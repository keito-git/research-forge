'use client';

import { BookOpen, Code, Download, ExternalLink, Eye, Info, Save, Sliders } from 'lucide-react';
import type React from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { GeneratedTool } from '@/types';
import { EmptyPreview } from './EmptyPreview';
import { ToolAboutTab } from './ToolAboutTab';
import { ToolCodeTab } from './ToolCodeTab';
import { ToolCustomizeTab } from './ToolCustomizeTab';
import { ToolPreviewBanner } from './ToolPreviewBanner';

export function ToolPreviewPanel({
  tool,
  previewTab,
  customParams,
  toolSaved,
  iframeSrcDoc,
  iframeRef,
  mobileView,
  onPreviewTabChange,
  onSaveTool,
  onPublishTool,
  onOpenInNewTab,
  onDownload,
  onParamChange,
}: {
  tool: GeneratedTool | null;
  previewTab: string;
  customParams: Record<string, string>;
  toolSaved: boolean;
  iframeSrcDoc: string;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  mobileView: 'chat' | 'preview';
  onPreviewTabChange: (tab: string) => void;
  onSaveTool: () => void;
  onPublishTool: () => void;
  onOpenInNewTab: () => void;
  onDownload: () => void;
  onParamChange: (id: string, value: string) => void;
}) {
  return (
    <div className={`flex-1 flex-col bg-sand-50 ${mobileView === 'preview' ? 'flex' : 'hidden md:flex'}`}>
      {tool ? (
        <>
          <ToolPreviewBanner title={tool.title} onOpenInNewTab={onOpenInNewTab} onDownload={onDownload} />

          <Tabs value={previewTab} onValueChange={onPreviewTabChange} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-sand-200 bg-white shrink-0">
              <TabsList className="bg-transparent">
                <TabsTrigger value="preview">
                  <Eye className="w-3.5 h-3.5" />
                  プレビュー
                </TabsTrigger>
                <TabsTrigger value="about">
                  <Info className="w-3.5 h-3.5" />
                  このツールについて
                </TabsTrigger>
                <TabsTrigger value="customize">
                  <Sliders className="w-3.5 h-3.5" />
                  カスタマイズ
                </TabsTrigger>
                <TabsTrigger value="code">
                  <Code className="w-3.5 h-3.5" />
                  コード
                </TabsTrigger>
              </TabsList>
              <div className="flex gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={toolSaved ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={onSaveTool}
                      disabled={toolSaved}
                    >
                      <Save className="w-3.5 h-3.5 mr-1" />
                      {toolSaved ? '保存済み' : '保存'}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>ツールを保存</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" onClick={onPublishTool}>
                      <BookOpen className="w-3.5 h-3.5 mr-1" />
                      ギャラリーに追加
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>ギャラリーに追加</TooltipContent>
                </Tooltip>
                <Button size="sm" onClick={onOpenInNewTab} className="gap-1.5">
                  <ExternalLink className="w-3.5 h-3.5" />
                  新しいタブで使う
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onDownload}
                  className="gap-1.5 text-forge-700 border-forge-300 hover:bg-forge-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  保存
                </Button>
              </div>
            </div>

            <TabsContent value="preview" className="flex flex-col flex-1">
              <div className="px-4 py-2 bg-forge-50 border-b border-forge-100 flex items-center justify-between shrink-0">
                <p className="text-xs text-forge-700">
                  ファイル読み込み等を使うには「<strong>新しいタブで使う</strong>」ボタンで開いてください
                </p>
              </div>
              <iframe
                ref={iframeRef}
                srcDoc={iframeSrcDoc}
                className="preview-frame flex-1"
                sandbox="allow-scripts allow-forms allow-modals"
                title={tool.title}
              />
            </TabsContent>

            <TabsContent value="about" className="flex-1 overflow-auto">
              <ToolAboutTab tool={tool} />
            </TabsContent>

            <TabsContent value="customize" className="flex-1 overflow-auto">
              <ToolCustomizeTab
                params={tool.customizable_params ?? []}
                customParams={customParams}
                onParamChange={onParamChange}
              />
            </TabsContent>

            <TabsContent value="code" className="flex-1 overflow-auto">
              <ToolCodeTab html={tool.html} />
            </TabsContent>
          </Tabs>
        </>
      ) : (
        <EmptyPreview />
      )}
    </div>
  );
}
