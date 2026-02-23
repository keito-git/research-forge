'use client';

import type { Message } from 'ai/react';
import { RefreshCw, Sparkles } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatBubble } from './ChatBubble';
import { ChatInput } from './ChatInput';

export function ChatPanel({
  messages,
  input,
  isLoading,
  chatError,
  lastFailedInput,
  fieldLabel,
  researchTheme,
  onInputChange,
  onSend,
  onKeyDown,
  onRetry,
  onOpenInNewTab,
  onStop,
  onSuggestionClick,
}: {
  messages: Message[];
  input: string;
  isLoading: boolean;
  chatError: Error | undefined;
  lastFailedInput: string | null;
  fieldLabel: string;
  researchTheme?: string;
  onInputChange: (value: string) => void;
  onSend: (e: React.FormEvent) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onRetry: () => void;
  onOpenInNewTab: () => void;
  onStop: () => void;
  onSuggestionClick: (text: string) => void;
}) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  return (
    <>
      <ScrollArea className="flex-1 px-4 py-4">
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="message-enter">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-forge-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Sparkles className="w-4 h-4 text-forge-600" />
                </div>
                <div className="flex-1 space-y-3">
                  <div className="bg-sand-50 rounded-2xl rounded-tl-md px-4 py-3 text-ink-700">
                    <p className="mb-2">
                      こんにちは！{fieldLabel}の研究をされているのですね。
                      {researchTheme && `「${researchTheme}」について、`}
                      どのようなツールを作りましょうか？
                    </p>
                    <p className="text-sm text-ink-500">
                      例えば「テキストの頻出語を分析したい」「アンケート結果を可視化したい」など、お気軽にお話しください。
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      'テキストを分析したい',
                      'データを可視化したい',
                      'アンケートを分析したい',
                      '今の研究で困っていることがある',
                    ].map((s) => (
                      <Button
                        key={s}
                        variant="outline"
                        size="sm"
                        onClick={() => onSuggestionClick(s)}
                        className="rounded-full"
                      >
                        {s}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <ChatBubble
              key={m.id}
              message={m}
              isLastAssistant={m.role === 'assistant' && i === messages.length - 1}
              isStreaming={isLoading}
              lastFailedInput={lastFailedInput}
              onRetry={onRetry}
              onOpenInNewTab={onOpenInNewTab}
              onStop={onStop}
            />
          ))}
          {isLoading && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-forge-100 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 text-forge-600" />
              </div>
              <div className="bg-sand-50 rounded-2xl rounded-tl-md px-4 py-3">
                <p className="text-sm text-ink-400 mb-2">生成中です。少々お待ちください...</p>
                <div className="flex gap-1.5">
                  <div className="typing-dot w-2 h-2 rounded-full bg-forge-400" />
                  <div className="typing-dot w-2 h-2 rounded-full bg-forge-400" />
                  <div className="typing-dot w-2 h-2 rounded-full bg-forge-400" />
                </div>
              </div>
            </div>
          )}

          {/* Chat error display */}
          {chatError && (
            <div className="message-enter">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-forge-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Sparkles className="w-4 h-4 text-forge-600" />
                </div>
                <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-sand-50 text-ink-700 rounded-tl-md space-y-2">
                  <p className="text-[15px]">{'\u26A0\uFE0F'} エラーが発生しました。もう一度お試しください。</p>
                  {lastFailedInput && (
                    <Button variant="outline" size="sm" onClick={onRetry} className="gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5" />
                      再送信
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <ChatInput
        input={input}
        isLoading={isLoading}
        onInputChange={onInputChange}
        onSend={onSend}
        onKeyDown={onKeyDown}
      />
    </>
  );
}
