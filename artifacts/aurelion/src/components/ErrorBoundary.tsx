import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  /** Optional custom fallback — overrides the default "Something went wrong" UI. */
  fallback?: ReactNode;
  /** Label shown in the error card heading (e.g. "Activities", "Itinerary"). */
  section?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * React class-based Error Boundary.
 * Catches render-phase errors in its subtree and shows a friendly fallback UI
 * instead of an empty screen. Wrapping major page sections prevents one broken
 * component from blanking the entire page.
 *
 * Usage:
 *   <ErrorBoundary section="Activities">
 *     <ActivitiesList />
 *   </ErrorBoundary>
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // In production this is where you'd report to Sentry / Datadog
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      const section = this.props.section ?? "this section";

      return (
        <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-destructive/70" />
          </div>
          <h3 className="font-serif text-2xl text-foreground mb-3">Something went wrong</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            We couldn't load {section}. Please try again — if the problem persists,
            refreshing the page usually helps.
          </p>
          <div className="flex gap-3 justify-center">
            <Button
              variant="outline"
              onClick={this.handleReset}
              className="font-serif uppercase tracking-widest"
            >
              Try Again
            </Button>
            <Button
              variant="ghost"
              onClick={() => window.location.reload()}
              className="font-serif uppercase tracking-widest text-muted-foreground"
            >
              Refresh Page
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
