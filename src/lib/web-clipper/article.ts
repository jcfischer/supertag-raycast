import { parseHTML } from "linkedom";
import { Readability } from "@mozilla/readability";
import type { ArticleContent } from "./types";
import { calculateReadingTime } from "./content";

/**
 * Parse HTML string into a DOM Document using linkedom (lightweight)
 * @param html - Raw HTML string
 * @param url - Base URL for resolving relative links
 * @returns DOM Document
 */
export async function parseHTMLToDOM(html: string, url: string): Promise<Document> {
  const { document } = parseHTML(html);
  // Set the base URL for relative link resolution
  if (url) {
    const base = document.createElement("base");
    base.href = url;
    document.head.appendChild(base);
  }
  return document as unknown as Document;
}

/**
 * Extract article content from HTML using Mozilla Readability
 * @param html - Raw HTML string
 * @param url - URL of the page (used for resolving relative links)
 * @returns ArticleContent or null if no article could be extracted
 */
export async function extractArticle(
  html: string,
  url: string,
): Promise<ArticleContent | null> {
  try {
    const doc = await parseHTMLToDOM(html, url);

    // Clone document for Readability (it modifies the DOM)
    const documentClone = doc.cloneNode(true) as Document;

    const reader = new Readability(documentClone, {
      charThreshold: 100, // Lower threshold for shorter articles
    });

    const article = reader.parse();

    if (!article || !article.content || !article.textContent) {
      return null;
    }

    const textContent = article.textContent.trim();
    const readingTime = calculateReadingTime(textContent);

    return {
      title: article.title || doc.title || "",
      content: article.content,
      textContent,
      excerpt: article.excerpt || textContent.slice(0, 200) + "...",
      byline: article.byline || undefined,
      siteName: article.siteName || undefined,
      length: textContent.length,
      readingTime,
    };
  } catch (error) {
    console.error("Article extraction failed:", error);
    return null;
  }
}

/**
 * Fetch and extract article from a URL
 * @param url - URL to fetch and extract
 * @returns ArticleContent or null if extraction failed
 */
export async function fetchAndExtractArticle(
  url: string,
): Promise<ArticleContent | null> {
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
    return extractArticle(html, url);
  } catch (error) {
    console.error("Failed to fetch and extract article:", error);
    return null;
  }
}
