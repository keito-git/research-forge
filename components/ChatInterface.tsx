'use client';

import { Bookmark, BookOpen, MessageSquarePlus, Settings, Sparkles } from 'lucide-react';
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useChatSession } from '@/hooks/use-chat-session';
import { useConversations } from '@/hooks/use-conversations';
import { useSavedTools } from '@/hooks/use-saved-tools';
import { useToolPreview } from '@/hooks/use-tool-preview';
import { FIELDS } from '@/lib/prompts';
import type { ChatInterfaceProps, SavedTool } from '@/types';
import { ChatPanel } from './chat/ChatPanel';
import { ToolPreviewPanel } from './preview/ToolPreviewPanel';
import { ConversationHistory } from './sidebar/ConversationHistory';
import { GalleryPanel } from './sidebar/GalleryPanel';
import { SavedToolsList } from './sidebar/SavedToolsList';

const SettingsModal = lazy(() => import('./SettingsModal'));

export default function ChatInterface({
  profile,
  apiKey,
  model,
  onApiKeyChange,
  onModelChange,
  onResetProfile,
}: ChatInterfaceProps) {
  // UI-only local state
  const [mobileView, setMobileView] = useState<'chat' | 'preview'>('chat');
  const [sidePanel, setSidePanel] = useState<'chat' | 'history' | 'saved' | 'gallery'>('chat');
  const [showSettings, setShowSettings] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Shared state lifted to break circular deps between hooks
  const [activeConversationId, setActiveConversationId] = useState('');
  const [storageReady, setStorageReady] = useState(false);

  const fieldInfo = useMemo(() => FIELDS.find((f) => f.id === profile.field), [profile.field]);
  const fieldLabel = fieldInfo?.label ?? profile.fieldCustom ?? '';

  // 1. Tool preview (standalone)
  const preview = useToolPreview(apiKey);

  // 2. Saved tools (needs storageReady from conversations init)
  const savedTools = useSavedTools(storageReady, preview.tool, fieldLabel);

  // 3. Chat session (needs activeConversationId)
  const chatSession = useChatSession({
    profile,
    apiKey,
    model,
    activeConversationId,
    setActiveConversationId,
    onToolGenerated: useCallback(
      (parsed: import('@/types').GeneratedTool) => {
        preview.setToolFromGeneration(parsed);
        preview.setToolSaved(false);
      },
      [preview.setToolFromGeneration, preview.setToolSaved],
    ),
    setMobileView,
  });

  // 4. Conversations (needs setters from chatSession + savedTools + preview)
  const conversations = useConversations({
    activeConversationId,
    setActiveConversationId,
    setStorageReady,
    setMessages: chatSession.setMessages,
    setSavedTools: savedTools.setSavedTools,
    setCommunityTools: savedTools.setCommunityTools,
    setTool: preview.setTool,
    setLastFailedInput: chatSession.setLastFailedInput,
  });

  // Debounced save on message change
  useEffect(() => {
    if (!storageReady || chatSession.messages.length === 0 || !activeConversationId) return;
    const timeout = setTimeout(() => {
      conversations.saveConversation(chatSession.messages);
    }, 500);
    return () => clearTimeout(timeout);
  }, [chatSession.messages, storageReady, activeConversationId, conversations.saveConversation]);

  // Bridge: save + publish set toolSaved
  const handleSaveTool = useCallback(() => {
    if (savedTools.handleSaveTool()) {
      preview.setToolSaved(true);
    }
  }, [savedTools.handleSaveTool, preview.setToolSaved]);

  const handlePublishTool = useCallback(() => {
    savedTools.handlePublishTool();
    preview.setToolSaved(true);
  }, [savedTools.handlePublishTool, preview.setToolSaved]);

  const handleLoadTool = useCallback(
    (saved: SavedTool) => {
      preview.handleLoadTool(saved);
      setSidePanel('chat');
      setMobileView('preview');
    },
    [preview.handleLoadTool],
  );

  const handleClearAndClose = useCallback(() => {
    conversations.handleClearChat();
    setShowClearConfirm(false);
  }, [conversations.handleClearChat]);

  return (
    <div className="h-screen flex flex-col bg-sand-50">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-sand-200 bg-sand-50/90 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-forge-600 flex items-center justify-center shadow-sm">
            <span className="text-white text-base">{'\uD83C\uDF3F'}</span>
          </div>
          <div>
            <h1 className="font-display text-lg font-bold text-ink-900 leading-tight">Research Forge</h1>
            <p className="text-xs text-ink-400">
              {fieldInfo?.icon} {fieldLabel} モード
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={conversations.handleNewConversation} className="gap-1.5">
            <MessageSquarePlus className="w-3.5 h-3.5" />
            新しい会話
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowClearConfirm(true)}
            disabled={chatSession.messages.length === 0}
          >
            チャットを削除
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowSettings(true)} className="gap-1.5">
            <Settings className="w-3.5 h-3.5" />
            設定
          </Button>
        </div>
      </header>

      {showSettings && (
        <Suspense fallback={null}>
          <SettingsModal
            isOpen={showSettings}
            onClose={() => setShowSettings(false)}
            apiKey={apiKey}
            model={model}
            onApiKeyChange={onApiKeyChange}
            onModelChange={onModelChange}
            onResetProfile={onResetProfile}
          />
        </Suspense>
      )}

      <Dialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>会話を削除</DialogTitle>
            <DialogDescription>この会話を削除してもよろしいですか？この操作は元に戻せません。</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClearConfirm(false)}>
              キャンセル
            </Button>
            <Button variant="destructive" onClick={handleClearAndClose}>
              削除する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mobile Tab Bar */}
      <div className="flex md:hidden border-b border-sand-200 bg-white">
        <button
          onClick={() => setMobileView('chat')}
          className={`flex-1 py-2.5 text-sm font-medium text-center transition-colors ${mobileView === 'chat' ? 'text-forge-700 border-b-2 border-forge-600' : 'text-ink-400'}`}
        >
          チャット
        </button>
        <button
          onClick={() => setMobileView('preview')}
          className={`flex-1 py-2.5 text-sm font-medium text-center transition-colors ${mobileView === 'preview' ? 'text-forge-700 border-b-2 border-forge-600' : 'text-ink-400'}`}
        >
          プレビュー {preview.tool ? '●' : ''}
        </button>
      </div>

      {/* Main */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel */}
        <div
          className={`w-full md:w-[42%] flex-col border-r border-sand-200 bg-white ${mobileView === 'chat' ? 'flex' : 'hidden md:flex'}`}
        >
          <Tabs
            value={sidePanel}
            onValueChange={(v) => setSidePanel(v as typeof sidePanel)}
            className="flex flex-col flex-1 overflow-hidden"
          >
            <TabsList className="border-b border-sand-200 rounded-none bg-transparent shrink-0">
              <TabsTrigger value="chat">
                <Sparkles className="w-3.5 h-3.5" />
                チャット
              </TabsTrigger>
              <TabsTrigger value="history">
                <MessageSquarePlus className="w-3.5 h-3.5" />
                履歴({conversations.conversations.length})
              </TabsTrigger>
              <TabsTrigger value="saved">
                <Bookmark className="w-3.5 h-3.5" />
                保存済み({savedTools.savedTools.length})
              </TabsTrigger>
              <TabsTrigger value="gallery">
                <BookOpen className="w-3.5 h-3.5" />
                ギャラリー
              </TabsTrigger>
            </TabsList>

            <TabsContent value="chat" className="flex flex-col flex-1 overflow-hidden">
              <ChatPanel
                messages={chatSession.messages}
                input={chatSession.input}
                isLoading={chatSession.isLoading}
                chatError={chatSession.chatError}
                lastFailedInput={chatSession.lastFailedInput}
                fieldLabel={fieldLabel}
                researchTheme={profile.researchTheme}
                onInputChange={chatSession.setInput}
                onSend={chatSession.handleSend}
                onKeyDown={chatSession.handleKeyDown}
                onRetry={chatSession.handleRetry}
                onOpenInNewTab={preview.handleOpenInNewTab}
                onStop={chatSession.stop}
                onSuggestionClick={chatSession.setInput}
              />
            </TabsContent>

            <TabsContent value="history" className="flex-1 overflow-auto p-4">
              <ConversationHistory
                conversations={conversations.conversations}
                activeConversationId={activeConversationId}
                onSwitch={conversations.handleSwitchConversation}
                onDelete={conversations.handleDeleteConversation}
              />
            </TabsContent>

            <TabsContent value="saved" className="flex-1 overflow-auto p-4">
              <SavedToolsList
                savedTools={savedTools.savedTools}
                onLoadTool={handleLoadTool}
                onDeleteTool={savedTools.handleDeleteSavedTool}
              />
            </TabsContent>

            <TabsContent value="gallery" className="flex-1 overflow-auto p-4">
              <GalleryPanel
                communityTools={savedTools.communityTools}
                onLoadTool={handleLoadTool}
                onDeleteTool={savedTools.handleDeleteGalleryTool}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Right: Preview Panel */}
        <ToolPreviewPanel
          tool={preview.tool}
          previewTab={preview.previewTab}
          customParams={preview.customParams}
          toolSaved={preview.toolSaved}
          iframeSrcDoc={preview.iframeSrcDoc}
          iframeRef={preview.iframeRef}
          mobileView={mobileView}
          onPreviewTabChange={(v) => preview.setPreviewTab(v as 'preview' | 'about' | 'customize' | 'code')}
          onSaveTool={handleSaveTool}
          onPublishTool={handlePublishTool}
          onOpenInNewTab={preview.handleOpenInNewTab}
          onDownload={preview.handleDownload}
          onParamChange={preview.handleParamChange}
        />
      </div>
    </div>
  );
}
