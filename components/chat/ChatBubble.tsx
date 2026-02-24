'use client';

import type { Message } from 'ai/react';
import { ExternalLink, RefreshCw, Sparkles } from 'lucide-react';
import { memo, useMemo, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import { parseStreamingToolProgress, tryParseToolGeneration } from '@/lib/tool-parser';
import { CopyButton } from './CopyButton';
import { markdownComponents } from './MarkdownMessage';
import { StreamingToolProgress } from './StreamingToolProgress';

export const ChatBubble = memo(function ChatBubble({
  message,
  isLastAssistant,
  isStreaming,
  lastFailedInput,
  onRetry,
  onOpenInNewTab,
  onStop,
}: {
  message: Message;
  isLastAssistant: boolean;
  isStreaming: boolean;
  lastFailedInput: string | null;
  onRetry: () => void;
  onOpenInNewTab: () => void;
  onStop: () => void;
}) {
  const content = message.content;
  const showStreaming = isStreaming && isLastAssistant;

  // Hold callbacks in refs so they don't bust the useMemo cache
  const onRetryRef = useRef(onRetry);
  onRetryRef.current = onRetry;
  const onOpenInNewTabRef = useRef(onOpenInNewTab);
  onOpenInNewTabRef.current = onOpenInNewTab;
  const onStopRef = useRef(onStop);
  onStopRef.current = onStop;

  const renderedContent = useMemo(() => {
    if (message.role === 'user') {
      return <p className="text-[15px]">{content}</p>;
    }

    // While streaming, show progress for tool generation
    if (showStreaming && content.includes('"tool_generation"')) {
      const progress = parseStreamingToolProgress(content);
      return <StreamingToolProgress progress={progress} onStop={() => onStopRef.current()} />;
    }

    // Guard: only attempt tool parse if content looks like a tool generation
    const toolParsed = content.includes('"tool_generation"') ? tryParseToolGeneration(content) : null;
    if (toolParsed) {
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-3 py-2 bg-forge-50 rounded-lg border border-forge-200">
            <Sparkles className="w-4 h-4 text-forge-600" />
            <span className="text-sm font-medium text-forge-800">
              {'\u300C'}
              {toolParsed.title}
              {'\u300D'}を作成しました！
            </span>
          </div>
          {toolParsed.academic_advice?.map((advice, i) => (
            <div
              key={i}
              className="text-sm text-forge-700 bg-forge-50/50 px-3 py-2 rounded-md border-l-2 border-forge-300"
            >
              {advice}
            </div>
          ))}
          <Button onClick={() => onOpenInNewTabRef.current()} className="w-full gap-2">
            <ExternalLink className="w-4 h-4" />
            このツールを使う（新しいタブで開く）
          </Button>
          <p className="text-[11px] text-ink-400 text-center">新しいタブでは、ファイルの読み込みや全機能が使えます</p>
        </div>
      );
    }

    // Check for error messages
    const isError = content.startsWith('\u26A0\uFE0F');
    if (isError && lastFailedInput) {
      return (
        <div className="space-y-2">
          <div className="whitespace-pre-wrap leading-relaxed text-[15px]">{content}</div>
          <Button variant="outline" size="sm" onClick={() => onRetryRef.current()} className="gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" />
            再送信
          </Button>
        </div>
      );
    }

    return (
      <div className={`prose-chat text-[15px] leading-relaxed ${showStreaming ? 'streaming-cursor' : ''}`}>
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
          {content}
        </ReactMarkdown>
      </div>
    );
  }, [content, showStreaming, lastFailedInput, message.role]);

  return (
    <div className="message-enter group">
      <div className={`flex items-start gap-2.5 ${message.role === 'user' ? 'justify-end' : ''}`}>
        {message.role === 'assistant' && (
          <div className="w-6 h-6 rounded-md bg-forge-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Sparkles className="w-3 h-3 text-forge-600" />
          </div>
        )}
        <div
          className={`min-w-0 ${message.role === 'user' ? 'max-w-[80%] bg-sand-100 rounded-lg px-4 py-2.5 text-ink-800' : 'flex-1 text-ink-700'}`}
        >
          {renderedContent}
        </div>
        {message.role === 'assistant' && !showStreaming && content && !content.includes('"tool_generation"') && (
          <div className="flex items-start mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <CopyButton text={content} />
          </div>
        )}
      </div>
    </div>
  );
});
