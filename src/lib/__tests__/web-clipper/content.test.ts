import { describe, it, expect } from "bun:test";
import {
  parseOpenGraphMeta,
  extractDomain,
  fetchMetadata,
} from "../../web-clipper/content";
import type { OpenGraphMeta } from "../../web-clipper/types";

describe("Content service", () => {
  describe("extractDomain", () => {
    it("should extract domain from URL", () => {
      expect(extractDomain("https://example.com/path")).toBe("example.com");
    });

    it("should handle www prefix", () => {
      expect(extractDomain("https://www.example.com/path")).toBe("example.com");
    });

    it("should handle subdomains", () => {
      expect(extractDomain("https://blog.example.com/path")).toBe("blog.example.com");
    });

    it("should handle URLs with ports", () => {
      expect(extractDomain("http://localhost:3000/path")).toBe("localhost");
    });
  });

  describe("parseOpenGraphMeta", () => {
    it("should parse og:title", () => {
      const html = `
        <html>
          <head>
            <meta property="og:title" content="Test Title">
          </head>
        </html>
      `;
      const meta = parseOpenGraphMeta(html);
      expect(meta.title).toBe("Test Title");
    });

    it("should parse og:description", () => {
      const html = `
        <html>
          <head>
            <meta property="og:description" content="Test description">
          </head>
        </html>
      `;
      const meta = parseOpenGraphMeta(html);
      expect(meta.description).toBe("Test description");
    });

    it("should parse og:image", () => {
      const html = `
        <html>
          <head>
            <meta property="og:image" content="https://example.com/image.jpg">
          </head>
        </html>
      `;
      const meta = parseOpenGraphMeta(html);
      expect(meta.image).toBe("https://example.com/image.jpg");
    });

    it("should parse og:type", () => {
      const html = `
        <html>
          <head>
            <meta property="og:type" content="article">
          </head>
        </html>
      `;
      const meta = parseOpenGraphMeta(html);
      expect(meta.type).toBe("article");
    });

    it("should parse og:site_name", () => {
      const html = `
        <html>
          <head>
            <meta property="og:site_name" content="Example Site">
          </head>
        </html>
      `;
      const meta = parseOpenGraphMeta(html);
      expect(meta.siteName).toBe("Example Site");
    });

    it("should parse article:author", () => {
      const html = `
        <html>
          <head>
            <meta property="article:author" content="Jane Doe">
          </head>
        </html>
      `;
      const meta = parseOpenGraphMeta(html);
      expect(meta.author).toBe("Jane Doe");
    });

    it("should fallback to author meta tag", () => {
      const html = `
        <html>
          <head>
            <meta name="author" content="John Smith">
          </head>
        </html>
      `;
      const meta = parseOpenGraphMeta(html);
      expect(meta.author).toBe("John Smith");
    });

    it("should parse article:published_time", () => {
      const html = `
        <html>
          <head>
            <meta property="article:published_time" content="2026-01-04T12:00:00Z">
          </head>
        </html>
      `;
      const meta = parseOpenGraphMeta(html);
      expect(meta.publishedTime).toBe("2026-01-04T12:00:00Z");
    });

    it("should fallback to title tag", () => {
      const html = `
        <html>
          <head>
            <title>Page Title</title>
          </head>
        </html>
      `;
      const meta = parseOpenGraphMeta(html);
      expect(meta.title).toBe("Page Title");
    });

    it("should fallback to meta description", () => {
      const html = `
        <html>
          <head>
            <meta name="description" content="Page description">
          </head>
        </html>
      `;
      const meta = parseOpenGraphMeta(html);
      expect(meta.description).toBe("Page description");
    });

    it("should handle multiple meta tags", () => {
      const html = `
        <html>
          <head>
            <title>Fallback Title</title>
            <meta property="og:title" content="OG Title">
            <meta name="description" content="Fallback Description">
            <meta property="og:description" content="OG Description">
            <meta property="og:image" content="https://example.com/og.jpg">
            <meta property="og:site_name" content="Example">
          </head>
        </html>
      `;
      const meta = parseOpenGraphMeta(html);
      // OG tags should take precedence
      expect(meta.title).toBe("OG Title");
      expect(meta.description).toBe("OG Description");
      expect(meta.image).toBe("https://example.com/og.jpg");
      expect(meta.siteName).toBe("Example");
    });

    it("should handle empty/missing meta tags gracefully", () => {
      const html = `<html><head></head><body></body></html>`;
      const meta = parseOpenGraphMeta(html);
      expect(meta.title).toBeUndefined();
      expect(meta.description).toBeUndefined();
    });

    it("should decode HTML entities", () => {
      const html = `
        <html>
          <head>
            <meta property="og:title" content="Test &amp; Title &quot;Quoted&quot;">
          </head>
        </html>
      `;
      const meta = parseOpenGraphMeta(html);
      expect(meta.title).toBe('Test & Title "Quoted"');
    });
  });

  describe("fetchMetadata", () => {
    it("should be a function", () => {
      expect(typeof fetchMetadata).toBe("function");
    });

    // Note: Integration tests would need mocking or live URLs
    // These are handled in e2e tests
  });
});
