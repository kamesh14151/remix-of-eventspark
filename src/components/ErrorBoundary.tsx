import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { AlertTriangle, RotateCcw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Caught error in ErrorBoundary:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background text-foreground">
          <Card className="max-w-md w-full border-border shadow-2xl">
            <CardContent className="p-8 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-bold font-display">Something went wrong</h2>
              <p className="text-sm text-muted-foreground break-words">
                {this.state.error?.message || "An unexpected error occurred while rendering the page."}
              </p>
              <div className="pt-2 flex flex-col gap-2">
                <Button onClick={() => window.location.reload()} className="w-full">
                  <RotateCcw className="w-4 h-4 mr-2" /> Reload Page
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <a href="/">Go to Home</a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
