import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";

/**
 * Create a configured Turndown instance with GFM support
 */
function createTurndownService(): TurndownService {
  const turndown = new TurndownService({
    headingStyle: "atx", // Use # style headings
    bulletListMarker: "-",
    codeBlockStyle: "fenced",
    emDelimiter: "_",
  });

  // Add GFM plugin for tables, strikethrough, task lists
  turndown.use(gfm);

  // Remove script and style elements
  turndown.remove(["script", "style", "noscript", "iframe"]);

  // Custom rule for code blocks with language detection
  turndown.addRule("fencedCodeBlock", {
    filter: (node, options) => {
      return (
        options.codeBlockStyle === "fenced" &&
        node.nodeName === "PRE" &&
        node.firstChild !== null &&
        node.firstChild.nodeName === "CODE"
      );
    },
    replacement: (_content, node) => {
      const codeNode = node.firstChild as HTMLElement;
      const className = codeNode.getAttribute("class") || "";
      const languageMatch = className.match(/language-(\w+)/);
      const language = languageMatch ? languageMatch[1] : "";
      const code = codeNode.textContent || "";

      return `\n\n\`\`\`${language}\n${code}\n\`\`\`\n\n`;
    },
  });

  return turndown;
}

// Singleton instance
let turndownInstance: TurndownService | null = null;

/**
 * Get the Turndown instance (lazy initialization)
 */
function getTurndown(): TurndownService {
  if (!turndownInstance) {
    turndownInstance = createTurndownService();
  }
  return turndownInstance;
}

/**
 * Convert HTML to Markdown with GFM support
 * @param html - HTML string to convert
 * @returns Markdown string
 */
export function htmlToMarkdown(html: string): string {
  const trimmed = html.trim();
  if (!trimmed) {
    return "";
  }

  const turndown = getTurndown();
  const markdown = turndown.turndown(trimmed);

  return markdown.trim();
}

/**
 * Convert HTML to Markdown with custom options
 * @param html - HTML string to convert
 * @param options - Turndown options override
 * @returns Markdown string
 */
export function htmlToMarkdownWithOptions(
  html: string,
  options: Partial<TurndownService.Options>,
): string {
  const trimmed = html.trim();
  if (!trimmed) {
    return "";
  }

  const turndown = new TurndownService({
    headingStyle: "atx",
    bulletListMarker: "-",
    codeBlockStyle: "fenced",
    emDelimiter: "_",
    ...options,
  });

  turndown.use(gfm);
  turndown.remove(["script", "style", "noscript", "iframe"]);

  return turndown.turndown(trimmed).trim();
}
