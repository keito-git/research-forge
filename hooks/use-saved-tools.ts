'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { putAll } from '@/lib/storage';
import type { GeneratedTool, SavedTool } from '@/types';

export function useSavedTools(storageReady: boolean, tool: GeneratedTool | null, fieldLabel: string) {
  const [savedTools, setSavedTools] = useState<SavedTool[]>([]);
  const [communityTools, setCommunityTools] = useState<SavedTool[]>([]);

  // Save tools to IndexedDB when they change
  useEffect(() => {
    if (!storageReady) return;
    putAll('savedTools', savedTools).catch(() => {
      toast({ title: '保存に失敗しました', variant: 'destructive' });
    });
  }, [savedTools, storageReady]);

  const handleSaveTool = useCallback((): boolean => {
    if (!tool) return false;
    const newTool: SavedTool = {
      id: `tool-${Date.now()}`,
      title: tool.title,
      description: tool.description,
      html: tool.html,
      explanation: tool.explanation,
      field: fieldLabel,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setSavedTools((prev) => [newTool, ...prev]);
    toast({ title: 'ツールを保存しました' });
    return true;
  }, [tool, fieldLabel]);

  const handlePublishTool = useCallback(() => {
    if (!tool) return;
    const newTool: SavedTool = {
      id: `community-${Date.now()}`,
      title: tool.title,
      description: tool.description,
      html: tool.html,
      explanation: tool.explanation,
      field: fieldLabel,
      createdAt: new Date().toISOString().split('T')[0],
      author: `${fieldLabel}研究者`,
    };
    setCommunityTools((prev) => {
      const updated = [newTool, ...prev];
      putAll('communityTools', updated).catch((err) => console.warn('Failed to save community tools:', err));
      return updated;
    });
    toast({ title: 'ギャラリーに追加しました' });
  }, [tool, fieldLabel]);

  const handleDeleteSavedTool = useCallback((toolId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSavedTools((prev) => prev.filter((t) => t.id !== toolId));
    toast({ title: 'ツールを削除しました' });
  }, []);

  const handleDeleteGalleryTool = useCallback((toolId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCommunityTools((prev) => {
      const updated = prev.filter((t) => t.id !== toolId);
      putAll('communityTools', updated).catch((err) => console.warn('Failed to update community tools:', err));
      return updated;
    });
    toast({ title: 'ギャラリーから削除しました' });
  }, []);

  return {
    savedTools,
    setSavedTools,
    communityTools,
    setCommunityTools,
    handleSaveTool,
    handlePublishTool,
    handleDeleteSavedTool,
    handleDeleteGalleryTool,
  };
}
