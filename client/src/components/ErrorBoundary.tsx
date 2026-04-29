import { Component, type ReactNode } from "react";

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }): void {
    console.error("Unhandled UI error:", error, info);
  }

  reset = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    if (!this.state.error) return this.props.children;
    return (
      <div className="card max-w-2xl mx-auto mt-12">
        <h1 className="text-2xl font-semibold text-rose-700">Something went wrong</h1>
        <p className="text-sm text-slate-600 mt-2">
          The page crashed unexpectedly. Reload to try again — your work is safe in the database.
        </p>
        <pre className="text-xs text-slate-500 bg-slate-50 p-3 rounded mt-3 overflow-auto">
          {this.state.error.message}
        </pre>
        <div className="flex gap-2 mt-3">
          <button className="btn-primary" onClick={() => location.reload()}>
            Reload
          </button>
          <button className="btn-secondary" onClick={this.reset}>
            Try again
          </button>
        </div>
      </div>
    );
  }
}
