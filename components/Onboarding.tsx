'use client';

import { useState } from 'react';
import { FIELDS, type FieldId, type UserProfile } from '@/lib/prompts';
import { Key, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import ApiKeyGuide from './ApiKeyGuide';

interface OnboardingProps {
  onComplete: (profile: UserProfile, apiKey: string) => void;
  initialApiKey?: string;
}

export default function Onboarding({ onComplete, initialApiKey = '' }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const [field, setField] = useState<FieldId | null>(null);
  const [fieldCustom, setFieldCustom] = useState('');
  const [researchTheme, setResearchTheme] = useState('');
  const [currentTools, setCurrentTools] = useState<string[]>([]);
  const [purpose, setPurpose] = useState('');
  const [apiKey, setApiKey] = useState(initialApiKey);
  const [showKey, setShowKey] = useState(false);

  const tools = ['Word', 'Excel', 'SPSS', 'R', 'NVivo', 'Python', 'KH Coder', '特になし'];
  const purposes = ['研究データ分析', '教育用ツール作成', '文献整理', 'データ可視化', 'その他'];

  const handleComplete = () => {
    if (!field || !apiKey.trim()) return;
    onComplete(
      {
        field,
        fieldCustom: field === 'other' ? fieldCustom : undefined,
        researchTheme: researchTheme || undefined,
        currentTools: currentTools.length ? currentTools : undefined,
        purpose: purpose || undefined,
      },
      apiKey.trim()
    );
  };

  const toggleTool = (tool: string) => {
    setCurrentTools(prev =>
      prev.includes(tool) ? prev.filter(t => t !== tool) : [...prev, tool]
    );
  };

  const stepLabels = ['APIキー', '専門分野', '詳細設定'];

  return (
    <div className="min-h-screen flex items-center justify-center bg-sand-50 px-4 py-8">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-forge-100 text-forge-700 text-sm font-medium mb-6">
            <span className="w-2 h-2 rounded-full bg-forge-500 animate-pulse-soft" />
            Research Forge
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-ink-900 mb-4 tracking-tight">
            {step === 0 ? 'はじめに' : step === 1 ? '専門分野' : '詳細設定'}
          </h1>
          <p className="text-ink-500 text-lg max-w-md mx-auto leading-relaxed">
            {step === 0 && 'AIツール生成に必要なAPIキーを設定します'}
            {step === 1 && 'あなたの専門分野を教えてください'}
            {step === 2 && '研究についてもう少し教えてください（任意）'}
          </p>
        </div>

        {/* Step Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {stepLabels.map((label, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${i < step ? 'bg-forge-500 text-white' : i === step ? 'bg-forge-600 text-white shadow-md' : 'bg-sand-200 text-ink-400'}`}>
                {i < step ? '✓' : i + 1}
              </div>
              <span className={`text-xs hidden sm:inline ${i === step ? 'text-forge-700 font-medium' : 'text-ink-400'}`}>{label}</span>
              {i < 2 && <div className={`w-8 h-0.5 ${i < step ? 'bg-forge-400' : 'bg-sand-200'}`} />}
            </div>
          ))}
        </div>

        {/* Step 0: API Key */}
        {step === 0 && (
          <div className="animate-slide-up space-y-5">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-ink-600 mb-2">
                <Key className="w-4 h-4" />
                Anthropic APIキー <span className="text-forge-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder="sk-ant-..."
                  className="w-full px-4 py-3.5 pr-12 rounded-xl border-2 border-sand-200 bg-white focus:border-forge-500 focus:outline-none transition-colors font-mono text-sm"
                />
                <button onClick={() => setShowKey(!showKey)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-sand-100 transition-colors">
                  {showKey ? <EyeOff className="w-4 h-4 text-ink-400" /> : <Eye className="w-4 h-4 text-ink-400" />}
                </button>
              </div>
              <div className="flex items-center gap-1.5 mt-2">
                <ShieldCheck className="w-3.5 h-3.5 text-forge-500" />
                <p className="text-xs text-ink-400">キーはブラウザ内にのみ保存され、外部に送信されることはありません</p>
              </div>
            </div>
            <ApiKeyGuide />
            <button onClick={() => apiKey.trim() && setStep(1)} disabled={!apiKey.trim()} className="w-full py-3.5 rounded-xl bg-forge-600 text-white font-medium hover:bg-forge-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md">
              次へ
            </button>
          </div>
        )}

        {/* Step 1: Field Selection */}
        {step === 1 && (
          <div className="animate-slide-up">
            <p className="text-sm font-medium text-ink-600 mb-4">専門分野を選択 <span className="text-forge-500">*</span></p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
              {FIELDS.map(f => (
                <button key={f.id} onClick={() => setField(f.id)} className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 transition-all duration-200 text-left ${field === f.id ? 'border-forge-500 bg-forge-50 shadow-sm' : 'border-sand-200 bg-white hover:border-forge-300 hover:bg-forge-50/50'}`}>
                  <span className="text-xl">{f.icon}</span>
                  <span className="font-medium text-ink-800 text-sm">{f.label}</span>
                </button>
              ))}
            </div>
            {field === 'other' && (
              <input type="text" value={fieldCustom} onChange={e => setFieldCustom(e.target.value)} placeholder="専門分野を入力してください" className="w-full px-4 py-3 rounded-xl border-2 border-sand-200 bg-white focus:border-forge-500 focus:outline-none transition-colors mb-6" />
            )}
            <div className="flex gap-3">
              <button onClick={() => setStep(0)} className="px-6 py-3.5 rounded-xl border-2 border-sand-200 text-ink-600 font-medium hover:bg-sand-100 transition-all">戻る</button>
              <button onClick={() => field && setStep(2)} disabled={!field || (field === 'other' && !fieldCustom)} className="flex-1 py-3.5 rounded-xl bg-forge-600 text-white font-medium hover:bg-forge-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md">次へ</button>
            </div>
          </div>
        )}

        {/* Step 2: Optional Details */}
        {step === 2 && (
          <div className="animate-slide-up space-y-6">
            <div>
              <p className="text-sm font-medium text-ink-600 mb-2">研究テーマ（任意）</p>
              <input type="text" value={researchTheme} onChange={e => setResearchTheme(e.target.value)} placeholder="例: 近世日本の都市文化" className="w-full px-4 py-3 rounded-xl border-2 border-sand-200 bg-white focus:border-forge-500 focus:outline-none transition-colors" />
            </div>
            <div>
              <p className="text-sm font-medium text-ink-600 mb-3">普段使っているツール（任意）</p>
              <div className="flex flex-wrap gap-2">
                {tools.map(tool => (
                  <button key={tool} onClick={() => toggleTool(tool)} className={`px-3 py-1.5 rounded-lg text-sm transition-all duration-200 ${currentTools.includes(tool) ? 'bg-forge-500 text-white' : 'bg-white border border-sand-300 text-ink-600 hover:border-forge-400'}`}>{tool}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-ink-600 mb-3">主な利用目的（任意）</p>
              <div className="flex flex-wrap gap-2">
                {purposes.map(pp => (
                  <button key={pp} onClick={() => setPurpose(prev => prev === pp ? '' : pp)} className={`px-3 py-1.5 rounded-lg text-sm transition-all duration-200 ${purpose === pp ? 'bg-forge-500 text-white' : 'bg-white border border-sand-300 text-ink-600 hover:border-forge-400'}`}>{pp}</button>
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setStep(1)} className="px-6 py-3.5 rounded-xl border-2 border-sand-200 text-ink-600 font-medium hover:bg-sand-100 transition-all">戻る</button>
              <button onClick={handleComplete} className="flex-1 py-3.5 rounded-xl bg-forge-600 text-white font-medium hover:bg-forge-700 transition-all duration-200 shadow-sm hover:shadow-md">Research Forge を始める ✨</button>
            </div>
            <p className="text-center text-xs text-ink-400 mt-2">これらの情報はいつでも変更できます</p>
          </div>
        )}
      </div>
    </div>
  );
}
