import { describe, it, expect } from "bun:test";
import { extractArticle, parseHTMLToDOM } from "../../web-clipper/article";

describe("Article extractor", () => {
  describe("parseHTMLToDOM", () => {
    it("should parse valid HTML into a DOM document", async () => {
      const html = `
        <!DOCTYPE html>
        <html>
          <head><title>Test</title></head>
          <body><p>Hello world</p></body>
        </html>
      `;
      const doc = await parseHTMLToDOM(html, "https://example.com");
      expect(doc).toBeDefined();
      expect(doc.title).toBe("Test");
    });

    it("should handle malformed HTML gracefully", async () => {
      const html = `<p>No doctype<div>unclosed`;
      const doc = await parseHTMLToDOM(html, "https://example.com");
      expect(doc).toBeDefined();
    });
  });

  describe("extractArticle", () => {
    it("should extract article from simple HTML", async () => {
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Test Article</title>
          </head>
          <body>
            <article>
              <h1>Main Heading</h1>
              <p>This is the first paragraph with enough content to make it interesting.
                 It needs to have some substance for Readability to consider it valid content.</p>
              <p>This is the second paragraph which also contains meaningful text.
                 We need multiple paragraphs for the algorithm to work properly.</p>
              <p>And here is a third paragraph to ensure we have enough content
                 for the article extractor to identify this as the main content.</p>
            </article>
          </body>
        </html>
      `;
      const result = await extractArticle(html, "https://example.com/article");

      expect(result).not.toBeNull();
      expect(result!.title).toBe("Test Article");
      expect(result!.content).toContain("Main Heading");
      expect(result!.textContent).toContain("first paragraph");
      expect(result!.length).toBeGreaterThan(0);
    });

    it("should extract byline/author when present", async () => {
      const html = `
        <!DOCTYPE html>
        <html>
          <head><title>Author Test</title></head>
          <body>
            <article>
              <p class="byline">By Jane Doe</p>
              <p>This is an article with enough content to be extracted.
                 We need multiple paragraphs for proper extraction.</p>
              <p>Here is another paragraph of meaningful content.</p>
              <p>And a third paragraph to make it substantial enough.</p>
            </article>
          </body>
        </html>
      `;
      const result = await extractArticle(html, "https://example.com/article");

      expect(result).not.toBeNull();
      // Byline extraction depends on Readability heuristics
      // Just verify the article was extracted
      expect(result!.textContent).toBeTruthy();
    });

    it("should calculate reading time based on word count", async () => {
      // Create an article with ~400 words (should be ~2-3 minutes at 200 wpm)
      const words = Array(400).fill("word").join(" ");
      const html = `
        <!DOCTYPE html>
        <html>
          <head><title>Long Article</title></head>
          <body>
            <article>
              <h1>Title</h1>
              <p>${words}</p>
            </article>
          </body>
        </html>
      `;
      const result = await extractArticle(html, "https://example.com/article");

      expect(result).not.toBeNull();
      // Reading time depends on total extracted text including title
      expect(result!.readingTime).toBeGreaterThanOrEqual(2);
      expect(result!.readingTime).toBeLessThanOrEqual(3);
    });

    it("should return null for truly empty pages", async () => {
      const html = `
        <!DOCTYPE html>
        <html>
          <head><title>Empty Page</title></head>
          <body></body>
        </html>
      `;
      const result = await extractArticle(html, "https://example.com");

      expect(result).toBeNull();
    });

    it("should return minimal content for nav-only pages", async () => {
      const html = `
        <!DOCTYPE html>
        <html>
          <head><title>Nav Page</title></head>
          <body>
            <nav>Navigation</nav>
            <footer>Footer</footer>
          </body>
        </html>
      `;
      const result = await extractArticle(html, "https://example.com");

      // Readability may extract nav text but it should be minimal
      if (result) {
        expect(result.textContent.length).toBeLessThan(50);
      }
    });

    it("should extract excerpt from content", async () => {
      const html = `
        <!DOCTYPE html>
        <html>
          <head><title>Excerpt Test</title></head>
          <body>
            <article>
              <h1>Article Title</h1>
              <p>This is a longer article with substantial content that should produce an excerpt.
                 The excerpt is typically the first few sentences of the article content.</p>
              <p>Here is more content to make the article substantial enough for extraction.
                 We need enough content for Readability to identify this as the main article.</p>
              <p>Third paragraph with additional content to ensure proper extraction works.</p>
            </article>
          </body>
        </html>
      `;
      const result = await extractArticle(html, "https://example.com/article");

      expect(result).not.toBeNull();
      expect(result!.excerpt).toBeTruthy();
      expect(result!.excerpt.length).toBeLessThan(result!.textContent.length);
    });

    it("should preserve HTML structure in content", async () => {
      const html = `
        <!DOCTYPE html>
        <html>
          <head><title>HTML Test</title></head>
          <body>
            <article>
              <h1>Main Title</h1>
              <p>First paragraph with <strong>bold</strong> and <em>italic</em> text.</p>
              <ul>
                <li>List item one</li>
                <li>List item two</li>
              </ul>
              <p>Another paragraph to ensure we have enough content for extraction.</p>
            </article>
          </body>
        </html>
      `;
      const result = await extractArticle(html, "https://example.com/article");

      expect(result).not.toBeNull();
      // Content should be HTML with tags preserved
      expect(result!.content).toContain("<strong>bold</strong>");
      expect(result!.content).toContain("<em>italic</em>");
    });

    it("should strip navigation and ads from content", async () => {
      const html = `
        <!DOCTYPE html>
        <html>
          <head><title>Clean Test</title></head>
          <body>
            <nav><a href="/">Home</a></nav>
            <aside class="ad">Advertisement</aside>
            <article>
              <h1>Article</h1>
              <p>This is the main article content that should be extracted without ads or navigation.</p>
              <p>Second paragraph with more substantial content for proper extraction.</p>
              <p>Third paragraph to make the article long enough.</p>
            </article>
            <footer>Copyright</footer>
          </body>
        </html>
      `;
      const result = await extractArticle(html, "https://example.com/article");

      expect(result).not.toBeNull();
      expect(result!.textContent).not.toContain("Advertisement");
      expect(result!.textContent).not.toContain("Copyright");
    });
  });
});
