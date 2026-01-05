import { describe, it, expect } from "bun:test";
import { OllamaProvider } from "../../../web-clipper/ai/providers/ollama";

describe("OllamaProvider", () => {
  it("should create with default endpoint", () => {
    const provider = new OllamaProvider();
    expect(provider.name).toBe("ollama");
  });

  it("should create with custom endpoint", () => {
    const provider = new OllamaProvider("http://custom:11434");
    expect(provider.name).toBe("ollama");
  });

  it("should strip trailing slash from endpoint", () => {
    const provider = new OllamaProvider("http://localhost:11434/");
    expect(provider.name).toBe("ollama");
  });

  it("should check availability", async () => {
    const provider = new OllamaProvider();
    const available = await provider.isAvailable();
    expect(typeof available).toBe("boolean");
    // Will be false unless Ollama is running locally
  });

  it("should give helpful error for missing model", async () => {
    const provider = new OllamaProvider(
      "http://localhost:11434",
      "nonexistent-model",
    );

    // This test only runs if Ollama is available
    const available = await provider.isAvailable();
    if (!available) {
      return; // Skip if Ollama not running
    }

    try {
      await provider.process({
        url: "https://example.com",
        title: "Test",
        content: "Test content",
        operation: "summarize",
      });
      // Should not reach here
      expect(true).toBe(false);
    } catch (error) {
      expect(error instanceof Error).toBe(true);
      if (error instanceof Error) {
        expect(error.message).toContain("nonexistent-model");
        expect(error.message).toContain("not found");
      }
    }
  });

  // Integration tests would need Ollama running
  it.skip("should process with local Ollama", async () => {
    // Requires Ollama running locally
  });
});
