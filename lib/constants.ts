import type { SavedTool } from '@/types';

export const STAGE_LABELS: Record<string, string> = {
  starting: 'ツール情報を準備中...',
  html: 'HTMLコードを生成中...',
  explanation: '説明を作成中...',
  finishing: '仕上げ中...',
};

// Sample gallery tools for demo (module-level constant to avoid re-creation)
export const DEFAULT_COMMUNITY_TOOLS: SavedTool[] = [
  {
    id: 'community-1',
    title: 'ワードクラウド生成ツール',
    description: 'テキストを貼り付けると、頻出語をワードクラウドで可視化します',
    html: `<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ワードクラウド生成ツール</title><style>@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700&display=swap');*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Noto Sans JP',sans-serif;background:#faf8f5;color:#2d3240;padding:24px;max-width:900px;margin:0 auto}h1{font-size:1.5rem;margin-bottom:8px;color:#1a1d27}p.sub{color:#7a849a;margin-bottom:20px;font-size:0.9rem}textarea{width:100%;height:120px;padding:12px;border:2px solid #e6ddd0;border-radius:12px;font-family:inherit;font-size:14px;resize:vertical;margin-bottom:12px}textarea:focus{outline:none;border-color:#358964}button{background:#358964;color:#fff;border:none;padding:10px 24px;border-radius:10px;font-size:14px;cursor:pointer;font-family:inherit}button:hover{background:#266e50}#cloud{margin-top:20px;min-height:300px;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:8px;padding:20px;background:#fff;border-radius:12px;border:1px solid #e6ddd0}.word{display:inline-block;padding:4px 8px;border-radius:6px;cursor:default;transition:transform 0.2s}.word:hover{transform:scale(1.1)}</style></head><body><h1>ワードクラウド生成ツール</h1><p class="sub">テキストを入力して「分析する」を押すと、頻出語を可視化します</p><textarea id="input" placeholder="ここにテキストを貼り付けてください...">吾輩は猫である。名前はまだ無い。どこで生れたかとんと見当がつかぬ。何でも薄暗いじめじめした所でニャーニャー泣いていた事だけは記憶している。吾輩はここで始めて人間というものを見た。</textarea><button onclick="analyze()">分析する</button><div id="cloud"></div><script>function analyze(){const t=document.getElementById('input').value;if(!t.trim())return;const words=t.replace(/[。、！？「」『』（）\\n\\r]/g,' ').split(/\\s+/).filter(w=>w.length>=2);const freq={};words.forEach(w=>{freq[w]=(freq[w]||0)+1});const sorted=Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,40);const max=sorted[0]?sorted[0][1]:1;const colors=['#358964','#4A90A4','#E8734A','#8B6D59','#5f687f','#a6856a','#55a67f','#725a4c'];const cloud=document.getElementById('cloud');cloud.innerHTML='';sorted.forEach(([word,count],i)=>{const size=14+((count/max)*36);const el=document.createElement('span');el.className='word';el.textContent=word;el.style.fontSize=size+'px';el.style.fontWeight=count>max*0.5?'700':'400';el.style.color=colors[i%colors.length];el.style.opacity=0.6+(count/max)*0.4;el.title=word+': '+count+'回';cloud.appendChild(el)})}</script></body></html>`,
    explanation: {
      summary: 'テキストから頻出語を抽出し、出現頻度に応じた大きさで表示します',
      mechanism: 'テキストを単語に分割し、各単語の出現回数を数え、頻度が高いほど大きく表示します',
      usage_hint: '論文のテキストデータの傾向把握や、インタビューデータの概要分析に活用できます',
    },
    field: '文学',
    createdAt: '2026-02-20',
    author: '文学研究者A',
  },
  {
    id: 'community-2',
    title: '年表タイムライン作成ツール',
    description: 'イベントを入力すると、インタラクティブな年表を生成します',
    html: `<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>年表タイムライン</title><style>@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;600&display=swap');*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Noto Sans JP',sans-serif;background:#faf8f5;color:#2d3240;padding:24px;max-width:800px;margin:0 auto}h1{font-size:1.5rem;margin-bottom:8px}p.sub{color:#7a849a;margin-bottom:20px;font-size:0.9rem}.form{display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap}.form input{padding:8px 12px;border:2px solid #e6ddd0;border-radius:8px;font-family:inherit;font-size:14px}.form input:focus{outline:none;border-color:#358964}.form input.year{width:100px}.form input.event{flex:1;min-width:200px}.form button{background:#358964;color:#fff;border:none;padding:8px 16px;border-radius:8px;cursor:pointer;font-family:inherit}.timeline{position:relative;padding-left:30px}.timeline::before{content:'';position:absolute;left:14px;top:0;bottom:0;width:2px;background:#d5c7b0}.item{position:relative;margin-bottom:24px;animation:fadeIn 0.3s ease}.item::before{content:'';position:absolute;left:-22px;top:6px;width:12px;height:12px;border-radius:50%;background:#358964;border:2px solid #fff;box-shadow:0 0 0 2px #358964}.year-label{font-size:0.85rem;font-weight:600;color:#358964;margin-bottom:2px}.event-text{font-size:1rem;color:#2d3240;background:#fff;padding:10px 14px;border-radius:10px;border:1px solid #e6ddd0}@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}</style></head><body><h1>年表タイムライン作成ツール</h1><p class="sub">年と出来事を入力して年表を作成しましょう</p><div class="form"><input class="year" id="yearInput" placeholder="年（例:1868）" type="number"><input class="event" id="eventInput" placeholder="出来事を入力"><button onclick="addEvent()">追加</button></div><div class="timeline" id="timeline"></div><script>let events=[{year:1853,text:'ペリー来航'},{year:1868,text:'明治維新'},{year:1889,text:'大日本帝国憲法発布'},{year:1912,text:'大正時代の始まり'}];function render(){const tl=document.getElementById('timeline');events.sort((a,b)=>a.year-b.year);tl.innerHTML=events.map(e=>'<div class="item"><div class="year-label">'+e.year+'年</div><div class="event-text">'+e.text+'</div></div>').join('')}function addEvent(){const y=parseInt(document.getElementById('yearInput').value);const t=document.getElementById('eventInput').value.trim();if(!y||!t)return;events.push({year:y,text:t});document.getElementById('yearInput').value='';document.getElementById('eventInput').value='';render()}render()</script></body></html>`,
    explanation: {
      summary: '歴史的な出来事を時系列で可視化するインタラクティブな年表です',
      mechanism: '入力された年と出来事を時系列順に並べ替えて表示します',
      usage_hint: '研究対象の時代背景の整理や、論文の時系列的な議論の構成に役立ちます',
    },
    field: '歴史学',
    createdAt: '2026-02-19',
    author: '歴史学研究者B',
  },
  {
    id: 'community-3',
    title: 'リカート尺度分析ツール',
    description: 'アンケートのリカート尺度データを集計・可視化します',
    html: `<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>リカート尺度分析</title><style>@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;600&display=swap');*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Noto Sans JP',sans-serif;background:#faf8f5;color:#2d3240;padding:24px;max-width:800px;margin:0 auto}h1{font-size:1.5rem;margin-bottom:8px}p.sub{color:#7a849a;margin-bottom:20px;font-size:0.9rem}table{width:100%;border-collapse:collapse;margin-bottom:20px;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e6ddd0}th,td{padding:10px 14px;text-align:center;border-bottom:1px solid #e6ddd0;font-size:14px}th{background:#358964;color:#fff;font-weight:600}.bar-container{height:24px;background:#e6ddd0;border-radius:6px;overflow:hidden;display:flex}.bar-seg{height:100%;transition:width 0.5s ease}.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-top:20px}.stat-card{background:#fff;padding:14px;border-radius:10px;border:1px solid #e6ddd0;text-align:center}.stat-val{font-size:1.5rem;font-weight:600;color:#358964}.stat-label{font-size:0.8rem;color:#7a849a;margin-top:4px}</style></head><body><h1>リカート尺度分析ツール</h1><p class="sub">5段階評価のアンケート結果をサンプルデータで表示しています</p><table><thead><tr><th>質問項目</th><th>1(そう思わない)</th><th>2</th><th>3</th><th>4</th><th>5(そう思う)</th><th>平均</th></tr></thead><tbody id="tbody"></tbody></table><h2 style="font-size:1.1rem;margin-bottom:12px">分布グラフ</h2><div id="bars"></div><div class="stats" id="stats"></div><script>const data=[{q:'授業内容は理解しやすかった',d:[2,5,12,25,16]},{q:'教材は適切だった',d:[1,3,8,28,20]},{q:'課題の量は適切だった',d:[5,10,15,18,12]},{q:'総合的に満足している',d:[1,4,10,22,23]}];const colors=['#d9534f','#f0ad4e','#cccccc','#5cb85c','#358964'];function render(){const tb=document.getElementById('tbody');const bars=document.getElementById('bars');const stats=document.getElementById('stats');tb.innerHTML='';bars.innerHTML='';let allAvgs=[];data.forEach(item=>{const total=item.d.reduce((a,b)=>a+b,0);const avg=(item.d.reduce((s,v,i)=>s+v*(i+1),0)/total).toFixed(2);allAvgs.push(parseFloat(avg));let row='<tr><td style="text-align:left;font-weight:500">'+item.q+'</td>';item.d.forEach(v=>{row+='<td>'+v+'</td>'});row+='<td style="font-weight:600;color:#358964">'+avg+'</td></tr>';tb.innerHTML+=row;let barHtml='<p style="font-size:13px;margin-bottom:4px;color:#5f687f">'+item.q+'</p><div class="bar-container">';item.d.forEach((v,i)=>{const pct=(v/total*100).toFixed(1);barHtml+='<div class="bar-seg" style="width:'+pct+'%;background:'+colors[i]+'" title="'+(i+1)+': '+v+'人 ('+pct+'%)"></div>'});barHtml+='</div><p style="font-size:11px;color:#9da5b5;margin-bottom:16px">n='+total+'</p>';bars.innerHTML+=barHtml});const grandAvg=(allAvgs.reduce((a,b)=>a+b,0)/allAvgs.length).toFixed(2);const totalN=data[0].d.reduce((a,b)=>a+b,0);stats.innerHTML='<div class="stat-card"><div class="stat-val">'+grandAvg+'</div><div class="stat-label">全体平均</div></div><div class="stat-card"><div class="stat-val">'+totalN+'</div><div class="stat-label">回答者数</div></div><div class="stat-card"><div class="stat-val">'+data.length+'</div><div class="stat-label">質問項目数</div></div>'}render()</script></body></html>`,
    explanation: {
      summary: '5段階リカート尺度のアンケート結果を集計表と分布グラフで表示します',
      mechanism: '各選択肢の回答数から平均値を算出し、積み上げ棒グラフで分布を可視化します',
      usage_hint: '授業評価や意識調査の結果報告に使えます。論文のFigureとしても活用可能です',
    },
    field: '教育学',
    createdAt: '2026-02-18',
    author: '教育学研究者C',
  },
];
