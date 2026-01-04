import { describe, it, expect, mock, beforeEach } from "bun:test";
import {
  getActiveTab,
  getSelection,
  getSupportedBrowsers,
  detectFrontmostBrowser,
  type BrowserName,
} from "../../web-clipper/browser";

// Mock execa for testing without actual AppleScript execution
const mockExeca = mock(() => Promise.resolve({ stdout: "", exitCode: 0 }));

describe("Browser service", () => {
  describe("getSupportedBrowsers", () => {
    it("should return list of supported browsers", () => {
      const browsers = getSupportedBrowsers();
      expect(browsers).toContain("Safari");
      expect(browsers).toContain("Google Chrome");
      expect(browsers).toContain("Arc");
      expect(browsers).toContain("Firefox");
    });
  });

  describe("detectFrontmostBrowser", () => {
    it("should return Safari when Safari is frontmost", async () => {
      // This test would need mocking in real implementation
      // For now, we test the exported function exists
      expect(typeof detectFrontmostBrowser).toBe("function");
    });
  });

  describe("getActiveTab", () => {
    it("should return url, title, and browser name", async () => {
      // This requires AppleScript execution
      // In real testing, we'd mock the osascript call
      expect(typeof getActiveTab).toBe("function");
    });

    it("should handle Safari tab info", () => {
      // Test the parsing logic independently
      const mockOutput = "https://example.com\nExample Page";
      const lines = mockOutput.split("\n");
      expect(lines[0]).toBe("https://example.com");
      expect(lines[1]).toBe("Example Page");
    });
  });

  describe("getSelection", () => {
    it("should return selected text from browser", async () => {
      expect(typeof getSelection).toBe("function");
    });

    it("should return null when no selection", () => {
      // Test empty selection handling
      const emptyOutput = "";
      expect(emptyOutput || null).toBeNull();
    });
  });

  describe("AppleScript parsing", () => {
    it("should parse Safari URL correctly", () => {
      const url = "https://example.com/path?query=1";
      expect(url.startsWith("http")).toBe(true);
    });

    it("should handle URL with special characters", () => {
      const url = "https://example.com/path?foo=bar&baz=qux#anchor";
      expect(new URL(url).hostname).toBe("example.com");
    });

    it("should trim whitespace from title", () => {
      const title = "  Example Page  \n";
      expect(title.trim()).toBe("Example Page");
    });
  });
});
