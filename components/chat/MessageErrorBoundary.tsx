'use client';

import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class MessageErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.warn('ChatBubble render error:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex gap-3">
          <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-sand-50 text-ink-400 rounded-tl-md text-sm">
            メッセージの表示中にエラーが発生しました
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
