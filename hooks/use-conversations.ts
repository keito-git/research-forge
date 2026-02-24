'use client';

import type { Message } from 'ai/react';
import { useCallback, useEffect, useState } from 'react';
import { getAll, migrateFromLocalStorage, put, remove } from '@/lib/storage';
import type { Conversation, GeneratedTool, SavedTool } from '@/types';

interface UseConversationsArgs {
  activeConversationId: string;
  setActiveConversationId: (id: string) => void;
  setStorageReady: (ready: boolean) => void;
  setMessages: (messages: Message[]) => void;
  setSavedTools: React.Dispatch<React.SetStateAction<SavedTool[]>>;
  setCommunityTools: React.Dispatch<React.SetStateAction<SavedTool[]>>;
  setTool: React.Dispatch<React.SetStateAction<GeneratedTool | null>>;
  setLastFailedInput: React.Dispatch<React.SetStateAction<string | null>>;
}

export function useConversations({
  activeConversationId,
  setActiveConversationId,
  setStorageReady,
  setMessages,
  setSavedTools,
  setCommunityTools,
  setTool,
  setLastFailedInput,
}: UseConversationsArgs) {
  const [conversations, setConversations] = useState<Conversation[]>([]);

  // Load persisted data from IndexedDB
  useEffect(() => {
    (async () => {
      try {
        await migrateFromLocalStorage();
        const [savedData, communityData, chatData] = await Promise.all([
          getAll<SavedTool>('savedTools'),
          getAll<SavedTool>('communityTools'),
          getAll<Conversation>('chatHistory'),
        ]);
        setSavedTools(savedData);
        if (communityData.length > 0) {
          setCommunityTools(communityData);
        } else {
          const { DEFAULT_COMMUNITY_TOOLS } = await import('@/lib/default-community-tools');
          setCommunityTools(DEFAULT_COMMUNITY_TOOLS);
        }

        // Migrate old single-conversation format
        const oldFormat = chatData.find((c) => c.id === 'current' && !c.title);
        if (oldFormat) {
          const oldMessages = (oldFormat as Conversation & { messages: Message[] }).messages ?? [];
          const migrated: Conversation = {
            id: `conv-${Date.now()}`,
            title: '以前の会話',
            messages: oldMessages,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          await remove('chatHistory', 'current');
          await put('chatHistory', migrated);
          setConversations([migrated]);
          setActiveConversationId(migrated.id);
          setMessages(migrated.messages);
        } else {
          const convs = (chatData as Conversation[])
            .filter((c) => c.title)
            .sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''));
          setConversations(convs);
          if (convs.length > 0) {
            setActiveConversationId(convs[0].id);
            setMessages(convs[0].messages);
          }
        }
      } catch {
        import('@/lib/default-community-tools').then(({ DEFAULT_COMMUNITY_TOOLS }) => {
          setCommunityTools(DEFAULT_COMMUNITY_TOOLS);
        });
      }
      setStorageReady(true);
    })();
  }, [setActiveConversationId, setMessages, setStorageReady, setSavedTools, setCommunityTools]);

  const saveConversation = useCallback(
    (messages: Message[]) => {
      if (!activeConversationId) return;
      const conv: Conversation = {
        id: activeConversationId,
        title:
          conversations.find((c) => c.id === activeConversationId)?.title ??
          (messages[0]?.content?.slice(0, 30) || '新しい会話'),
        messages,
        createdAt: conversations.find((c) => c.id === activeConversationId)?.createdAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      put('chatHistory', conv).catch((err) => console.warn('Failed to save conversation:', err));
      setConversations((prev) => {
        const existing = prev.findIndex((c) => c.id === activeConversationId);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = conv;
          return updated;
        }
        return [conv, ...prev];
      });
    },
    [activeConversationId, conversations],
  );

  const handleNewConversation = useCallback(() => {
    const newId = `conv-${Date.now()}`;
    setMessages([]);
    setActiveConversationId(newId);
    setTool(null);
    setLastFailedInput(null);
  }, [setMessages, setActiveConversationId, setTool, setLastFailedInput]);

  const handleSwitchConversation = useCallback(
    (conv: Conversation) => {
      setActiveConversationId(conv.id);
      setMessages(conv.messages);
      setTool(null);
      setLastFailedInput(null);
    },
    [setActiveConversationId, setMessages, setTool, setLastFailedInput],
  );

  const handleDeleteConversation = useCallback(
    (convId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      remove('chatHistory', convId).catch((err) => console.warn('Failed to delete conversation:', err));
      setConversations((prev) => prev.filter((c) => c.id !== convId));
      if (activeConversationId === convId) {
        setMessages([]);
        setActiveConversationId('');
        setTool(null);
      }
    },
    [activeConversationId, setMessages, setActiveConversationId, setTool],
  );

  const handleClearChat = useCallback(() => {
    if (activeConversationId) {
      remove('chatHistory', activeConversationId).catch((err) => console.warn('Failed to clear conversation:', err));
      setConversations((prev) => prev.filter((c) => c.id !== activeConversationId));
    }
    setMessages([]);
    setActiveConversationId('');
    setTool(null);
  }, [setMessages, activeConversationId, setActiveConversationId, setTool]);

  return {
    conversations,
    saveConversation,
    handleNewConversation,
    handleSwitchConversation,
    handleDeleteConversation,
    handleClearChat,
  };
}
