import { AI, environment } from "@raycast/api";
import type { AIProvider } from "../provider";
import { AIProviderError } from "../provider";
import type { AIOptions, AIRequest, AIResult } from "../types";
import {
  buildSummarizePrompt,
  buildKeypointsPrompt,
  buildTagsPrompt,
} from "../prompts";

const DEFAULT_TIMEOUT = 30000; // 30 seconds
const DEFAULT_MAX_TOKENS = 1024;
const DEFAULT_TEMPERATURE = 0.3;

export class RaycastProvider implements AIProvider {
    readonly name = "raycast";

    async isAvailable(): Promise<boolean> {
    try {
      return !!environment.canAccess(AI);
    } catch {
      return false;
    }
  }

  async process(request: AIRequest, options: AIOptions): Promise<AIResult> {
    try {
      const timeout = options?.timeout ?? DEFAULT_TIMEOUT;
      const maxTokens = options?.maxTokens ?? DEFAULT_MAX_TOKENS;
      const temperature = options?.temperature ?? DEFAULT_TEMPERATURE;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const prompt = this.buildPrompt(request);

    //   const response = await this.client.messages.create(
    //     {
    //       model: "claude-sonnet-4-5-20250929",
    //       max_tokens: maxTokens,
    //       temperature,
    //       messages: [{ role: "user", content: prompt }],
    //     },
    //     { signal: controller.signal as AbortSignal },
    //   );

    
      const response = await AI.ask(prompt, { creativity: options?.temperature ?? DEFAULT_TEMPERATURE, model: AI.Model["Anthropic_Claude_4.5_Haiku"] })

      clearTimeout(timeoutId);

      const content = response;
      if ((typeof content) !== "string") {
        throw new AIProviderError("Unexpected response type", this.name);
      }

      return this.parseResponse(request.operation, content);
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
          // Fallback: split by newlines if JSON parsing fails
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
          // Fallback: split by commas
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
  