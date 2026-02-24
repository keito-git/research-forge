// Inject API key receiver script into generated HTML so tools can use Claude API
export function wrapHtmlWithApiKeyInjector(html: string): string {
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
    return html.replace('</head>', `${injectorScript}</head>`);
  }
  return injectorScript + html;
}

// For download / new-tab: inject a banner for the user to enter their API key
export function getToolHtmlForDownload(html: string): string {
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
    return html.replace('</body>', `${bannerScript}</body>`);
  }
  return html + bannerScript;
}
