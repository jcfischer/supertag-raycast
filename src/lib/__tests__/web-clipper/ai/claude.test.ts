import { describe, it, expect } from "bun:test";
import { ClaudeProvider } from "../../../web-clipper/ai/providers/claude";
import { AIProviderError } from "../../../web-clipper/ai/provider";

describe("ClaudeProvider", () => {
  it("should reject invalid API key", () => {
    expect(() => new ClaudeProvider("invalid")).toThrow(AIProviderError);
    expect(() => new ClaudeProvider("")).toThrow(AIProviderError);
    expect(() => new ClaudeProvider("not-starting-with-sk-ant")).toThrow(
      AIProviderError,
    );
  });

  it("should accept valid API key format", () => {
    const provider = new ClaudeProvider("sk-ant-test123");
    expect(provider.name).toBe("claude");
  });

  it("should be available with valid key", async () => {
    const provider = new ClaudeProvider("sk-ant-test123");
    const available = await provider.isAvailable();
    expect(typeof available).toBe("boolean");
    expect(available).toBe(true);
  });

  // Integration tests would need real API key
  it.skip("should process summarize request", async () => {
    // Requires real API key
  });
});
