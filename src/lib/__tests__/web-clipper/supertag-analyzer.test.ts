import { describe, it, expect } from "bun:test";
import {
  analyzeSupertag,
  findClipFriendlySupertags,
  type AnalyzedSupertag,
} from "../../web-clipper/supertag-analyzer";
import type { CachedSupertag, CachedField } from "../../schema-cache";

// Helper to create test supertags
function createSupertag(
  name: string,
  fields: Partial<CachedField>[],
): CachedSupertag {
  return {
    id: `test-${name}`,
    name,
    normalizedName: name.toLowerCase(),
    fields: fields.map((f, i) => ({
      attributeId: `attr-${i}`,
      name: f.name || "",
      normalizedName: (f.name || "").toLowerCase(),
      dataType: f.dataType,
      ...f,
    })),
  };
}

describe("Supertag Analyzer", () => {
  describe("analyzeSupertag", () => {
    it("should score supertag with URL field high", () => {
      const supertag = createSupertag("bookmark", [{ name: "URL", dataType: "url" }]);
      const result = analyzeSupertag(supertag);

      expect(result.hasUrlField).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(10);
    });

    it("should identify url-type fields by dataType", () => {
      const supertag = createSupertag("resource", [
        { name: "Source", dataType: "url" },
      ]);
      const result = analyzeSupertag(supertag);

      expect(result.hasUrlField).toBe(true);
      expect(result.urlFieldName).toBe("Source");
    });

    it("should identify url-type fields by name pattern", () => {
      const supertag = createSupertag("article", [
        { name: "Source URL", dataType: "plain" },
      ]);
      const result = analyzeSupertag(supertag);

      expect(result.hasUrlField).toBe(true);
      expect(result.urlFieldName).toBe("Source URL");
    });

    it("should score supertag with notes field", () => {
      const supertag = createSupertag("bookmark", [
        { name: "URL", dataType: "url" },
        { name: "Notes", dataType: "plain" },
      ]);
      const result = analyzeSupertag(supertag);

      expect(result.textFields.length).toBeGreaterThan(0);
      expect(result.score).toBeGreaterThanOrEqual(15);
    });

    it("should identify multiple text fields", () => {
      const supertag = createSupertag("article", [
        { name: "URL", dataType: "url" },
        { name: "Summary", dataType: "plain" },
        { name: "Highlights", dataType: "plain" },
        { name: "Notes", dataType: "plain" },
      ]);
      const result = analyzeSupertag(supertag);

      expect(result.textFields).toContain("Summary");
      expect(result.textFields).toContain("Highlights");
      expect(result.textFields).toContain("Notes");
    });

    it("should identify author field", () => {
      const supertag = createSupertag("article", [
        { name: "Author", dataType: "plain" },
      ]);
      const result = analyzeSupertag(supertag);

      expect(result.hasAuthorField).toBe(true);
      expect(result.authorFieldName).toBe("Author");
    });

    it("should identify creator as author field", () => {
      const supertag = createSupertag("content", [
        { name: "Creator", dataType: "plain" },
      ]);
      const result = analyzeSupertag(supertag);

      expect(result.hasAuthorField).toBe(true);
      expect(result.authorFieldName).toBe("Creator");
    });

    it("should score supertag without URL field lower", () => {
      const supertag = createSupertag("task", [
        { name: "Due Date", dataType: "date" },
        { name: "Status", dataType: "plain" },
      ]);
      const result = analyzeSupertag(supertag);

      expect(result.hasUrlField).toBe(false);
      expect(result.score).toBeLessThan(10);
    });

    it("should return zero score for empty supertag", () => {
      const supertag = createSupertag("empty", []);
      const result = analyzeSupertag(supertag);

      expect(result.score).toBe(0);
    });
  });

  describe("findClipFriendlySupertags", () => {
    it("should return empty array for empty input", () => {
      const result = findClipFriendlySupertags([]);
      expect(result).toEqual([]);
    });

    it("should rank supertags by score descending", () => {
      const supertags = [
        createSupertag("task", [{ name: "Status", dataType: "plain" }]),
        createSupertag("bookmark", [
          { name: "URL", dataType: "url" },
          { name: "Notes", dataType: "plain" },
        ]),
        createSupertag("note", [{ name: "Content", dataType: "plain" }]),
      ];

      const result = findClipFriendlySupertags(supertags);

      expect(result[0].supertag.name).toBe("bookmark");
      expect(result[0].score).toBeGreaterThan(result[1].score);
    });

    it("should filter out supertags with score below threshold", () => {
      const supertags = [
        createSupertag("bookmark", [{ name: "URL", dataType: "url" }]),
        createSupertag("task", [{ name: "Status", dataType: "plain" }]),
      ];

      const result = findClipFriendlySupertags(supertags, { minScore: 10 });

      expect(result.length).toBe(1);
      expect(result[0].supertag.name).toBe("bookmark");
    });

    it("should include all fields from original supertag", () => {
      const supertags = [
        createSupertag("article", [
          { name: "URL", dataType: "url" },
          { name: "Title", dataType: "plain" },
        ]),
      ];

      const result = findClipFriendlySupertags(supertags);

      expect(result[0].supertag.fields.length).toBe(2);
    });

    it("should limit results when requested", () => {
      const supertags = Array.from({ length: 20 }, (_, i) =>
        createSupertag(`tag${i}`, [{ name: "URL", dataType: "url" }]),
      );

      const result = findClipFriendlySupertags(supertags, { limit: 5 });

      expect(result.length).toBe(5);
    });
  });
});
