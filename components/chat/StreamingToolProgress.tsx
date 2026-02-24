'use client';

import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { STAGE_LABELS } from '@/lib/constants';
import type { StreamingToolProgress as ProgressData } from '@/types';

const STAGES = ['starting', 'html', 'explanation', 'finishing'] as const;

export function StreamingToolProgress({ progress, onStop }: { progress: ProgressData; onStop: () => void }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-3 py-2 bg-forge-50 rounded-lg border border-forge-200">
        <Sparkles className="w-4 h-4 text-forge-600 animate-pulse-soft" />
        <div className="flex-1 min-w-0">
          {progress.title ? (
            <span className="text-sm font-medium text-forge-800">
              {'\u300C'}
              {progress.title}
              {'\u300D'}を生成中
            </span>
          ) : (
            <span className="text-sm text-forge-700">ツールを生成中...</span>
          )}
          {progress.description && <p className="text-xs text-forge-600 mt-0.5 truncate">{progress.description}</p>}
        </div>
      </div>
      {/* Progress steps */}
      <div className="flex items-center gap-1.5 px-1">
        {STAGES.map((s, i) => {
          const currentIdx = STAGES.indexOf(progress.stage);
          const isDone = i < currentIdx;
          const isCurrent = i === currentIdx;
          return (
            <div key={s} className="flex items-center gap-1.5 flex-1">
              <div
                className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                  isDone ? 'bg-forge-500' : isCurrent ? 'bg-forge-400 animate-pulse' : 'bg-sand-200'
                }`}
              />
            </div>
          );
        })}
      </div>
      <p className="text-xs text-ink-400 px-1">{STAGE_LABELS[progress.stage]}</p>
      <Button variant="outline" size="sm" onClick={onStop} className="gap-1.5 w-full">
        生成を中止
      </Button>
    </div>
  );
}
