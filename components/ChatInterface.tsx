'use client';

import { Plus, Settings, Trash2 } from 'lucide-react';
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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
    onToolGenerated: preview.setToolFromGeneration,
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

  // Ref to break saveConversation -> conversations -> saveConversation dependency cycle
  const saveConversationRef = useRef(conversations.saveConversation);
  saveConversationRef.current = conversations.saveConversation;

  // Debounced save on message change
  useEffect(() => {
    if (!storageReady || chatSession.messages.length === 0 || !activeConversationId) return;
    const timeout = setTimeout(() => {
      saveConversationRef.current(chatSession.messages);
    }, 500);
    return () => clearTimeout(timeout);
  }, [chatSession.messages, storageReady, activeConversationId]);

  // Bridge: save + publish set toolSaved
  const handleSaveTool = useCallback(() => {
    if (savedTools.handleSaveTool()) {
      preview.setToolSaved(true);
    }
  }, [savedTools.handleSaveTool, preview.setToolSaved]);

  const handlePublishTool = useCallback(() => {
    if (!preview.tool) return;
    savedTools.handlePublishTool();
    preview.setToolSaved(true);
  }, [savedTools.handlePublishTool, preview.setToolSaved, preview.tool]);

  const handleLoadTool = useCallback(
    (saved: SavedTool) => {
      preview.handleLoadTool(saved);
      setSidePanel('chat');
      setMobileView('preview');
    },
    [preview.handleLoadTool],
  );

  const handleSwitchConversation = useCallback(
    (conv: import('@/types').Conversation) => {
      conversations.handleSwitchConversation(conv);
      setSidePanel('chat');
    },
    [conversations.handleSwitchConversation],
  );

  const handleClearAndClose = useCallback(() => {
    conversations.handleClearChat();
    setShowClearConfirm(false);
  }, [conversations.handleClearChat]);

  return (
    <div className="h-screen flex flex-col bg-sand-50">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-2.5 border-b border-sand-200/80 bg-sand-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-forge-600 flex items-center justify-center">
            <span className="text-white text-sm">{'\uD83C\uDF3F'}</span>
          </div>
          <div>
            <h1 className="font-display text-base font-bold text-ink-900 leading-tight">Research Forge</h1>
            <p className="text-[11px] text-ink-400">
              {fieldInfo?.icon} {fieldLabel}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={conversations.handleNewConversation} className="w-8 h-8">
                <Plus className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>新しい会話</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowClearConfirm(true)}
                disabled={chatSession.messages.length === 0}
                className="w-8 h-8"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>チャットを削除</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => setShowSettings(true)} className="w-8 h-8">
                <Settings className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>設定</TooltipContent>
          </Tooltip>
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
        {/* Left Panel — the workbench */}
        <div
          className={`w-full md:w-[42%] flex-col border-r border-sand-300/60 bg-white ${mobileView === 'chat' ? 'flex' : 'hidden md:flex'}`}
        >
          <Tabs
            value={sidePanel}
            onValueChange={(v) => setSidePanel(v as typeof sidePanel)}
            className="flex flex-col flex-1 overflow-hidden"
          >
            <TabsList className="border-b border-sand-200/70 rounded-none bg-transparent shrink-0 px-3">
              <TabsTrigger value="chat">チャット</TabsTrigger>
              <TabsTrigger value="history">
                履歴
                {conversations.conversations.length > 0 && (
                  <span className="text-[10px] text-ink-400 tabular-nums">{conversations.conversations.length}</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="saved">
                保存済み
                {savedTools.savedTools.length > 0 && (
                  <span className="text-[10px] text-ink-400 tabular-nums">{savedTools.savedTools.length}</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="gallery">ギャラリー</TabsTrigger>
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
                onSwitch={handleSwitchConversation}
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
          onPreviewTabChange={preview.setPreviewTab}
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
