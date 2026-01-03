import {
  showToast,
  Toast,
  Clipboard,
  LaunchProps,
  showHUD,
} from "@raycast/api";
import { exportContext } from "./lib/cli";
import { showErrorWithFallback, createStandardFallbacks } from "./lib/fallbacks";

interface ExportContextArguments {
  profile?: "minimal" | "standard" | "full";
}

export default async function Command(
  props: LaunchProps<{ arguments: ExportContextArguments }>
) {
  const profile = props.arguments.profile || "minimal";

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Exporting context...",
    message: `Profile: ${profile}`,
  });

  try {
    const result = await exportContext(profile);

    if (result.success && result.data) {
      const data = result.data as { content: string; tokenCount: number };

      // Copy to clipboard
      await Clipboard.copy(data.content);

      toast.style = Toast.Style.Success;
      toast.title = "Context exported!";
      toast.message = `${data.tokenCount} tokens copied to clipboard`;

      // Also show HUD for quick feedback
      await showHUD(`✓ ${profile} context copied (${data.tokenCount} tokens)`);
    } else {
      toast.hide();
      await showErrorWithFallback(
        result.error || "Failed to export context",
        createStandardFallbacks(`k context export --profile ${profile}`)
      );
    }
  } catch (error) {
    toast.hide();
    await showErrorWithFallback(
      error instanceof Error ? error.message : "Unknown error",
      createStandardFallbacks(`k context export --profile ${profile}`)
    );
  }
}
