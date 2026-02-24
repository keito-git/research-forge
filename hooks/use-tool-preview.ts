'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getToolHtmlForDownload, wrapHtmlWithApiKeyInjector } from '@/lib/tool-html';
import type { GeneratedTool, PreviewTab, SavedTool } from '@/types';

export function useToolPreview(apiKey: string) {
  const [tool, setTool] = useState<GeneratedTool | null>(null);
  const [previewTab, setPreviewTab] = useState<PreviewTab>('preview');
  const [customParams, setCustomParams] = useState<Record<string, string>>({});
  const [toolSaved, setToolSaved] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const setToolFromGeneration = useCallback((parsed: GeneratedTool) => {
    setTool(parsed);
    setPreviewTab('preview');
    setToolSaved(false);
    const defaultParams: Record<string, string> = {};
    parsed.customizable_params?.forEach((p) => {
      defaultParams[p.id] = p.default;
    });
    setCustomParams(defaultParams);
  }, []);

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
  }, []);

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
    setCustomParams((prev) => ({ ...prev, [id]: value }));
  }, []);

  // PostMessage for customization
  useEffect(() => {
    if (iframeRef.current && tool) {
      iframeRef.current.contentWindow?.postMessage({ type: 'customize', params: customParams }, '*');
    }
  }, [customParams, tool]);

  // Inject API key into iframe when tool loads
  useEffect(() => {
    if (!iframeRef.current || !tool) return;
    const injectKey = () => {
      try {
        iframeRef.current?.contentWindow?.postMessage({ type: 'set_api_key', apiKey }, '*');
      } catch {}
    };
    const iframe = iframeRef.current;
    iframe.addEventListener('load', injectKey);
    injectKey();
    return () => iframe.removeEventListener('load', injectKey);
  }, [tool, apiKey]);

  // Memoize iframe srcDoc to prevent unnecessary iframe reloads
  const iframeSrcDoc = useMemo(() => (tool ? wrapHtmlWithApiKeyInjector(tool.html) : ''), [tool]);

  return {
    tool,
    setTool,
    previewTab,
    setPreviewTab,
    customParams,
    toolSaved,
    setToolSaved,
    iframeRef,
    iframeSrcDoc,
    setToolFromGeneration,
    handleLoadTool,
    handleDownload,
    handleOpenInNewTab,
    handleParamChange,
  };
}
