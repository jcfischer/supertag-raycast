import { describe, it, expect } from "bun:test";
import { htmlToMarkdown } from "../../web-clipper/markdown";

describe("Markdown converter", () => {
  describe("htmlToMarkdown", () => {
    it("should convert simple paragraphs", () => {
      const html = "<p>Hello world</p><p>Second paragraph</p>";
      const md = htmlToMarkdown(html);
      expect(md).toContain("Hello world");
      expect(md).toContain("Second paragraph");
    });

    it("should convert headings", () => {
      const html = "<h1>Title</h1><h2>Subtitle</h2><h3>Section</h3>";
      const md = htmlToMarkdown(html);
      expect(md).toContain("# Title");
      expect(md).toContain("## Subtitle");
      expect(md).toContain("### Section");
    });

    it("should convert bold and italic", () => {
      const html =
        "<p>This is <strong>bold</strong> and <em>italic</em> text.</p>";
      const md = htmlToMarkdown(html);
      expect(md).toContain("**bold**");
      expect(md).toContain("_italic_");
    });

    it("should convert links", () => {
      const html = '<p>Visit <a href="https://example.com">Example</a></p>';
      const md = htmlToMarkdown(html);
      expect(md).toContain("[Example](https://example.com)");
    });

    it("should convert unordered lists", () => {
      const html = "<ul><li>Item 1</li><li>Item 2</li><li>Item 3</li></ul>";
      const md = htmlToMarkdown(html);
      // Turndown adds extra spaces after list markers
      expect(md).toMatch(/-\s+Item 1/);
      expect(md).toMatch(/-\s+Item 2/);
      expect(md).toMatch(/-\s+Item 3/);
    });

    it("should convert ordered lists", () => {
      const html = "<ol><li>First</li><li>Second</li><li>Third</li></ol>";
      const md = htmlToMarkdown(html);
      expect(md).toMatch(/1\.\s+First/);
      expect(md).toMatch(/2\.\s+Second/);
      expect(md).toMatch(/3\.\s+Third/);
    });

    it("should convert code blocks", () => {
      const html = '<pre><code class="language-javascript">const x = 1;</code></pre>';
      const md = htmlToMarkdown(html);
      expect(md).toContain("```javascript");
      expect(md).toContain("const x = 1;");
      expect(md).toContain("```");
    });

    it("should convert inline code", () => {
      const html = "<p>Use <code>npm install</code> to install</p>";
      const md = htmlToMarkdown(html);
      expect(md).toContain("`npm install`");
    });

    it("should convert blockquotes", () => {
      const html = "<blockquote><p>This is a quote</p></blockquote>";
      const md = htmlToMarkdown(html);
      expect(md).toContain("> This is a quote");
    });

    it("should convert images", () => {
      const html = '<img src="https://example.com/img.jpg" alt="Alt text">';
      const md = htmlToMarkdown(html);
      expect(md).toContain("![Alt text](https://example.com/img.jpg)");
    });

    it("should convert tables (GFM)", () => {
      const html = `
        <table>
          <thead>
            <tr><th>Name</th><th>Age</th></tr>
          </thead>
          <tbody>
            <tr><td>Alice</td><td>30</td></tr>
            <tr><td>Bob</td><td>25</td></tr>
          </tbody>
        </table>
      `;
      const md = htmlToMarkdown(html);
      expect(md).toContain("| Name | Age |");
      expect(md).toContain("| --- | --- |");
      expect(md).toContain("| Alice | 30 |");
      expect(md).toContain("| Bob | 25 |");
    });

    it("should convert strikethrough (GFM)", () => {
      const html = "<p>This is <del>deleted</del> text</p>";
      const md = htmlToMarkdown(html);
      // GFM plugin uses single ~ for strikethrough
      expect(md).toMatch(/~+deleted~+/);
    });

    it("should convert task lists (GFM)", () => {
      const html = `
        <ul>
          <li><input type="checkbox" checked> Done</li>
          <li><input type="checkbox"> Todo</li>
        </ul>
      `;
      const md = htmlToMarkdown(html);
      // Task list items with flexible whitespace
      expect(md).toMatch(/\[x\]\s*Done/);
      expect(md).toMatch(/\[ \]\s*Todo/);
    });

    it("should handle nested lists", () => {
      const html = `
        <ul>
          <li>Parent
            <ul>
              <li>Child 1</li>
              <li>Child 2</li>
            </ul>
          </li>
        </ul>
      `;
      const md = htmlToMarkdown(html);
      expect(md).toContain("Parent");
      expect(md).toContain("Child 1");
      expect(md).toContain("Child 2");
    });

    it("should strip unwanted elements", () => {
      const html = `
        <div>
          <script>alert('bad');</script>
          <style>.foo { color: red; }</style>
          <p>Good content</p>
        </div>
      `;
      const md = htmlToMarkdown(html);
      expect(md).toContain("Good content");
      expect(md).not.toContain("alert");
      expect(md).not.toContain("color: red");
    });

    it("should preserve line breaks in preformatted text", () => {
      const html = "<pre>Line 1\nLine 2\nLine 3</pre>";
      const md = htmlToMarkdown(html);
      expect(md).toContain("Line 1");
      expect(md).toContain("Line 2");
      expect(md).toContain("Line 3");
    });

    it("should handle empty input", () => {
      expect(htmlToMarkdown("")).toBe("");
      expect(htmlToMarkdown("   ")).toBe("");
    });

    it("should handle plain text (no HTML)", () => {
      const text = "Just plain text without any HTML";
      const md = htmlToMarkdown(text);
      expect(md).toBe("Just plain text without any HTML");
    });
  });
});
