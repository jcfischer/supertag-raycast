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
  extractArticle as fetchAndExtractArticleWithMarkdown,
  type ExtractedArticle,
} from "./content";

// Article extraction
export {
  extractArticle,
  fetchAndExtractArticle,
  parseHTMLToDOM,
} from "./article";

// Markdown conversion
export { htmlToMarkdown, htmlToMarkdownWithOptions } from "./markdown";

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

// Supertag analysis
export {
  analyzeSupertag,
  findClipFriendlySupertags,
  getBestTextFieldName,
  type AnalyzedSupertag,
  type FindOptions,
} from "./supertag-analyzer";

// Field mapping
export {
  mapClipToFields,
  createDefaultMapping,
  type ClipData,
  type MapOptions,
} from "./field-mapper";

// Template types
export {
  type ClipTemplate as TemplateClipTemplate,
  type TemplateContext,
  type RenderedTemplate,
  type FilterFunction,
  type FilterRegistry,
} from "./template-types";

// Template filters
export {
  truncate,
  defaultValue,
  lower,
  upper,
  capitalize,
  strip,
  wordcount,
  readtime,
  format,
  first,
  last,
  replace,
  trim,
  join,
  wrap,
  hideif,
  defaultFilters,
  parseFilterExpression,
  applyFilters,
} from "./filters";

// Template engine
export {
  renderTemplateString,
  renderTemplate,
  matchesDomainPattern,
  findMatchingTemplate,
  createTemplateContext,
  validateTemplate,
} from "./template";

// Builtin templates
export {
  builtinTemplates,
  getBuiltinTemplate,
  isBuiltinTemplate,
  githubRepoTemplate,
  githubIssueTemplate,
  youtubeTemplate,
  twitterTemplate,
  mediumTemplate,
  hackerNewsTemplate,
  redditTemplate,
  wikipediaTemplate,
  stackOverflowTemplate,
  genericArticleTemplate,
} from "./builtin-templates";

// Smart field mapping
export {
  createSmartFieldMapping,
  applySmartFieldMapping,
  getTemplateFieldNames,
  type SmartFieldMapping,
} from "./field-mapper-smart";

// AI providers
export {
  type AIProvider,
  type AIRequest,
  type AIResult,
  type AIOptions,
  type OllamaModel,
  AIProviderError,
  createAIProvider,
  ClaudeProvider,
  OllamaProvider,
  DisabledProvider,
  fetchOllamaModels,
} from "./ai";
