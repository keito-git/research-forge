'use client';

import { useState } from 'react';
import { ExternalLink, Key, Copy, Check, ShieldCheck } from 'lucide-react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';

interface ApiKeyGuideProps {
  compact?: boolean;
}

export default function ApiKeyGuide({ compact = false }: ApiKeyGuideProps) {
  const [expanded, setExpanded] = useState(!compact);
  const [copied, setCopied] = useState(false);

  const copyUrl = () => {
    navigator.clipboard.writeText('https://console.anthropic.com/');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (compact) {
    return (
      <Collapsible open={expanded} onOpenChange={setExpanded} className="rounded-xl border border-amber-200 bg-amber-50/80 overflow-hidden">
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between px-4 py-3 text-left">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-800">APIキーの取得方法</span>
            </div>
            <svg className={`w-4 h-4 text-amber-500 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <GuideContent onCopyUrl={copyUrl} copied={copied} />
        </CollapsibleContent>
      </Collapsible>
    );
  }

  return (
    <div className="rounded-xl border-2 border-amber-200 bg-amber-50/80 overflow-hidden">
      <div className="px-5 py-4 border-b border-amber-200 bg-amber-100/50">
        <div className="flex items-center gap-2">
          <Key className="w-5 h-5 text-amber-600" />
          <h3 className="font-medium text-amber-900">APIキーの取得方法</h3>
        </div>
        <p className="text-sm text-amber-700 mt-1">
          Research Forgeを使うには、AnthropicのAPIキーが必要です。以下の手順で無料で取得できます。
        </p>
      </div>
      <GuideContent onCopyUrl={copyUrl} copied={copied} />
    </div>
  );
}

function GuideContent({ onCopyUrl, copied }: { onCopyUrl: () => void; copied: boolean }) {
  return (
    <div className="px-5 py-4 space-y-4">
      <div className="space-y-3">
        {[
          {
            step: '1',
            title: 'Anthropicのサイトにアクセス',
            desc: (
              <div className="flex items-center gap-2 flex-wrap">
                <a
                  href="https://console.anthropic.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-amber-700 underline underline-offset-2 hover:text-amber-900 transition-colors"
                >
                  console.anthropic.com
                  <ExternalLink className="w-3 h-3" />
                </a>
                <Button variant="ghost" size="sm" onClick={onCopyUrl} className="h-auto px-2 py-0.5 text-xs bg-amber-200/60 text-amber-700 hover:bg-amber-200">
                  {copied ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                  {copied ? 'コピー済み' : 'URLをコピー'}
                </Button>
              </div>
            ),
          },
          {
            step: '2',
            title: 'アカウントを作成（無料）',
            desc: <span>メールアドレスまたはGoogleアカウントでサインアップします</span>,
          },
          {
            step: '3',
            title: 'APIキーを発行',
            desc: (
              <span>
                ダッシュボードの「API Keys」→「Create Key」で新しいキーを作成します。
                キーは <code className="px-1.5 py-0.5 rounded bg-amber-200/60 text-amber-800 text-xs font-mono">sk-ant-...</code> で始まります
              </span>
            ),
          },
          {
            step: '4',
            title: 'このページに貼り付け',
            desc: <span>発行されたキーをコピーして、下の入力欄に貼り付けてください</span>,
          },
        ].map(item => (
          <div key={item.step} className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-amber-200 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-bold text-amber-800">{item.step}</span>
            </div>
            <div>
              <p className="text-sm font-medium text-amber-900">{item.title}</p>
              <div className="text-sm text-amber-700 mt-0.5">{item.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-start gap-2 pt-2 border-t border-amber-200">
        <ShieldCheck className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-amber-600 leading-relaxed">
          APIキーはあなたのブラウザ内にのみ保存され、外部サーバーに送信されることはありません。
          APIの利用料金はAnthropicのアカウントに直接課金されます。
        </p>
      </div>
    </div>
  );
}
