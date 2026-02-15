import { z } from "zod";

/**
 * A text highlight/selection from a web page
 */
export const HighlightSchema = z.object({
  text: z.string().min(1, "Highlight text cannot be empty"),
  html: z.string().optional(),
  position: z.number().optional(),
});

export type Highlight = z.infer<typeof HighlightSchema>;

/**
 * Captured web page data
 */
export const WebClipSchema = z.object({
  url: z.string().url("Invalid URL"),
  title: z.string().min(1, "Title cannot be empty"),
  description: z.string().optional(),
  image: z.string().url().optional(),
  author: z.string().optional(),
  publishedDate: z.string().optional(),
  siteName: z.string().optional(),
  highlights: z.array(HighlightSchema),
  content: z.string().optional(), // Full article markdown
  summary: z.string().optional(), // AI-generated
  keypoints: z.array(z.string()).optional(), // AI-extracted
  clippedAt: z.string(), // ISO date
});

export type WebClip = z.infer<typeof WebClipSchema>;

/**
 * Template for clipping specific site types
 */
export const ClipTemplateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  triggers: z.array(z.string()).min(1, "At least one trigger pattern required"),
  supertag: z.string().min(1),
  fields: z.record(z.string(), z.string()), // Field name → template expression
  contentTemplate: z.string().optional(), // Body template
  isBuiltin: z.boolean().optional(),
});

export type ClipTemplate = z.infer<typeof ClipTemplateSchema>;

/**
 * User's preferred supertag per domain
 */
export const DomainPreferenceSchema = z.object({
  domain: z.string().min(1),
  supertag: z.string().min(1),
  templateId: z.string().optional(),
  lastUsed: z.string(), // ISO date
});

export type DomainPreference = z.infer<typeof DomainPreferenceSchema>;

/**
 * AI provider configuration
 */
export const AIConfigSchema = z.object({
  provider: z.enum(["claude", "ollama", "raycast", "disabled"]),
  claudeApiKey: z.string().optional(),
  ollamaEndpoint: z.string().optional(),
  ollamaModel: z.string().optional(),
  autoSummarize: z.boolean(),
});

export type AIConfig = z.infer<typeof AIConfigSchema>;

/**
 * Open Graph metadata from a web page
 */
export interface OpenGraphMeta {
  title?: string;
  description?: string;
  image?: string;
  type?: string;
  siteName?: string;
  author?: string;
  publishedTime?: string;
}

/**
 * Extracted article content
 */
export interface ArticleContent {
  title: string;
  content: string; // HTML
  textContent: string;
  excerpt: string;
  byline?: string;
  siteName?: string;
  length: number;
  readingTime: number; // minutes
}

/**
 * Browser tab information
 */
export interface BrowserTab {
  url: string;
  title: string;
  browser: string;
}

/**
 * Storage keys for LocalStorage
 */
export const STORAGE_KEYS = {
  templates: "webclip:templates",
  domainPrefs: "webclip:domainPrefs",
  aiConfig: "webclip:aiConfig",
  recentClips: "webclip:recent",
} as const;

/**
 * Default AI config (disabled)
 */
export const DEFAULT_AI_CONFIG: AIConfig = {
  provider: "disabled",
  autoSummarize: false,
};
