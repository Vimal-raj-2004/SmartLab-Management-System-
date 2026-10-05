import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * ErrorBoundary — catches React render errors and shows a friendly fallback.
 * Wrap any subtree to prevent white-screen crashes.
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    this.setState({ info });
    console.error('[ErrorBoundary] Caught error:', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, info: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6 px-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white mb-2">Something went wrong</h2>
            <p className="text-slate-400 text-sm max-w-md">
              {this.state.error?.message || 'An unexpected error occurred while rendering this page.'}
            </p>
          </div>
          <button
            onClick={this.handleReset}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
          {import.meta.env.DEV && this.state.info && (
            <details className="text-left max-w-2xl w-full">
              <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-400">
                Show technical details (dev only)
              </summary>
              <pre className="mt-2 p-4 bg-slate-800 rounded-xl text-xs text-red-300 overflow-auto whitespace-pre-wrap">
                {this.state.error?.stack}
                {'\n\nComponent Stack:'}
                {this.state.info.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
