import { Component, type ReactNode } from 'react';
import { NotFoundScreen } from '../screens/NotFoundScreen';

interface ErrorBoundaryProps {
  resetKey: string;
  children: ReactNode;
}

interface ErrorBoundaryState {
  failedAt: string | null;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { failedAt: null };

  static getDerivedStateFromError(): Partial<ErrorBoundaryState> {
    return { failedAt: '' };
  }

  static getDerivedStateFromProps(
    props: ErrorBoundaryProps,
    state: ErrorBoundaryState,
  ): Partial<ErrorBoundaryState> | null {
    if (state.failedAt === '') return { failedAt: props.resetKey };
    if (state.failedAt !== null && state.failedAt !== props.resetKey)
      return { failedAt: null };
    return null;
  }

  render() {
    if (this.state.failedAt === null) return this.props.children;
    return (
      <NotFoundScreen title="Something went wrong on this page.">
        <button
          type="button"
          onClick={() => this.setState({ failedAt: null })}
          className="bg-btn hover:bg-btn-hover inline-flex h-11 items-center rounded-md px-5 font-bold"
        >
          Try again
        </button>
      </NotFoundScreen>
    );
  }
}
