import type { OpenGraphMeta } from "./types";

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
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

/**
 * Extract content attribute from meta tag using regex
 */
function getMetaContent(html: string, property: string, isName = false): string | undefined {
  const attrType = isName ? "name" : "property";
  // Match both single and double quotes, case insensitive
  const regex = new RegExp(
    `<meta\\s+[^>]*${attrType}=["']${property}["'][^>]*content=["']([^"']*)["']|<meta\\s+[^>]*content=["']([^"']*)["'][^>]*${attrType}=["']${property}["']`,
    "i"
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
  meta.description = getMetaContent(html, "og:description") || getMetaContent(html, "description", true);
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
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
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
    throw new Error(`Failed to fetch metadata: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Calculate estimated reading time from text
 * @param text - Plain text content
 * @param wordsPerMinute - Reading speed (default: 200 wpm)
 * @returns Reading time in minutes
 */
export function calculateReadingTime(text: string, wordsPerMinute = 200): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.ceil(words / wordsPerMinute);
}

/**
 * Count words in text
 */
export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}
