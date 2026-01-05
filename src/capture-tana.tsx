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
import { capturePlainNode } from "./lib/cli";
import { showErrorWithFallback } from "./lib/fallbacks";

interface TanaNode {
  name: string;
  children?: TanaNode[];
}

/**
 * Parse multi-line text with indented nodes into Tana Input API JSON format
 * Creates a single parent node with name, and parses content as children
 */
function buildTanaJSON(name: string, content: string): TanaNode[] {
  const parentNode: TanaNode = { name };

  // If there's content, parse it as children
  if (content.trim()) {
    const lines = content.split("\n").filter((line) => line.trim());

    interface ParsedLine {
      indent: number;
      text: string;
    }

    // Parse lines and calculate indentation levels
    const parsed: ParsedLine[] = lines.map((line) => {
      const trimmed = line.trimStart();
      const nodeContent = trimmed.startsWith("-")
        ? trimmed.slice(1).trim()
        : trimmed;
      const indent = line.search(/\S/);
      return { indent, text: nodeContent };
    });

    // Build tree structure for children
    const children: TanaNode[] = [];
    const stack: { node: TanaNode; indent: number }[] = [];

    for (const { indent, text } of parsed) {
      const node: TanaNode = { name: text };

      // Pop stack until we find the parent level
      while (stack.length > 0 && stack[stack.length - 1].indent >= indent) {
        stack.pop();
      }

      if (stack.length === 0) {
        // Root level child
        children.push(node);
      } else {
        // Nested child
        const parent = stack[stack.length - 1].node;
        if (!parent.children) {
          parent.children = [];
        }
        parent.children.push(node);
      }

      stack.push({ node, indent });
    }

    if (children.length > 0) {
      parentNode.children = children;
    }
  }

  return [parentNode];
}

/**
 * Build Tana Paste format for manual clipboard fallback
 */
function buildTanaPaste(text: string): string {
  const lines = text.split("\n");
  const formattedLines: string[] = [];

  for (const line of lines) {
    if (!line.trim()) continue;

    if (line.trimStart().startsWith("-")) {
      const indent = line.search(/\S/);
      const content = line.trimStart();
      formattedLines.push(" ".repeat(indent) + content);
    } else {
      formattedLines.push("- " + line.trim());
    }
  }

  return `%%tana%%\n${formattedLines.join("\n")}`;
}

export default function Command() {
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState("");
  const [text, setText] = useState("");

  async function handleSubmit() {
    if (!name.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Please enter a name for the node",
      });
      return;
    }

    setIsLoading(true);

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Creating Tana node...",
    });

    try {
      const tanaJSON = buildTanaJSON(name.trim(), text);
      const result = await capturePlainNode(JSON.stringify(tanaJSON));

      if (result.success && result.data) {
        toast.style = Toast.Style.Success;
        toast.title = "Created in Tana!";
        toast.message = `"${name.slice(0, 30)}${name.length > 30 ? "..." : ""}"`;

        await popToRoot();
      } else {
        toast.hide();

        // Fallback: copy Tana Paste manually
        const tanaPaste = buildTanaPaste(name + "\n" + text);
        await showErrorWithFallback(
          result.error || "Failed to create Tana node",
          [
            {
              action: "clipboard",
              label: "Copy Tana Paste manually",
              data: tanaPaste,
            },
          ],
        );
      }
    } catch (error) {
      toast.hide();

      // Fallback: copy Tana Paste manually
      const tanaPaste = buildTanaPaste(name + "\n" + text);

      await showErrorWithFallback(
        error instanceof Error ? error.message : "Unknown error",
        [
          {
            action: "clipboard",
            label: "Copy Tana Paste manually",
            data: tanaPaste,
          },
        ],
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
              if (name.trim()) {
                const paste = buildTanaPaste(name + (text ? "\n" + text : ""));
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
      <Form.TextField
        id="name"
        title="Name"
        placeholder="Enter node name..."
        value={name}
        onChange={setName}
        autoFocus
      />
      <Form.TextArea
        id="content"
        title="Children (optional)"
        placeholder="- Child 1&#10;  - Grandchild&#10;- Child 2"
        value={text}
        onChange={setText}
        enableMarkdown={false}
      />
    </Form>
  );
}
