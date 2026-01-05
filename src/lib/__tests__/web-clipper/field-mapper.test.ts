import { describe, it, expect } from "bun:test";
import { mapClipToFields, type ClipData } from "../../web-clipper/field-mapper";
import type { AnalyzedSupertag } from "../../web-clipper/supertag-analyzer";
import type { CachedSupertag, CachedField } from "../../schema-cache";

// Helper to create test supertag
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

// Helper to create analyzed supertag
function createAnalyzed(supertag: CachedSupertag): AnalyzedSupertag {
  return {
    supertag,
    score: 10,
    hasUrlField: supertag.fields.some(
      (f) => f.dataType === "url" || f.name.toLowerCase().includes("url"),
    ),
    urlFieldName: supertag.fields.find(
      (f) => f.dataType === "url" || f.name.toLowerCase().includes("url"),
    )?.name,
    textFields: supertag.fields
      .filter((f) =>
        /^(notes?|summary|highlights?|snapshot)/i.test(f.name),
      )
      .map((f) => f.name),
    hasAuthorField: supertag.fields.some((f) =>
      /^(author|creator)/i.test(f.name),
    ),
    authorFieldName: supertag.fields.find((f) =>
      /^(author|creator)/i.test(f.name),
    )?.name,
  };
}

describe("Field Mapper", () => {
  describe("mapClipToFields", () => {
    it("should map URL to url-type field", () => {
      const supertag = createSupertag("bookmark", [
        { name: "URL", dataType: "url" },
      ]);
      const analyzed = createAnalyzed(supertag);
      const clip: ClipData = {
        url: "https://example.com",
        title: "Example",
      };

      const result = mapClipToFields(clip, analyzed);

      expect(result.URL).toBe("https://example.com");
    });

    it("should map URL to Source URL field", () => {
      const supertag = createSupertag("article", [
        { name: "Source URL", dataType: "url" },
      ]);
      const analyzed = createAnalyzed(supertag);
      const clip: ClipData = {
        url: "https://example.com",
        title: "Example",
      };

      const result = mapClipToFields(clip, analyzed);

      expect(result["Source URL"]).toBe("https://example.com");
    });

    it("should map selection to Notes field", () => {
      const supertag = createSupertag("bookmark", [
        { name: "URL", dataType: "url" },
        { name: "Notes", dataType: "plain" },
      ]);
      const analyzed = createAnalyzed(supertag);
      const clip: ClipData = {
        url: "https://example.com",
        title: "Example",
        selection: "Important text",
      };

      const result = mapClipToFields(clip, analyzed);

      expect(result.Notes).toBe("Important text");
    });

    it("should map selection to Summary field when Notes not available", () => {
      const supertag = createSupertag("resource", [
        { name: "URL", dataType: "url" },
        { name: "Summary", dataType: "plain" },
      ]);
      const analyzed = createAnalyzed(supertag);
      const clip: ClipData = {
        url: "https://example.com",
        title: "Example",
        selection: "Summary text",
      };

      const result = mapClipToFields(clip, analyzed);

      expect(result.Summary).toBe("Summary text");
    });

    it("should map author to Author field", () => {
      const supertag = createSupertag("article", [
        { name: "URL", dataType: "url" },
        { name: "Author", dataType: "plain" },
      ]);
      const analyzed = createAnalyzed(supertag);
      const clip: ClipData = {
        url: "https://example.com",
        title: "Example",
        author: "John Doe",
      };

      const result = mapClipToFields(clip, analyzed);

      expect(result.Author).toBe("John Doe");
    });

    it("should map author to Creator field when named Creator", () => {
      const supertag = createSupertag("content", [
        { name: "URL", dataType: "url" },
        { name: "Creator", dataType: "plain" },
      ]);
      const analyzed = createAnalyzed(supertag);
      const clip: ClipData = {
        url: "https://example.com",
        title: "Example",
        author: "Jane Smith",
      };

      const result = mapClipToFields(clip, analyzed);

      expect(result.Creator).toBe("Jane Smith");
    });

    it("should skip fields with no data", () => {
      const supertag = createSupertag("bookmark", [
        { name: "URL", dataType: "url" },
        { name: "Notes", dataType: "plain" },
        { name: "Author", dataType: "plain" },
      ]);
      const analyzed = createAnalyzed(supertag);
      const clip: ClipData = {
        url: "https://example.com",
        title: "Example",
        // No selection or author
      };

      const result = mapClipToFields(clip, analyzed);

      expect(result.URL).toBe("https://example.com");
      expect(result.Notes).toBeUndefined();
      expect(result.Author).toBeUndefined();
    });

    it("should handle supertag with no matching fields", () => {
      const supertag = createSupertag("task", [
        { name: "Status", dataType: "plain" },
        { name: "Due Date", dataType: "date" },
      ]);
      const analyzed = createAnalyzed(supertag);
      const clip: ClipData = {
        url: "https://example.com",
        title: "Example",
        selection: "Some text",
      };

      const result = mapClipToFields(clip, analyzed);

      expect(Object.keys(result).length).toBe(0);
    });

    it("should format URL as link when formatUrlAsLink is true", () => {
      const supertag = createSupertag("bookmark", [
        { name: "URL", dataType: "url" },
      ]);
      const analyzed = createAnalyzed(supertag);
      const clip: ClipData = {
        url: "https://example.com",
        title: "Example Title",
      };

      const result = mapClipToFields(clip, analyzed, { formatUrlAsLink: true });

      expect(result.URL).toBe("[Example Title](https://example.com)");
    });
  });
});
