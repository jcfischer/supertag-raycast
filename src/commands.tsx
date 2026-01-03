import { List, ActionPanel, Action, showToast, Toast, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { listCommands } from "./lib/cli";
import { type KaiCommand, KaiCommandSchema, CommandsListResponseSchema } from "./lib/types";
import { openKInTerminal, openInTerminal } from "./lib/terminal";

const CATEGORY_ICONS: Record<string, Icon> = {
  session: Icon.Terminal,
  context: Icon.Brain,
  mcp: Icon.Plug,
  tools: Icon.Hammer,
};

const CATEGORY_LABELS: Record<string, string> = {
  session: "Session",
  context: "Context",
  mcp: "MCP",
  tools: "Tools",
};

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [commands, setCommands] = useState<KaiCommand[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function loadCommands() {
    setIsLoading(true);
    setError(null);

    try {
      const result = await listCommands();

      if (result.success && result.data) {
        const parsed = CommandsListResponseSchema.safeParse(result.data);
        if (parsed.success) {
          setCommands(parsed.data.commands);
        } else {
          setError("Invalid commands data format");
        }
      } else {
        setError(result.error || "Failed to load commands");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadCommands();
  }, []);

  if (error) {
    return (
      <List>
        <List.EmptyView
          title="Error Loading Commands"
          description={error}
          actions={
            <ActionPanel>
              <Action title="Retry" onAction={loadCommands} />
              <Action
                title="Open k in Terminal"
                onAction={() => openKInTerminal([])}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  // Group by category
  const byCategory = commands.reduce(
    (acc, cmd) => {
      const cat = cmd.category;
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(cmd);
      return acc;
    },
    {} as Record<string, KaiCommand[]>
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search commands...">
      {Object.entries(byCategory).map(([category, cmds]) => (
        <List.Section
          key={category}
          title={CATEGORY_LABELS[category] || category}
        >
          {cmds.map((cmd) => (
            <List.Item
              key={cmd.name}
              title={cmd.name}
              subtitle={cmd.description}
              accessories={[{ text: cmd.usage }]}
              icon={CATEGORY_ICONS[cmd.category] || Icon.Circle}
              actions={
                <ActionPanel>
                  <Action
                    title="Run in Terminal"
                    icon={Icon.Terminal}
                    onAction={() => {
                      // Parse the usage to get the actual command
                      const cmdParts = cmd.usage.replace("k ", "").split(" ");
                      openKInTerminal(cmdParts);
                    }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Usage"
                    content={cmd.usage}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
