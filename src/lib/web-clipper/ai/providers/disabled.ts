import type { AIProvider } from "../provider";
import type { AIRequest, AIResult } from "../types";

/**
 * Noop provider when AI is disabled
 */
export class DisabledProvider implements AIProvider {
  readonly name = "disabled";

  async isAvailable(): Promise<boolean> {
    return true; // Always available (it does nothing)
  }

  async process(_request: AIRequest): Promise<AIResult> {
    // Return empty result
    return {};
  }
}
