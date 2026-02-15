import { describe, it, expect } from "bun:test";
import { createAIProvider } from "../../../web-clipper/ai/factory";
import { ClaudeProvider } from "../../../web-clipper/ai/providers/claude";
import { OllamaProvider } from "../../../web-clipper/ai/providers/ollama";
import { DisabledProvider } from "../../../web-clipper/ai/providers/disabled";
import { RaycastProvider } from "../../../web-clipper/ai/providers/raycast";

describe("AI Provider Factory", () => {
  it("should create disabled provider", () => {
    const provider = createAIProvider({
      provider: "disabled",
      autoSummarize: false,
    });
    expect(provider).toBeInstanceOf(DisabledProvider);
  });

  it("should create Claude provider with API key", () => {
    const provider = createAIProvider({
      provider: "claude",
      claudeApiKey: "sk-ant-test123",
      autoSummarize: false,
    });
    expect(provider).toBeInstanceOf(ClaudeProvider);
  });

  it("should throw without Claude API key", () => {
    expect(() =>
      createAIProvider({
        provider: "claude",
        autoSummarize: false,
      }),
    ).toThrow("Claude API key required");
  });

  it("should create Ollama provider", () => {
    const provider = createAIProvider({
      provider: "ollama",
      ollamaEndpoint: "http://localhost:11434",
      ollamaModel: "llama3.2",
      autoSummarize: false,
    });
    expect(provider).toBeInstanceOf(OllamaProvider);
  });

  it("should create Ollama provider with defaults", () => {
    const provider = createAIProvider({
      provider: "ollama",
      autoSummarize: false,
    });
    expect(provider).toBeInstanceOf(OllamaProvider);
  });

  it("should create Raycast AI provider", () => {
    const provider =  createAIProvider({
        provider: "raycast",
        autoSummarize: false
      });
      expect(provider).toBeInstanceOf(RaycastProvider);
  })
});
