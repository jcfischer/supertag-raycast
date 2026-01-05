import { showToast, Toast, open, Clipboard } from "@raycast/api";

/**
 * Fallback action types
 */
export type FallbackAction = "retry" | "terminal" | "clipboard" | "none";

/**
 * Fallback configuration
 */
export interface Fallback {
  action: FallbackAction;
  label: string;
  data?: string;
}

/**
 * Show error toast with optional fallback actions
 */
export async function showErrorWithFallback(
  error: string,
  fallbacks: Fallback[] = [],
): Promise<void> {
  const primaryAction =
    fallbacks.length > 0
      ? {
          title: fallbacks[0].label,
          onAction: () => executeFallback(fallbacks[0]),
        }
      : undefined;

  await showToast({
    style: Toast.Style.Failure,
    title: "Error",
    message: error,
    primaryAction,
  });
}

/**
 * Execute a fallback action
 */
export async function executeFallback(fallback: Fallback): Promise<void> {
  switch (fallback.action) {
    case "terminal":
      // Open Terminal with k command
      const command = fallback.data || "k";
      await open(`terminal://run?command=${encodeURIComponent(command)}`);
      break;

    case "clipboard":
      if (fallback.data) {
        await Clipboard.copy(fallback.data);
        await showToast({
          style: Toast.Style.Success,
          title: "Copied to clipboard",
        });
      }
      break;

    case "retry":
      // Retry is handled by the caller
      break;

    case "none":
    default:
      break;
  }
}

/**
 * Create standard fallbacks for common scenarios
 */
export function createStandardFallbacks(
  command: string,
  clipboardData?: string,
): Fallback[] {
  const fallbacks: Fallback[] = [
    {
      action: "terminal",
      label: "Open in Terminal",
      data: command,
    },
  ];

  if (clipboardData) {
    fallbacks.push({
      action: "clipboard",
      label: "Copy to Clipboard",
      data: clipboardData,
    });
  }

  return fallbacks;
}

/**
 * Show success toast
 */
export async function showSuccess(
  title: string,
  message?: string,
): Promise<void> {
  await showToast({
    style: Toast.Style.Success,
    title,
    message,
  });
}

/**
 * Show loading toast
 */
export async function showLoading(message: string): Promise<Toast> {
  return await showToast({
    style: Toast.Style.Animated,
    title: "Loading",
    message,
  });
}
