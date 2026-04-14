import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
          <div className="max-w-md w-full neu-surface p-8 text-center space-y-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="text-accent-red" size={32} />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-[#1c1917]">Something went wrong</h2>
              <p className="text-gray-500 text-sm">
                We've encountered an unexpected error. Our team has been notified.
              </p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="w-full btn-primary py-3 flex items-center justify-center gap-2"
            >
              <RefreshCw size={20} />
              <span>Reload Application</span>
            </button>
            {process.env.NODE_ENV !== 'production' && (
              <pre className="text-left text-[10px] bg-gray-100 p-4 rounded overflow-auto max-h-40">
                {this.state.error?.message}
                {this.state.error?.stack}
              </pre>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
