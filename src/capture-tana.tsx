import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  popToRoot,
  Clipboard,
} from "@raycast/api";
import { useState } from "react";
import { captureTana } from "./lib/cli";
import { SUPERTAGS, type Supertag } from "./lib/types";
import { showErrorWithFallback } from "./lib/fallbacks";

export default function Command() {
  const [isLoading, setIsLoading] = useState(false);
  const [text, setText] = useState("");
  const [supertag, setSupertag] = useState<Supertag>("todo");

  async function handleSubmit() {
    if (!text.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Please enter some text",
      });
      return;
    }

    setIsLoading(true);

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Creating Tana node...",
    });

    try {
      const result = await captureTana(text.trim(), supertag);

      if (result.success && result.data) {
        toast.style = Toast.Style.Success;
        toast.title = "Created in Tana!";
        toast.message = `#${supertag}: "${text.slice(0, 30)}${text.length > 30 ? "..." : ""}"`;

        await popToRoot();
      } else {
        toast.hide();

        // Fallback: generate Tana Paste manually
        const tanaPaste = `%%tana%%\n- ${text.trim()} #${supertag}`;

        await showErrorWithFallback(result.error || "Failed to create Tana node", [
          {
            action: "clipboard",
            label: "Copy Tana Paste manually",
            data: tanaPaste,
          },
        ]);
      }
    } catch (error) {
      toast.hide();

      // Fallback: generate Tana Paste manually
      const tanaPaste = `%%tana%%\n- ${text.trim()} #${supertag}`;

      await showErrorWithFallback(
        error instanceof Error ? error.message : "Unknown error",
        [
          {
            action: "clipboard",
            label: "Copy Tana Paste manually",
            data: tanaPaste,
          },
        ]
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Node" onSubmit={handleSubmit} />
          <Action
            title="Copy as Tana Paste"
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            onAction={async () => {
              if (text.trim()) {
                const paste = `%%tana%%\n- ${text.trim()} #${supertag}`;
                await Clipboard.copy(paste);
                await showToast({
                  style: Toast.Style.Success,
                  title: "Copied Tana Paste",
                });
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="text"
        title="Content"
        placeholder="Enter your note, task, or idea..."
        value={text}
        onChange={setText}
        autoFocus
      />
      <Form.Dropdown
        id="supertag"
        title="Supertag"
        value={supertag}
        onChange={(value) => setSupertag(value as Supertag)}
      >
        {SUPERTAGS.map((tag) => (
          <Form.Dropdown.Item
            key={tag}
            value={tag}
            title={tag.charAt(0).toUpperCase() + tag.slice(1)}
            icon={
              tag === "todo" ? "checkmark-circle" : tag === "note" ? "doc" : "lightbulb"
            }
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
