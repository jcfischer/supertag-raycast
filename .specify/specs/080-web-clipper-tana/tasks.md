---
feature: "Web Clipper to Tana"
plan: "./plan.md"
status: "phase2_complete"
total_tasks: 42
completed: 26
phase1_completed: "2026-01-04"
phase2_completed: "2026-01-05"
---

# Tasks: Web Clipper to Tana

## Legend

- `[T]` - Test required (TDD mandatory - write test FIRST)
- `[P]` - Can run in parallel with other [P] tasks in same group
- `depends: T-X.Y` - Must complete after specified task(s)

---

## Group 1: Foundation (MVP)

Core types, browser integration, and basic clip flow.

### T-1.1 Create WebClip types [T] [P]

- File: `src/lib/web-clipper/types.ts`
- Test: `src/lib/__tests__/web-clipper/types.test.ts`
- Description: Define WebClip, Highlight, ClipTemplate, DomainPreference, AIConfig interfaces with Zod schemas for validation

### T-1.2 Create storage service [T] [P]

- File: `src/lib/web-clipper/storage.ts`
- Test: `src/lib/__tests__/web-clipper/storage.test.ts`
- Description: Wrapper for Raycast LocalStorage with typed getters/setters for templates, domain prefs, AI config

### T-1.3 Create browser service (Safari) [T] [P]

- File: `src/lib/web-clipper/browser.ts`
- Test: `src/lib/__tests__/web-clipper/browser.test.ts`
- Description: AppleScript to get active tab URL/title and selection from Safari

### T-1.4 Add Chrome/Arc support to browser service [T] (depends: T-1.3)

- File: `src/lib/web-clipper/browser.ts`
- Test: `src/lib/__tests__/web-clipper/browser.test.ts`
- Description: Extend browser service with Chrome and Arc AppleScript variants

### T-1.5 Add Firefox support to browser service [T] (depends: T-1.3)

- File: `src/lib/web-clipper/browser.ts`
- Test: `src/lib/__tests__/web-clipper/browser.test.ts`
- Description: Add Firefox AppleScript support (different API)

### T-1.6 Create metadata fetcher [T] [P]

- File: `src/lib/web-clipper/content.ts`
- Test: `src/lib/__tests__/web-clipper/content.test.ts`
- Description: Fetch URL and parse OG meta tags (title, description, image, author, type, siteName)

### T-1.7 Create Tana Paste builder [T] [P]

- File: `src/lib/web-clipper/tana-paste.ts`
- Test: `src/lib/__tests__/web-clipper/tana-paste.test.ts`
- Description: Build %%tana%% format from WebClip with supertag, fields, and highlights as children

### T-1.8 Create web-clipper index exports [P] (depends: T-1.1, T-1.6, T-1.7)

- File: `src/lib/web-clipper/index.ts`
- Description: Re-export all public APIs from web-clipper module

### T-1.9 Create clip-web command UI [T] (depends: T-1.3, T-1.6, T-1.7)

- File: `src/clip-web.tsx`
- Test: Manual integration test
- Description: Raycast Form with title, URL, selection fields; supertag dropdown; basic save action

### T-1.10 Add live preview panel [T] (depends: T-1.9)

- File: `src/clip-web.tsx`
- Description: Detail panel showing real-time Tana Paste preview as user edits

### T-1.11 Add clipboard fallback action (depends: T-1.9)

- File: `src/clip-web.tsx`
- Description: "Copy as Tana Paste" action using existing fallbacks pattern

### T-1.12 Register command in package.json (depends: T-1.9)

- File: `package.json`
- Description: Add clip-web command to extension manifest

---

## Group 2: Enhanced Capture

Article extraction, markdown conversion, domain memory.

### T-2.1 Add dependencies (readability, turndown, cheerio)

- File: `package.json`
- Description: Install @mozilla/readability, turndown, turndown-plugin-gfm, cheerio

### T-2.2 Create article extractor [T] (depends: T-2.1)

- File: `src/lib/web-clipper/article.ts`
- Test: `src/lib/__tests__/web-clipper/article.test.ts`
- Description: Wrap Readability.js to extract clean article content from HTML

### T-2.3 Create markdown converter [T] (depends: T-2.1)

- File: `src/lib/web-clipper/markdown.ts`
- Test: `src/lib/__tests__/web-clipper/markdown.test.ts`
- Description: Turndown with GFM plugin for tables, code blocks, task lists

### T-2.4 Add reading time calculation [T] (depends: T-2.2)

- File: `src/lib/web-clipper/article.ts`
- Test: `src/lib/__tests__/web-clipper/article.test.ts`
- Description: Calculate reading time from word count (~200 wpm)

### T-2.5 Integrate article extraction in content service [T] (depends: T-2.2, T-2.3)

- File: `src/lib/web-clipper/content.ts`
- Test: `src/lib/__tests__/web-clipper/content.test.ts`
- Description: Add extractArticle() method that fetches, extracts, and converts to markdown

### T-2.6 Add "Extract Full Article" toggle to UI (depends: T-2.5)

- File: `src/clip-web.tsx`
- Description: Checkbox to enable full article extraction with loading state

### T-2.7 Display reading time in UI (depends: T-2.6)

- File: `src/clip-web.tsx`
- Description: Show estimated reading time when article is extracted

### T-2.8 Add multi-highlight support [T] (depends: T-1.9)

- File: `src/clip-web.tsx`, `src/lib/web-clipper/types.ts`
- Test: `src/lib/__tests__/web-clipper/tana-paste.test.ts`
- Description: Allow adding multiple highlights to a clip, render as child nodes

### T-2.9 Implement domain preference memory [T] (depends: T-1.2)

- File: `src/lib/web-clipper/storage.ts`
- Test: `src/lib/__tests__/web-clipper/storage.test.ts`
- Description: Save/load last used supertag per domain

### T-2.10 Pre-select supertag from domain memory (depends: T-2.9)

- File: `src/clip-web.tsx`
- Description: On load, check domain prefs and pre-select last used supertag

### T-2.11 Create supertag analyzer [T] [P]

- File: `src/lib/web-clipper/supertag-analyzer.ts`
- Test: `src/lib/__tests__/web-clipper/supertag-analyzer.test.ts`
- Description: Analyze supertag schemas to find clip-friendly tags. Score by: has URL field (+10), has text field named notes/summary/highlight (+5), has author field (+2). Return ranked list.

### T-2.12 Create field mapper [T] (depends: T-2.11)

- File: `src/lib/web-clipper/field-mapper.ts`
- Test: `src/lib/__tests__/web-clipper/field-mapper.test.ts`
- Description: Map clip data to supertag fields dynamically. URL → url-type field, Selection → text field matching pattern (notes|summary|highlight|snapshot), Author → author/creator field.

### T-2.13 Integrate smart supertag dropdown (depends: T-2.11)

- File: `src/clip-web.tsx`
- Description: Replace hardcoded supertag list with analyzed tags. Show "Recommended" section for high-scoring tags.

### T-2.14 Replace hardcoded field mapping (depends: T-2.12)

- File: `src/clip-web.tsx`
- Description: Use field-mapper instead of hardcoded bookmark/resource/reference mappings. Remove TODO comment.

---

## Group 3: Templates

Template engine, built-in templates, domain matching.

### T-3.1 Create template engine [T] [P]

- File: `src/lib/web-clipper/template.ts`
- Test: `src/lib/__tests__/web-clipper/template.test.ts`
- Description: Variable substitution ({{var}}), access to WebClip fields

### T-3.2 Create template filters [T] [P]

- File: `src/lib/web-clipper/filters.ts`
- Test: `src/lib/__tests__/web-clipper/filters.test.ts`
- Description: Implement truncate, format, wordcount, readtime, default filters

### T-3.3 Add filter support to template engine [T] (depends: T-3.1, T-3.2)

- File: `src/lib/web-clipper/template.ts`
- Test: `src/lib/__tests__/web-clipper/template.test.ts`
- Description: Parse pipe syntax {{var|filter:arg}} and apply filters

### T-3.4 Create domain pattern matcher [T] (depends: T-3.1)

- File: `src/lib/web-clipper/template.ts`
- Test: `src/lib/__tests__/web-clipper/template.test.ts`
- Description: Match URL against template triggers (glob patterns)

### T-3.5 Create built-in templates [P]

- Files: `src/lib/web-clipper/templates/github.ts`, `twitter.ts`, `youtube.ts`, `medium.ts`, `index.ts`
- Description: Define GitHub, Twitter/X, YouTube, Medium templates

### T-3.6 Add template storage CRUD [T] (depends: T-1.2, T-3.1)

- File: `src/lib/web-clipper/storage.ts`
- Test: `src/lib/__tests__/web-clipper/storage.test.ts`
- Description: Load/save/delete custom templates, merge with built-ins

### T-3.7 Add template selector dropdown to UI (depends: T-3.4, T-3.6)

- File: `src/clip-web.tsx`
- Description: Dropdown showing matched template + all templates, auto-select by domain

### T-3.8 Render Tana Paste from template [T] (depends: T-3.3, T-1.7)

- File: `src/lib/web-clipper/tana-paste.ts`
- Test: `src/lib/__tests__/web-clipper/tana-paste.test.ts`
- Description: Add fromTemplate() method that applies template to WebClip

### T-3.9 Create template editor command (depends: T-3.6)

- File: `src/edit-template.tsx`
- Description: Form to create/edit templates with live preview

### T-3.10 Add template import/export [T] (depends: T-3.6)

- File: `src/lib/web-clipper/storage.ts`
- Test: `src/lib/__tests__/web-clipper/storage.test.ts`
- Description: Export templates as JSON, import from clipboard/file

---

## Group 4: AI Features

Optional AI summarization, key points, tag suggestions.

### T-4.1 Create AI provider interface [T] [P]

- File: `src/lib/web-clipper/ai/types.ts`
- Test: `src/lib/__tests__/web-clipper/ai/types.test.ts`
- Description: Define AIProvider interface with summarize, extractKeyPoints, suggestTags, extract methods

### T-4.2 Create disabled provider [T] [P]

- File: `src/lib/web-clipper/ai/disabled.ts`
- Test: `src/lib/__tests__/web-clipper/ai/disabled.test.ts`
- Description: Noop implementation returning empty/null for all methods

### T-4.3 Create Claude provider [T] (depends: T-4.1)

- File: `src/lib/web-clipper/ai/claude.ts`
- Test: `src/lib/__tests__/web-clipper/ai/claude.test.ts`
- Description: Claude API implementation with summarize, extractKeyPoints, suggestTags

### T-4.4 Create Ollama provider [T] (depends: T-4.1)

- File: `src/lib/web-clipper/ai/ollama.ts`
- Test: `src/lib/__tests__/web-clipper/ai/ollama.test.ts`
- Description: Ollama local API implementation

### T-4.5 Create AI provider factory [T] (depends: T-4.2, T-4.3, T-4.4)

- File: `src/lib/web-clipper/ai/index.ts`
- Test: `src/lib/__tests__/web-clipper/ai/index.test.ts`
- Description: Factory function to instantiate provider based on AIConfig

### T-4.6 Add AI settings to Raycast preferences (depends: T-4.5)

- File: `package.json`, `src/lib/web-clipper/storage.ts`
- Description: Preferences for AI provider, API key, Ollama endpoint/model

### T-4.7 Add "Summarize" toggle to UI (depends: T-4.5)

- File: `src/clip-web.tsx`
- Description: Checkbox to generate AI summary, show in preview

### T-4.8 Add key points extraction action (depends: T-4.5)

- File: `src/clip-web.tsx`
- Description: Action to extract key points, add as child nodes in preview

---

## Dependency Graph

```
Phase 1 (Foundation):
T-1.1 ─────┬────────────────────> T-1.8 ──> T-1.9 ──> T-1.10 ──> T-1.11
T-1.2 ─────┤                         │         │
T-1.3 ──> T-1.4                      │         │
     └──> T-1.5                      │         └──> T-1.12
T-1.6 ─────┤                         │
T-1.7 ─────┘─────────────────────────┘

Phase 2 (Enhanced):
T-2.1 ──> T-2.2 ──> T-2.4 ──> T-2.5 ──> T-2.6 ──> T-2.7
     └──> T-2.3 ─────────┘
T-1.9 ──> T-2.8
T-1.2 ──> T-2.9 ──> T-2.10

Phase 3 (Templates):
T-3.1 ──> T-3.3 ──> T-3.8
T-3.2 ────┘    └──> T-3.4 ──> T-3.7
                         └──> T-3.6 ──> T-3.9 ──> T-3.10
T-3.5 (parallel)

Phase 4 (AI):
T-4.1 ──> T-4.3 ──┬──> T-4.5 ──> T-4.6 ──> T-4.7 ──> T-4.8
     └──> T-4.4 ──┘
T-4.2 ────────────┘
```

## Execution Order

### Batch 1 (Parallel - Foundation Start)
- T-1.1 WebClip types
- T-1.2 Storage service
- T-1.3 Browser service (Safari)
- T-1.6 Metadata fetcher
- T-1.7 Tana Paste builder

### Batch 2 (Sequential - Browser Extensions)
- T-1.4 Chrome/Arc support (after T-1.3)
- T-1.5 Firefox support (after T-1.3)

### Batch 3 (Sequential - MVP UI)
- T-1.8 Index exports (after T-1.1, T-1.6, T-1.7)
- T-1.9 Clip-web command (after T-1.3, T-1.6, T-1.7)
- T-1.10 Live preview (after T-1.9)
- T-1.11 Clipboard fallback (after T-1.9)
- T-1.12 Package.json (after T-1.9)

### Batch 4 (Parallel - Enhanced Start)
- T-2.1 Dependencies
- T-2.8 Multi-highlight (after T-1.9)
- T-2.9 Domain memory (after T-1.2)

### Batch 5 (Sequential - Article Extraction)
- T-2.2 Article extractor (after T-2.1)
- T-2.3 Markdown converter (after T-2.1)
- T-2.4 Reading time (after T-2.2)
- T-2.5 Content service integration (after T-2.2, T-2.3)
- T-2.6 Extract toggle (after T-2.5)
- T-2.7 Reading time UI (after T-2.6)
- T-2.10 Domain pre-select (after T-2.9)

### Batch 6 (Parallel - Templates Start)
- T-3.1 Template engine
- T-3.2 Filters
- T-3.5 Built-in templates

### Batch 7 (Sequential - Templates)
- T-3.3 Filter support (after T-3.1, T-3.2)
- T-3.4 Domain matcher (after T-3.1)
- T-3.6 Template storage (after T-1.2, T-3.1)
- T-3.7 Template selector (after T-3.4, T-3.6)
- T-3.8 Tana Paste from template (after T-3.3, T-1.7)
- T-3.9 Template editor (after T-3.6)
- T-3.10 Import/export (after T-3.6)

### Batch 8 (Parallel - AI Start)
- T-4.1 AI provider interface
- T-4.2 Disabled provider

### Batch 9 (Sequential - AI)
- T-4.3 Claude provider (after T-4.1)
- T-4.4 Ollama provider (after T-4.1)
- T-4.5 Provider factory (after T-4.2, T-4.3, T-4.4)
- T-4.6 AI settings (after T-4.5)
- T-4.7 Summarize toggle (after T-4.5)
- T-4.8 Key points action (after T-4.5)

---

## Progress Tracking

| Task | Status | Started | Completed | Notes |
|------|--------|---------|-----------|-------|
| **Phase 1: Foundation** |
| T-1.1 | completed | 2026-01-04 | 2026-01-04 | WebClip types with Zod |
| T-1.2 | completed | 2026-01-04 | 2026-01-04 | Storage service |
| T-1.3 | completed | 2026-01-04 | 2026-01-04 | Browser (Safari) |
| T-1.4 | completed | 2026-01-04 | 2026-01-04 | Browser (Chrome/Arc) |
| T-1.5 | completed | 2026-01-04 | 2026-01-04 | Browser (Firefox) |
| T-1.6 | completed | 2026-01-04 | 2026-01-04 | Metadata fetcher |
| T-1.7 | completed | 2026-01-04 | 2026-01-04 | Tana Paste builder |
| T-1.8 | completed | 2026-01-04 | 2026-01-04 | Index exports |
| T-1.9 | completed | 2026-01-04 | 2026-01-04 | Clip-web UI |
| T-1.10 | completed | 2026-01-04 | 2026-01-04 | Live preview (in T-1.9) |
| T-1.11 | completed | 2026-01-04 | 2026-01-04 | Clipboard fallback |
| T-1.12 | completed | 2026-01-04 | 2026-01-04 | Package.json |
| **Phase 2: Enhanced** |
| T-2.1 | completed | 2026-01-05 | 2026-01-05 | Dependencies (readability, turndown, jsdom) |
| T-2.2 | completed | 2026-01-05 | 2026-01-05 | Article extractor |
| T-2.3 | completed | 2026-01-05 | 2026-01-05 | Markdown converter |
| T-2.4 | completed | 2026-01-05 | 2026-01-05 | Reading time (already in content.ts) |
| T-2.5 | completed | 2026-01-05 | 2026-01-05 | Content integration |
| T-2.6 | completed | 2026-01-05 | 2026-01-05 | Extract toggle |
| T-2.7 | completed | 2026-01-05 | 2026-01-05 | Reading time UI |
| T-2.8 | completed | 2026-01-05 | 2026-01-05 | Multi-highlight |
| T-2.9 | completed | 2026-01-05 | 2026-01-05 | Domain memory |
| T-2.10 | completed | 2026-01-05 | 2026-01-05 | Domain pre-select |
| T-2.11 | completed | 2026-01-05 | 2026-01-05 | Supertag analyzer |
| T-2.12 | completed | 2026-01-05 | 2026-01-05 | Field mapper |
| T-2.13 | completed | 2026-01-05 | 2026-01-05 | Smart supertag dropdown |
| T-2.14 | completed | 2026-01-05 | 2026-01-05 | Replace hardcoded mapping |
| **Phase 3: Templates** |
| T-3.1 | pending | - | - | Template engine |
| T-3.2 | pending | - | - | Filters |
| T-3.3 | pending | - | - | Filter support |
| T-3.4 | pending | - | - | Domain matcher |
| T-3.5 | pending | - | - | Built-in templates |
| T-3.6 | pending | - | - | Template storage |
| T-3.7 | pending | - | - | Template selector |
| T-3.8 | pending | - | - | Tana Paste from template |
| T-3.9 | pending | - | - | Template editor |
| T-3.10 | pending | - | - | Import/export |
| **Phase 4: AI** |
| T-4.1 | pending | - | - | AI interface |
| T-4.2 | pending | - | - | Disabled provider |
| T-4.3 | pending | - | - | Claude provider |
| T-4.4 | pending | - | - | Ollama provider |
| T-4.5 | pending | - | - | Provider factory |
| T-4.6 | pending | - | - | AI settings |
| T-4.7 | pending | - | - | Summarize toggle |
| T-4.8 | pending | - | - | Key points action |

---

## TDD Reminder

For each task marked [T]:

1. **RED:** Write failing test first
2. **GREEN:** Write minimal implementation to pass
3. **BLUE:** Refactor while keeping tests green
4. **VERIFY:** Run full test suite (`bun test`)

**DO NOT proceed to next task until:**
- Current task's tests pass
- Full test suite passes (no regressions)

---

## Blockers & Issues

| Task | Issue | Resolution |
|------|-------|------------|
| - | - | - |

---

## Phase Milestones

| Phase | Tasks | Success Criteria |
|-------|-------|------------------|
| 1: Foundation | T-1.1 → T-1.12 | ✅ Can clip current tab to Tana with selection and see preview |
| 2: Enhanced | T-2.1 → T-2.14 | Can extract article, selection saves to correct field for any supertag |
| 3: Templates | T-3.1 → T-3.10 | Templates auto-select by domain, variables resolve |
| 4: AI | T-4.1 → T-4.8 | AI summary appears in clip, works with Ollama |
