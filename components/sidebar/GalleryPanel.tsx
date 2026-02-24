'use client';

import { Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import type { SavedTool } from '@/types';

export function GalleryPanel({
  communityTools,
  onLoadTool,
  onDeleteTool,
}: {
  communityTools: SavedTool[];
  onLoadTool: (tool: SavedTool) => void;
  onDeleteTool: (toolId: string, e: React.MouseEvent) => void;
}) {
  return (
    <>
      <p className="text-xs text-ink-400 mb-2">保存したツールやサンプルツールを閲覧できます</p>
      <div className="space-y-3">
        {communityTools.map((t) => (
          <Card
            key={t.id}
            className="group cursor-pointer hover:border-forge-300 hover:shadow-sm transition-all p-4"
            onClick={() => onLoadTool(t)}
          >
            <div className="flex items-start justify-between">
              <CardTitle>{t.title}</CardTitle>
              <button
                onClick={(e) => onDeleteTool(t.id, e)}
                className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-red-50 transition-all"
                title="削除"
              >
                <Trash2 className="w-3.5 h-3.5 text-ink-400 hover:text-red-500" />
              </button>
            </div>
            <CardDescription className="mt-1 line-clamp-2">{t.description}</CardDescription>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary">{t.field}</Badge>
              {t.author && <span className="text-[10px] text-ink-300">by {t.author}</span>}
              <span className="text-[10px] text-ink-300">{t.createdAt}</span>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
