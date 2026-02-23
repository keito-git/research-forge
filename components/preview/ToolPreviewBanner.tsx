'use client';

import { Download, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export function ToolPreviewBanner({
  title,
  onOpenInNewTab,
  onDownload,
}: {
  title: string;
  onOpenInNewTab: () => void;
  onDownload: () => void;
}) {
  return (
    <div className="px-4 py-3 bg-forge-600 text-white flex items-center justify-between shrink-0">
      <div>
        <h3 className="font-medium text-sm">{title}</h3>
        <p className="text-xs text-forge-200">右はプレビューです。実際に使うには新しいタブで開いてください</p>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="secondary" onClick={onOpenInNewTab} className="gap-2 text-forge-700">
          <ExternalLink className="w-4 h-4" />
          ツールを使う
        </Button>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="icon" onClick={onDownload} className="bg-forge-500 hover:bg-forge-400">
              <Download className="w-3.5 h-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>HTMLをダウンロード</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
