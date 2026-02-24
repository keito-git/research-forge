'use client';

import type { Message } from 'ai/react';
import { RefreshCw, Sparkles } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatBubble } from './ChatBubble';
import { ChatInput } from './ChatInput';
import { MessageErrorBoundary } from './MessageErrorBoundary';

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

  // biome-ignore lint/correctness/useExhaustiveDependencies: messages.length triggers auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  return (
    <>
      <ScrollArea className="flex-1 px-4 py-4">
        <div className="space-y-3">
          {messages.length === 0 && (
            <div className="message-enter">
              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-md bg-forge-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Sparkles className="w-3 h-3 text-forge-600" />
                </div>
                <div className="flex-1 space-y-3">
                  <div className="text-ink-700">
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
                        className="rounded-full text-ink-500 hover:text-ink-700"
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
            <MessageErrorBoundary key={m.id}>
              <ChatBubble
                message={m}
                isLastAssistant={m.role === 'assistant' && i === messages.length - 1}
                isStreaming={isLoading}
                lastFailedInput={lastFailedInput}
                onRetry={onRetry}
                onOpenInNewTab={onOpenInNewTab}
                onStop={onStop}
              />
            </MessageErrorBoundary>
          ))}
          {isLoading && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
            <div className="flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-md bg-forge-100 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-3 h-3 text-forge-600" />
              </div>
              <div className="pt-0.5">
                <p className="text-sm text-ink-400 mb-2">考えています...</p>
                <div className="flex gap-1.5">
                  <div className="typing-dot w-1.5 h-1.5 rounded-full bg-forge-400" />
                  <div className="typing-dot w-1.5 h-1.5 rounded-full bg-forge-400" />
                  <div className="typing-dot w-1.5 h-1.5 rounded-full bg-forge-400" />
                </div>
              </div>
            </div>
          )}

          {/* Chat error display */}
          {chatError && (
            <div className="message-enter">
              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-md bg-forge-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Sparkles className="w-3 h-3 text-forge-600" />
                </div>
                <div className="flex-1 text-ink-700 space-y-2">
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
