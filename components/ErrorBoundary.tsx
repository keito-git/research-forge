'use client';

import { Component, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-sand-50 px-4">
          <div className="text-center max-w-md">
            <div className="text-5xl mb-4">🔧</div>
            <h1 className="font-display text-2xl font-bold text-ink-900 mb-2">エラーが発生しました</h1>
            <p className="text-ink-500 mb-6 text-sm leading-relaxed">
              予期しないエラーが発生しました。ページを再読み込みしてください。
            </p>
            <Button onClick={() => window.location.reload()}>ページを再読み込み</Button>
            {this.state.error && (
              <pre className="mt-6 text-left text-xs text-ink-400 bg-sand-100 rounded-xl p-4 overflow-x-auto">
                {this.state.error.message}
              </pre>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
