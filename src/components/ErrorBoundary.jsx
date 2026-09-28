/**
 * Catches render-time crashes anywhere below it.
 *
 * Without this a single bad render leaves a blank white page and a console
 * message nobody sees. The old version printed the raw error message straight
 * into a red box, which is unreadable ("Objects are not valid as a React child")
 * and tells a merchant nothing about what to do next.
 *
 * This one says what happened in plain language, offers a retry that does not
 * throw away the session, and keeps the technical detail behind a disclosure
 * that is only useful in development.
 */
import { Component } from 'react';
import { AlertTriangle, RefreshCw, Home, ChevronDown } from 'lucide-react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, details: false };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Keep the stack for the console; the screen never needs it.
    console.error('[ui] render failed:', error, info?.componentStack);
  }

  /** Retry without a full reload: a transient bad render often succeeds. */
  handleRetry = () => this.setState({ error: null });

  render() {
    const { error, details } = this.state;
    if (!error) return this.props.children;

    const isDev = Boolean(import.meta.env?.DEV);
    const message = error?.message || 'The page ran into an unexpected problem.';

    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
              <AlertTriangle size={18} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-slate-900">This page ran into a problem</h1>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                Nothing you did wrong caused this. The rest of the app still works - you can
                try again, or go back to your dashboard.
              </p>
            </div>
          </div>

          {isDev ? (
            <p className="mt-4 rounded-lg bg-slate-50 p-3 font-mono text-xs leading-relaxed text-slate-700">
              {message}
            </p>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={this.handleRetry}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              <RefreshCw size={15} aria-hidden="true" />Try again
            </button>
            <button
              type="button"
              onClick={() => { window.location.href = '/'; }}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <Home size={15} aria-hidden="true" />Go to dashboard
            </button>
          </div>

          {error?.stack ? (
            <div className="mt-4">
              <button
                type="button"
                onClick={() => this.setState((s) => ({ details: !s.details }))}
                aria-expanded={details}
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-700"
              >
                <ChevronDown size={12} className={details ? 'rotate-180 transition' : 'transition'} aria-hidden="true" />
                {details ? 'Hide technical details' : 'Technical details'}
              </button>
              {details ? (
                <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-slate-900 p-3 font-mono text-[11px] leading-relaxed text-slate-100">
                  {String(error.stack)}
                </pre>
              ) : null}
            </div>
          ) : null}
        </div>
      </main>
    );
  }
}
