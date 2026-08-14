import { Component, type ErrorInfo, type ReactNode } from 'react';

interface State { error: Error | null }

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State { return { error }; }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled application error', error, info);
  }

  render() {
    if (this.state.error) {
      return <main className="fatal-error"><div><p className="eyebrow">APPLICATION ERROR</p><h1>アプリを表示できませんでした</h1><p>{this.state.error.message}</p><button type="button" onClick={() => window.location.reload()}>再読み込み</button></div></main>;
    }
    return this.props.children;
  }
}

