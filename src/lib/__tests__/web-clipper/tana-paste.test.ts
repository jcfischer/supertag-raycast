import { describe, it, expect } from "bun:test";
import { buildTanaPaste, buildTanaPasteFromClip } from "../../web-clipper/tana-paste";
import type { WebClip } from "../../web-clipper/types";

describe("Tana Paste builder", () => {
  describe("buildTanaPaste", () => {
    it("should create basic Tana Paste with title and supertag", () => {
      const result = buildTanaPaste({
        title: "Test Article",
        supertag: "#bookmark",
      });
      expect(result).toBe("%%tana%%\n- Test Article #bookmark");
    });

    it("should add URL field", () => {
      const result = buildTanaPaste({
        title: "Test Article",
        supertag: "#bookmark",
        fields: { URL: "https://example.com" },
      });
      expect(result).toContain("- URL:: https://example.com");
    });

    it("should add multiple fields", () => {
      const result = buildTanaPaste({
        title: "Test Article",
        supertag: "#article",
        fields: {
          URL: "https://example.com",
          Author: "Jane Doe",
          Description: "A great article",
        },
      });
      expect(result).toContain("- URL:: https://example.com");
      expect(result).toContain("- Author:: Jane Doe");
      expect(result).toContain("- Description:: A great article");
    });

    it("should add highlights as child nodes", () => {
      const result = buildTanaPaste({
        title: "Test Article",
        supertag: "#bookmark",
        highlights: ["First highlight", "Second highlight"],
      });
      expect(result).toContain("  - First highlight");
      expect(result).toContain("  - Second highlight");
    });

    it("should add content as child node", () => {
      const result = buildTanaPaste({
        title: "Test Article",
        supertag: "#article",
        content: "Full article content here",
      });
      expect(result).toContain("  - Full article content here");
    });

    it("should format URL as link when title is provided", () => {
      const result = buildTanaPaste({
        title: "Test Article",
        supertag: "#bookmark",
        fields: { URL: "[Test Article](https://example.com)" },
      });
      expect(result).toContain("- URL:: [Test Article](https://example.com)");
    });

    it("should include clipped date", () => {
      const result = buildTanaPaste({
        title: "Test Article",
        supertag: "#bookmark",
        fields: { Clipped: "2026-01-04" },
      });
      expect(result).toContain("- Clipped:: 2026-01-04");
    });
  });

  describe("buildTanaPasteFromClip", () => {
    it("should build Tana Paste from WebClip", () => {
      const clip: WebClip = {
        url: "https://example.com/article",
        title: "Great Article",
        description: "An amazing read",
        highlights: [{ text: "Key insight" }],
        clippedAt: "2026-01-04T12:00:00Z",
      };

      const result = buildTanaPasteFromClip(clip, "#article");

      expect(result).toContain("%%tana%%");
      expect(result).toContain("- Great Article #article");
      expect(result).toContain("- URL:: [Great Article](https://example.com/article)");
      expect(result).toContain("- Description:: An amazing read");
      expect(result).toContain("  - Key insight");
    });

    it("should include author when present", () => {
      const clip: WebClip = {
        url: "https://example.com",
        title: "Test",
        author: "Jane Doe",
        highlights: [],
        clippedAt: "2026-01-04T12:00:00Z",
      };

      const result = buildTanaPasteFromClip(clip, "#bookmark");
      expect(result).toContain("- Author:: Jane Doe");
    });

    it("should include summary when present", () => {
      const clip: WebClip = {
        url: "https://example.com",
        title: "Test",
        summary: "AI-generated summary of the article",
        highlights: [],
        clippedAt: "2026-01-04T12:00:00Z",
      };

      const result = buildTanaPasteFromClip(clip, "#bookmark");
      expect(result).toContain("- Summary:: AI-generated summary of the article");
    });

    it("should include keypoints as nested bullets", () => {
      const clip: WebClip = {
        url: "https://example.com",
        title: "Test",
        keypoints: ["Point 1", "Point 2", "Point 3"],
        highlights: [],
        clippedAt: "2026-01-04T12:00:00Z",
      };

      const result = buildTanaPasteFromClip(clip, "#bookmark");
      expect(result).toContain("- Key Points::");
      expect(result).toContain("    - Point 1");
      expect(result).toContain("    - Point 2");
      expect(result).toContain("    - Point 3");
    });

    it("should handle multiple highlights", () => {
      const clip: WebClip = {
        url: "https://example.com",
        title: "Test",
        highlights: [
          { text: "First highlight" },
          { text: "Second highlight" },
          { text: "Third highlight" },
        ],
        clippedAt: "2026-01-04T12:00:00Z",
      };

      const result = buildTanaPasteFromClip(clip, "#bookmark");
      expect(result).toContain("  - First highlight");
      expect(result).toContain("  - Second highlight");
      expect(result).toContain("  - Third highlight");
    });

    it("should escape special characters in content", () => {
      const clip: WebClip = {
        url: "https://example.com",
        title: "Test with [[brackets]]",
        highlights: [{ text: "Text with #hashtag" }],
        clippedAt: "2026-01-04T12:00:00Z",
      };

      const result = buildTanaPasteFromClip(clip, "#bookmark");
      // Title should be preserved (brackets are meaningful in Tana)
      expect(result).toContain("Test with [[brackets]]");
    });
  });
});
