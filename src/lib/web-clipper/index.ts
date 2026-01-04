/**
 * Web Clipper Module
 *
 * Best-of-breed web clipper for Tana combining:
 * - Notion's one-click database integration
 * - Readwise Reader's keyboard-first highlighting
 * - Obsidian's template system with variables
 * - Roam's bidirectional linking with live preview
 */

// Types and schemas
export {
  type WebClip,
  type Highlight,
  type ClipTemplate,
  type DomainPreference,
  type AIConfig,
  type OpenGraphMeta,
  type ArticleContent,
  type BrowserTab,
  WebClipSchema,
  HighlightSchema,
  ClipTemplateSchema,
  DomainPreferenceSchema,
  AIConfigSchema,
  STORAGE_KEYS,
  DEFAULT_AI_CONFIG,
} from "./types";

// Browser interaction
export {
  type BrowserName,
  getActiveTab,
  getSelection,
  getSupportedBrowsers,
  detectFrontmostBrowser,
  isBrowserRunning,
} from "./browser";

// Content extraction
export {
  fetchMetadata,
  parseOpenGraphMeta,
  extractDomain,
  calculateReadingTime,
  countWords,
} from "./content";

// Tana Paste builder
export {
  buildTanaPaste,
  buildTanaPasteFromClip,
  formatTanaLink,
  escapeTanaText,
  type TanaPasteOptions,
} from "./tana-paste";

// Storage
export {
  WebClipStorage,
  createRaycastStorage,
  type StorageInterface,
} from "./storage";
