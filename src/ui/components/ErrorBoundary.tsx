import { Component, type ReactNode } from "react";
import { Box, Text } from "ink";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary for Ink UI.
 * Catches uncaught errors in the component tree and shows a fallback UI
 * instead of crashing the entire terminal application.
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: object): void {
    // Log to stderr so it doesn't interfere with Ink's output
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <Box flexDirection="column" paddingX={1} marginTop={1}>
          <Box
            borderStyle="round"
            borderColor="red"
            paddingX={1}
            paddingY={1}
            flexDirection="column"
          >
            <Text bold color="red">
              ⚠️ Something went wrong
            </Text>
            <Text dimColor>{this.state.error?.message || "Unknown error"}</Text>
            <Text dimColor>Press Ctrl+C twice to exit, or /clear to reset</Text>
          </Box>
        </Box>
      );
    }

    return this.props.children;
  }
}
