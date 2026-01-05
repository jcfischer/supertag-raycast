import type { OpenGraphMeta, ArticleContent } from "./types";
import { extractArticle as extractArticleFromHTML } from "./article";
import { htmlToMarkdown } from "./markdown";

/**
 * Extract domain from URL, removing www prefix
 */
export function extractDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/**
 * Decode HTML entities in a string
 */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCharCode(parseInt(code, 16)),
    );
}

/**
 * Extract content attribute from meta tag using regex
 */
function getMetaContent(
  html: string,
  property: string,
  isName = false,
): string | undefined {
  const attrType = isName ? "name" : "property";
  // Match both single and double quotes, case insensitive
  const regex = new RegExp(
    `<meta\\s+[^>]*${attrType}=["']${property}["'][^>]*content=["']([^"']*)["']|<meta\\s+[^>]*content=["']([^"']*)["'][^>]*${attrType}=["']${property}["']`,
    "i",
  );
  const match = html.match(regex);
  if (match) {
    const content = match[1] || match[2];
    return content ? decodeHtmlEntities(content) : undefined;
  }
  return undefined;
}

/**
 * Extract title from <title> tag
 */
function getTitleTag(html: string): string | undefined {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return match ? decodeHtmlEntities(match[1].trim()) : undefined;
}

/**
 * Parse Open Graph and standard meta tags from HTML
 */
export function parseOpenGraphMeta(html: string): OpenGraphMeta {
  const meta: OpenGraphMeta = {};

  // OG tags (preferred)
  meta.title = getMetaContent(html, "og:title") || getTitleTag(html);
  meta.description =
    getMetaContent(html, "og:description") ||
    getMetaContent(html, "description", true);
  meta.image = getMetaContent(html, "og:image");
  meta.type = getMetaContent(html, "og:type");
  meta.siteName = getMetaContent(html, "og:site_name");

  // Author (try multiple sources)
  meta.author =
    getMetaContent(html, "article:author") ||
    getMetaContent(html, "author", true) ||
    getMetaContent(html, "twitter:creator");

  // Published time
  meta.publishedTime =
    getMetaContent(html, "article:published_time") ||
    getMetaContent(html, "pubdate", true) ||
    getMetaContent(html, "date", true);

  return meta;
}

/**
 * Fetch and parse metadata from a URL
 */
export async function fetchMetadata(url: string): Promise<OpenGraphMeta> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    return parseOpenGraphMeta(html);
  } catch (error) {
    throw new Error(
      `Failed to fetch metadata: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Calculate estimated reading time from text
 * @param text - Plain text content
 * @param wordsPerMinute - Reading speed (default: 200 wpm)
 * @returns Reading time in minutes
 */
export function calculateReadingTime(
  text: string,
  wordsPerMinute = 200,
): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.ceil(words / wordsPerMinute);
}

/**
 * Count words in text
 */
export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Extracted article with markdown content
 */
export interface ExtractedArticle extends ArticleContent {
  markdown: string; // Full article as markdown
}

/**
 * Heading with context for re-injection after Readability processing
 */
interface HeadingWithContext {
  level: number; // 2 for h2, 3 for h3
  text: string; // Heading text
  followingText: string; // First ~50 chars of following paragraph (for matching)
}

/**
 * Extract H2/H3 headings from HTML with their following paragraph text
 * Used to re-inject headings that Readability strips
 */
function extractHeadingsFromHTML(html: string): HeadingWithContext[] {
  const headings: HeadingWithContext[] = [];

  // Match h2 and h3 tags - use a more permissive regex that handles nested elements
  const headingRegex = /<h([23])[^>]*>([\s\S]*?)<\/h\1>/gi;

  let match;
  while ((match = headingRegex.exec(html)) !== null) {
    const level = parseInt(match[1], 10);
    // Clean heading text - remove nested tags and decode entities
    const rawText = match[2]
      .replace(/<[^>]*>/g, "")
      .replace(/\s+/g, " ")
      .trim();
    const text = decodeHtmlEntities(rawText);

    if (!text || text.length < 3) continue;

    // Find the text that follows this heading (for matching later)
    const afterHeading = html.slice(match.index + match[0].length);
    // Get first paragraph or text content after heading
    const paragraphMatch = afterHeading.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
    let followingText = "";
    if (paragraphMatch) {
      followingText = decodeHtmlEntities(
        paragraphMatch[1].replace(/<[^>]*>/g, ""),
      )
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 60); // First 60 chars for matching
    }

    headings.push({ level, text, followingText });
  }

  return headings;
}

/**
 * Inject missing headings back into markdown
 * Finds locations by matching followingText and inserts heading before
 */
function injectMissingHeadings(
  markdown: string,
  headings: HeadingWithContext[],
): string {
  let result = markdown;

  for (const heading of headings) {
    // Check if heading already exists in markdown (case-insensitive)
    const headingMarker = "#".repeat(heading.level);
    const headingPattern = new RegExp(
      `^${headingMarker}\\s+${escapeRegex(heading.text)}\\s*$`,
      "im",
    );

    if (headingPattern.test(result)) {
      continue; // Heading already exists
    }

    // Try to find the location by matching following text
    if (heading.followingText && heading.followingText.length > 15) {
      // Use first 30 chars for matching to avoid special chars issues
      const searchText = heading.followingText.slice(0, 30);
      const searchIndex = result.indexOf(searchText);

      if (searchIndex !== -1) {
        // Find the start of the line containing this text
        let lineStart = searchIndex;
        while (lineStart > 0 && result[lineStart - 1] !== "\n") {
          lineStart--;
        }

        // Don't insert if line already starts with # (is a heading)
        if (result[lineStart] !== "#") {
          const headingLine = `${headingMarker} ${heading.text}\n\n`;
          result =
            result.slice(0, lineStart) + headingLine + result.slice(lineStart);
        }
      }
    }
  }

  return result;
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Fetch and extract article content from a URL
 * Combines fetching, Readability extraction, and markdown conversion
 * @param url - URL to fetch and extract
 * @returns ExtractedArticle or null if extraction failed
 */
export async function extractArticle(
  url: string,
): Promise<ExtractedArticle | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();

    // Extract headings from original HTML before Readability strips them
    const originalHeadings = extractHeadingsFromHTML(html);

    const article = await extractArticleFromHTML(html, url);

    if (!article) {
      return null;
    }

    // Convert HTML content to markdown
    let markdown = htmlToMarkdown(article.content);

    // Re-inject any headings that Readability stripped
    if (originalHeadings.length > 0) {
      markdown = injectMissingHeadings(markdown, originalHeadings);
    }

    return {
      ...article,
      markdown,
    };
  } catch (error) {
    console.error("Failed to extract article:", error);
    return null;
  }
}
