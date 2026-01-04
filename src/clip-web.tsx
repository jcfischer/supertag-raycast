import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  popToRoot,
  Clipboard,
  Detail,
  Icon,
  getPreferenceValues,
} from "@raycast/api";
import { useState, useEffect, useMemo } from "react";
import {
  getActiveTab,
  getSelection,
  fetchMetadata,
  extractDomain,
  buildTanaPasteFromClip,
  type WebClip,
  type BrowserTab,
  type OpenGraphMeta,
  type BrowserName,
} from "./lib/web-clipper";
import { listSupertags, createTanaNode, type SupertagInfo } from "./lib/cli";
import { showErrorWithFallback } from "./lib/fallbacks";

/**
 * Create a WebClip from current state
 */
function createClipFromState(
  url: string,
  title: string,
  description: string,
  selection: string,
  metadata: OpenGraphMeta | null
): WebClip {
  return {
    url,
    title,
    description: description || metadata?.description,
    image: metadata?.image,
    author: metadata?.author,
    siteName: metadata?.siteName,
    publishedDate: metadata?.publishedTime,
    highlights: selection ? [{ text: selection }] : [],
    clippedAt: new Date().toISOString(),
  };
}

/**
 * Main web clipper command
 */
export default function Command() {
  // Form state
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selection, setSelection] = useState("");
  const [supertag, setSupertag] = useState("#bookmark");

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Data
  const [browserTab, setBrowserTab] = useState<BrowserTab | null>(null);
  const [metadata, setMetadata] = useState<OpenGraphMeta | null>(null);
  const [supertags, setSupertags] = useState<SupertagInfo[]>([]);

  // Load initial data from browser
  useEffect(() => {
    async function loadInitialData() {
      try {
        // Get active tab (auto-detects frontmost browser)
        const tab = await getActiveTab();
        setBrowserTab(tab);
        setUrl(tab.url);
        setTitle(tab.title);

        // Get selection
        const sel = await getSelection(tab.browser as BrowserName);
        if (sel) {
          setSelection(sel);
        }

        // Fetch metadata in background
        fetchMetadata(tab.url)
          .then((meta) => {
            setMetadata(meta);
            // Use OG title if better than document title
            if (meta.title && meta.title.length > tab.title.length) {
              setTitle(meta.title);
            }
            if (meta.description) {
              setDescription(meta.description);
            }
          })
          .catch(() => {
            // Metadata fetch failed, continue with basic info
          });

        // Load supertags
        const result = await listSupertags(50);
        if (result.success && result.data) {
          setSupertags(result.data);
        }
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to get browser tab",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadInitialData();
  }, []);

  // Build live preview
  const preview = useMemo(() => {
    if (!url || !title) return "";
    const clip = createClipFromState(url, title, description, selection, metadata);
    return buildTanaPasteFromClip(clip, supertag);
  }, [url, title, description, selection, supertag, metadata]);

  // Handle save to Tana
  async function handleSave() {
    if (!url || !title) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Missing required fields",
        message: "URL and title are required",
      });
      return;
    }

    setIsSaving(true);

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Saving to Tana...",
    });

    try {
      const tagName = supertag.replace(/^#/, "");

      // Build fields - map to correct field names based on supertag
      const fields: Record<string, string> = {};

      // URL field varies by supertag
      if (tagName === "article") {
        fields["Source URL"] = url;
      } else {
        fields.URL = url;
      }

      // Author field
      if (metadata?.author) {
        fields.Author = metadata.author;
      }

      // TODO: Generalize before release - current mapping is schema-specific
      // Options: 1) Query schema for text fields, 2) User-configurable mapping,
      // 3) Add as child node instead of field, 4) Convention-based (Notes/Summary/Highlight)
      if (selection) {
        if (tagName === "bookmark") {
          fields.Snapshot = selection;
        } else if (tagName === "resource") {
          fields.Summary = selection;
        } else if (tagName === "reference") {
          fields.Notes = selection;
        }
      }

      const result = await createTanaNode(tagName, title, fields);

      if (result.success) {
        toast.style = Toast.Style.Success;
        toast.title = "Saved to Tana!";
        toast.message = title.slice(0, 40);
        await popToRoot();
      } else {
        throw new Error(result.error || "Failed to save");
      }
    } catch (error) {
      toast.hide();

      // Offer clipboard fallback
      await showErrorWithFallback(
        error instanceof Error ? error.message : "Failed to save to Tana",
        [
          {
            action: "clipboard",
            label: "Copy as Tana Paste",
            data: preview,
          },
        ]
      );
    } finally {
      setIsSaving(false);
    }
  }

  // Handle copy to clipboard
  async function handleCopyTanaPaste() {
    await Clipboard.copy(preview);
    await showToast({
      style: Toast.Style.Success,
      title: "Copied Tana Paste",
      message: "Paste into Tana to create the node",
    });
  }

  return (
    <Form
      isLoading={isLoading || isSaving}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save to Tana"
            icon={Icon.Upload}
            onSubmit={handleSave}
          />
          <Action
            title="Copy as Tana Paste"
            icon={Icon.Clipboard}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            onAction={handleCopyTanaPaste}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Title"
        placeholder="Page title..."
        value={title}
        onChange={setTitle}
        autoFocus
      />

      <Form.TextField
        id="url"
        title="URL"
        placeholder="https://..."
        value={url}
        onChange={setUrl}
      />

      <Form.TextArea
        id="selection"
        title="Selection"
        placeholder="Selected text from the page..."
        value={selection}
        onChange={setSelection}
      />

      <Form.TextArea
        id="description"
        title="Description"
        placeholder="Page description..."
        value={description}
        onChange={setDescription}
      />

      <Form.Dropdown
        id="supertag"
        title="Supertag"
        value={supertag}
        onChange={setSupertag}
      >
        <Form.Dropdown.Item value="#bookmark" title="#bookmark" icon={Icon.Bookmark} />
        <Form.Dropdown.Item value="#article" title="#article" icon={Icon.Document} />
        <Form.Dropdown.Item value="#resource" title="#resource" icon={Icon.Link} />
        <Form.Dropdown.Item value="#reference" title="#reference" icon={Icon.Book} />
        <Form.Dropdown.Section title="Your Supertags">
          {supertags.slice(0, 20).map((tag) => (
            <Form.Dropdown.Item
              key={tag.tagId}
              value={`#${tag.tagName}`}
              title={`#${tag.tagName}`}
              icon={Icon.Tag}
            />
          ))}
        </Form.Dropdown.Section>
      </Form.Dropdown>

      <Form.Separator />

      <Form.Description
        title="Preview"
        text={preview || "Fill in the fields above to see the preview..."}
      />

      {browserTab && (
        <Form.Description
          title="Source"
          text={`${browserTab.browser} • ${extractDomain(browserTab.url)}`}
        />
      )}
    </Form>
  );
}
