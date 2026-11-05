import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';

interface State {
  error: Error | null;
}

/** Contains a crash to the current page so navigation and the rest of the shell keep working. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Page crashed:', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <Card>
        <EmptyState
          icon={AlertTriangle}
          title="Something went wrong on this page"
          description={this.state.error.message}
          action={<Button onClick={() => this.setState({ error: null })}>Try again</Button>}
        />
      </Card>
    );
  }
}
