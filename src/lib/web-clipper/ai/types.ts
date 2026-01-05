import { z } from "zod";

/**
 * AI processing result
 */
export const AIResultSchema = z.object({
  summary: z.string().optional(),
  keypoints: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
});

export type AIResult = z.infer<typeof AIResultSchema>;

/**
 * AI processing request
 */
export interface AIRequest {
  url: string;
  title: string;
  content: string; // Article markdown or description
  operation: "summarize" | "extract-keypoints" | "suggest-tags";
}

/**
 * AI processing options
 */
export interface AIOptions {
  maxTokens?: number;
  temperature?: number;
  timeout?: number; // milliseconds
}
