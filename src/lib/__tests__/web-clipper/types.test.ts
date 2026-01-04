import { describe, it, expect } from "bun:test";
import {
  WebClipSchema,
  HighlightSchema,
  ClipTemplateSchema,
  DomainPreferenceSchema,
  AIConfigSchema,
  type WebClip,
  type Highlight,
  type ClipTemplate,
  type DomainPreference,
  type AIConfig,
} from "../../web-clipper/types";

describe("WebClip types", () => {
  describe("HighlightSchema", () => {
    it("should validate a valid highlight", () => {
      const highlight = { text: "Important passage" };
      expect(HighlightSchema.parse(highlight)).toEqual(highlight);
    });

    it("should validate highlight with optional fields", () => {
      const highlight = {
        text: "Important passage",
        html: "<b>Important</b> passage",
        position: 42,
      };
      expect(HighlightSchema.parse(highlight)).toEqual(highlight);
    });

    it("should reject empty text", () => {
      expect(() => HighlightSchema.parse({ text: "" })).toThrow();
    });
  });

  describe("WebClipSchema", () => {
    it("should validate a minimal WebClip", () => {
      const clip: WebClip = {
        url: "https://example.com",
        title: "Example Page",
        highlights: [],
        clippedAt: "2026-01-04T12:00:00Z",
      };
      expect(WebClipSchema.parse(clip)).toEqual(clip);
    });

    it("should validate a full WebClip", () => {
      const clip: WebClip = {
        url: "https://example.com/article",
        title: "Full Article",
        description: "A great article",
        image: "https://example.com/image.jpg",
        author: "Jane Doe",
        publishedDate: "2026-01-01",
        siteName: "Example Site",
        highlights: [
          { text: "Key insight", position: 100 },
          { text: "Another point" },
        ],
        content: "# Full article content\n\nParagraph here.",
        summary: "AI-generated summary",
        keypoints: ["Point 1", "Point 2"],
        clippedAt: "2026-01-04T12:00:00Z",
      };
      expect(WebClipSchema.parse(clip)).toEqual(clip);
    });

    it("should reject invalid URL", () => {
      const clip = {
        url: "not-a-url",
        title: "Test",
        highlights: [],
        clippedAt: "2026-01-04T12:00:00Z",
      };
      expect(() => WebClipSchema.parse(clip)).toThrow();
    });

    it("should reject empty title", () => {
      const clip = {
        url: "https://example.com",
        title: "",
        highlights: [],
        clippedAt: "2026-01-04T12:00:00Z",
      };
      expect(() => WebClipSchema.parse(clip)).toThrow();
    });
  });

  describe("ClipTemplateSchema", () => {
    it("should validate a minimal template", () => {
      const template: ClipTemplate = {
        id: "custom:test",
        name: "Test Template",
        triggers: ["example.com/*"],
        supertag: "#bookmark",
        fields: {},
      };
      expect(ClipTemplateSchema.parse(template)).toEqual(template);
    });

    it("should validate a full template", () => {
      const template: ClipTemplate = {
        id: "builtin:github",
        name: "GitHub Repository",
        triggers: ["github.com/*/*"],
        supertag: "#repository",
        fields: {
          URL: "{{url}}",
          Description: "{{description}}",
        },
        contentTemplate: "{{selection}}",
        isBuiltin: true,
      };
      expect(ClipTemplateSchema.parse(template)).toEqual(template);
    });

    it("should reject empty triggers array", () => {
      const template = {
        id: "test",
        name: "Test",
        triggers: [],
        supertag: "#test",
        fields: {},
      };
      expect(() => ClipTemplateSchema.parse(template)).toThrow();
    });
  });

  describe("DomainPreferenceSchema", () => {
    it("should validate domain preference", () => {
      const pref: DomainPreference = {
        domain: "github.com",
        supertag: "#repository",
        lastUsed: "2026-01-04T12:00:00Z",
      };
      expect(DomainPreferenceSchema.parse(pref)).toEqual(pref);
    });

    it("should validate with optional templateId", () => {
      const pref: DomainPreference = {
        domain: "medium.com",
        supertag: "#article",
        templateId: "builtin:medium",
        lastUsed: "2026-01-04T12:00:00Z",
      };
      expect(DomainPreferenceSchema.parse(pref)).toEqual(pref);
    });
  });

  describe("AIConfigSchema", () => {
    it("should validate disabled config", () => {
      const config: AIConfig = {
        provider: "disabled",
        autoSummarize: false,
      };
      expect(AIConfigSchema.parse(config)).toEqual(config);
    });

    it("should validate claude config", () => {
      const config: AIConfig = {
        provider: "claude",
        claudeApiKey: "sk-ant-api-key",
        autoSummarize: true,
      };
      expect(AIConfigSchema.parse(config)).toEqual(config);
    });

    it("should validate ollama config", () => {
      const config: AIConfig = {
        provider: "ollama",
        ollamaEndpoint: "http://localhost:11434",
        ollamaModel: "llama2",
        autoSummarize: true,
      };
      expect(AIConfigSchema.parse(config)).toEqual(config);
    });

    it("should reject invalid provider", () => {
      const config = {
        provider: "openai",
        autoSummarize: false,
      };
      expect(() => AIConfigSchema.parse(config)).toThrow();
    });
  });
});
