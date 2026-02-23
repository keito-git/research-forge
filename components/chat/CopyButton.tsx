'use client';

import { Check, Copy } from 'lucide-react';
import { useCallback, useState } from 'react';

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);
  return (
    <button
      onClick={handleCopy}
      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-sand-200"
      title="コピー"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-forge-600" /> : <Copy className="w-3.5 h-3.5 text-ink-400" />}
    </button>
  );
}
