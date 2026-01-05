import type { AIRequest } from "./types";

/**
 * Generate summarization prompt
 */
export function buildSummarizePrompt(request: AIRequest): string {
  return `Summarize the following article in 2-3 concise sentences. Focus on the main idea and key takeaways.

Title: ${request.title}
URL: ${request.url}

Content:
${request.content}

Provide only the summary, without any preamble or meta-commentary.`;
}

/**
 * Generate key points extraction prompt
 */
export function buildKeypointsPrompt(request: AIRequest): string {
  return `Extract 3-5 key points from the following article. Each point should be a single, clear sentence.

Title: ${request.title}
URL: ${request.url}

Content:
${request.content}

Return the key points as a JSON array of strings, like: ["point 1", "point 2", "point 3"]
Return ONLY the JSON array, nothing else.`;
}

/**
 * Generate tag suggestion prompt
 */
export function buildTagsPrompt(request: AIRequest): string {
  return `Suggest 3-5 relevant tags for categorizing this article. Tags should be single words or short phrases.

Title: ${request.title}
URL: ${request.url}

Content:
${request.content.slice(0, 1000)}

Return the tags as a JSON array of strings, like: ["technology", "ai", "productivity"]
Return ONLY the JSON array, nothing else.`;
}
