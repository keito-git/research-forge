'use client';

import { Bookmark, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import type { SavedTool } from '@/types';

export function SavedToolsList({
  savedTools,
  onLoadTool,
  onDeleteTool,
}: {
  savedTools: SavedTool[];
  onLoadTool: (tool: SavedTool) => void;
  onDeleteTool: (toolId: string, e: React.MouseEvent) => void;
}) {
  if (savedTools.length === 0) {
    return (
      <div className="text-center py-12">
        <Bookmark className="w-10 h-10 text-sand-300 mx-auto mb-3" />
        <p className="text-sm text-ink-400">保存されたツールはまだありません</p>
        <p className="text-xs text-ink-300 mt-1">ツール作成後「保存」ボタンで保存できます</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {savedTools.map((t) => (
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
            <Badge>{t.field}</Badge>
            <span className="text-[10px] text-ink-300">{t.createdAt}</span>
          </div>
        </Card>
      ))}
    </div>
  );
}
