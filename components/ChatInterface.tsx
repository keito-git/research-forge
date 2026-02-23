'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Sparkles, Download, ExternalLink, Info, Sliders, Code, Eye, Settings, BookOpen, Save, Bookmark, Users } from 'lucide-react';
import { type UserProfile, FIELDS } from '@/lib/prompts';
import SettingsModal from './SettingsModal';

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

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const CHAT_KEY = 'research-forge-chat';
const TOOLS_KEY = 'research-forge-saved-tools';
const COMMUNITY_KEY = 'research-forge-community';

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
      // Extract html value directly using the pattern "html": "..."
      const htmlStartMarker = '"html"';
      const htmlIdx = text.indexOf(htmlStartMarker);
      if (htmlIdx === -1) return null;
      
      // Find the opening quote of the html value
      let i = htmlIdx + htmlStartMarker.length;
      while (i < text.length && text[i] !== '"') i++;
      if (i >= text.length) return null;
      
      // Now extract the string value, handling escaped quotes
      i++; // skip opening quote
      let htmlContent = '';
      while (i < text.length) {
        if (text[i] === '\\' && i + 1 < text.length) {
          // Handle escape sequences
          const next = text[i + 1];
          if (next === '"') { htmlContent += '"'; i += 2; }
          else if (next === 'n') { htmlContent += '\n'; i += 2; }
          else if (next === 't') { htmlContent += '\t'; i += 2; }
          else if (next === '\\') { htmlContent += '\\'; i += 2; }
          else if (next === '/') { htmlContent += '/'; i += 2; }
          else { htmlContent += text[i]; i++; }
        } else if (text[i] === '"') {
          break; // end of string
        } else {
          htmlContent += text[i];
          i++;
        }
      }
      
      if (htmlContent.includes('<!DOCTYPE') || htmlContent.includes('<html') || htmlContent.includes('<head')) {
        // We found valid HTML, now try to extract other fields
        const titleMatch = text.match(/"title"\s*:\s*"([^"]*?)"/);
        const descMatch = text.match(/"description"\s*:\s*"([^"]*?)"/);
        const summaryMatch = text.match(/"summary"\s*:\s*"([^"]*?)"/);
        const mechanismMatch = text.match(/"mechanism"\s*:\s*"([^"]*?)"/);
        const usageHintMatch = text.match(/"usage_hint"\s*:\s*"([^"]*?)"/);
        
        // Extract academic_advice array
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
  // Insert before </head> or at the start of the document
  if (html.includes('</head>')) {
    return html.replace('</head>', injectorScript + '</head>');
  }
  return injectorScript + html;
}

// Sample community tools for demo
function getDefaultCommunityTools(): SavedTool[] {
  return [
    {
      id: 'community-1',
      title: 'ワードクラウド生成ツール',
      description: 'テキストを貼り付けると、頻出語をワードクラウドで可視化します',
      html: `<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ワードクラウド生成ツール</title><style>@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700&display=swap');*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Noto Sans JP',sans-serif;background:#faf8f5;color:#2d3240;padding:24px;max-width:900px;margin:0 auto}h1{font-size:1.5rem;margin-bottom:8px;color:#1a1d27}p.sub{color:#7a849a;margin-bottom:20px;font-size:0.9rem}textarea{width:100%;height:120px;padding:12px;border:2px solid #e6ddd0;border-radius:12px;font-family:inherit;font-size:14px;resize:vertical;margin-bottom:12px}textarea:focus{outline:none;border-color:#358964}button{background:#358964;color:#fff;border:none;padding:10px 24px;border-radius:10px;font-size:14px;cursor:pointer;font-family:inherit}button:hover{background:#266e50}#cloud{margin-top:20px;min-height:300px;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:8px;padding:20px;background:#fff;border-radius:12px;border:1px solid #e6ddd0}.word{display:inline-block;padding:4px 8px;border-radius:6px;cursor:default;transition:transform 0.2s}.word:hover{transform:scale(1.1)}</style></head><body><h1>📊 ワードクラウド生成ツール</h1><p class="sub">テキストを入力して「分析する」を押すと、頻出語を可視化します</p><textarea id="input" placeholder="ここにテキストを貼り付けてください...">吾輩は猫である。名前はまだ無い。どこで生れたかとんと見当がつかぬ。何でも薄暗いじめじめした所でニャーニャー泣いていた事だけは記憶している。吾輩はここで始めて人間というものを見た。</textarea><button onclick="analyze()">分析する</button><div id="cloud"></div><script>function analyze(){const t=document.getElementById('input').value;if(!t.trim())return;const words=t.replace(/[。、！？「」『』（）\\n\\r]/g,' ').split(/\\s+/).filter(w=>w.length>=2);const freq={};words.forEach(w=>{freq[w]=(freq[w]||0)+1});const sorted=Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,40);const max=sorted[0]?sorted[0][1]:1;const colors=['#358964','#4A90A4','#E8734A','#8B6D59','#5f687f','#a6856a','#55a67f','#725a4c'];const cloud=document.getElementById('cloud');cloud.innerHTML='';sorted.forEach(([word,count],i)=>{const size=14+((count/max)*36);const el=document.createElement('span');el.className='word';el.textContent=word;el.style.fontSize=size+'px';el.style.fontWeight=count>max*0.5?'700':'400';el.style.color=colors[i%colors.length];el.style.opacity=0.6+(count/max)*0.4;el.title=word+': '+count+'回';cloud.appendChild(el)})}</script></body></html>`,
      explanation: { summary: 'テキストから頻出語を抽出し、出現頻度に応じた大きさで表示します', mechanism: 'テキストを単語に分割し、各単語の出現回数を数え、頻度が高いほど大きく表示します', usage_hint: '論文のテキストデータの傾向把握や、インタビューデータの概要分析に活用できます' },
      field: '文学',
      createdAt: '2026-02-20',
      author: '文学研究者A',
    },
    {
      id: 'community-2',
      title: '年表タイムライン作成ツール',
      description: 'イベントを入力すると、インタラクティブな年表を生成します',
      html: `<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>年表タイムライン</title><style>@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;600&display=swap');*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Noto Sans JP',sans-serif;background:#faf8f5;color:#2d3240;padding:24px;max-width:800px;margin:0 auto}h1{font-size:1.5rem;margin-bottom:8px}p.sub{color:#7a849a;margin-bottom:20px;font-size:0.9rem}.form{display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap}.form input{padding:8px 12px;border:2px solid #e6ddd0;border-radius:8px;font-family:inherit;font-size:14px}.form input:focus{outline:none;border-color:#358964}.form input.year{width:100px}.form input.event{flex:1;min-width:200px}.form button{background:#358964;color:#fff;border:none;padding:8px 16px;border-radius:8px;cursor:pointer;font-family:inherit}.timeline{position:relative;padding-left:30px}.timeline::before{content:'';position:absolute;left:14px;top:0;bottom:0;width:2px;background:#d5c7b0}.item{position:relative;margin-bottom:24px;animation:fadeIn 0.3s ease}.item::before{content:'';position:absolute;left:-22px;top:6px;width:12px;height:12px;border-radius:50%;background:#358964;border:2px solid #fff;box-shadow:0 0 0 2px #358964}.year-label{font-size:0.85rem;font-weight:600;color:#358964;margin-bottom:2px}.event-text{font-size:1rem;color:#2d3240;background:#fff;padding:10px 14px;border-radius:10px;border:1px solid #e6ddd0}@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}</style></head><body><h1>🏛️ 年表タイムライン作成ツール</h1><p class="sub">年と出来事を入力して年表を作成しましょう</p><div class="form"><input class="year" id="yearInput" placeholder="年（例:1868）" type="number"><input class="event" id="eventInput" placeholder="出来事を入力"><button onclick="addEvent()">追加</button></div><div class="timeline" id="timeline"></div><script>let events=[{year:1853,text:'ペリー来航'},{year:1868,text:'明治維新'},{year:1889,text:'大日本帝国憲法発布'},{year:1912,text:'大正時代の始まり'}];function render(){const tl=document.getElementById('timeline');events.sort((a,b)=>a.year-b.year);tl.innerHTML=events.map(e=>'<div class="item"><div class="year-label">'+e.year+'年</div><div class="event-text">'+e.text+'</div></div>').join('')}function addEvent(){const y=parseInt(document.getElementById('yearInput').value);const t=document.getElementById('eventInput').value.trim();if(!y||!t)return;events.push({year:y,text:t});document.getElementById('yearInput').value='';document.getElementById('eventInput').value='';render()}render()</script></body></html>`,
      explanation: { summary: '歴史的な出来事を時系列で可視化するインタラクティブな年表です', mechanism: '入力された年と出来事を時系列順に並べ替えて表示します', usage_hint: '研究対象の時代背景の整理や、論文の時系列的な議論の構成に役立ちます' },
      field: '歴史学',
      createdAt: '2026-02-19',
      author: '歴史学研究者B',
    },
    {
      id: 'community-3',
      title: 'リカート尺度分析ツール',
      description: 'アンケートのリカート尺度データを集計・可視化します',
      html: `<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>リカート尺度分析</title><style>@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;600&display=swap');*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Noto Sans JP',sans-serif;background:#faf8f5;color:#2d3240;padding:24px;max-width:800px;margin:0 auto}h1{font-size:1.5rem;margin-bottom:8px}p.sub{color:#7a849a;margin-bottom:20px;font-size:0.9rem}table{width:100%;border-collapse:collapse;margin-bottom:20px;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e6ddd0}th,td{padding:10px 14px;text-align:center;border-bottom:1px solid #e6ddd0;font-size:14px}th{background:#358964;color:#fff;font-weight:600}.bar-container{height:24px;background:#e6ddd0;border-radius:6px;overflow:hidden;display:flex}.bar-seg{height:100%;transition:width 0.5s ease}.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-top:20px}.stat-card{background:#fff;padding:14px;border-radius:10px;border:1px solid #e6ddd0;text-align:center}.stat-val{font-size:1.5rem;font-weight:600;color:#358964}.stat-label{font-size:0.8rem;color:#7a849a;margin-top:4px}</style></head><body><h1>📊 リカート尺度分析ツール</h1><p class="sub">5段階評価のアンケート結果をサンプルデータで表示しています</p><table><thead><tr><th>質問項目</th><th>1(そう思わない)</th><th>2</th><th>3</th><th>4</th><th>5(そう思う)</th><th>平均</th></tr></thead><tbody id="tbody"></tbody></table><h2 style="font-size:1.1rem;margin-bottom:12px">分布グラフ</h2><div id="bars"></div><div class="stats" id="stats"></div><script>const data=[{q:'授業内容は理解しやすかった',d:[2,5,12,25,16]},{q:'教材は適切だった',d:[1,3,8,28,20]},{q:'課題の量は適切だった',d:[5,10,15,18,12]},{q:'総合的に満足している',d:[1,4,10,22,23]}];const colors=['#d9534f','#f0ad4e','#cccccc','#5cb85c','#358964'];function render(){const tb=document.getElementById('tbody');const bars=document.getElementById('bars');const stats=document.getElementById('stats');tb.innerHTML='';bars.innerHTML='';let allAvgs=[];data.forEach(item=>{const total=item.d.reduce((a,b)=>a+b,0);const avg=(item.d.reduce((s,v,i)=>s+v*(i+1),0)/total).toFixed(2);allAvgs.push(parseFloat(avg));let row='<tr><td style="text-align:left;font-weight:500">'+item.q+'</td>';item.d.forEach(v=>{row+='<td>'+v+'</td>'});row+='<td style="font-weight:600;color:#358964">'+avg+'</td></tr>';tb.innerHTML+=row;let barHtml='<p style="font-size:13px;margin-bottom:4px;color:#5f687f">'+item.q+'</p><div class="bar-container">';item.d.forEach((v,i)=>{const pct=(v/total*100).toFixed(1);barHtml+='<div class="bar-seg" style="width:'+pct+'%;background:'+colors[i]+'" title="'+(i+1)+': '+v+'人 ('+pct+'%)"></div>'});barHtml+='</div><p style="font-size:11px;color:#9da5b5;margin-bottom:16px">n='+total+'</p>';bars.innerHTML+=barHtml});const grandAvg=(allAvgs.reduce((a,b)=>a+b,0)/allAvgs.length).toFixed(2);const totalN=data[0].d.reduce((a,b)=>a+b,0);stats.innerHTML='<div class="stat-card"><div class="stat-val">'+grandAvg+'</div><div class="stat-label">全体平均</div></div><div class="stat-card"><div class="stat-val">'+totalN+'</div><div class="stat-label">回答者数</div></div><div class="stat-card"><div class="stat-val">'+data.length+'</div><div class="stat-label">質問項目数</div></div>'}render()</script></body></html>`,
      explanation: { summary: '5段階リカート尺度のアンケート結果を集計表と分布グラフで表示します', mechanism: '各選択肢の回答数から平均値を算出し、積み上げ棒グラフで分布を可視化します', usage_hint: '授業評価や意識調査の結果報告に使えます。論文のFigureとしても活用可能です' },
      field: '教育学',
      createdAt: '2026-02-18',
      author: '教育学研究者C',
    },
  ];
}

export default function ChatInterface({ profile, apiKey, model, onApiKeyChange, onModelChange, onResetProfile }: ChatInterfaceProps) {
  const [tool, setTool] = useState<GeneratedTool | null>(null);
  const [previewTab, setPreviewTab] = useState<'preview' | 'about' | 'customize' | 'code'>('preview');
  const [customParams, setCustomParams] = useState<Record<string, string>>({});
  const [showSettings, setShowSettings] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [savedTools, setSavedTools] = useState<SavedTool[]>([]);
  const [communityTools, setCommunityTools] = useState<SavedTool[]>([]);
  const [sidePanel, setSidePanel] = useState<'chat' | 'saved' | 'community'>('chat');
  const [toolSaved, setToolSaved] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fieldInfo = FIELDS.find(f => f.id === profile.field);

  // Load persisted data
  useEffect(() => {
    try {
      const savedChat = localStorage.getItem(CHAT_KEY);
      if (savedChat) setMessages(JSON.parse(savedChat));
      const savedToolsData = localStorage.getItem(TOOLS_KEY);
      if (savedToolsData) setSavedTools(JSON.parse(savedToolsData));
      const communityData = localStorage.getItem(COMMUNITY_KEY);
      setCommunityTools(communityData ? JSON.parse(communityData) : getDefaultCommunityTools());
    } catch {
      setCommunityTools(getDefaultCommunityTools());
    }
  }, []);

  // Save chat on change
  useEffect(() => {
    if (messages.length > 0) {
      try { localStorage.setItem(CHAT_KEY, JSON.stringify(messages)); } catch {}
    }
  }, [messages]);

  // Save tools on change
  useEffect(() => {
    try { localStorage.setItem(TOOLS_KEY, JSON.stringify(savedTools)); } catch {}
  }, [savedTools]);

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
    // Inject after iframe loads
    const iframe = iframeRef.current;
    iframe.addEventListener('load', injectKey);
    // Also inject immediately in case iframe already loaded
    injectKey();
    return () => iframe.removeEventListener('load', injectKey);
  }, [tool, apiKey]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 150) + 'px';
    }
  }, [input]);

  // Send message — button only, no Enter key
  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = { role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          profile,
          apiKey,
          model,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || 'エラーが発生しました');
      }

      const textContent = data.content || '';

      const assistantMsg: ChatMessage = { role: 'assistant', content: textContent };
      const updatedMessages = [...newMessages, assistantMsg];
      setMessages(updatedMessages);

      // Check for tool generation
      const parsed = tryParseToolGeneration(textContent);
      if (parsed) {
        setTool(parsed);
        setPreviewTab('preview');
        setToolSaved(false);
        const defaultParams: Record<string, string> = {};
        parsed.customizable_params?.forEach(p => { defaultParams[p.id] = p.default; });
        setCustomParams(defaultParams);
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        role: 'assistant',
        content: `⚠️ ${err.message || 'エラーが発生しました。もう一度お試しください。'}`,
      };
      setMessages([...newMessages, errorMsg]);
    }

    setIsLoading(false);
  }, [input, messages, isLoading, profile, apiKey]);

  const handleSaveTool = () => {
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
  };

  const handlePublishTool = () => {
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
      try { localStorage.setItem(COMMUNITY_KEY, JSON.stringify(updated)); } catch {}
      return updated;
    });
    setToolSaved(true);
  };

  const handleLoadTool = (saved: SavedTool) => {
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
  };

  const handleClearChat = () => {
    setMessages([]);
    try { localStorage.removeItem(CHAT_KEY); } catch {}
  };

  // Inject API key into tool HTML so it works standalone
  const getToolHtmlWithApiKey = () => {
    if (!tool) return '';
    const keyScript = `<script>window.__RESEARCH_FORGE_API_KEY__ = ${JSON.stringify(apiKey || '')};</script>`;
    const html = tool.html;
    if (html.includes('</head>')) {
      return html.replace('</head>', keyScript + '</head>');
    }
    return keyScript + html;
  };

  const handleDownload = () => {
    if (!tool) return;
    const blob = new Blob([getToolHtmlWithApiKey()], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tool.title || 'tool'}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleOpenInNewTab = () => {
    if (!tool) return;
    const blob = new Blob([getToolHtmlWithApiKey()], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  const handleParamChange = (id: string, value: string) => {
    setCustomParams(prev => ({ ...prev, [id]: value }));
  };

  const renderMessageContent = (content: string) => {
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
          <button
            onClick={handleOpenInNewTab}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-forge-600 text-white rounded-xl hover:bg-forge-700 transition-all shadow-sm font-medium text-sm"
          >
            <ExternalLink className="w-4 h-4" />
            このツールを使う（新しいタブで開く）
          </button>
          <p className="text-[11px] text-ink-400 text-center">新しいタブでは、ファイルの読み込みや全機能が使えます</p>
        </div>
      );
    }
    return <div className="whitespace-pre-wrap leading-relaxed text-[15px]">{content}</div>;
  };

  return (
    <div className="h-screen flex flex-col bg-sand-50">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-sand-200 bg-sand-50/90 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-forge-600 flex items-center justify-center shadow-sm">
            <span className="text-white text-base">🌿</span>
          </div>
          <div>
            <h1 className="font-display text-lg font-bold text-ink-900 leading-tight">Research Forge</h1>
            <p className="text-xs text-ink-400">{fieldInfo?.icon} {fieldInfo?.label ?? profile.fieldCustom} モード</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={handleClearChat} className="text-xs text-ink-400 hover:text-ink-600 px-2 py-1.5 rounded-lg hover:bg-sand-200 transition-colors">
            チャットをクリア
          </button>
          <button onClick={() => setShowSettings(true)} className="flex items-center gap-1.5 text-xs text-ink-400 hover:text-ink-600 px-2 py-1.5 rounded-lg hover:bg-sand-200 transition-colors">
            <Settings className="w-3.5 h-3.5" />設定
          </button>
        </div>
      </header>

      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} apiKey={apiKey} model={model} onApiKeyChange={onApiKeyChange} onModelChange={onModelChange} onResetProfile={onResetProfile} />

      {/* Main */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel */}
        <div className="w-full md:w-[42%] flex flex-col border-r border-sand-200 bg-white">
          {/* Left Panel Tabs */}
          <div className="flex border-b border-sand-200 px-2 py-1">
            {([
              { id: 'chat' as const, icon: Sparkles, label: 'チャット' },
              { id: 'saved' as const, icon: Bookmark, label: `保存済み(${savedTools.length})` },
              { id: 'community' as const, icon: Users, label: 'コミュニティ' },
            ]).map(tab => (
              <button key={tab.id} onClick={() => setSidePanel(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs transition-all ${sidePanel === tab.id ? 'bg-forge-100 text-forge-700 font-medium' : 'text-ink-400 hover:text-ink-600 hover:bg-sand-50'}`}>
                <tab.icon className="w-3.5 h-3.5" />{tab.label}
              </button>
            ))}
          </div>

          {/* Chat Panel */}
          {sidePanel === 'chat' && (
            <>
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
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
                            <button key={s} onClick={() => setInput(s)} className="px-3 py-1.5 rounded-full bg-white border border-sand-300 text-sm text-ink-600 hover:border-forge-400 hover:bg-forge-50 transition-all">{s}</button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {messages.map((m, i) => (
                  <div key={i} className="message-enter">
                    <div className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                      {m.role === 'assistant' && (
                        <div className="w-8 h-8 rounded-full bg-forge-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Sparkles className="w-4 h-4 text-forge-600" />
                        </div>
                      )}
                      <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${m.role === 'user' ? 'bg-forge-600 text-white rounded-tr-md' : 'bg-sand-50 text-ink-700 rounded-tl-md'}`}>
                        {m.role === 'user' ? <p className="text-[15px]">{m.content}</p> : renderMessageContent(m.content)}
                      </div>
                    </div>
                  </div>
                ))}
                {isLoading && (
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
                <div ref={messagesEndRef} />
              </div>

              {/* Input — Enter = newline, Button = send */}
              <div className="px-4 py-3 border-t border-sand-200 bg-white">
                <div className="flex items-end gap-2">
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => {
                      // Enterキーでは絶対に送信しない。改行のみ。
                      // 何もブロックしない = デフォルトの改行動作
                    }}
                    placeholder="どのようなツールを作りましょうか？"
                    rows={2}
                    className="flex-1 px-4 py-3 rounded-xl border-2 border-sand-200 bg-sand-50 focus:border-forge-500 focus:bg-white focus:outline-none transition-all resize-none text-[15px]"
                    style={{ minHeight: '60px', maxHeight: '150px' }}
                  />
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading}
                    className="w-11 h-11 rounded-xl bg-forge-600 text-white flex items-center justify-center hover:bg-forge-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm flex-shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-[11px] text-ink-300 mt-1.5 text-right">送信ボタンで送信 ・ Enterで改行</p>
              </div>
            </>
          )}

          {/* Saved Tools Panel */}
          {sidePanel === 'saved' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {savedTools.length === 0 ? (
                <div className="text-center py-12">
                  <Bookmark className="w-10 h-10 text-sand-300 mx-auto mb-3" />
                  <p className="text-sm text-ink-400">保存されたツールはまだありません</p>
                  <p className="text-xs text-ink-300 mt-1">ツール作成後「保存」ボタンで保存できます</p>
                </div>
              ) : (
                savedTools.map(t => (
                  <button key={t.id} onClick={() => handleLoadTool(t)} className="w-full text-left p-4 bg-white rounded-xl border border-sand-200 hover:border-forge-300 hover:shadow-sm transition-all">
                    <h4 className="font-medium text-ink-800 text-sm">{t.title}</h4>
                    <p className="text-xs text-ink-400 mt-1 line-clamp-2">{t.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-forge-100 text-forge-700">{t.field}</span>
                      <span className="text-[10px] text-ink-300">{t.createdAt}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {/* Community Gallery Panel */}
          {sidePanel === 'community' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <p className="text-xs text-ink-400 mb-2">他の研究者が作成したツールを試してみましょう</p>
              {communityTools.map(t => (
                <button key={t.id} onClick={() => handleLoadTool(t)} className="w-full text-left p-4 bg-white rounded-xl border border-sand-200 hover:border-forge-300 hover:shadow-sm transition-all">
                  <h4 className="font-medium text-ink-800 text-sm">{t.title}</h4>
                  <p className="text-xs text-ink-400 mt-1 line-clamp-2">{t.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-sand-200 text-ink-600">{t.field}</span>
                    {t.author && <span className="text-[10px] text-ink-300">by {t.author}</span>}
                    <span className="text-[10px] text-ink-300">{t.createdAt}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Preview Panel */}
        <div className="hidden md:flex flex-1 flex-col bg-sand-50">
          {tool ? (
            <>
              {/* Big CTA banner */}
              <div className="px-4 py-3 bg-forge-600 text-white flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-sm">{tool.title}</h3>
                  <p className="text-xs text-forge-200">右はプレビューです。実際に使うには新しいタブで開いてください</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={handleOpenInNewTab}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white text-forge-700 rounded-xl hover:bg-forge-50 transition-all font-medium text-sm shadow-sm">
                    <ExternalLink className="w-4 h-4" />
                    ツールを使う
                  </button>
                  <button onClick={handleDownload}
                    className="flex items-center gap-1 px-3 py-2.5 bg-forge-500 text-white rounded-xl hover:bg-forge-400 transition-all text-sm">
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              {/* Tabs */}
              <div className="flex items-center justify-between px-4 py-2 border-b border-sand-200 bg-white">
                <div className="flex gap-1">
                  {([
                    { id: 'preview' as const, icon: Eye, label: 'プレビュー' },
                    { id: 'about' as const, icon: Info, label: 'このツールについて' },
                    { id: 'customize' as const, icon: Sliders, label: 'カスタマイズ' },
                    { id: 'code' as const, icon: Code, label: 'コード' },
                  ]).map(tab => (
                    <button key={tab.id} onClick={() => setPreviewTab(tab.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all ${previewTab === tab.id ? 'bg-forge-100 text-forge-700 font-medium' : 'text-ink-400 hover:text-ink-600 hover:bg-sand-100'}`}>
                      <tab.icon className="w-3.5 h-3.5" />{tab.label}
                    </button>
                  ))}
                </div>
                <div className="flex gap-1">
                  <button onClick={handleSaveTool} disabled={toolSaved}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${toolSaved ? 'text-forge-600 bg-forge-50' : 'text-ink-500 hover:bg-sand-100'}`}
                    title="ツールを保存">
                    <Save className="w-3.5 h-3.5" />{toolSaved ? '保存済み' : '保存'}
                  </button>
                  <button onClick={handlePublishTool}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-ink-500 hover:bg-sand-100 transition-colors" title="コミュニティに公開">
                    <Users className="w-3.5 h-3.5" />公開
                  </button>
                  <button onClick={handleOpenInNewTab}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-forge-600 text-white hover:bg-forge-700 transition-colors shadow-sm"
                    title="新しいタブで開く（ファイルの読み込みなど全機能が使えます）">
                    <ExternalLink className="w-3.5 h-3.5" />新しいタブで使う
                  </button>
                  <button onClick={handleDownload}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-forge-300 text-forge-700 hover:bg-forge-50 transition-colors"
                    title="HTMLファイルとしてダウンロード">
                    <Download className="w-3.5 h-3.5" />保存
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-hidden flex flex-col">
                {previewTab === 'preview' && (
                  <>
                    <div className="px-4 py-2 bg-forge-50 border-b border-forge-100 flex items-center justify-between">
                      <p className="text-xs text-forge-700">
                        💡 ファイル読み込み等を使うには「<strong>新しいタブで使う</strong>」ボタンで開いてください
                      </p>
                    </div>
                    <iframe ref={iframeRef} srcDoc={wrapHtmlWithApiKeyInjector(tool.html)} className="preview-frame flex-1" sandbox="allow-scripts allow-forms allow-modals allow-same-origin" title={tool.title} />
                  </>
                )}
                {previewTab === 'about' && (
                  <div className="p-6 overflow-y-auto h-full space-y-6">
                    <div>
                      <h3 className="font-display text-xl font-bold text-ink-900 mb-1">{tool.title}</h3>
                      <p className="text-ink-500 text-sm">{tool.description}</p>
                    </div>
                    <div className="space-y-4">
                      {[
                        { label: '概要', content: tool.explanation.summary, icon: '📋' },
                        { label: '仕組み', content: tool.explanation.mechanism, icon: '⚙️' },
                        { label: '活用ヒント', content: tool.explanation.usage_hint, icon: '💡' },
                      ].map(s => (
                        <div key={s.label} className="bg-white rounded-xl p-4 border border-sand-200">
                          <div className="flex items-center gap-2 mb-2"><span>{s.icon}</span><span className="font-medium text-ink-800 text-sm">{s.label}</span></div>
                          <p className="text-ink-600 text-sm leading-relaxed">{s.content}</p>
                        </div>
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
                )}
                {previewTab === 'customize' && (
                  <div className="p-6 overflow-y-auto h-full space-y-4">
                    <h3 className="font-medium text-ink-800">カスタマイズ</h3>
                    {tool.customizable_params?.length > 0 ? (
                      tool.customizable_params.map(param => (
                        <div key={param.id} className="bg-white rounded-xl p-4 border border-sand-200">
                          <label className="block text-sm font-medium text-ink-700 mb-2">{param.label}</label>
                          {param.type === 'slider' && <input type="range" min={param.min} max={param.max} value={customParams[param.id] ?? param.default} onChange={e => handleParamChange(param.id, e.target.value)} className="w-full accent-forge-600" />}
                          {param.type === 'color' && <input type="color" value={customParams[param.id] ?? param.default} onChange={e => handleParamChange(param.id, e.target.value)} className="w-full h-10 rounded-lg cursor-pointer" />}
                          {param.type === 'toggle' && <button onClick={() => handleParamChange(param.id, customParams[param.id] === 'true' ? 'false' : 'true')} className={`w-12 h-6 rounded-full transition-all ${customParams[param.id] === 'true' ? 'bg-forge-500' : 'bg-sand-300'}`}><div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${customParams[param.id] === 'true' ? 'translate-x-6' : 'translate-x-0.5'}`} /></button>}
                          {param.type === 'select' && <select value={customParams[param.id] ?? param.default} onChange={e => handleParamChange(param.id, e.target.value)} className="w-full px-3 py-2 rounded-lg border border-sand-200 bg-sand-50 text-sm">{param.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select>}
                          {param.type === 'text' && <input type="text" value={customParams[param.id] ?? param.default} onChange={e => handleParamChange(param.id, e.target.value)} className="w-full px-3 py-2 rounded-lg border border-sand-200 bg-sand-50 text-sm" />}
                        </div>
                      ))
                    ) : <p className="text-sm text-ink-400">このツールにはカスタマイズ可能なパラメータがありません。</p>}
                  </div>
                )}
                {previewTab === 'code' && (
                  <div className="p-4 overflow-auto h-full">
                    <pre className="code-block bg-ink-950 text-green-300 p-4 rounded-xl overflow-x-auto">{tool.html}</pre>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center max-w-sm">
                <div className="text-5xl mb-6">🌱</div>
                <h3 className="font-display text-lg font-bold text-ink-800 mb-2">ツールがここに表示されます</h3>
                <p className="text-sm text-ink-400 leading-relaxed mb-4">左のチャットでツールについてお話しください。AIがあなたの研究に最適なツールを作成します。</p>
                <p className="text-xs text-ink-300 bg-sand-100 rounded-xl px-4 py-3 leading-relaxed">💡 完成したツールは「ツールを使う」ボタンで新しいタブに開けます。ファイル読み込みなど全機能が使えます。</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
