import type { AIConfig } from "../types";
import type { AIProvider } from "./provider";
import { ClaudeProvider } from "./providers/claude";
import { OllamaProvider } from "./providers/ollama";
import { DisabledProvider } from "./providers/disabled";
import { environment, AI } from "@raycast/api";
import { RaycastProvider } from "./providers/raycast";

/**
 * Create AI provider from config
 */
export function createAIProvider(config: AIConfig): AIProvider {
  switch (config.provider) {
    case "claude":
      if (!config.claudeApiKey) {
        throw new Error("Claude API key required");
      }
      return new ClaudeProvider(config.claudeApiKey);

    case "ollama":
      return new OllamaProvider(config.ollamaEndpoint, config.ollamaModel);
    case "raycast":
      if (!environment.canAccess(AI)) {
        throw new Error("Raycast Pro Sub Required")
      }
      return new RaycastProvider()

    case "disabled":
    default:
      return new DisabledProvider();
  }
}
