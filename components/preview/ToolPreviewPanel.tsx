'use client';

import { BookOpen, Save } from 'lucide-react';
import type React from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { GeneratedTool, PreviewTab } from '@/types';
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
  previewTab: PreviewTab;
  customParams: Record<string, string>;
  toolSaved: boolean;
  iframeSrcDoc: string;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  mobileView: 'chat' | 'preview';
  onPreviewTabChange: (tab: PreviewTab) => void;
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

          <Tabs
            value={previewTab}
            onValueChange={(v) => onPreviewTabChange(v as PreviewTab)}
            className="flex flex-col flex-1 overflow-hidden"
          >
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-sand-200/70 bg-sand-50 shrink-0">
              <TabsList className="bg-transparent">
                <TabsTrigger value="preview">プレビュー</TabsTrigger>
                <TabsTrigger value="about">概要</TabsTrigger>
                <TabsTrigger value="customize">カスタマイズ</TabsTrigger>
                <TabsTrigger value="code">コード</TabsTrigger>
              </TabsList>
              <div className="flex gap-0.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={toolSaved ? 'secondary' : 'ghost'}
                      size="icon"
                      onClick={onSaveTool}
                      disabled={toolSaved}
                      className="w-8 h-8"
                    >
                      <Save className="w-3.5 h-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{toolSaved ? '保存済み' : 'ツールを保存'}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={onPublishTool} className="w-8 h-8">
                      <BookOpen className="w-3.5 h-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>ギャラリーに追加</TooltipContent>
                </Tooltip>
              </div>
            </div>

            <TabsContent value="preview" className="flex flex-col flex-1">
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
