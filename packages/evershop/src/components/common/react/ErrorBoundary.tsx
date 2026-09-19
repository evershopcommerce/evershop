import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';
import { reportClientError } from './client/reportClientError.js';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Root error boundary for the hydrated `#app` tree. React 19 still has no
 * function-component equivalent, so this stays a class. A throw in any route or
 * extension component renders the fallback instead of blanking the whole app,
 * and the error is surfaced through the client reporter.
 */
export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    reportClientError('render', error, info);
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="p-8 text-center text-muted-foreground">
            {_('Something went wrong. Please refresh the page.')}
          </div>
        )
      );
    }
    return this.props.children;
  }
}
