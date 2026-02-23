'use client';

import { Send } from 'lucide-react';
import { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export function ChatInput({
  input,
  isLoading,
  onInputChange,
  onSend,
  onKeyDown,
}: {
  input: string;
  isLoading: boolean;
  onInputChange: (value: string) => void;
  onSend: (e: React.FormEvent) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => onInputChange(e.target.value),
    [onInputChange],
  );

  return (
    <form onSubmit={onSend} className="px-4 py-3 border-t border-sand-200 bg-white shrink-0">
      <div className="flex items-end gap-2">
        <Textarea
          value={input}
          onChange={handleChange}
          onKeyDown={onKeyDown}
          placeholder="どのようなツールを作りましょうか？"
          rows={2}
          className="flex-1 resize-none"
          style={{ minHeight: '60px', maxHeight: '150px' }}
        />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button type="submit" disabled={!input.trim() || isLoading} size="icon" className="w-11 h-11 flex-shrink-0">
              <Send className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>送信 (Ctrl+Enter)</TooltipContent>
        </Tooltip>
      </div>
      <p className="text-[11px] text-ink-300 mt-1.5 text-right">Ctrl+Enter ({'\u2318'}+Enter) で送信 ・ Enterで改行</p>
    </form>
  );
}
