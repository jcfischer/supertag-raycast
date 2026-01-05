import type { AIRequest, AIResult, AIOptions } from "./types";

/**
 * Base interface for AI providers
 */
export interface AIProvider {
  /**
   * Provider name
   */
  readonly name: string;

  /**
   * Process AI request
   */
  process(request: AIRequest, options?: AIOptions): Promise<AIResult>;

  /**
   * Check if provider is configured and ready
   */
  isAvailable(): Promise<boolean>;
}

/**
 * Base error class for AI providers
 */
export class AIProviderError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = "AIProviderError";
  }
}
