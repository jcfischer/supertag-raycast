import { Detail, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { getBriefing } from "./lib/cli";
import { type BriefingData, BriefingDataSchema } from "./lib/types";
import { openKInTerminal } from "./lib/terminal";

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [briefing, setBriefing] = useState<BriefingData | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadBriefing() {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getBriefing();

      if (result.success && result.data) {
        const parsed = BriefingDataSchema.safeParse(result.data);
        if (parsed.success) {
          setBriefing(parsed.data);
        } else {
          setError("Invalid briefing data format");
        }
      } else {
        setError(result.error || "Failed to load briefing");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadBriefing();
  }, []);

  if (error) {
    return (
      <Detail
        markdown={`# Error\n\n${error}\n\nTry opening the briefing in Terminal instead.`}
        actions={
          <ActionPanel>
            <Action
              title="Open in Terminal"
              onAction={() => openKInTerminal(["briefing"])}
            />
            <Action title="Retry" onAction={loadBriefing} />
          </ActionPanel>
        }
      />
    );
  }

  const markdown = briefing ? formatBriefingMarkdown(briefing) : "Loading...";

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Refresh" onAction={loadBriefing} />
          <Action
            title="Open in Terminal"
            shortcut={{ modifiers: ["cmd"], key: "t" }}
            onAction={() => openKInTerminal(["briefing"])}
          />
        </ActionPanel>
      }
    />
  );
}

function formatBriefingMarkdown(data: BriefingData): string {
  const lines: string[] = [];

  lines.push(`# Daily Briefing - ${data.date}`);
  lines.push("");

  // Calendar
  lines.push("## Calendar");
  if (data.calendar.length === 0) {
    lines.push("*No events scheduled*");
  } else {
    for (const event of data.calendar) {
      const loc = event.location ? ` *(${event.location})*` : "";
      lines.push(`- **${event.time}** - ${event.title}${loc}`);
    }
  }
  lines.push("");

  // Tasks
  lines.push("## Tasks");
  if (data.tasks.length === 0) {
    lines.push("*No tasks for today*");
  } else {
    for (const task of data.tasks) {
      const proj = task.project ? ` [${task.project}]` : "";
      const pri = task.priority ? ` (${task.priority})` : "";
      lines.push(`- ${task.title}${proj}${pri}`);
    }
  }
  lines.push("");

  // Email
  lines.push("## Email");
  if (data.unreadEmails === 0) {
    lines.push("Inbox zero!");
  } else {
    lines.push(`${data.unreadEmails} unread emails`);
  }
  lines.push("");

  // Reminders
  if (data.reminders.length > 0) {
    lines.push("## Reminders");
    for (const reminder of data.reminders) {
      lines.push(`- ${reminder}`);
    }
  }

  return lines.join("\n");
}
