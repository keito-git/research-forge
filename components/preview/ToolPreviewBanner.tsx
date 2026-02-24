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
    <div className="px-4 py-2.5 border-b border-sand-200/80 bg-white flex items-center justify-between shrink-0">
      <div>
        <h3 className="font-display font-bold text-sm text-ink-900">{title}</h3>
        <p className="text-[11px] text-ink-400">新しいタブで開くと全機能が使えます</p>
      </div>
      <div className="flex items-center gap-1.5">
        <Button onClick={onOpenInNewTab} size="sm" className="gap-1.5">
          <ExternalLink className="w-3.5 h-3.5" />
          ツールを使う
        </Button>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={onDownload} className="w-8 h-8">
              <Download className="w-3.5 h-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>HTMLをダウンロード</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
