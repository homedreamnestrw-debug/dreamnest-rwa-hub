import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: unknown) {
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary]", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
          <div className="max-w-lg w-full rounded-lg border bg-card p-6 shadow-sm">
            <h1 className="font-serif text-2xl mb-2">Something went wrong</h1>
            <p className="text-sm text-muted-foreground mb-4">
              The page failed to render. Try reloading. If it keeps happening, share the
              message below with support.
            </p>
            <pre className="text-xs bg-muted rounded p-3 overflow-auto max-h-48 whitespace-pre-wrap break-words">
              {this.state.error.message}
            </pre>
            <button
              className="mt-4 inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm text-primary-foreground"
              onClick={() => window.location.reload()}
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
