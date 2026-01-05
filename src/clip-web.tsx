import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  popToRoot,
  Clipboard,
  Icon,
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
  type ExtractedArticle,
  fetchAndExtractArticleWithMarkdown,
  WebClipStorage,
  findClipFriendlySupertags,
  type AnalyzedSupertag,
} from "./lib/web-clipper";
import { LocalStorage } from "@raycast/api";
import { SchemaCache } from "./lib/schema-cache";
import { createTanaNode, type TanaChildNode } from "./lib/cli";
import { showErrorWithFallback } from "./lib/fallbacks";

// Create storage instance with Raycast LocalStorage
const storage = new WebClipStorage({
  getItem: (key) => LocalStorage.getItem(key),
  setItem: (key, value) => LocalStorage.setItem(key, value),
  removeItem: (key) => LocalStorage.removeItem(key),
});

// Schema cache for supertag analysis
const schemaCache = new SchemaCache();

/**
 * Create a WebClip from current state
 */
function createClipFromState(
  url: string,
  title: string,
  description: string,
  highlightTexts: string[],
  metadata: OpenGraphMeta | null,
  articleContent?: string,
): WebClip {
  return {
    url,
    title,
    description: description || metadata?.description,
    image: metadata?.image,
    author: metadata?.author,
    siteName: metadata?.siteName,
    publishedDate: metadata?.publishedTime,
    highlights: highlightTexts.map((text) => ({ text })),
    content: articleContent,
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
  const [highlights, setHighlights] = useState<string[]>([]);
  const [currentHighlight, setCurrentHighlight] = useState("");
  const [supertag, setSupertag] = useState("#bookmark");
  const [extractArticle, setExtractArticle] = useState(false);

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);

  // Data
  const [browserTab, setBrowserTab] = useState<BrowserTab | null>(null);
  const [metadata, setMetadata] = useState<OpenGraphMeta | null>(null);
  const [analyzedSupertags, setAnalyzedSupertags] = useState<AnalyzedSupertag[]>([]);
  const [article, setArticle] = useState<ExtractedArticle | null>(null);

  // Load initial data from browser
  useEffect(() => {
    async function loadInitialData() {
      try {
        // Get active tab (auto-detects frontmost browser)
        const tab = await getActiveTab();
        setBrowserTab(tab);
        setUrl(tab.url);
        setTitle(tab.title);

        // Get selection and set as current highlight for editing
        const sel = await getSelection(tab.browser as BrowserName);
        if (sel) {
          setCurrentHighlight(sel);
        }

        // Load domain preference for pre-selecting supertag
        const domain = extractDomain(tab.url);
        const domainPref = await storage.getDomainPreference(domain);
        if (domainPref) {
          setSupertag(domainPref.supertag);
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

        // Load and analyze supertags from schema cache
        const allSupertags = schemaCache.getAllSupertags();
        const clipFriendly = findClipFriendlySupertags(allSupertags, {
          minScore: 5, // Include tags with at least some clip-relevant fields
          limit: 30,
        });
        setAnalyzedSupertags(clipFriendly);
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

  // Extract article when toggle is enabled
  useEffect(() => {
    if (!extractArticle || !url) {
      setArticle(null);
      return;
    }

    async function doExtract() {
      setIsExtracting(true);
      try {
        const extracted = await fetchAndExtractArticleWithMarkdown(url);
        setArticle(extracted);
        if (extracted) {
          await showToast({
            style: Toast.Style.Success,
            title: "Article extracted",
            message: `${extracted.readingTime} min read`,
          });
        } else {
          await showToast({
            style: Toast.Style.Failure,
            title: "Could not extract article",
            message: "This page may not be an article",
          });
        }
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Extraction failed",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setIsExtracting(false);
      }
    }

    doExtract();
  }, [extractArticle, url]);

  // Build live preview - include current highlight with saved ones
  const allHighlights = useMemo(() => {
    const all = [...highlights];
    if (currentHighlight.trim()) {
      all.push(currentHighlight.trim());
    }
    return all;
  }, [highlights, currentHighlight]);

  const preview = useMemo(() => {
    if (!url || !title) return "";
    const clip = createClipFromState(
      url,
      title,
      description,
      allHighlights,
      metadata,
      article?.markdown,
    );
    return buildTanaPasteFromClip(clip, supertag);
  }, [url, title, description, allHighlights, supertag, metadata, article]);

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

      // Build fields (metadata only)
      const fields: Record<string, string> = {
        URL: url,
      };
      if (metadata?.description) {
        fields.Description = metadata.description;
      }
      if (metadata?.author) {
        fields.Author = metadata.author;
      }
      if (metadata?.siteName) {
        fields.Site = metadata.siteName;
      }
      fields.Clipped = new Date().toISOString().split("T")[0];

      // Build children (highlights + article content)
      const children: TanaChildNode[] = [];

      // Add highlights as children (clean newlines)
      for (const highlight of allHighlights) {
        const cleaned = highlight.replace(/\n/g, " ").trim();
        if (cleaned) {
          children.push({ name: cleaned });
        }
      }

      // Add article content as children, nesting paragraphs under headlines
      // Track total size to stay under 5000 char API limit
      let totalChars = JSON.stringify(fields).length + title.length;
      const MAX_PAYLOAD_SIZE = 4500; // Leave buffer for JSON overhead
      let wasTruncated = false;

      if (article?.markdown) {
        // Split by lines first, then process
        const lines = article.markdown.split("\n");
        let currentHeadline: TanaChildNode | null = null;
        let currentParagraph: string[] = [];

        const flushParagraph = () => {
          if (currentParagraph.length === 0) return;
          const text = currentParagraph.join(" ").trim();
          currentParagraph = [];
          // Skip empty or whitespace-only content
          if (!text || text.length < 2) return;

          if (totalChars + text.length > MAX_PAYLOAD_SIZE) {
            wasTruncated = true;
            return;
          }

          if (currentHeadline) {
            currentHeadline.children = currentHeadline.children || [];
            currentHeadline.children.push({ name: text });
          } else {
            children.push({ name: text });
          }
          totalChars += text.length;
        };

        const flushHeadline = () => {
          if (!currentHeadline) return;
          // Only add headline if it has children or is meaningful
          if (currentHeadline.children && currentHeadline.children.length > 0) {
            if (totalChars + JSON.stringify(currentHeadline).length > MAX_PAYLOAD_SIZE) {
              wasTruncated = true;
              return;
            }
            children.push(currentHeadline);
            totalChars += currentHeadline.name.length;
          } else {
            // Headline without children - add as plain text
            children.push({ name: currentHeadline.name });
            totalChars += currentHeadline.name.length;
          }
          currentHeadline = null;
        };

        for (const line of lines) {
          if (wasTruncated) break;

          const trimmedLine = line.trim();

          // Check if this is a headline
          const headlineMatch = trimmedLine.match(/^(#{1,6})\s+(.+)$/);

          if (headlineMatch) {
            // Flush any pending paragraph
            flushParagraph();
            // Flush previous headline
            flushHeadline();
            // Start new headline
            currentHeadline = { name: headlineMatch[2].trim() };
          } else if (trimmedLine === "") {
            // Empty line - flush paragraph
            flushParagraph();
          } else {
            // Regular text - accumulate
            currentParagraph.push(trimmedLine);
          }
        }

        // Flush remaining content
        if (!wasTruncated) {
          flushParagraph();
          flushHeadline();
        }

        // Add truncation marker if needed
        if (wasTruncated) {
          children.push({ name: "⚠️ [Content truncated due to size limit]" });
        }
      }

      const result = await createTanaNode(tagName, title, fields, children);

      if (result.success) {
        // Save domain preference for next time
        const domain = extractDomain(url);
        await storage.saveDomainPreference({
          domain,
          supertag,
          lastUsed: new Date().toISOString(),
        });

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
        ],
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

  // Add current text as a highlight
  function handleAddHighlight() {
    if (currentHighlight.trim()) {
      setHighlights([...highlights, currentHighlight.trim()]);
      setCurrentHighlight("");
      showToast({
        style: Toast.Style.Success,
        title: "Highlight added",
        message: `${highlights.length + 1} highlights total`,
      });
    }
  }

  // Remove a highlight by index
  function handleRemoveHighlight(index: number) {
    setHighlights(highlights.filter((_, i) => i !== index));
  }

  return (
    <Form
      isLoading={isLoading || isSaving || isExtracting}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save to Tana"
            icon={Icon.Upload}
            onSubmit={handleSave}
          />
          <Action
            title="Add Highlight"
            icon={Icon.Plus}
            shortcut={{ modifiers: ["cmd"], key: "enter" }}
            onAction={handleAddHighlight}
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
        id="currentHighlight"
        title={`Highlight ${highlights.length > 0 ? `(${highlights.length} saved)` : ""}`}
        placeholder="Add a text highlight..."
        value={currentHighlight}
        onChange={setCurrentHighlight}
        info={highlights.length > 0 ? `Press ⌘+Enter to add another highlight` : undefined}
      />

      {highlights.length > 0 && (
        <Form.Description
          title="Saved Highlights"
          text={highlights.map((h, i) => `${i + 1}. ${h.slice(0, 60)}${h.length > 60 ? "..." : ""}`).join("\n")}
        />
      )}

      <Form.TextArea
        id="description"
        title="Description"
        placeholder="Page description..."
        value={description}
        onChange={setDescription}
      />

      <Form.Checkbox
        id="extractArticle"
        label="Extract Full Article"
        value={extractArticle}
        onChange={setExtractArticle}
        info="Extract the main article content as markdown using Readability"
      />

      <Form.Dropdown
        id="supertag"
        title="Supertag"
        value={supertag}
        onChange={setSupertag}
      >
        {analyzedSupertags.length > 0 ? (
          <>
            <Form.Dropdown.Section title="Recommended for Clipping">
              {analyzedSupertags
                .filter((a) => a.hasUrlField)
                .slice(0, 5)
                .map((analyzed) => (
                  <Form.Dropdown.Item
                    key={analyzed.supertag.id}
                    value={`#${analyzed.supertag.name}`}
                    title={`#${analyzed.supertag.name}`}
                    icon={Icon.Star}
                  />
                ))}
            </Form.Dropdown.Section>
            <Form.Dropdown.Section title="Other Tags">
              {analyzedSupertags
                .filter((a) => !a.hasUrlField)
                .slice(0, 15)
                .map((analyzed) => (
                  <Form.Dropdown.Item
                    key={analyzed.supertag.id}
                    value={`#${analyzed.supertag.name}`}
                    title={`#${analyzed.supertag.name}`}
                    icon={Icon.Tag}
                  />
                ))}
            </Form.Dropdown.Section>
          </>
        ) : (
          <>
            <Form.Dropdown.Item
              value="#bookmark"
              title="#bookmark"
              icon={Icon.Bookmark}
            />
            <Form.Dropdown.Item
              value="#article"
              title="#article"
              icon={Icon.Document}
            />
            <Form.Dropdown.Item
              value="#resource"
              title="#resource"
              icon={Icon.Link}
            />
          </>
        )}
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

      {article && (
        <Form.Description
          title="Article Info"
          text={`${article.readingTime} min read • ${article.length.toLocaleString()} characters${article.byline ? ` • ${article.byline}` : ""}`}
        />
      )}
    </Form>
  );
}
