import { useStdout } from "ink";

/**
 * Hook to get terminal width.
 *
 * Simply reads `stdout.columns` from Ink's StdoutContext during render.
 * Ink already triggers a full React re-render on resize (via its internal
 * `onRender()`). No extra resize subscriber needed — that was the root cause
 * of terminal duplication on resize.
 */
export function useTerminalWidth(): number {
  const { stdout } = useStdout();
  return stdout?.columns ?? 80;
}
