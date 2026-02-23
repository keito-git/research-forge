'use client';

import { MessageSquarePlus, Trash2 } from 'lucide-react';
import type { Conversation } from '@/types';

export function ConversationHistory({
  conversations,
  activeConversationId,
  onSwitch,
  onDelete,
}: {
  conversations: Conversation[];
  activeConversationId: string;
  onSwitch: (conv: Conversation) => void;
  onDelete: (convId: string, e: React.MouseEvent) => void;
}) {
  if (conversations.length === 0) {
    return (
      <div className="text-center py-12">
        <MessageSquarePlus className="w-10 h-10 text-sand-300 mx-auto mb-3" />
        <p className="text-sm text-ink-400">会話履歴はまだありません</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {conversations.map((conv) => (
        <div
          key={conv.id}
          onClick={() => onSwitch(conv)}
          className={`group cursor-pointer rounded-xl px-4 py-3 border transition-all ${conv.id === activeConversationId ? 'border-forge-500 bg-forge-50' : 'border-sand-200 bg-white hover:border-forge-300'}`}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-ink-800 truncate flex-1">{conv.title}</p>
            <button
              onClick={(e) => onDelete(conv.id, e)}
              className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-red-50 transition-all"
              title="会話を削除"
            >
              <Trash2 className="w-3.5 h-3.5 text-ink-400 hover:text-red-500" />
            </button>
          </div>
          <p className="text-xs text-ink-400 mt-0.5">
            {conv.messages.length}件のメッセージ ・ {conv.updatedAt?.split('T')[0]}
          </p>
        </div>
      ))}
    </div>
  );
}
