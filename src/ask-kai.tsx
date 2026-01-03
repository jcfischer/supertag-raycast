import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Detail,
  Clipboard,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import { executePrompt } from "./lib/cli";
import { openPromptInTerminal } from "./lib/terminal";

const COMPLEXITY_THRESHOLD = 500; // chars

export default function Command() {
  const [isLoading, setIsLoading] = useState(false);
  const [query, setQuery] = useState("");
  const { push } = useNavigation();

  async function handleSubmit() {
    if (!query.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Please enter a question",
      });
      return;
    }

    setIsLoading(true);

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Asking KAI...",
      message: "This may take a moment",
    });

    try {
      const result = await executePrompt(query.trim());

      if (result.success && result.data) {
        const data = result.data as { response: string; query: string };
        toast.hide();

        // Check if response is complex
        if (data.response.length > COMPLEXITY_THRESHOLD) {
          // Show in Detail view
          push(
            <ResponseDetail
              response={data.response}
              query={query}
              duration={result.metadata?.duration}
            />
          );
        } else {
          // Show inline
          push(
            <ResponseDetail
              response={data.response}
              query={query}
              duration={result.metadata?.duration}
            />
          );
        }
      } else {
        toast.style = Toast.Style.Failure;
        toast.title = "Error";
        toast.message = result.error || "Failed to get response";

        // Offer to open in terminal
        toast.primaryAction = {
          title: "Open in Terminal",
          onAction: () => openPromptInTerminal(query),
        };
      }
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Error";
      toast.message = error instanceof Error ? error.message : "Unknown error";

      toast.primaryAction = {
        title: "Open in Terminal",
        onAction: () => openPromptInTerminal(query),
      };
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Ask" onSubmit={handleSubmit} />
          <Action
            title="Open in Terminal"
            shortcut={{ modifiers: ["cmd"], key: "t" }}
            onAction={() => {
              if (query.trim()) {
                openPromptInTerminal(query.trim());
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="query"
        title="Question"
        placeholder="Ask anything..."
        value={query}
        onChange={setQuery}
        autoFocus
      />
    </Form>
  );
}

function ResponseDetail({
  response,
  query,
  duration,
}: {
  response: string;
  query: string;
  duration?: number;
}) {
  const durationText = duration ? `${(duration / 1000).toFixed(1)}s` : "";

  const markdown = `# Response

${response}

---

*Query: "${query}"*${durationText ? ` | *${durationText}*` : ""}
`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Response" content={response} />
          <Action
            title="Open in Terminal"
            shortcut={{ modifiers: ["cmd"], key: "t" }}
            onAction={() => openPromptInTerminal(query)}
          />
          <Action.CopyToClipboard
            title="Copy Query"
            content={query}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}
