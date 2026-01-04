import { describe, it, expect, beforeEach, mock } from "bun:test";
import {
  WebClipStorage,
  STORAGE_KEYS,
  type StorageInterface,
} from "../../web-clipper/storage";
import type { ClipTemplate, DomainPreference, AIConfig, WebClip } from "../../web-clipper/types";

// Mock storage for testing
function createMockStorage(): StorageInterface {
  const store = new Map<string, string>();
  return {
    getItem: async (key: string) => store.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: async (key: string) => {
      store.delete(key);
    },
  };
}

describe("WebClipStorage", () => {
  let storage: WebClipStorage;
  let mockStore: StorageInterface;

  beforeEach(() => {
    mockStore = createMockStorage();
    storage = new WebClipStorage(mockStore);
  });

  describe("templates", () => {
    const testTemplate: ClipTemplate = {
      id: "custom:test",
      name: "Test Template",
      triggers: ["example.com/*"],
      supertag: "#bookmark",
      fields: { URL: "{{url}}" },
    };

    it("should save and load templates", async () => {
      await storage.saveTemplate(testTemplate);
      const templates = await storage.getTemplates();
      expect(templates).toContainEqual(testTemplate);
    });

    it("should update existing template", async () => {
      await storage.saveTemplate(testTemplate);
      const updated = { ...testTemplate, name: "Updated Template" };
      await storage.saveTemplate(updated);
      const templates = await storage.getTemplates();
      expect(templates.find((t) => t.id === testTemplate.id)?.name).toBe("Updated Template");
    });

    it("should delete template", async () => {
      await storage.saveTemplate(testTemplate);
      await storage.deleteTemplate(testTemplate.id);
      const templates = await storage.getTemplates();
      expect(templates.find((t) => t.id === testTemplate.id)).toBeUndefined();
    });

    it("should return empty array when no templates", async () => {
      const templates = await storage.getTemplates();
      expect(templates).toEqual([]);
    });
  });

  describe("domain preferences", () => {
    const testPref: DomainPreference = {
      domain: "github.com",
      supertag: "#repository",
      lastUsed: "2026-01-04T12:00:00Z",
    };

    it("should save and load domain preference", async () => {
      await storage.saveDomainPreference(testPref);
      const pref = await storage.getDomainPreference("github.com");
      expect(pref).toEqual(testPref);
    });

    it("should return null for unknown domain", async () => {
      const pref = await storage.getDomainPreference("unknown.com");
      expect(pref).toBeNull();
    });

    it("should get all domain preferences", async () => {
      await storage.saveDomainPreference(testPref);
      await storage.saveDomainPreference({
        domain: "medium.com",
        supertag: "#article",
        lastUsed: "2026-01-04T12:00:00Z",
      });
      const prefs = await storage.getAllDomainPreferences();
      expect(Object.keys(prefs)).toHaveLength(2);
    });
  });

  describe("AI config", () => {
    const testConfig: AIConfig = {
      provider: "claude",
      claudeApiKey: "sk-test",
      autoSummarize: true,
    };

    it("should save and load AI config", async () => {
      await storage.saveAIConfig(testConfig);
      const config = await storage.getAIConfig();
      expect(config).toEqual(testConfig);
    });

    it("should return default config when none saved", async () => {
      const config = await storage.getAIConfig();
      expect(config.provider).toBe("disabled");
      expect(config.autoSummarize).toBe(false);
    });
  });

  describe("recent clips", () => {
    const testClip: WebClip = {
      url: "https://example.com",
      title: "Test Clip",
      highlights: [],
      clippedAt: "2026-01-04T12:00:00Z",
    };

    it("should add and retrieve recent clips", async () => {
      await storage.addRecentClip(testClip);
      const clips = await storage.getRecentClips();
      expect(clips).toContainEqual(testClip);
    });

    it("should limit recent clips to 10", async () => {
      for (let i = 0; i < 15; i++) {
        await storage.addRecentClip({
          ...testClip,
          url: `https://example.com/${i}`,
          clippedAt: new Date(Date.now() + i * 1000).toISOString(),
        });
      }
      const clips = await storage.getRecentClips();
      expect(clips).toHaveLength(10);
    });

    it("should order recent clips by clippedAt descending", async () => {
      const older = {
        ...testClip,
        url: "https://example.com/older",
        clippedAt: "2026-01-01T12:00:00Z",
      };
      const newer = {
        ...testClip,
        url: "https://example.com/newer",
        clippedAt: "2026-01-04T12:00:00Z",
      };
      await storage.addRecentClip(older);
      await storage.addRecentClip(newer);
      const clips = await storage.getRecentClips();
      expect(clips[0].url).toBe(newer.url);
    });

    it("should clear recent clips", async () => {
      await storage.addRecentClip(testClip);
      await storage.clearRecentClips();
      const clips = await storage.getRecentClips();
      expect(clips).toHaveLength(0);
    });
  });
});
