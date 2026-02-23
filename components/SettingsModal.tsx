'use client';

import { useState } from 'react';
import { X, Key, Eye, EyeOff, Check, AlertCircle, User, Cpu } from 'lucide-react';
import ApiKeyGuide from './ApiKeyGuide';

const MODELS = [
  { id: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4', desc: '⚡ 速い・安い（$3/$15）', tag: 'おすすめ' },
  { id: 'claude-sonnet-4-5-20250929', label: 'Claude Sonnet 4.5', desc: '⚡ 高速・高性能（$3/$15）', tag: '' },
  { id: 'claude-opus-4-20250514', label: 'Claude Opus 4', desc: '🧠 高品質・遅め（$15/$75）', tag: '' },
  { id: 'claude-opus-4-5-20250527', label: 'Claude Opus 4.5', desc: '🧠 高品質（$5/$25）', tag: '' },
  { id: 'claude-opus-4-6', label: 'Claude Opus 4.6', desc: '🧠 最高性能・遅い（$5/$25）', tag: '最新' },
];

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  model: string;
  onApiKeyChange: (key: string) => void;
  onModelChange: (model: string) => void;
  onResetProfile: () => void;
}

export default function SettingsModal({
  isOpen,
  onClose,
  apiKey,
  model,
  onApiKeyChange,
  onModelChange,
  onResetProfile,
}: SettingsModalProps) {
  const [localKey, setLocalKey] = useState(apiKey);
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  if (!isOpen) return null;

  const handleSave = () => {
    onApiKeyChange(localKey.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleTest = async () => {
    if (!localKey.trim()) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'テスト。「OK」とだけ返してください。' }],
          profile: { field: 'other' },
          apiKey: localKey.trim(),
          model,
        }),
      });
      setTestResult(res.ok ? 'success' : 'error');
    } catch {
      setTestResult('error');
    }
    setTesting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-950/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
        <div className="flex items-center justify-between px-6 py-4 border-b border-sand-200">
          <h2 className="font-display text-lg font-bold text-ink-900">設定</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-sand-100 transition-colors">
            <X className="w-4 h-4 text-ink-500" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* API Key Section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Key className="w-4 h-4 text-forge-600" />
              <h3 className="font-medium text-ink-800">APIキー</h3>
            </div>
            <div className="space-y-3">
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={localKey}
                  onChange={e => { setLocalKey(e.target.value); setTestResult(null); }}
                  placeholder="sk-ant-..."
                  className="w-full px-4 py-3 pr-20 rounded-xl border-2 border-sand-200 bg-sand-50 focus:border-forge-500 focus:bg-white focus:outline-none transition-all font-mono text-sm"
                />
                <button onClick={() => setShowKey(!showKey)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-sand-200 transition-colors" title={showKey ? 'キーを隠す' : 'キーを表示'}>
                  {showKey ? <EyeOff className="w-4 h-4 text-ink-400" /> : <Eye className="w-4 h-4 text-ink-400" />}
                </button>
              </div>

              {testResult && (
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${testResult === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                  {testResult === 'success' ? <><Check className="w-4 h-4" />APIキーは有効です</> : <><AlertCircle className="w-4 h-4" />APIキーが無効です</>}
                </div>
              )}

              <div className="flex gap-2">
                <button onClick={handleTest} disabled={!localKey.trim() || testing} className="px-4 py-2 rounded-lg border border-sand-300 text-sm text-ink-600 hover:bg-sand-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                  {testing ? '確認中...' : '接続テスト'}
                </button>
                <button onClick={handleSave} disabled={!localKey.trim()} className="flex-1 py-2 rounded-lg bg-forge-600 text-white text-sm font-medium hover:bg-forge-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                  {saved ? '✓ 保存しました' : '保存'}
                </button>
              </div>

              <p className="text-xs text-ink-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                キーはブラウザ内にのみ保存されます
              </p>
            </div>
          </div>

          {/* Model Selection */}
          <div className="pt-2 border-t border-sand-200">
            <div className="flex items-center gap-2 mb-3">
              <Cpu className="w-4 h-4 text-forge-600" />
              <h3 className="font-medium text-ink-800">AIモデル</h3>
            </div>
            <div className="space-y-2">
              {MODELS.map(m => (
                <button
                  key={m.id}
                  onClick={() => onModelChange(m.id)}
                  className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${model === m.id ? 'border-forge-500 bg-forge-50' : 'border-sand-200 bg-sand-50 hover:border-sand-300'}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm text-ink-800">{m.label}</span>
                    <div className="flex items-center gap-2">
                      {m.tag && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${m.tag === 'おすすめ' ? 'bg-forge-100 text-forge-700' : 'bg-amber-100 text-amber-700'}`}>{m.tag}</span>
                      )}
                      {model === m.id && <Check className="w-4 h-4 text-forge-600" />}
                    </div>
                  </div>
                  <p className="text-xs text-ink-400 mt-0.5">{m.desc}</p>
                </button>
              ))}
            </div>
            <p className="text-xs text-ink-400 mt-2">
              ⚠️ Opusモデルは高品質ですが応答に時間がかかり、Vercel無料プランではタイムアウトする場合があります
            </p>
          </div>

          {/* API Key Guide */}
          <ApiKeyGuide compact />

          {/* Profile Section */}
          <div className="pt-2 border-t border-sand-200">
            <div className="flex items-center gap-2 mb-3">
              <User className="w-4 h-4 text-forge-600" />
              <h3 className="font-medium text-ink-800">プロフィール</h3>
            </div>
            <button onClick={() => { onResetProfile(); onClose(); }} className="w-full py-2.5 rounded-lg border border-sand-300 text-sm text-ink-600 hover:bg-sand-100 transition-all">
              専門分野を変更する
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
