import type { WebClip, Highlight } from "./types";

/**
 * Options for building Tana Paste
 */
export interface TanaPasteOptions {
  title: string;
  supertag: string;
  fields?: Record<string, string>;
  highlights?: string[];
  content?: string;
}

/**
 * Build Tana Paste format from options
 *
 * @example
 * ```
 * %%tana%%
 * - Article Title #bookmark
 *   - URL:: https://example.com
 *   - Description:: Great article
 *   - First highlight
 *   - Second highlight
 * ```
 */
export function buildTanaPaste(options: TanaPasteOptions): string {
  const lines: string[] = ["%%tana%%"];

  // Main node with title and supertag
  lines.push(`- ${options.title} ${options.supertag}`);

  // Add fields as child nodes with :: syntax
  if (options.fields) {
    for (const [name, value] of Object.entries(options.fields)) {
      if (value) {
        lines.push(`  - ${name}:: ${value}`);
      }
    }
  }

  // Add highlights as child nodes
  if (options.highlights) {
    for (const highlight of options.highlights) {
      lines.push(`  - ${highlight}`);
    }
  }

  // Add content as child node
  if (options.content) {
    lines.push(`  - ${options.content}`);
  }

  return lines.join("\n");
}

/**
 * Build Tana Paste from a WebClip object
 */
export function buildTanaPasteFromClip(clip: WebClip, supertag: string): string {
  const lines: string[] = ["%%tana%%"];

  // Main node with title and supertag
  lines.push(`- ${clip.title} ${supertag}`);

  // URL field (always include, formatted as link)
  lines.push(`  - URL:: [${clip.title}](${clip.url})`);

  // Optional metadata fields
  if (clip.description) {
    lines.push(`  - Description:: ${clip.description}`);
  }

  if (clip.author) {
    lines.push(`  - Author:: ${clip.author}`);
  }

  if (clip.siteName) {
    lines.push(`  - Site:: ${clip.siteName}`);
  }

  // Clipped date
  const clippedDate = clip.clippedAt.split("T")[0]; // Extract date part
  lines.push(`  - Clipped:: ${clippedDate}`);

  // AI-generated summary
  if (clip.summary) {
    lines.push(`  - Summary:: ${clip.summary}`);
  }

  // AI-extracted key points (nested bullets)
  if (clip.keypoints && clip.keypoints.length > 0) {
    lines.push(`  - Key Points::`);
    for (const point of clip.keypoints) {
      lines.push(`    - ${point}`);
    }
  }

  // Highlights as child nodes
  if (clip.highlights.length > 0) {
    for (const highlight of clip.highlights) {
      lines.push(`  - ${highlight.text}`);
    }
  }

  // Full content (if extracted)
  if (clip.content) {
    // For long content, add as a separate child node
    lines.push(`  - Content::`);
    // Split content into paragraphs and add as nested children
    const paragraphs = clip.content.split("\n\n").filter((p) => p.trim());
    for (const para of paragraphs) {
      lines.push(`    - ${para.trim()}`);
    }
  }

  return lines.join("\n");
}

/**
 * Format a URL as a Tana link
 */
export function formatTanaLink(title: string, url: string): string {
  return `[${title}](${url})`;
}

/**
 * Escape special Tana characters if needed
 * Note: Most characters are safe in Tana Paste format
 */
export function escapeTanaText(text: string): string {
  // Tana Paste is mostly plain text, but we should handle newlines
  return text.replace(/\n/g, " ").trim();
}
