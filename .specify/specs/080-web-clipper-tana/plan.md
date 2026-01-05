---
feature: "Web Clipper to Tana"
spec: "./spec.md"
status: "phase2_complete"
created: "2026-01-04"
updated: "2026-01-05"
---

# Technical Plan: Web Clipper to Tana

## Architecture Overview

Separate Raycast command (`clip-web`) with modular service architecture. Core logic abstracted into reusable library for potential CLI/MCP exposure later.

```
┌─────────────────────────────────────────────────────────────────┐
│                     Raycast Extension                            │
├─────────────────────────────────────────────────────────────────┤
│  clip-web.tsx (Command)                                          │
│  ├── ClipForm (UI)                                               │
│  │   ├── Title, URL, Selection fields                            │
│  │   ├── Supertag dropdown (cached schemas)                      │
│  │   ├── Template selector (domain-matched)                      │
│  │   ├── AI toggle (summarize/keypoints)                         │
│  │   └── Live preview panel (Tana Paste)                         │
│  └── Actions: Save to Tana | Copy Paste | Edit Template          │
├─────────────────────────────────────────────────────────────────┤
│                        Services Layer                            │
├──────────────┬──────────────┬───────────────┬───────────────────┤
│ BrowserService│ ContentService│ TemplateService│ AIService       │
│ - getActiveTab│ - fetchMeta  │ - loadTemplates│ - summarize     │
│ - getSelection│ - extractBody│ - matchDomain │ - extractPoints │
│ - supportedApps│ - toMarkdown │ - renderVars  │ - suggestTags   │
├──────────────┴──────────────┴───────────────┴───────────────────┤
│                     Core Library (lib/)                          │
├─────────────────────────────────────────────────────────────────┤
│ TanaPasteBuilder     │ Builds %%tana%% formatted output          │
│ TemplateEngine       │ Variable substitution & filters           │
│ MetadataFetcher      │ OG/meta tag extraction                    │
│ ArticleExtractor     │ Readability.js wrapper                    │
│ MarkdownConverter    │ Turndown with GFM extensions              │
├─────────────────────────────────────────────────────────────────┤
│                  Existing Infrastructure                         │
├─────────────────────────────────────────────────────────────────┤
│ cli.ts (supertag-cli) │ schema-cache.ts │ fallbacks.ts           │
└─────────────────────────────────────────────────────────────────┘
```

## Technology Stack

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Language | TypeScript | PAI standard, existing codebase |
| Runtime | Bun (via Raycast) | PAI standard, fast |
| UI | @raycast/api | Existing pattern |
| Browser Automation | AppleScript via osascript | macOS native, no deps |
| Article Extraction | @mozilla/readability | Industry standard |
| HTML→Markdown | turndown + turndown-plugin-gfm | GFM tables, task lists |
| AI Provider | Claude API / Ollama | Privacy-first with local option |
| Storage | Raycast LocalStorage | Preferences, templates, domain prefs |

## Constitutional Compliance

- [x] **CLI-First:** Services exposed via existing supertag-cli integration; TanaPasteBuilder can be used standalone
- [x] **Library-First:** All logic in `lib/web-clipper/` as reusable modules, UI is thin wrapper
- [x] **Test-First:** Unit tests for each service, integration tests for browser extraction
- [x] **Deterministic:** AI features are optional (disabled by default per user clarification); core clipping is deterministic
- [x] **Code Before Prompts:** Extraction logic in code (Readability, Turndown); AI only for optional summarization

## Data Model

### Entities

```typescript
// Core clip data
interface WebClip {
  url: string;
  title: string;
  description?: string;
  image?: string;
  author?: string;
  publishedDate?: string;
  siteName?: string;
  highlights: Highlight[];
  content?: string; // Full article markdown
  summary?: string; // AI-generated
  keypoints?: string[]; // AI-extracted
  clippedAt: string; // ISO date
}

interface Highlight {
  text: string;
  html?: string;
  position?: number;
}

// Template system
interface ClipTemplate {
  id: string;
  name: string;
  triggers: string[]; // Domain patterns: "github.com/*", "*.medium.com"
  supertag: string;
  fields: Record<string, string>; // Field name → template expression
  contentTemplate?: string; // Body template
  isBuiltin?: boolean;
}

// User preferences
interface DomainPreference {
  domain: string;
  supertag: string;
  templateId?: string;
  lastUsed: string;
}

// AI configuration
interface AIConfig {
  provider: "claude" | "ollama" | "disabled";
  claudeApiKey?: string;
  ollamaEndpoint?: string;
  ollamaModel?: string;
  autoSummarize: boolean;
}
```

### Storage Schema (Raycast LocalStorage)

```typescript
// Keys
const STORAGE_KEYS = {
  templates: "webclip:templates", // ClipTemplate[]
  domainPrefs: "webclip:domainPrefs", // Record<string, DomainPreference>
  aiConfig: "webclip:aiConfig", // AIConfig
  recentClips: "webclip:recent", // WebClip[] (last 10)
};
```

## API Contracts

### Internal APIs

```typescript
// lib/web-clipper/browser.ts
interface BrowserService {
  getActiveTab(): Promise<{ url: string; title: string; browser: string }>;
  getSelection(): Promise<string | null>;
  getSupportedBrowsers(): string[];
}

// lib/web-clipper/content.ts
interface ContentService {
  fetchMetadata(url: string): Promise<OpenGraphMeta>;
  extractArticle(url: string): Promise<ArticleContent>;
  toMarkdown(html: string): string;
}

interface OpenGraphMeta {
  title?: string;
  description?: string;
  image?: string;
  type?: string;
  siteName?: string;
  author?: string;
  publishedTime?: string;
}

interface ArticleContent {
  title: string;
  content: string; // HTML
  textContent: string;
  excerpt: string;
  byline?: string;
  siteName?: string;
  length: number;
  readingTime: number; // minutes
}

// lib/web-clipper/template.ts
interface TemplateService {
  loadTemplates(): Promise<ClipTemplate[]>;
  saveTemplate(template: ClipTemplate): Promise<void>;
  deleteTemplate(id: string): Promise<void>;
  matchTemplate(url: string): ClipTemplate | null;
  renderTemplate(template: ClipTemplate, clip: WebClip): string;
}

// lib/web-clipper/ai.ts
interface AIProvider {
  isAvailable(): Promise<boolean>;
  summarize(content: string): Promise<string>;
  extractKeyPoints(content: string): Promise<string[]>;
  suggestTags(content: string, existingTags: string[]): Promise<string[]>;
  extract(content: string, prompt: string): Promise<string>;
}

// lib/web-clipper/tana-paste.ts
interface TanaPasteBuilder {
  fromClip(clip: WebClip, supertag: string, fields?: Record<string, string>): string;
  fromTemplate(clip: WebClip, template: ClipTemplate): string;
}
```

### Template Variable Syntax

```typescript
// Variables
type TemplateVariable =
  | "{{title}}"
  | "{{url}}"
  | "{{domain}}"
  | "{{date}}"
  | "{{selection}}"
  | "{{content}}"
  | "{{description}}"
  | "{{author}}"
  | "{{image}}"
  | "{{summary}}"
  | "{{keypoints}}"
  | "{{readtime}}";

// Filters (pipe syntax)
// {{title|truncate:50}}
// {{date|format:"YYYY-MM-DD"}}
// {{content|wordcount}}
// {{content|readtime}}
// {{selection|default:"No selection"}}
```

## Implementation Strategy

### Phase 1: Foundation (MVP) ✅ COMPLETE

Core clipping without AI or templates. Get basic flow working.

- [x] Create `lib/web-clipper/browser.ts` - AppleScript for Safari/Chrome/Arc/Firefox + Brave/Zen
- [x] Create `lib/web-clipper/content.ts` - Metadata fetching via fetch + cheerio
- [x] Create `lib/web-clipper/tana-paste.ts` - Tana Paste format builder
- [x] Create `src/clip-web.tsx` - Basic form UI with:
  - URL/title from active tab
  - Selection capture
  - Supertag dropdown (reuse existing cache)
  - Live preview panel
  - Save action with fallback
- [x] Add command to `package.json`
- [x] Unit tests for browser service mocks (69 tests)
- [x] Integration test with real browser (manual)
- [x] Smart browser detection using CGWindowListCopyWindowInfo (z-order)

**Success:** ✅ Can clip current tab to Tana with selection and see preview

### Phase 2: Enhanced Capture ✅ COMPLETE

Full article extraction, multi-highlight support, and smart supertag detection.

- [x] Add `@mozilla/readability`, `turndown`, and `jsdom` dependencies
- [x] Create `lib/web-clipper/article.ts` - Readability wrapper
- [x] Create `lib/web-clipper/markdown.ts` - Turndown with GFM plugins
- [x] Update UI with "Extract Full Article" toggle
- [x] Add reading time estimate display
- [x] Support multiple highlights in session
- [x] Domain preference memory (last used supertag)
- [x] **Smart supertag detection** - Scan workspace for clip-friendly tags:
  - Query schema-cache for supertags with URL field
  - Score by presence of text fields (notes/summary/highlight)
  - Rank and suggest in dropdown
- [x] **Dynamic field mapping** - Map clip data to schema fields:
  - URL → first url-type field
  - Selection → text field matching notes/summary/highlight/snapshot pattern
  - Author/Description → matching field names
  - Removed hardcoded field mappings from clip-web.tsx

**Success:** ✅ Can extract clean article content, selection saves to correct field for any supertag

### Phase 3: Templates

Template system with variables and domain matching.

- [ ] Create `lib/web-clipper/template.ts` - Template engine
- [ ] Create `lib/web-clipper/filters.ts` - Variable filters
- [ ] Add template storage (Raycast LocalStorage)
- [ ] Create template editor UI
- [ ] Add domain-based template matching
- [ ] Bundle default templates (GitHub, Twitter/X, YouTube, Medium)
- [ ] Import/export templates as JSON

**Success:** Templates auto-select by domain, variables resolve correctly

### Phase 4: AI Features

Optional AI summarization and extraction.

- [ ] Create `lib/web-clipper/ai/provider.ts` - Provider interface
- [ ] Create `lib/web-clipper/ai/claude.ts` - Claude API implementation
- [ ] Create `lib/web-clipper/ai/ollama.ts` - Ollama implementation
- [ ] Create `lib/web-clipper/ai/disabled.ts` - Noop implementation
- [ ] Add AI settings to Raycast preferences
- [ ] Add "Summarize" toggle in clip form
- [ ] Add "Extract key points" action
- [ ] Add tag suggestions (match against Tana supertags)

**Success:** AI summary appears in clip, works with local Ollama

## File Structure

```
src/
├── clip-web.tsx                    # [New] Main command
├── lib/
│   ├── cli.ts                      # [Existing] supertag-cli wrapper
│   ├── schema-cache.ts             # [Existing] Supertag caching
│   ├── fallbacks.ts                # [Existing] Error handling
│   ├── types.ts                    # [Modified] Add WebClip types
│   └── web-clipper/                # [New] All new
│       ├── index.ts                # Public exports
│       ├── browser.ts              # AppleScript browser interaction
│       ├── content.ts              # Metadata fetching
│       ├── article.ts              # Readability extraction
│       ├── markdown.ts             # Turndown conversion
│       ├── tana-paste.ts           # Tana Paste builder
│       ├── template.ts             # Template engine
│       ├── filters.ts              # Template filters
│       ├── storage.ts              # LocalStorage wrapper
│       ├── ai/
│       │   ├── index.ts            # Provider factory
│       │   ├── types.ts            # AIProvider interface
│       │   ├── claude.ts           # Claude implementation
│       │   ├── ollama.ts           # Ollama implementation
│       │   └── disabled.ts         # Noop implementation
│       └── templates/              # Built-in templates
│           ├── index.ts
│           ├── github.ts
│           ├── twitter.ts
│           ├── youtube.ts
│           └── medium.ts

tests/
├── lib/
│   └── web-clipper/
│       ├── browser.test.ts
│       ├── content.test.ts
│       ├── article.test.ts
│       ├── tana-paste.test.ts
│       ├── template.test.ts
│       └── ai/
│           ├── claude.test.ts
│           └── ollama.test.ts
```

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| AppleScript browser access denied | High | Medium | Clear error messaging, guide to enable permissions |
| Browser API changes (Arc/Firefox) | Medium | Low | Modular browser service with fallback chain |
| Readability fails on complex pages | Medium | Medium | Graceful fallback to metadata-only clip |
| Ollama not installed/running | Low | High | Clear "disabled" state, guide to setup |
| Claude API rate limits | Low | Low | Exponential backoff, cache summaries |
| Tana Paste format changes | High | Low | Validate against official examples, version templates |
| Large article content | Medium | Medium | Truncate with warning, configurable limits |

## Dependencies

### External (New)

```json
{
  "@mozilla/readability": "^0.5.0",
  "turndown": "^7.1.3",
  "turndown-plugin-gfm": "^1.0.2",
  "cheerio": "^1.0.0-rc.12"
}
```

### Internal (Existing)

- `lib/cli.ts` - supertag-cli for Tana node creation
- `lib/schema-cache.ts` - Caching supertag schemas
- `lib/fallbacks.ts` - Error handling with clipboard fallback
- `@raycast/api` - UI components
- `execa` - CLI execution
- `zod` - Validation

## Migration/Deployment

- [ ] No database migrations needed (uses Raycast LocalStorage)
- [ ] New command added, no breaking changes to existing commands
- [ ] Environment variables for AI (optional):
  - `ANTHROPIC_API_KEY` - Claude API key
  - `OLLAMA_ENDPOINT` - Custom Ollama endpoint (default: http://localhost:11434)

## Estimated Complexity

- **New files:** ~20
- **Modified files:** ~3 (package.json, types.ts, extension manifest)
- **Test files:** ~8
- **Estimated tasks:** ~35-40

## Builtin Templates

### GitHub Repository

```json
{
  "id": "builtin:github-repo",
  "name": "GitHub Repository",
  "triggers": ["github.com/*/*"],
  "supertag": "#repository",
  "fields": {
    "URL": "{{url}}",
    "Description": "{{description}}",
    "Language": "{{meta:language}}"
  }
}
```

### YouTube Video

```json
{
  "id": "builtin:youtube",
  "name": "YouTube Video",
  "triggers": ["youtube.com/watch*", "youtu.be/*"],
  "supertag": "#video",
  "fields": {
    "URL": "{{url}}",
    "Channel": "{{author}}",
    "Description": "{{description|truncate:200}}"
  }
}
```

### Twitter/X Post

```json
{
  "id": "builtin:twitter",
  "name": "Twitter/X Post",
  "triggers": ["twitter.com/*/status/*", "x.com/*/status/*"],
  "supertag": "#tweet",
  "fields": {
    "URL": "{{url}}",
    "Author": "{{author}}"
  },
  "contentTemplate": "{{selection|default:description}}"
}
```

### Medium Article

```json
{
  "id": "builtin:medium",
  "name": "Medium Article",
  "triggers": ["medium.com/*", "*.medium.com/*"],
  "supertag": "#article",
  "fields": {
    "URL": "{{url}}",
    "Author": "{{author}}",
    "Reading Time": "{{readtime}} min"
  }
}
```

## Next Steps

After plan approval, run `/speckit.tasks` to generate granular task breakdown.
