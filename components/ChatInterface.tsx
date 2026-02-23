'use client';

import { useState, useRef, useEffect, useCallback, useMemo, memo, lazy, Suspense } from 'react';
import { useChat, type Message } from 'ai/react';
import { Send, Sparkles, Download, ExternalLink, Info, Sliders, Code, Eye, Settings, BookOpen, Save, Bookmark, RefreshCw, MessageSquarePlus, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { type UserProfile, FIELDS } from '@/lib/prompts';
import { getAll, put, putAll, clear, remove, migrateFromLocalStorage } from '@/lib/storage';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

const SettingsModal = lazy(() => import('./SettingsModal'));

interface ChatInterfaceProps {
  profile: UserProfile;
  apiKey: string;
  model: string;
  onApiKeyChange: (key: string) => void;
  onModelChange: (model: string) => void;
  onResetProfile: () => void;
}

interface GeneratedTool {
  title: string;
  description: string;
  html: string;
  explanation: {
    summary: string;
    mechanism: string;
    usage_hint: string;
  };
  customizable_params: Array<{
    id: string;
    label: string;
    type: 'slider' | 'color' | 'toggle' | 'select' | 'text';
    default: string;
    min?: string;
    max?: string;
    options?: string[];
  }>;
  academic_advice: string[];
}

interface SavedTool {
  id: string;
  title: string;
  description: string;
  html: string;
  explanation: GeneratedTool['explanation'];
  field: string;
  createdAt: string;
  author?: string;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

function tryParseToolGeneration(text: string): GeneratedTool | null {
  // Strategy 1: Try ```json block
  try {
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[1]);
      if (parsed?.type === 'tool_generation' && parsed?.tool?.html) {
        return parsed.tool;
      }
    }
  } catch {}

  // Strategy 2: Look for "tool_generation" and extract the html field directly
  try {
    if (text.includes('"tool_generation"') && text.includes('"html"')) {
      const htmlStartMarker = '"html"';
      const htmlIdx = text.indexOf(htmlStartMarker);
      if (htmlIdx === -1) return null;

      let i = htmlIdx + htmlStartMarker.length;
      while (i < text.length && text[i] !== '"') i++;
      if (i >= text.length) return null;

      i++;
      let htmlContent = '';
      while (i < text.length) {
        if (text[i] === '\\' && i + 1 < text.length) {
          const next = text[i + 1];
          if (next === '"') { htmlContent += '"'; i += 2; }
          else if (next === 'n') { htmlContent += '\n'; i += 2; }
          else if (next === 't') { htmlContent += '\t'; i += 2; }
          else if (next === '\\') { htmlContent += '\\'; i += 2; }
          else if (next === '/') { htmlContent += '/'; i += 2; }
          else { htmlContent += text[i]; i++; }
        } else if (text[i] === '"') {
          break;
        } else {
          htmlContent += text[i];
          i++;
        }
      }

      if (htmlContent.includes('<!DOCTYPE') || htmlContent.includes('<html') || htmlContent.includes('<head')) {
        const titleMatch = text.match(/"title"\s*:\s*"([^"]*?)"/);
        const descMatch = text.match(/"description"\s*:\s*"([^"]*?)"/);
        const summaryMatch = text.match(/"summary"\s*:\s*"([^"]*?)"/);
        const mechanismMatch = text.match(/"mechanism"\s*:\s*"([^"]*?)"/);
        const usageHintMatch = text.match(/"usage_hint"\s*:\s*"([^"]*?)"/);

        const adviceMatches: string[] = [];
        const adviceRegex = /"academic_advice"\s*:\s*\[([\s\S]*?)\]/;
        const adviceArrayMatch = text.match(adviceRegex);
        if (adviceArrayMatch) {
          const items = adviceArrayMatch[1].match(/"([^"]*?)"/g);
          items?.forEach(item => adviceMatches.push(item.replace(/^"|"$/g, '')));
        }

        return {
          title: titleMatch?.[1] ?? 'ツール',
          description: descMatch?.[1] ?? '',
          html: htmlContent,
          explanation: {
            summary: summaryMatch?.[1] ?? '',
            mechanism: mechanismMatch?.[1] ?? '',
            usage_hint: usageHintMatch?.[1] ?? '',
          },
          customizable_params: [],
          academic_advice: adviceMatches,
        };
      }
    }
  } catch (e) {
    console.warn('Research Forge: Tool parse strategy 2 failed:', e);
  }

  // Strategy 3: Try the whole text as JSON
  try {
    const trimmed = text.trim();
    if (trimmed.startsWith('{')) {
      const parsed = JSON.parse(trimmed);
      if (parsed?.type === 'tool_generation' && parsed?.tool?.html) {
        return parsed.tool;
      }
    }
  } catch {}

  return null;
}

// Inject API key receiver script into generated HTML so tools can use Claude API
function wrapHtmlWithApiKeyInjector(html: string): string {
  const injectorScript = `
<script>
// Research Forge: API key injection listener
window.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'set_api_key') {
    window.__RESEARCH_FORGE_API_KEY__ = event.data.apiKey;
  }
  if (event.data && event.data.type === 'customize') {
    window.__RESEARCH_FORGE_PARAMS__ = event.data.params;
    if (typeof window.onCustomize === 'function') {
      window.onCustomize(event.data.params);
    }
  }
});
</script>`;
  if (html.includes('</head>')) {
    return html.replace('</head>', injectorScript + '</head>');
  }
  return injectorScript + html;
}

// For download / new-tab: inject a banner for the user to enter their API key
function getToolHtmlForDownload(html: string): string {
  const bannerScript = `
<script>
(function() {
  // API key banner for standalone use
  if (!window.__RESEARCH_FORGE_API_KEY__) {
    var banner = document.createElement('div');
    banner.id = 'rf-api-banner';
    banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:#3d6b4f;color:#fff;padding:10px 16px;display:flex;align-items:center;gap:8px;font-family:sans-serif;font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,0.15)';
    banner.innerHTML = '<span>APIキーを入力してAI機能を有効化:</span><input id="rf-api-input" type="password" placeholder="sk-ant-..." style="flex:1;padding:6px 10px;border:none;border-radius:6px;font-size:13px;font-family:monospace;color:#333" /><button id="rf-api-btn" style="padding:6px 16px;background:#fff;color:#3d6b4f;border:none;border-radius:6px;font-weight:600;cursor:pointer;font-size:13px">設定</button><button id="rf-api-close" style="padding:4px 8px;background:transparent;color:#fff;border:none;cursor:pointer;font-size:18px;opacity:0.7">&times;</button>';
    document.body.prepend(banner);
    document.body.style.paddingTop = '48px';
    document.getElementById('rf-api-btn').onclick = function() {
      var key = document.getElementById('rf-api-input').value.trim();
      if (key) {
        window.__RESEARCH_FORGE_API_KEY__ = key;
        banner.remove();
        document.body.style.paddingTop = '';
      }
    };
    document.getElementById('rf-api-close').onclick = function() {
      banner.remove();
      document.body.style.paddingTop = '';
    };
  }
  // Also listen for postMessage
  window.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'set_api_key') {
      window.__RESEARCH_FORGE_API_KEY__ = event.data.apiKey;
      var b = document.getElementById('rf-api-banner');
      if (b) { b.remove(); document.body.style.paddingTop = ''; }
    }
    if (event.data && event.data.type === 'customize') {
      window.__RESEARCH_FORGE_PARAMS__ = event.data.params;
      if (typeof window.onCustomize === 'function') {
        window.onCustomize(event.data.params);
      }
    }
  });
})();
</script>`;
  if (html.includes('</body>')) {
    return html.replace('</body>', bannerScript + '</body>');
  }
  return html + bannerScript;
}

// Sample gallery tools for demo (module-level constant to avoid re-creation)
const DEFAULT_COMMUNITY_TOOLS: SavedTool[] = [
    {
      id: 'community-1',
      title: 'ワードクラウド生成ツール',
      description: 'テキストを貼り付けると、頻出語をワードクラウドで可視化します',
      html: `<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ワードクラウド生成ツール</title><style>@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700&display=swap');*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Noto Sans JP',sans-serif;background:#faf8f5;color:#2d3240;padding:24px;max-width:900px;margin:0 auto}h1{font-size:1.5rem;margin-bottom:8px;color:#1a1d27}p.sub{color:#7a849a;margin-bottom:20px;font-size:0.9rem}textarea{width:100%;height:120px;padding:12px;border:2px solid #e6ddd0;border-radius:12px;font-family:inherit;font-size:14px;resize:vertical;margin-bottom:12px}textarea:focus{outline:none;border-color:#358964}button{background:#358964;color:#fff;border:none;padding:10px 24px;border-radius:10px;font-size:14px;cursor:pointer;font-family:inherit}button:hover{background:#266e50}#cloud{margin-top:20px;min-height:300px;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:8px;padding:20px;background:#fff;border-radius:12px;border:1px solid #e6ddd0}.word{display:inline-block;padding:4px 8px;border-radius:6px;cursor:default;transition:transform 0.2s}.word:hover{transform:scale(1.1)}</style></head><body><h1>ワードクラウド生成ツール</h1><p class="sub">テキストを入力して「分析する」を押すと、頻出語を可視化します</p><textarea id="input" placeholder="ここにテキストを貼り付けてください...">吾輩は猫である。名前はまだ無い。どこで生れたかとんと見当がつかぬ。何でも薄暗いじめじめした所でニャーニャー泣いていた事だけは記憶している。吾輩はここで始めて人間というものを見た。</textarea><button onclick="analyze()">分析する</button><div id="cloud"></div><script>function analyze(){const t=document.getElementById('input').value;if(!t.trim())return;const words=t.replace(/[。、！？「」『』（）\\n\\r]/g,' ').split(/\\s+/).filter(w=>w.length>=2);const freq={};words.forEach(w=>{freq[w]=(freq[w]||0)+1});const sorted=Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,40);const max=sorted[0]?sorted[0][1]:1;const colors=['#358964','#4A90A4','#E8734A','#8B6D59','#5f687f','#a6856a','#55a67f','#725a4c'];const cloud=document.getElementById('cloud');cloud.innerHTML='';sorted.forEach(([word,count],i)=>{const size=14+((count/max)*36);const el=document.createElement('span');el.className='word';el.textContent=word;el.style.fontSize=size+'px';el.style.fontWeight=count>max*0.5?'700':'400';el.style.color=colors[i%colors.length];el.style.opacity=0.6+(count/max)*0.4;el.title=word+': '+count+'回';cloud.appendChild(el)})}</script></body></html>`,
      explanation: { summary: 'テキストから頻出語を抽出し、出現頻度に応じた大きさで表示します', mechanism: 'テキストを単語に分割し、各単語の出現回数を数え、頻度が高いほど大きく表示します', usage_hint: '論文のテキストデータの傾向把握や、インタビューデータの概要分析に活用できます' },
      field: '文学',
      createdAt: '2026-02-20',
      author: '文学研究者A',
    },
    {
      id: 'community-2',
      title: '年表タイムライン作成ツール',
      description: 'イベントを入力すると、インタラクティブな年表を生成します',
      html: `<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>年表タイムライン</title><style>@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;600&display=swap');*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Noto Sans JP',sans-serif;background:#faf8f5;color:#2d3240;padding:24px;max-width:800px;margin:0 auto}h1{font-size:1.5rem;margin-bottom:8px}p.sub{color:#7a849a;margin-bottom:20px;font-size:0.9rem}.form{display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap}.form input{padding:8px 12px;border:2px solid #e6ddd0;border-radius:8px;font-family:inherit;font-size:14px}.form input:focus{outline:none;border-color:#358964}.form input.year{width:100px}.form input.event{flex:1;min-width:200px}.form button{background:#358964;color:#fff;border:none;padding:8px 16px;border-radius:8px;cursor:pointer;font-family:inherit}.timeline{position:relative;padding-left:30px}.timeline::before{content:'';position:absolute;left:14px;top:0;bottom:0;width:2px;background:#d5c7b0}.item{position:relative;margin-bottom:24px;animation:fadeIn 0.3s ease}.item::before{content:'';position:absolute;left:-22px;top:6px;width:12px;height:12px;border-radius:50%;background:#358964;border:2px solid #fff;box-shadow:0 0 0 2px #358964}.year-label{font-size:0.85rem;font-weight:600;color:#358964;margin-bottom:2px}.event-text{font-size:1rem;color:#2d3240;background:#fff;padding:10px 14px;border-radius:10px;border:1px solid #e6ddd0}@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}</style></head><body><h1>年表タイムライン作成ツール</h1><p class="sub">年と出来事を入力して年表を作成しましょう</p><div class="form"><input class="year" id="yearInput" placeholder="年（例:1868）" type="number"><input class="event" id="eventInput" placeholder="出来事を入力"><button onclick="addEvent()">追加</button></div><div class="timeline" id="timeline"></div><script>let events=[{year:1853,text:'ペリー来航'},{year:1868,text:'明治維新'},{year:1889,text:'大日本帝国憲法発布'},{year:1912,text:'大正時代の始まり'}];function render(){const tl=document.getElementById('timeline');events.sort((a,b)=>a.year-b.year);tl.innerHTML=events.map(e=>'<div class="item"><div class="year-label">'+e.year+'年</div><div class="event-text">'+e.text+'</div></div>').join('')}function addEvent(){const y=parseInt(document.getElementById('yearInput').value);const t=document.getElementById('eventInput').value.trim();if(!y||!t)return;events.push({year:y,text:t});document.getElementById('yearInput').value='';document.getElementById('eventInput').value='';render()}render()</script></body></html>`,
      explanation: { summary: '歴史的な出来事を時系列で可視化するインタラクティブな年表です', mechanism: '入力された年と出来事を時系列順に並べ替えて表示します', usage_hint: '研究対象の時代背景の整理や、論文の時系列的な議論の構成に役立ちます' },
      field: '歴史学',
      createdAt: '2026-02-19',
      author: '歴史学研究者B',
    },
    {
      id: 'community-3',
      title: 'リカート尺度分析ツール',
      description: 'アンケートのリカート尺度データを集計・可視化します',
      html: `<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>リカート尺度分析</title><style>@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;600&display=swap');*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Noto Sans JP',sans-serif;background:#faf8f5;color:#2d3240;padding:24px;max-width:800px;margin:0 auto}h1{font-size:1.5rem;margin-bottom:8px}p.sub{color:#7a849a;margin-bottom:20px;font-size:0.9rem}table{width:100%;border-collapse:collapse;margin-bottom:20px;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e6ddd0}th,td{padding:10px 14px;text-align:center;border-bottom:1px solid #e6ddd0;font-size:14px}th{background:#358964;color:#fff;font-weight:600}.bar-container{height:24px;background:#e6ddd0;border-radius:6px;overflow:hidden;display:flex}.bar-seg{height:100%;transition:width 0.5s ease}.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-top:20px}.stat-card{background:#fff;padding:14px;border-radius:10px;border:1px solid #e6ddd0;text-align:center}.stat-val{font-size:1.5rem;font-weight:600;color:#358964}.stat-label{font-size:0.8rem;color:#7a849a;margin-top:4px}</style></head><body><h1>リカート尺度分析ツール</h1><p class="sub">5段階評価のアンケート結果をサンプルデータで表示しています</p><table><thead><tr><th>質問項目</th><th>1(そう思わない)</th><th>2</th><th>3</th><th>4</th><th>5(そう思う)</th><th>平均</th></tr></thead><tbody id="tbody"></tbody></table><h2 style="font-size:1.1rem;margin-bottom:12px">分布グラフ</h2><div id="bars"></div><div class="stats" id="stats"></div><script>const data=[{q:'授業内容は理解しやすかった',d:[2,5,12,25,16]},{q:'教材は適切だった',d:[1,3,8,28,20]},{q:'課題の量は適切だった',d:[5,10,15,18,12]},{q:'総合的に満足している',d:[1,4,10,22,23]}];const colors=['#d9534f','#f0ad4e','#cccccc','#5cb85c','#358964'];function render(){const tb=document.getElementById('tbody');const bars=document.getElementById('bars');const stats=document.getElementById('stats');tb.innerHTML='';bars.innerHTML='';let allAvgs=[];data.forEach(item=>{const total=item.d.reduce((a,b)=>a+b,0);const avg=(item.d.reduce((s,v,i)=>s+v*(i+1),0)/total).toFixed(2);allAvgs.push(parseFloat(avg));let row='<tr><td style="text-align:left;font-weight:500">'+item.q+'</td>';item.d.forEach(v=>{row+='<td>'+v+'</td>'});row+='<td style="font-weight:600;color:#358964">'+avg+'</td></tr>';tb.innerHTML+=row;let barHtml='<p style="font-size:13px;margin-bottom:4px;color:#5f687f">'+item.q+'</p><div class="bar-container">';item.d.forEach((v,i)=>{const pct=(v/total*100).toFixed(1);barHtml+='<div class="bar-seg" style="width:'+pct+'%;background:'+colors[i]+'" title="'+(i+1)+': '+v+'人 ('+pct+'%)"></div>'});barHtml+='</div><p style="font-size:11px;color:#9da5b5;margin-bottom:16px">n='+total+'</p>';bars.innerHTML+=barHtml});const grandAvg=(allAvgs.reduce((a,b)=>a+b,0)/allAvgs.length).toFixed(2);const totalN=data[0].d.reduce((a,b)=>a+b,0);stats.innerHTML='<div class="stat-card"><div class="stat-val">'+grandAvg+'</div><div class="stat-label">全体平均</div></div><div class="stat-card"><div class="stat-val">'+totalN+'</div><div class="stat-label">回答者数</div></div><div class="stat-card"><div class="stat-val">'+data.length+'</div><div class="stat-label">質問項目数</div></div>'}render()</script></body></html>`,
      explanation: { summary: '5段階リカート尺度のアンケート結果を集計表と分布グラフで表示します', mechanism: '各選択肢の回答数から平均値を算出し、積み上げ棒グラフで分布を可視化します', usage_hint: '授業評価や意識調査の結果報告に使えます。論文のFigureとしても活用可能です' },
      field: '教育学',
      createdAt: '2026-02-18',
      author: '教育学研究者C',
    },
  ];

// Markdown components for ReactMarkdown
const markdownComponents = {
  p: ({ children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => <p className="mb-2 last:mb-0" {...props}>{children}</p>,
  ul: ({ children, ...props }: React.HTMLAttributes<HTMLUListElement>) => <ul className="list-disc pl-5 mb-2 space-y-1" {...props}>{children}</ul>,
  ol: ({ children, ...props }: React.HTMLAttributes<HTMLOListElement>) => <ol className="list-decimal pl-5 mb-2 space-y-1" {...props}>{children}</ol>,
  li: ({ children, ...props }: React.HTMLAttributes<HTMLLIElement>) => <li className="leading-relaxed" {...props}>{children}</li>,
  strong: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => <strong className="font-semibold" {...props}>{children}</strong>,
  code: ({ children, className, ...props }: React.HTMLAttributes<HTMLElement>) => {
    const isBlock = className?.includes('language-');
    if (isBlock) {
      return <code className={`block bg-ink-900 text-green-300 rounded-lg p-3 text-sm font-mono overflow-x-auto my-2 ${className ?? ''}`} {...props}>{children}</code>;
    }
    return <code className="bg-sand-200 text-ink-800 rounded px-1.5 py-0.5 text-sm font-mono" {...props}>{children}</code>;
  },
  pre: ({ children, ...props }: React.HTMLAttributes<HTMLPreElement>) => <pre className="my-2" {...props}>{children}</pre>,
  blockquote: ({ children, ...props }: React.HTMLAttributes<HTMLQuoteElement>) => <blockquote className="border-l-2 border-forge-400 pl-3 my-2 text-ink-500 italic" {...props}>{children}</blockquote>,
  h1: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => <h1 className="text-lg font-bold mb-2" {...props}>{children}</h1>,
  h2: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => <h2 className="text-base font-bold mb-1.5" {...props}>{children}</h2>,
  h3: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => <h3 className="text-sm font-bold mb-1" {...props}>{children}</h3>,
  table: ({ children, ...props }: React.HTMLAttributes<HTMLTableElement>) => <div className="overflow-x-auto my-2"><table className="min-w-full text-sm border-collapse border border-sand-300 rounded" {...props}>{children}</table></div>,
  th: ({ children, ...props }: React.HTMLAttributes<HTMLTableCellElement>) => <th className="border border-sand-300 bg-sand-100 px-3 py-1.5 text-left font-medium" {...props}>{children}</th>,
  td: ({ children, ...props }: React.HTMLAttributes<HTMLTableCellElement>) => <td className="border border-sand-300 px-3 py-1.5" {...props}>{children}</td>,
};

// Memoized message bubble to avoid re-rendering all messages on input change
const ChatBubble = memo(function ChatBubble({
  message,
  isLastAssistant,
  isStreaming,
  lastFailedInput,
  onRetry,
  onOpenInNewTab,
}: {
  message: Message;
  isLastAssistant: boolean;
  isStreaming: boolean;
  lastFailedInput: string | null;
  onRetry: () => void;
  onOpenInNewTab: () => void;
}) {
  const content = message.content;
  const showStreaming = isStreaming && isLastAssistant;

  const renderedContent = useMemo(() => {
    if (message.role === 'user') {
      return <p className="text-[15px]">{content}</p>;
    }

    // While streaming, check if it looks like a tool generation in progress
    if (showStreaming && content.includes('"tool_generation"')) {
      return (
        <div className="flex items-center gap-2 px-3 py-2 bg-forge-50 rounded-xl border border-forge-200">
          <Sparkles className="w-4 h-4 text-forge-600 animate-pulse-soft" />
          <span className="text-sm text-forge-700">ツールを生成中...</span>
        </div>
      );
    }

    const toolParsed = tryParseToolGeneration(content);
    if (toolParsed) {
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-3 py-2 bg-forge-50 rounded-xl border border-forge-200">
            <Sparkles className="w-4 h-4 text-forge-600" />
            <span className="text-sm font-medium text-forge-800">
              「{toolParsed.title}」を作成しました！
            </span>
          </div>
          {toolParsed.academic_advice?.map((advice, i) => (
            <div key={i} className="text-sm text-forge-700 bg-forge-50/50 px-3 py-2 rounded-xl border-l-2 border-forge-400">
              {advice}
            </div>
          ))}
          <Button onClick={onOpenInNewTab} className="w-full gap-2">
            <ExternalLink className="w-4 h-4" />
            このツールを使う（新しいタブで開く）
          </Button>
          <p className="text-[11px] text-ink-400 text-center">新しいタブでは、ファイルの読み込みや全機能が使えます</p>
        </div>
      );
    }

    // Check for error messages
    const isError = content.startsWith('\u26A0\uFE0F');
    if (isError && lastFailedInput) {
      return (
        <div className="space-y-2">
          <div className="whitespace-pre-wrap leading-relaxed text-[15px]">{content}</div>
          <Button variant="outline" size="sm" onClick={onRetry} className="gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" />
            再送信
          </Button>
        </div>
      );
    }

    return (
      <div className={`prose-chat text-[15px] leading-relaxed ${showStreaming ? 'streaming-cursor' : ''}`}>
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
          {content}
        </ReactMarkdown>
      </div>
    );
  }, [content, showStreaming, lastFailedInput, message.role, onRetry, onOpenInNewTab]);

  return (
    <div className="message-enter">
      <div className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
        {message.role === 'assistant' && (
          <div className="w-8 h-8 rounded-full bg-forge-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Sparkles className="w-4 h-4 text-forge-600" />
          </div>
        )}
        <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${message.role === 'user' ? 'bg-forge-600 text-white rounded-tr-md' : 'bg-sand-50 text-ink-700 rounded-tl-md'}`}>
          {renderedContent}
        </div>
      </div>
    </div>
  );
});

export default function ChatInterface({ profile, apiKey, model, onApiKeyChange, onModelChange, onResetProfile }: ChatInterfaceProps) {
  const [tool, setTool] = useState<GeneratedTool | null>(null);
  const [previewTab, setPreviewTab] = useState<'preview' | 'about' | 'customize' | 'code'>('preview');
  const [customParams, setCustomParams] = useState<Record<string, string>>({});
  const [showSettings, setShowSettings] = useState(false);
  const [savedTools, setSavedTools] = useState<SavedTool[]>([]);
  const [communityTools, setCommunityTools] = useState<SavedTool[]>([]);
  const [sidePanel, setSidePanel] = useState<'chat' | 'history' | 'saved' | 'gallery'>('chat');
  const [toolSaved, setToolSaved] = useState(false);
  const [mobileView, setMobileView] = useState<'chat' | 'preview'>('chat');
  const [lastFailedInput, setLastFailedInput] = useState<string | null>(null);
  const [storageReady, setStorageReady] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const fieldInfo = useMemo(() => FIELDS.find(f => f.id === profile.field), [profile.field]);

  // Streaming chat via Vercel AI SDK useChat
  const {
    messages,
    input,
    setInput,
    handleSubmit: chatHandleSubmit,
    isLoading,
    error: chatError,
    setMessages,
    append,
  } = useChat({
    api: '/api/chat',
    body: { profile, apiKey, model },
    // Token optimization: replace large tool JSON in assistant messages before sending
    fetch: async (url, options) => {
      if (options?.body) {
        try {
          const body = JSON.parse(options.body as string);
          if (body.messages) {
            body.messages = body.messages.map((m: Message) => {
              if (m.role === 'assistant' && m.content.includes('"tool_generation"')) {
                const parsed = tryParseToolGeneration(m.content);
                if (parsed) {
                  return { ...m, content: `[ツール生成: ${parsed.title}]` };
                }
              }
              return m;
            });
          }
          return fetch(url, { ...options, body: JSON.stringify(body) });
        } catch {
          return fetch(url, options);
        }
      }
      return fetch(url, options);
    },
    onFinish: (message) => {
      const parsed = tryParseToolGeneration(message.content);
      if (parsed) {
        setTool(parsed);
        setPreviewTab('preview');
        setToolSaved(false);
        const defaultParams: Record<string, string> = {};
        parsed.customizable_params?.forEach(p => { defaultParams[p.id] = p.default; });
        setCustomParams(defaultParams);
        setMobileView('preview');
      }
      setLastFailedInput(null);
    },
    onError: () => {
      setLastFailedInput(input || lastFailedInput);
    },
  });

  // Load persisted data from IndexedDB
  useEffect(() => {
    (async () => {
      try {
        await migrateFromLocalStorage();
        const [savedData, communityData, chatData] = await Promise.all([
          getAll<SavedTool>('savedTools'),
          getAll<SavedTool>('communityTools'),
          getAll<Conversation>('chatHistory'),
        ]);
        setSavedTools(savedData);
        setCommunityTools(communityData.length > 0 ? communityData : DEFAULT_COMMUNITY_TOOLS);

        // Migrate old single-conversation format
        const oldFormat = chatData.find(c => c.id === 'current' && !c.title);
        if (oldFormat) {
          const oldMessages = (oldFormat as Conversation & { messages: Message[] }).messages ?? [];
          const migrated: Conversation = {
            id: `conv-${Date.now()}`,
            title: '以前の会話',
            messages: oldMessages,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          await remove('chatHistory', 'current');
          await put('chatHistory', migrated);
          setConversations([migrated]);
          setActiveConversationId(migrated.id);
          setMessages(migrated.messages);
        } else {
          const convs = (chatData as Conversation[])
            .filter(c => c.title)
            .sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''));
          setConversations(convs);
          if (convs.length > 0) {
            setActiveConversationId(convs[0].id);
            setMessages(convs[0].messages);
          }
        }
      } catch {
        setCommunityTools(DEFAULT_COMMUNITY_TOOLS);
      }
      setStorageReady(true);
    })();
  }, []);

  // Save chat messages to IndexedDB when they change (debounced)
  useEffect(() => {
    if (!storageReady || messages.length === 0 || !activeConversationId) return;
    const timeout = setTimeout(() => {
      const conv: Conversation = {
        id: activeConversationId,
        title: conversations.find(c => c.id === activeConversationId)?.title
          ?? (messages[0]?.content?.slice(0, 30) || '新しい会話'),
        messages,
        createdAt: conversations.find(c => c.id === activeConversationId)?.createdAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      put('chatHistory', conv).catch(() => {});
      setConversations(prev => {
        const existing = prev.findIndex(c => c.id === activeConversationId);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = conv;
          return updated;
        }
        return [conv, ...prev];
      });
    }, 500);
    return () => clearTimeout(timeout);
  }, [messages, storageReady, activeConversationId]);

  // Save tools to IndexedDB when they change
  useEffect(() => {
    if (!storageReady) return;
    putAll('savedTools', savedTools).catch(() => {
      toast({ title: '保存に失敗しました', variant: 'destructive' });
    });
  }, [savedTools, storageReady]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // PostMessage for customization + API key injection
  useEffect(() => {
    if (iframeRef.current && tool) {
      iframeRef.current.contentWindow?.postMessage(
        { type: 'customize', params: customParams }, '*'
      );
    }
  }, [customParams, tool]);

  // Inject API key into iframe when tool loads
  useEffect(() => {
    if (!iframeRef.current || !tool) return;
    const injectKey = () => {
      try {
        iframeRef.current?.contentWindow?.postMessage(
          { type: 'set_api_key', apiKey }, '*'
        );
      } catch {}
    };
    const iframe = iframeRef.current;
    iframe.addEventListener('load', injectKey);
    injectKey();
    return () => iframe.removeEventListener('load', injectKey);
  }, [tool, apiKey]);

  // Ctrl+Enter send
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (input.trim() && !isLoading) {
        if (!activeConversationId) setActiveConversationId(`conv-${Date.now()}`);
        chatHandleSubmit(e as unknown as React.FormEvent);
      }
    }
  }, [input, isLoading, chatHandleSubmit, activeConversationId]);

  const handleSend = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    if (!activeConversationId) setActiveConversationId(`conv-${Date.now()}`);
    chatHandleSubmit(e);
  }, [input, isLoading, chatHandleSubmit, activeConversationId]);

  // Retry failed message
  const handleRetry = useCallback(() => {
    if (!lastFailedInput) return;
    const textToRetry = lastFailedInput;
    // Remove the last error message pair if present
    setMessages(prev => {
      const msgs = [...prev];
      // Remove trailing error messages
      while (msgs.length > 0 && msgs[msgs.length - 1].role === 'assistant' && msgs[msgs.length - 1].content.startsWith('\u26A0\uFE0F')) {
        msgs.pop();
      }
      // Remove the user message that caused the error
      if (msgs.length > 0 && msgs[msgs.length - 1].role === 'user') {
        msgs.pop();
      }
      return msgs;
    });
    setLastFailedInput(null);
    // Re-send
    setTimeout(() => {
      append({ role: 'user', content: textToRetry });
    }, 100);
  }, [lastFailedInput, setMessages, append]);

  const handleSaveTool = useCallback(() => {
    if (!tool) return;
    const newTool: SavedTool = {
      id: `tool-${Date.now()}`,
      title: tool.title,
      description: tool.description,
      html: tool.html,
      explanation: tool.explanation,
      field: fieldInfo?.label ?? '',
      createdAt: new Date().toISOString().split('T')[0],
    };
    setSavedTools(prev => [newTool, ...prev]);
    setToolSaved(true);
    toast({ title: 'ツールを保存しました' });
  }, [tool, fieldInfo]);

  const handlePublishTool = useCallback(() => {
    if (!tool) return;
    const newTool: SavedTool = {
      id: `community-${Date.now()}`,
      title: tool.title,
      description: tool.description,
      html: tool.html,
      explanation: tool.explanation,
      field: fieldInfo?.label ?? '',
      createdAt: new Date().toISOString().split('T')[0],
      author: `${fieldInfo?.label ?? ''}研究者`,
    };
    setCommunityTools(prev => {
      const updated = [newTool, ...prev];
      putAll('communityTools', updated).catch(() => {});
      return updated;
    });
    setToolSaved(true);
    toast({ title: 'ギャラリーに追加しました' });
  }, [tool, fieldInfo]);

  const handleLoadTool = useCallback((saved: SavedTool) => {
    setTool({
      title: saved.title,
      description: saved.description,
      html: saved.html,
      explanation: saved.explanation,
      customizable_params: [],
      academic_advice: [],
    });
    setPreviewTab('preview');
    setSidePanel('chat');
    setMobileView('preview');
  }, []);

  const handleClearChat = useCallback(() => {
    if (activeConversationId) {
      remove('chatHistory', activeConversationId).catch(() => {});
      setConversations(prev => prev.filter(c => c.id !== activeConversationId));
    }
    setMessages([]);
    setActiveConversationId('');
    setTool(null);
  }, [setMessages, activeConversationId]);

  const handleNewConversation = useCallback(() => {
    const newId = `conv-${Date.now()}`;
    setMessages([]);
    setActiveConversationId(newId);
    setTool(null);
    setLastFailedInput(null);
  }, [setMessages]);

  const handleSwitchConversation = useCallback((conv: Conversation) => {
    setActiveConversationId(conv.id);
    setMessages(conv.messages);
    setTool(null);
    setLastFailedInput(null);
    setSidePanel('chat');
  }, [setMessages]);

  const handleDeleteConversation = useCallback((convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    remove('chatHistory', convId).catch(() => {});
    setConversations(prev => prev.filter(c => c.id !== convId));
    if (activeConversationId === convId) {
      setMessages([]);
      setActiveConversationId('');
      setTool(null);
    }
  }, [activeConversationId, setMessages]);

  const handleDownload = useCallback(() => {
    if (!tool) return;
    const blob = new Blob([getToolHtmlForDownload(tool.html)], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tool.title || 'tool'}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }, [tool]);

  const handleOpenInNewTab = useCallback(() => {
    if (!tool) return;
    const blob = new Blob([getToolHtmlForDownload(tool.html)], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (win) {
      setTimeout(() => {
        try {
          win.postMessage({ type: 'set_api_key', apiKey }, '*');
        } catch {}
      }, 1000);
    }
  }, [tool, apiKey]);

  const handleParamChange = useCallback((id: string, value: string) => {
    setCustomParams(prev => ({ ...prev, [id]: value }));
  }, []);

  // Memoize iframe srcDoc to prevent unnecessary iframe reloads
  const iframeSrcDoc = useMemo(
    () => tool ? wrapHtmlWithApiKeyInjector(tool.html) : '',
    [tool?.html]
  );

  return (
    <div className="h-screen flex flex-col bg-sand-50">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-sand-200 bg-sand-50/90 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-forge-600 flex items-center justify-center shadow-sm">
            <span className="text-white text-base">{'\uD83C\uDF3F'}</span>
          </div>
          <div>
            <h1 className="font-display text-lg font-bold text-ink-900 leading-tight">Research Forge</h1>
            <p className="text-xs text-ink-400">{fieldInfo?.icon} {fieldInfo?.label ?? profile.fieldCustom} モード</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={handleNewConversation} className="gap-1.5">
            <MessageSquarePlus className="w-3.5 h-3.5" />新しい会話
          </Button>
          <Button variant="ghost" size="sm" onClick={handleClearChat} disabled={messages.length === 0}>
            チャットを削除
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowSettings(true)} className="gap-1.5">
            <Settings className="w-3.5 h-3.5" />設定
          </Button>
        </div>
      </header>

      {showSettings && (
        <Suspense fallback={null}>
          <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} apiKey={apiKey} model={model} onApiKeyChange={onApiKeyChange} onModelChange={onModelChange} onResetProfile={onResetProfile} />
        </Suspense>
      )}

      {/* Mobile Tab Bar */}
      <div className="flex md:hidden border-b border-sand-200 bg-white">
        <button onClick={() => setMobileView('chat')} className={`flex-1 py-2.5 text-sm font-medium text-center transition-colors ${mobileView === 'chat' ? 'text-forge-700 border-b-2 border-forge-600' : 'text-ink-400'}`}>
          チャット
        </button>
        <button onClick={() => setMobileView('preview')} className={`flex-1 py-2.5 text-sm font-medium text-center transition-colors ${mobileView === 'preview' ? 'text-forge-700 border-b-2 border-forge-600' : 'text-ink-400'}`}>
          プレビュー {tool ? '●' : ''}
        </button>
      </div>

      {/* Main */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel */}
        <div className={`w-full md:w-[42%] flex-col border-r border-sand-200 bg-white ${mobileView === 'chat' ? 'flex' : 'hidden md:flex'}`}>
          {/* Left Panel Tabs */}
          <Tabs value={sidePanel} onValueChange={v => setSidePanel(v as typeof sidePanel)} className="flex flex-col flex-1 overflow-hidden">
            <TabsList className="border-b border-sand-200 rounded-none bg-transparent shrink-0">
              <TabsTrigger value="chat"><Sparkles className="w-3.5 h-3.5" />チャット</TabsTrigger>
              <TabsTrigger value="history"><MessageSquarePlus className="w-3.5 h-3.5" />履歴({conversations.length})</TabsTrigger>
              <TabsTrigger value="saved"><Bookmark className="w-3.5 h-3.5" />保存済み({savedTools.length})</TabsTrigger>
              <TabsTrigger value="gallery"><BookOpen className="w-3.5 h-3.5" />ギャラリー</TabsTrigger>
            </TabsList>

            {/* Chat Panel */}
            <TabsContent value="chat" className="flex flex-col flex-1 overflow-hidden">
              <ScrollArea className="flex-1 px-4 py-4">
                <div className="space-y-4">
                  {messages.length === 0 && (
                    <div className="message-enter">
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-forge-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Sparkles className="w-4 h-4 text-forge-600" />
                        </div>
                        <div className="flex-1 space-y-3">
                          <div className="bg-sand-50 rounded-2xl rounded-tl-md px-4 py-3 text-ink-700">
                            <p className="mb-2">こんにちは！{fieldInfo?.label ?? ''}の研究をされているのですね。{profile.researchTheme && `「${profile.researchTheme}」について、`}どのようなツールを作りましょうか？</p>
                            <p className="text-sm text-ink-500">例えば「テキストの頻出語を分析したい」「アンケート結果を可視化したい」など、お気軽にお話しください。</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {['テキストを分析したい', 'データを可視化したい', 'アンケートを分析したい', '今の研究で困っていることがある'].map(s => (
                              <Button key={s} variant="outline" size="sm" onClick={() => setInput(s)} className="rounded-full">
                                {s}
                              </Button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {messages.map((m, i) => (
                    <ChatBubble
                      key={m.id}
                      message={m}
                      isLastAssistant={m.role === 'assistant' && i === messages.length - 1}
                      isStreaming={isLoading}
                      lastFailedInput={lastFailedInput}
                      onRetry={handleRetry}
                      onOpenInNewTab={handleOpenInNewTab}
                    />
                  ))}
                  {isLoading && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-forge-100 flex items-center justify-center flex-shrink-0">
                        <Sparkles className="w-4 h-4 text-forge-600" />
                      </div>
                      <div className="bg-sand-50 rounded-2xl rounded-tl-md px-4 py-3">
                        <p className="text-sm text-ink-400 mb-2">生成中です。少々お待ちください...</p>
                        <div className="flex gap-1.5">
                          <div className="typing-dot w-2 h-2 rounded-full bg-forge-400" />
                          <div className="typing-dot w-2 h-2 rounded-full bg-forge-400" />
                          <div className="typing-dot w-2 h-2 rounded-full bg-forge-400" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Chat error display */}
                  {chatError && (
                    <div className="message-enter">
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-forge-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Sparkles className="w-4 h-4 text-forge-600" />
                        </div>
                        <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-sand-50 text-ink-700 rounded-tl-md space-y-2">
                          <p className="text-[15px]">{'\u26A0\uFE0F'} エラーが発生しました。もう一度お試しください。</p>
                          {lastFailedInput && (
                            <Button variant="outline" size="sm" onClick={handleRetry} className="gap-1.5">
                              <RefreshCw className="w-3.5 h-3.5" />
                              再送信
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Input — Ctrl+Enter = send, Enter = newline */}
              <form onSubmit={handleSend} className="px-4 py-3 border-t border-sand-200 bg-white shrink-0">
                <div className="flex items-end gap-2">
                  <Textarea
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="どのようなツールを作りましょうか？"
                    rows={2}
                    className="flex-1 resize-none"
                    style={{ minHeight: '60px', maxHeight: '150px' }}
                  />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button type="submit" disabled={!input.trim() || isLoading} size="icon" className="w-11 h-11 flex-shrink-0">
                        <Send className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>送信 (Ctrl+Enter)</TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-[11px] text-ink-300 mt-1.5 text-right">Ctrl+Enter ({'\u2318'}+Enter) で送信 ・ Enterで改行</p>
              </form>
            </TabsContent>

            {/* Conversation History Panel */}
            <TabsContent value="history" className="flex-1 overflow-auto p-4">
              {conversations.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquarePlus className="w-10 h-10 text-sand-300 mx-auto mb-3" />
                  <p className="text-sm text-ink-400">会話履歴はまだありません</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {conversations.map(conv => (
                    <div
                      key={conv.id}
                      onClick={() => handleSwitchConversation(conv)}
                      className={`group cursor-pointer rounded-xl px-4 py-3 border transition-all ${conv.id === activeConversationId ? 'border-forge-500 bg-forge-50' : 'border-sand-200 bg-white hover:border-forge-300'}`}
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-ink-800 truncate flex-1">{conv.title}</p>
                        <button
                          onClick={(e) => handleDeleteConversation(conv.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-red-50 transition-all"
                          title="会話を削除"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-ink-400 hover:text-red-500" />
                        </button>
                      </div>
                      <p className="text-xs text-ink-400 mt-0.5">{conv.messages.length}件のメッセージ ・ {conv.updatedAt?.split('T')[0]}</p>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Saved Tools Panel */}
            <TabsContent value="saved" className="flex-1 overflow-auto p-4">
              {savedTools.length === 0 ? (
                <div className="text-center py-12">
                  <Bookmark className="w-10 h-10 text-sand-300 mx-auto mb-3" />
                  <p className="text-sm text-ink-400">保存されたツールはまだありません</p>
                  <p className="text-xs text-ink-300 mt-1">ツール作成後「保存」ボタンで保存できます</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {savedTools.map(t => (
                    <Card key={t.id} className="cursor-pointer hover:border-forge-300 hover:shadow-sm transition-all p-4" onClick={() => handleLoadTool(t)}>
                      <CardTitle>{t.title}</CardTitle>
                      <CardDescription className="mt-1 line-clamp-2">{t.description}</CardDescription>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge>{t.field}</Badge>
                        <span className="text-[10px] text-ink-300">{t.createdAt}</span>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Gallery Panel */}
            <TabsContent value="gallery" className="flex-1 overflow-auto p-4">
              <p className="text-xs text-ink-400 mb-2">保存したツールやサンプルツールを閲覧できます</p>
              <div className="space-y-3">
                {communityTools.map(t => (
                  <Card key={t.id} className="cursor-pointer hover:border-forge-300 hover:shadow-sm transition-all p-4" onClick={() => handleLoadTool(t)}>
                    <CardTitle>{t.title}</CardTitle>
                    <CardDescription className="mt-1 line-clamp-2">{t.description}</CardDescription>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary">{t.field}</Badge>
                      {t.author && <span className="text-[10px] text-ink-300">by {t.author}</span>}
                      <span className="text-[10px] text-ink-300">{t.createdAt}</span>
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right: Preview Panel */}
        <div className={`flex-1 flex-col bg-sand-50 ${mobileView === 'preview' ? 'flex' : 'hidden md:flex'}`}>
          {tool ? (
            <>
              {/* Big CTA banner */}
              <div className="px-4 py-3 bg-forge-600 text-white flex items-center justify-between shrink-0">
                <div>
                  <h3 className="font-medium text-sm">{tool.title}</h3>
                  <p className="text-xs text-forge-200">右はプレビューです。実際に使うには新しいタブで開いてください</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" onClick={handleOpenInNewTab} className="gap-2 text-forge-700">
                    <ExternalLink className="w-4 h-4" />
                    ツールを使う
                  </Button>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="icon" onClick={handleDownload} className="bg-forge-500 hover:bg-forge-400">
                        <Download className="w-3.5 h-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>HTMLをダウンロード</TooltipContent>
                  </Tooltip>
                </div>
              </div>

              {/* Preview Tabs */}
              <Tabs value={previewTab} onValueChange={v => setPreviewTab(v as typeof previewTab)} className="flex flex-col flex-1 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 border-b border-sand-200 bg-white shrink-0">
                  <TabsList className="bg-transparent">
                    <TabsTrigger value="preview"><Eye className="w-3.5 h-3.5" />プレビュー</TabsTrigger>
                    <TabsTrigger value="about"><Info className="w-3.5 h-3.5" />このツールについて</TabsTrigger>
                    <TabsTrigger value="customize"><Sliders className="w-3.5 h-3.5" />カスタマイズ</TabsTrigger>
                    <TabsTrigger value="code"><Code className="w-3.5 h-3.5" />コード</TabsTrigger>
                  </TabsList>
                  <div className="flex gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant={toolSaved ? 'secondary' : 'ghost'} size="sm" onClick={handleSaveTool} disabled={toolSaved}>
                          <Save className="w-3.5 h-3.5 mr-1" />{toolSaved ? '保存済み' : '保存'}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>ツールを保存</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="sm" onClick={handlePublishTool}>
                          <BookOpen className="w-3.5 h-3.5 mr-1" />ギャラリーに追加
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>ギャラリーに追加</TooltipContent>
                    </Tooltip>
                    <Button size="sm" onClick={handleOpenInNewTab} className="gap-1.5">
                      <ExternalLink className="w-3.5 h-3.5" />新しいタブで使う
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleDownload} className="gap-1.5 text-forge-700 border-forge-300 hover:bg-forge-50">
                      <Download className="w-3.5 h-3.5" />保存
                    </Button>
                  </div>
                </div>

                <TabsContent value="preview" className="flex flex-col flex-1">
                  <div className="px-4 py-2 bg-forge-50 border-b border-forge-100 flex items-center justify-between shrink-0">
                    <p className="text-xs text-forge-700">
                      ファイル読み込み等を使うには「<strong>新しいタブで使う</strong>」ボタンで開いてください
                    </p>
                  </div>
                  <iframe ref={iframeRef} srcDoc={iframeSrcDoc} className="preview-frame flex-1" sandbox="allow-scripts allow-forms allow-modals allow-same-origin" title={tool.title} />
                </TabsContent>

                <TabsContent value="about" className="flex-1 overflow-auto">
                  <div className="p-6 space-y-6">
                    <div>
                      <h3 className="font-display text-xl font-bold text-ink-900 mb-1">{tool.title}</h3>
                      <p className="text-ink-500 text-sm">{tool.description}</p>
                    </div>
                    <div className="space-y-4">
                      {[
                        { label: '概要', content: tool.explanation.summary, icon: '\uD83D\uDCCB' },
                        { label: '仕組み', content: tool.explanation.mechanism, icon: '\u2699\uFE0F' },
                        { label: '活用ヒント', content: tool.explanation.usage_hint, icon: '\uD83D\uDCA1' },
                      ].map(s => (
                        <Card key={s.label} className="p-4">
                          <div className="flex items-center gap-2 mb-2"><span>{s.icon}</span><span className="font-medium text-ink-800 text-sm">{s.label}</span></div>
                          <p className="text-ink-600 text-sm leading-relaxed">{s.content}</p>
                        </Card>
                      ))}
                    </div>
                    {tool.academic_advice?.length > 0 && (
                      <div className="bg-forge-50 rounded-xl p-4 border border-forge-200">
                        <h4 className="font-medium text-forge-800 text-sm mb-3">学術的アドバイス</h4>
                        <div className="space-y-2">
                          {tool.academic_advice.map((a, i) => <p key={i} className="text-sm text-forge-700 leading-relaxed">{a}</p>)}
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="customize" className="flex-1 overflow-auto">
                  <div className="p-6 space-y-4">
                    <h3 className="font-medium text-ink-800">カスタマイズ</h3>
                    {tool.customizable_params?.length > 0 ? (
                      tool.customizable_params.map(param => (
                        <Card key={param.id} className="p-4">
                          <label className="block text-sm font-medium text-ink-700 mb-2">{param.label}</label>
                          {param.type === 'slider' && (
                            <Slider
                              min={Number(param.min) || 0}
                              max={Number(param.max) || 100}
                              step={1}
                              value={[Number(customParams[param.id] ?? param.default)]}
                              onValueChange={([v]) => handleParamChange(param.id, String(v))}
                            />
                          )}
                          {param.type === 'color' && <input type="color" value={customParams[param.id] ?? param.default} onChange={e => handleParamChange(param.id, e.target.value)} className="w-full h-10 rounded-lg cursor-pointer" />}
                          {param.type === 'toggle' && (
                            <Switch
                              checked={customParams[param.id] === 'true'}
                              onCheckedChange={checked => handleParamChange(param.id, String(checked))}
                            />
                          )}
                          {param.type === 'select' && (
                            <Select value={customParams[param.id] ?? param.default} onValueChange={v => handleParamChange(param.id, v)}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {param.options?.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          )}
                          {param.type === 'text' && (
                            <Input
                              value={customParams[param.id] ?? param.default}
                              onChange={e => handleParamChange(param.id, e.target.value)}
                            />
                          )}
                        </Card>
                      ))
                    ) : <p className="text-sm text-ink-400">このツールにはカスタマイズ可能なパラメータがありません。</p>}
                  </div>
                </TabsContent>

                <TabsContent value="code" className="flex-1 overflow-auto">
                  <div className="p-4">
                    <pre className="code-block bg-ink-950 text-green-300 p-4 rounded-xl overflow-x-auto">{tool.html}</pre>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center max-w-sm">
                <div className="text-5xl mb-6">{'\uD83C\uDF31'}</div>
                <h3 className="font-display text-lg font-bold text-ink-800 mb-2">ツールがここに表示されます</h3>
                <p className="text-sm text-ink-400 leading-relaxed mb-4">左のチャットでツールについてお話しください。AIがあなたの研究に最適なツールを作成します。</p>
                <p className="text-xs text-ink-300 bg-sand-100 rounded-xl px-4 py-3 leading-relaxed">完成したツールは「ツールを使う」ボタンで新しいタブに開けます。ファイル読み込みなど全機能が使えます。</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
