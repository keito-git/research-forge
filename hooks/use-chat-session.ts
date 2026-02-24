'use client';

import { type Message, useChat } from 'ai/react';
import { useCallback, useState } from 'react';
import { tryParseToolGeneration } from '@/lib/tool-parser';
import type { GeneratedTool, UserProfile } from '@/types';

export function useChatSession({
  profile,
  apiKey,
  model,
  activeConversationId,
  setActiveConversationId,
  onToolGenerated,
  setMobileView,
}: {
  profile: UserProfile;
  apiKey: string;
  model: string;
  activeConversationId: string;
  setActiveConversationId: (id: string) => void;
  onToolGenerated: (tool: GeneratedTool) => void;
  setMobileView: (view: 'chat' | 'preview') => void;
}) {
  const [lastFailedInput, setLastFailedInput] = useState<string | null>(null);

  const {
    messages,
    input,
    setInput,
    handleSubmit: chatHandleSubmit,
    isLoading,
    error: chatError,
    setMessages,
    append,
    stop,
  } = useChat({
    api: '/api/chat',
    body: { profile, apiKey, model },
    // Token optimization: replace large tool JSON in assistant messages before sending
    fetch: async (url, options) => {
      if (options?.body) {
        try {
          const body = JSON.parse(options.body as string);
          if (body.messages) {
            body.messages = body.messages.map((m: Message) => {
              if (m.role === 'assistant' && m.content.includes('"tool_generation"')) {
                const parsed = tryParseToolGeneration(m.content);
                if (parsed) {
                  return { ...m, content: `[ツール生成: ${parsed.title}]` };
                }
              }
              return m;
            });
          }
          return fetch(url, { ...options, body: JSON.stringify(body) });
        } catch {
          return fetch(url, options);
        }
      }
      return fetch(url, options);
    },
    onFinish: (message) => {
      const parsed = tryParseToolGeneration(message.content);
      if (parsed) {
        onToolGenerated(parsed);
        setMobileView('preview');
      }
      setLastFailedInput(null);
    },
    onError: () => {
      setLastFailedInput(input || lastFailedInput);
    },
  });

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (input.trim() && !isLoading) {
          if (!activeConversationId) setActiveConversationId(`conv-${Date.now()}`);
          chatHandleSubmit(e as unknown as React.FormEvent);
        }
      }
    },
    [input, isLoading, chatHandleSubmit, activeConversationId, setActiveConversationId],
  );

  const handleSend = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!input.trim() || isLoading) return;
      if (!activeConversationId) setActiveConversationId(`conv-${Date.now()}`);
      chatHandleSubmit(e);
    },
    [input, isLoading, chatHandleSubmit, activeConversationId, setActiveConversationId],
  );

  const handleRetry = useCallback(() => {
    if (!lastFailedInput) return;
    const textToRetry = lastFailedInput;
    setMessages((prev) => {
      const msgs = [...prev];
      while (
        msgs.length > 0 &&
        msgs[msgs.length - 1].role === 'assistant' &&
        msgs[msgs.length - 1].content.startsWith('\u26A0\uFE0F')
      ) {
        msgs.pop();
      }
      if (msgs.length > 0 && msgs[msgs.length - 1].role === 'user') {
        msgs.pop();
      }
      return msgs;
    });
    setLastFailedInput(null);
    setTimeout(() => {
      append({ role: 'user', content: textToRetry });
    }, 100);
  }, [lastFailedInput, setMessages, append]);

  return {
    messages,
    input,
    setInput,
    setMessages,
    isLoading,
    chatError,
    lastFailedInput,
    setLastFailedInput,
    handleSend,
    handleKeyDown,
    handleRetry,
    stop,
  };
}
