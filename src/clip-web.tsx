import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  popToRoot,
  Clipboard,
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
  type ExtractedArticle,
  fetchAndExtractArticleWithMarkdown,
  WebClipStorage,
  findClipFriendlySupertags,
  type AnalyzedSupertag,
  // Template system
  builtinTemplates,
  findMatchingTemplate,
  createTemplateContext,
  renderTemplate,
  type TemplateClipTemplate as ClipTemplate,
  // Smart field mapping
  createSmartFieldMapping,
  applySmartFieldMapping,
  getTemplateFieldNames,
  // AI
  createAIProvider,
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

// Preferences interface
interface Preferences {
  aiProvider: "claude" | "ollama" | "disabled";
  claudeApiKey?: string;
  ollamaEndpoint?: string;
  ollamaModel?: string;
  autoSummarize: boolean;
  autoExtractKeypoints: boolean;
  autoSaveFullText: boolean;
}

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
  aiSummary?: string,
  aiKeypoints?: string[],
): WebClip {
  return {
    url,
    title,
    description: description || metadata?.description,
    image: metadata?.image,
    author: metadata?.author,
    siteName: metadata?.siteName,
    publishedDate: metadata?.publishedTime,
    highlights: highlightTexts
      .filter((text) => text && text.trim())
      .map((text) => ({ text })),
    content: articleContent,
    summary: aiSummary,
    keypoints: aiKeypoints,
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
  const [isAiProcessing, setIsAiProcessing] = useState(false);

  // Data
  const [browserTab, setBrowserTab] = useState<BrowserTab | null>(null);
  const [metadata, setMetadata] = useState<OpenGraphMeta | null>(null);
  const [analyzedSupertags, setAnalyzedSupertags] = useState<
    AnalyzedSupertag[]
  >([]);
  const [article, setArticle] = useState<ExtractedArticle | null>(null);

  // Template state
  const [matchedTemplate, setMatchedTemplate] = useState<ClipTemplate | null>(
    null,
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null,
  );
  const [useTemplate, setUseTemplate] = useState(true);

  // AI state
  const [aiSummary, setAiSummary] = useState<string | undefined>();
  const [aiKeypoints, setAiKeypoints] = useState<string[] | undefined>();

  // Initialize AI provider from preferences
  const preferences = getPreferenceValues<Preferences>();

  const aiProvider = useMemo(() => {
    try {
      return createAIProvider({
        provider: preferences.aiProvider,
        claudeApiKey: preferences.claudeApiKey,
        ollamaEndpoint: preferences.ollamaEndpoint,
        ollamaModel: preferences.ollamaModel,
        autoSummarize: preferences.autoSummarize,
      });
    } catch {
      return null; // Fallback to disabled if config invalid
    }
  }, [preferences]);

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

        // Fetch metadata in background (skip for sites that block scraping)
        const blockedDomains = ["twitter.com", "x.com", "mobile.twitter.com"];
        const isBlocked = blockedDomains.some((d) => domain.includes(d));

        if (!isBlocked) {
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
        }

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

  // Match template when URL changes
  useEffect(() => {
    if (!url) {
      setMatchedTemplate(null);
      return;
    }
    const matched = findMatchingTemplate(url, builtinTemplates);
    setMatchedTemplate(matched);
    if (matched && !selectedTemplateId) {
      setSelectedTemplateId(matched.id);
      // Update supertag to match template
      setSupertag(matched.supertag);
    }
  }, [url]);

  // Get active template (selected or matched)
  const activeTemplate = useMemo(() => {
    if (!useTemplate) return null;
    if (selectedTemplateId) {
      return (
        builtinTemplates.find((t) => t.id === selectedTemplateId) ||
        matchedTemplate
      );
    }
    return matchedTemplate;
  }, [useTemplate, selectedTemplateId, matchedTemplate]);

  // Check if auto-extract is needed (AI features enabled)
  const shouldAutoExtract =
    aiProvider &&
    (preferences.autoSummarize || preferences.autoExtractKeypoints);

  // Extract article when toggle is enabled OR when AI auto-features require it
  useEffect(() => {
    const needsExtraction = extractArticle || shouldAutoExtract;
    if (!needsExtraction || !url) {
      if (!extractArticle) setArticle(null);
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
  }, [extractArticle, url, shouldAutoExtract]);

  // Auto-run AI features when article is extracted and settings are enabled
  useEffect(() => {
    if (!article?.markdown || !aiProvider) return;

    async function runAutoAI() {
      setIsAiProcessing(true);
      try {
        // Auto-summarize if enabled
        if (preferences.autoSummarize && !aiSummary) {
          const result = await aiProvider.process({
            url,
            title,
            content: article.markdown,
            operation: "summarize",
          });
          if (result.summary) {
            setAiSummary(result.summary);
            setDescription(result.summary);
          }
        }

        // Auto-extract keypoints if enabled
        if (preferences.autoExtractKeypoints && !aiKeypoints) {
          const result = await aiProvider.process({
            url,
            title,
            content: article.markdown,
            operation: "extract-keypoints",
          });
          if (result.keypoints && result.keypoints.length > 0) {
            setAiKeypoints(result.keypoints);
          }
        }
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "AI processing failed",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setIsAiProcessing(false);
      }
    }

    runAutoAI();
  }, [
    article,
    aiProvider,
    preferences.autoSummarize,
    preferences.autoExtractKeypoints,
  ]);

  // Build live preview - include current highlight with saved ones
  // Filter out any empty or whitespace-only highlights
  const allHighlights = useMemo(() => {
    const all = highlights.filter((h) => h && h.trim().length > 0);
    const trimmedCurrent = currentHighlight?.trim();
    if (trimmedCurrent && trimmedCurrent.length > 0) {
      all.push(trimmedCurrent);
    }
    return all;
  }, [highlights, currentHighlight]);

  // Build template context for rendering
  const templateContext = useMemo(() => {
    if (!url || !title) return null;
    // Only include selection if there are actual highlights
    const selectionText =
      allHighlights.length > 0 ? allHighlights.join("\n") : undefined;
    return createTemplateContext({
      url,
      title,
      description: description || metadata?.description,
      author: metadata?.author,
      selection: selectionText,
      content: article?.markdown,
      siteName: metadata?.siteName,
      readtime: article?.readingTime,
    });
  }, [url, title, description, metadata, allHighlights, article]);

  // Render template fields if template is active
  const renderedTemplate = useMemo(() => {
    if (!activeTemplate || !templateContext) return null;
    return renderTemplate(activeTemplate, templateContext);
  }, [activeTemplate, templateContext]);

  const preview = useMemo(() => {
    if (!url || !title) return "";

    // If template rendered fields, show them in preview
    if (renderedTemplate) {
      const lines = [`%%tana%%`, `- ${title} ${renderedTemplate.supertag}`];
      for (const [fieldName, fieldValue] of Object.entries(
        renderedTemplate.fields,
      )) {
        lines.push(`  - ${fieldName}:: ${fieldValue}`);
      }
      if (renderedTemplate.content) {
        lines.push(`  - ${renderedTemplate.content}`);
      }
      for (const highlight of allHighlights) {
        lines.push(
          `  - ${highlight.slice(0, 100)}${highlight.length > 100 ? "..." : ""}`,
        );
      }
      return lines.join("\n");
    }

    // Fallback to standard preview
    const clip = createClipFromState(
      url,
      title,
      description,
      allHighlights,
      metadata,
      article?.markdown,
      aiSummary,
      aiKeypoints,
    );
    return buildTanaPasteFromClip(clip, supertag);
  }, [
    url,
    title,
    description,
    allHighlights,
    supertag,
    metadata,
    article,
    renderedTemplate,
    aiSummary,
    aiKeypoints,
  ]);

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
      // Use template supertag if available, otherwise use selected supertag
      const effectiveSupertag = renderedTemplate?.supertag || supertag;
      const tagName = effectiveSupertag.replace(/^#/, "");

      // Look up the supertag schema for smart field mapping
      const supertagSchema = schemaCache
        .getAllSupertags()
        .find((s) => s.name.toLowerCase() === tagName.toLowerCase());

      // Build fields - use template fields if available, otherwise metadata
      let fields: Record<string, string> = renderedTemplate?.fields
        ? { ...renderedTemplate.fields }
        : {
            URL: url,
            ...(metadata?.description && { Description: metadata.description }),
            ...(metadata?.author && { Author: metadata.author }),
            ...(metadata?.siteName && { Site: metadata.siteName }),
          };

      // Apply smart field mapping if we have a schema
      if (supertagSchema && activeTemplate) {
        const templateFieldNames = getTemplateFieldNames(activeTemplate.fields);
        const mapping = createSmartFieldMapping(
          templateFieldNames,
          supertagSchema,
        );
        fields = applySmartFieldMapping(fields, mapping);
      }

      // Always add clipped date (also with smart mapping)
      const clippedFieldName = supertagSchema
        ? createSmartFieldMapping(["Clipped"], supertagSchema).fieldMap[
            "Clipped"
          ]
        : "Clipped";
      fields[clippedFieldName] = new Date().toISOString().split("T")[0];

      // Build children (highlights + article content)
      const children: TanaChildNode[] = [];

      // Add AI summary to fields if available
      if (aiSummary) {
        let summaryFieldName = "Summary";
        if (supertagSchema) {
          const summaryMapping = createSmartFieldMapping(
            ["Summary"],
            supertagSchema,
          );
          summaryFieldName = summaryMapping.fieldMap["Summary"] || "Summary";
        }
        // Strip newlines - Tana Paste fields must be single-line
        fields[summaryFieldName] = aiSummary.replace(/\n/g, " ").trim();
      }

      // Add AI key points as structured child if available
      if (aiKeypoints && aiKeypoints.length > 0) {
        const keypointsNode: TanaChildNode = {
          name: "Key Points",
          children: aiKeypoints.map((point) => ({ name: point })),
        };
        children.push(keypointsNode);
      }

      // Add highlights as children (clean newlines)
      for (const highlight of allHighlights) {
        const cleaned = highlight.replace(/\n/g, " ").trim();
        if (cleaned) {
          children.push({ name: cleaned });
        }
      }

      // Add article content as children, nesting paragraphs under headlines
      // Only add full text if autoSaveFullText is enabled (or extractArticle was manually toggled)
      const shouldSaveFullText =
        preferences.autoSaveFullText || (extractArticle && !shouldAutoExtract);

      // Track total size to stay under Tana Input API 5000 char limit
      let totalChars =
        JSON.stringify(fields).length +
        title.length +
        JSON.stringify(children).length;
      const MAX_PAYLOAD_SIZE = 4800; // Leave buffer for JSON overhead (Tana API limit: 5000)
      let wasTruncated = false;

      if (article?.markdown && shouldSaveFullText) {
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

          if (currentHeadline) {
            // When adding to a headline, check estimated size but don't increment totalChars yet
            // (will be counted when headline is flushed to avoid double-counting)
            const estimatedHeadlineSize =
              currentHeadline.name.length +
              (currentHeadline.children?.reduce(
                (sum, c) => sum + c.name.length,
                0,
              ) || 0) +
              text.length +
              50; // JSON overhead estimate
            if (totalChars + estimatedHeadlineSize > MAX_PAYLOAD_SIZE) {
              wasTruncated = true;
              return;
            }
            currentHeadline.children = currentHeadline.children || [];
            currentHeadline.children.push({ name: text });
          } else {
            // Top-level paragraph - check and count immediately
            if (totalChars + text.length > MAX_PAYLOAD_SIZE) {
              wasTruncated = true;
              return;
            }
            children.push({ name: text });
            totalChars += text.length;
          }
        };

        const flushHeadline = () => {
          if (!currentHeadline) return;
          // Only add headline if it has children or is meaningful
          if (currentHeadline.children && currentHeadline.children.length > 0) {
            const headlineSize = JSON.stringify(currentHeadline).length;
            if (totalChars + headlineSize > MAX_PAYLOAD_SIZE) {
              wasTruncated = true;
              return;
            }
            children.push(currentHeadline);
            totalChars += headlineSize;
          } else {
            // Headline without children - add as plain text
            if (totalChars + currentHeadline.name.length > MAX_PAYLOAD_SIZE) {
              wasTruncated = true;
              return;
            }
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
          supertag: effectiveSupertag,
          templateId: activeTemplate?.id,
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

  // Remove a highlight by index (future: add remove button to UI)
  function _handleRemoveHighlight(index: number) {
    setHighlights(highlights.filter((_, i) => i !== index));
  }

  // AI: Summarize article
  async function handleSummarize() {
    if (!aiProvider || !article?.markdown) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Cannot summarize",
        message: "Extract article first and configure AI provider",
      });
      return;
    }

    setIsAiProcessing(true);
    try {
      const result = await aiProvider.process({
        url,
        title,
        content: article.markdown,
        operation: "summarize",
      });

      if (result.summary) {
        setAiSummary(result.summary);
        setDescription(result.summary);
        await showToast({
          style: Toast.Style.Success,
          title: "Summary generated",
        });
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Summarization failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsAiProcessing(false);
    }
  }

  // AI: Extract key points
  async function handleExtractKeypoints() {
    if (!aiProvider || !article?.markdown) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Cannot extract key points",
        message: "Extract article first and configure AI provider",
      });
      return;
    }

    setIsAiProcessing(true);
    try {
      const result = await aiProvider.process({
        url,
        title,
        content: article.markdown,
        operation: "extract-keypoints",
      });

      if (result.keypoints && result.keypoints.length > 0) {
        setAiKeypoints(result.keypoints);
        // Don't add to highlights - they'll be structured under "Key Points" node
        await showToast({
          style: Toast.Style.Success,
          title: "Key points extracted",
          message: `${result.keypoints.length} points`,
        });
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Key point extraction failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsAiProcessing(false);
    }
  }

  return (
    <Form
      isLoading={isLoading || isSaving || isExtracting || isAiProcessing}
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
          {article && aiProvider && (
            <>
              <Action
                title="Summarize with AI"
                icon={Icon.Stars}
                shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
                onAction={handleSummarize}
              />
              <Action
                title="Extract Key Points"
                icon={Icon.BulletPoints}
                shortcut={{ modifiers: ["cmd", "shift"], key: "k" }}
                onAction={handleExtractKeypoints}
              />
            </>
          )}
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
        info={
          highlights.length > 0
            ? `Press ⌘+Enter to add another highlight`
            : undefined
        }
      />

      {highlights.length > 0 && (
        <Form.Description
          title="Saved Highlights"
          text={highlights
            .map(
              (h, i) =>
                `${i + 1}. ${h.slice(0, 60)}${h.length > 60 ? "..." : ""}`,
            )
            .join("\n")}
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

      <Form.Separator />

      <Form.Dropdown
        id="template"
        title="Template"
        value={selectedTemplateId || "none"}
        onChange={(value) => {
          if (value === "none") {
            setSelectedTemplateId(null);
            setUseTemplate(false);
          } else {
            setSelectedTemplateId(value);
            setUseTemplate(true);
            // Update supertag to match template
            const template = builtinTemplates.find((t) => t.id === value);
            if (template) {
              setSupertag(template.supertag);
            }
          }
        }}
        info={
          matchedTemplate ? `Auto-detected: ${matchedTemplate.name}` : undefined
        }
      >
        <Form.Dropdown.Item
          value="none"
          title="No Template"
          icon={Icon.XMarkCircle}
        />
        <Form.Dropdown.Section title="Builtin Templates">
          {builtinTemplates.map((template) => (
            <Form.Dropdown.Item
              key={template.id}
              value={template.id}
              title={template.name}
              icon={
                matchedTemplate?.id === template.id
                  ? Icon.CheckCircle
                  : Icon.Document
              }
            />
          ))}
        </Form.Dropdown.Section>
      </Form.Dropdown>

      <Form.Dropdown
        id="supertag"
        title="Supertag"
        value={supertag}
        onChange={setSupertag}
        info={
          activeTemplate ? `From template: ${activeTemplate.name}` : undefined
        }
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

      {aiSummary && <Form.Description title="AI Summary" text={aiSummary} />}
    </Form>
  );
}
