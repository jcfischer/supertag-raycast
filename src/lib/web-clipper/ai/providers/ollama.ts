import type { AIProvider } from "../provider";
import type { AIRequest, AIResult, AIOptions } from "../types";
import { AIProviderError } from "../provider";
import {
  buildSummarizePrompt,
  buildKeypointsPrompt,
  buildTagsPrompt,
} from "../prompts";

const DEFAULT_TIMEOUT = 60000; // 60 seconds (local processing can be slower)
const DEFAULT_MODEL = "llama3.2";

interface OllamaResponse {
  model: string;
  response: string;
  done: boolean;
}

/**
 * Model info from Ollama API
 */
export interface OllamaModel {
  name: string;
  size: number;
  modified_at: string;
}

interface OllamaTagsResponse {
  models: Array<{
    name: string;
    size: number;
    modified_at: string;
  }>;
}

/**
 * Fetch available models from Ollama
 * @param endpoint - Ollama API endpoint (default: http://localhost:11434)
 * @returns List of available models or empty array if unavailable
 */
export async function fetchOllamaModels(
  endpoint = "http://localhost:11434",
): Promise<OllamaModel[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const normalizedEndpoint = endpoint.replace(/\/$/, "");
    const response = await fetch(`${normalizedEndpoint}/api/tags`, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return [];
    }

    const data = (await response.json()) as OllamaTagsResponse;
    return data.models || [];
  } catch {
    return [];
  }
}

export class OllamaProvider implements AIProvider {
  readonly name = "ollama";
  private endpoint: string;
  private model: string;

  constructor(endpoint = "http://localhost:11434", model = DEFAULT_MODEL) {
    this.endpoint = endpoint.replace(/\/$/, ""); // Remove trailing slash
    this.model = model;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${this.endpoint}/api/tags`, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }

  async process(request: AIRequest, options?: AIOptions): Promise<AIResult> {
    const timeout = options?.timeout ?? DEFAULT_TIMEOUT;
    const temperature = options?.temperature ?? 0.3;

    const prompt = this.buildPrompt(request);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(`${this.endpoint}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.model,
          prompt,
          stream: false,
          options: { temperature },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(
            `Model "${this.model}" not found. Check model name in preferences or run: ollama pull ${this.model}`,
          );
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = (await response.json()) as OllamaResponse;
      return this.parseResponse(request.operation, data.response);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new AIProviderError("Request timeout", this.name, error);
      }
      throw new AIProviderError(
        `Failed to process: ${error instanceof Error ? error.message : "Unknown error"}`,
        this.name,
        error instanceof Error ? error : undefined,
      );
    }
  }

  private buildPrompt(request: AIRequest): string {
    switch (request.operation) {
      case "summarize":
        return buildSummarizePrompt(request);
      case "extract-keypoints":
        return buildKeypointsPrompt(request);
      case "suggest-tags":
        return buildTagsPrompt(request);
    }
  }

  private parseResponse(operation: string, text: string): AIResult {
    // Same parsing logic as ClaudeProvider
    switch (operation) {
      case "summarize":
        return { summary: text.trim() };

      case "extract-keypoints":
        try {
          const keypoints = JSON.parse(text);
          if (!Array.isArray(keypoints)) {
            throw new Error("Expected array");
          }
          return { keypoints };
        } catch {
          const keypoints = text
            .split("\n")
            .map((line) => line.replace(/^[-*•]\s*/, "").trim())
            .filter(Boolean)
            .slice(0, 5);
          return { keypoints };
        }

      case "suggest-tags":
        try {
          const tags = JSON.parse(text);
          if (!Array.isArray(tags)) {
            throw new Error("Expected array");
          }
          return { tags };
        } catch {
          const tags = text
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean)
            .slice(0, 5);
          return { tags };
        }

      default:
        return {};
    }
  }
}
