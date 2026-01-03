import {
  List,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Clipboard,
  Icon,
  showHUD,
  popToRoot,
} from "@raycast/api";
import { useState } from "react";
import { exportContext } from "./lib/cli";
import { PROFILES, type Profile } from "./lib/types";
import { showErrorWithFallback, createStandardFallbacks } from "./lib/fallbacks";

const PROFILE_INFO: Record<Profile, { title: string; description: string; icon: Icon }> = {
  minimal: {
    title: "Minimal",
    description: "~5k tokens - identity & current state only",
    icon: Icon.Dot,
  },
  standard: {
    title: "Standard",
    description: "~10k tokens - adds patterns & decision framework",
    icon: Icon.Circle,
  },
  full: {
    title: "Full",
    description: "~15k tokens - all 6 context files",
    icon: Icon.CircleFilled,
  },
};

export default function Command() {
  const [isLoading, setIsLoading] = useState(false);

  async function handleExport(profile: Profile) {
    setIsLoading(true);

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

        toast.hide();
        await showHUD(`✓ ${profile} context copied (${data.tokenCount} tokens)`);
        await popToRoot();
      } else {
        toast.hide();
        await showErrorWithFallback(
          result.error || "Failed to export context",
          createStandardFallbacks(`k context export --profile ${profile}`)
        );
        setIsLoading(false);
      }
    } catch (error) {
      toast.hide();
      await showErrorWithFallback(
        error instanceof Error ? error.message : "Unknown error",
        createStandardFallbacks(`k context export --profile ${profile}`)
      );
      setIsLoading(false);
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Select context profile...">
      {PROFILES.map((profile) => {
        const info = PROFILE_INFO[profile];
        return (
          <List.Item
            key={profile}
            title={info.title}
            subtitle={info.description}
            icon={info.icon}
            actions={
              <ActionPanel>
                <Action
                  title="Export to Clipboard"
                  icon={Icon.Clipboard}
                  onAction={() => handleExport(profile)}
                />
                <Action.CopyToClipboard
                  title="Copy Command"
                  content={`k context export --profile ${profile}`}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
