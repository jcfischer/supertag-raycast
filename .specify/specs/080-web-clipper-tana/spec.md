---
id: "080"
feature: "Web Clipper to Tana"
status: "phase2_complete"
created: "2026-01-04"
updated: "2026-01-05"
research: "Notion, Readwise Reader, Roam, Obsidian Web Clipper"
---

# Specification: Web Clipper to Tana

## Overview

Add web clipping capabilities to the kai-raycast extension, enabling users to save web pages, articles, and selections directly to Tana from Raycast. Captures URL, title, content/selection, and metadata as structured Tana nodes with appropriate supertags.

**Vision:** Best-of-breed web clipper combining:
- **Notion's** one-click database integration with AI summarization
- **Readwise Reader's** keyboard-first highlighting and rich content capture
- **Obsidian's** template system with variables and filters
- **Roam's** bidirectional linking with live preview

## Competitive Analysis

| Feature | Notion | Readwise | Obsidian | Roam | **Ours** |
|---------|--------|----------|----------|------|----------|
| One-click save | ✓ | ✓ | ✓ | ✗ | ✓ |
| AI summarization | ✓ | ✗ | ✓ | ✗ | ✓ |
| Template system | ✗ | ✗ | ✓ | ✗ | ✓ |
| Highlight on web | ✗ | ✓ | ✓ | ✓ | ✓ |
| Image capture | ✓ | ✓ | ✓ | ✗ | ✓ |
| Keyboard-driven | ✗ | ✓ | ✓ | ✓ | ✓ |
| Custom fields | ✓ | ✗ | ✓ | ✗ | ✓ |
| Full article extract | ✗ | ✓ | ✓ | ✗ | ✓ |
| Live preview | ✗ | ✗ | ✓ | ✓ | ✓ |
| Offline fallback | ✗ | ✗ | ✓ | ✗ | ✓ |

## User Scenarios

### Scenario 1: Quick Clip (One Hotkey)

**As a** researcher browsing the web
**I want to** save the current browser tab to Tana with one hotkey
**So that** I can capture interesting content without leaving my workflow

**Acceptance Criteria:**
- [ ] Hotkey captures active browser tab (URL + title)
- [ ] Works with Safari, Chrome, Arc, and Firefox
- [ ] Creates Tana node with #bookmark or #article supertag
- [ ] Shows confirmation toast with node title
- [ ] Allows quick supertag selection before saving
- [ ] **NEW:** Shows live preview of Tana Paste format before save

### Scenario 2: Clip with Highlights

**As a** user who found specific passages
**I want to** clip the page with multiple text selections as highlights
**So that** I can capture the key insights and remember why I saved this

**Acceptance Criteria:**
- [ ] Captures selected text from browser
- [ ] **NEW:** Supports multiple highlights per clip (like Readwise)
- [ ] Stores highlights as child nodes in Tana
- [ ] Falls back to page description if no selection
- [ ] Preserves formatting (bold, italic, links, code)
- [ ] **NEW:** Captures highlighted images as attachments

### Scenario 3: Quick Clip from URL

**As a** user with a URL in clipboard
**I want to** clip it directly without opening the browser
**So that** I can save links shared via chat/email quickly

**Acceptance Criteria:**
- [ ] Detects URL in clipboard automatically
- [ ] Fetches page title and metadata
- [ ] Allows editing before save
- [ ] Creates structured Tana node
- [ ] **NEW:** Shows loading indicator while fetching

### Scenario 4: Clip to Specific Supertag

**As a** user organizing content by type
**I want to** choose which supertag to apply when clipping
**So that** my clips are properly categorized in Tana

**Acceptance Criteria:**
- [ ] Dropdown shows available supertags from Tana
- [ ] Remembers last used supertag per domain
- [ ] Supports: #bookmark, #article, #resource, #reference
- [ ] Can add custom fields based on supertag schema
- [ ] **NEW:** Template system auto-maps fields to page metadata

### Scenario 5: AI-Powered Clip (NEW)

**As a** researcher with limited time
**I want to** get an AI-generated summary when clipping long articles
**So that** I can quickly understand the content without reading everything

**Acceptance Criteria:**
- [ ] "Summarize" toggle in clip dialog
- [ ] AI generates 2-3 sentence summary
- [ ] AI extracts key points as bullet nodes
- [ ] AI suggests relevant tags based on content
- [ ] Can use natural language extraction ("extract the main argument")
- [ ] Works with local LLM via Ollama (privacy-first)

### Scenario 6: Full Article Extraction (NEW)

**As a** user saving an article for later reading
**I want to** capture the full article content in clean markdown
**So that** I can read it in Tana without visiting the source

**Acceptance Criteria:**
- [ ] Uses Readability.js for clean article extraction
- [ ] Converts HTML to markdown (Turndown)
- [ ] Preserves headings, lists, code blocks, tables
- [ ] Downloads images as attachments (optional)
- [ ] Strips ads, navigation, and clutter
- [ ] Shows estimated reading time

### Scenario 7: Template-Based Clipping (NEW)

**As a** power user with specific workflows
**I want to** define templates for different content types
**So that** clips are consistently structured for my needs

**Acceptance Criteria:**
- [ ] Templates use variables: {{title}}, {{url}}, {{date}}, {{selection}}, {{content}}
- [ ] Templates can specify supertag and field mappings
- [ ] Domain-based template matching (e.g., github.com → #repository)
- [ ] Template editor with live preview
- [ ] Import/export templates as JSON

## Functional Requirements

### Core Capture

#### FR-1: Browser Tab Extraction

Extract URL and title from the active browser tab using AppleScript.

**Validation:** Returns correct URL and title for Safari, Chrome, Arc, Firefox

#### FR-2: Selection Capture

Capture selected text from the active browser window.

**Validation:** Selection text matches what user highlighted

#### FR-3: Multi-Highlight Support (NEW)

Support capturing multiple text selections as separate highlight nodes.

**Validation:** Multiple highlights stored as child nodes in order captured

#### FR-4: Image Capture (NEW)

Capture og:image as attachment or selected images from page.

**Validation:** Images saved to Tana with proper attribution

### Metadata & Content

#### FR-5: Metadata Fetching

Fetch Open Graph metadata (og:title, og:description, og:image, og:type) for URLs.

**Validation:** Metadata matches page meta tags

#### FR-6: Full Article Extraction (NEW)

Extract main article content using Mozilla Readability.js.

**Validation:** Returns clean article text without navigation/ads

#### FR-7: Markdown Conversion (NEW)

Convert HTML to markdown using Turndown with extensions for:
- Tables
- Code blocks with language detection
- Strikethrough, task lists

**Validation:** Markdown renders correctly in Tana

### AI Features

#### FR-8: AI Summarization (NEW)

Generate 2-3 sentence summary of article content.

**Providers:** Claude API, Ollama (local), or disabled

**Validation:** Summary captures main thesis of article

#### FR-9: Key Points Extraction (NEW)

Extract 3-5 key points as bullet list for quick scanning.

**Validation:** Points are distinct and cover main ideas

#### FR-10: Auto-Tagging (NEW)

Suggest relevant Tana tags based on content analysis.

**Validation:** Suggested tags match existing Tana supertags

#### FR-11: Natural Language Extraction (NEW)

Allow user prompts like "extract the main argument" or "list all people mentioned".

**Validation:** Extraction matches user intent

### Templates

#### FR-12: Template Variables (NEW)

Support variables in templates:
| Variable | Description |
|----------|-------------|
| `{{title}}` | Page title (og:title or document.title) |
| `{{url}}` | Full URL |
| `{{domain}}` | Domain only (e.g., github.com) |
| `{{date}}` | Clip date (ISO format) |
| `{{selection}}` | Selected text |
| `{{content}}` | Full article content |
| `{{description}}` | og:description |
| `{{author}}` | Article author if detected |
| `{{image}}` | og:image URL |
| `{{summary}}` | AI-generated summary |
| `{{keypoints}}` | AI-extracted key points |

**Validation:** All variables resolve correctly

#### FR-13: Template Filters (NEW)

Support filters for transforming values:
- `{{title|truncate:50}}` - Limit length
- `{{date|format:"YYYY-MM-DD"}}` - Date formatting
- `{{content|wordcount}}` - Count words
- `{{content|readtime}}` - Estimate reading time

**Validation:** Filters produce expected output

#### FR-14: Domain-Based Templates (NEW)

Auto-select template based on URL domain patterns.

**Example:** `github.com/*` → #repository template with fields for stars, language

**Validation:** Correct template selected for known domains

### Tana Integration

#### FR-15: Tana Node Creation

Create structured nodes via supertag-cli with URL, title, description fields.

**Validation:** Node appears in Tana with correct fields populated

#### FR-16: Supertag Schema Support

Load supertag fields dynamically to show relevant input fields.

**Validation:** Shows correct fields for #bookmark vs #article

#### FR-17: Domain Memory

Remember preferred supertag per domain for faster repeat clips.

**Validation:** Second clip from same domain pre-selects previous supertag

#### FR-17b: Smart Supertag Detection (NEW)

Scan user's workspace for supertags suitable for web clipping:
- Has a URL field (url type)
- Has text fields for selection/notes/summary/highlights
- Optionally has Author, Description, or similar metadata fields

Auto-suggest these tags in the supertag dropdown, ranked by relevance.

**Validation:** Discovers #bookmark, #article, #resource without hardcoding

#### FR-17c: Dynamic Field Mapping (NEW)

Map clip data to supertag fields based on schema analysis:
- URL → first url-type field
- Selection → first text field named notes/summary/highlight/snapshot or longest text field
- Author → field named author/creator/by
- Description → field named description/summary/about

**Validation:** Selection saves to correct field regardless of supertag schema

#### FR-18: Tana Paste Fallback (NEW)

Generate Tana Paste format for clipboard when offline or API unavailable.

**Format:**
```
%%tana%%
- {{title}} #bookmark
  - URL:: [{{title}}]({{url}})
  - Description:: {{description}}
  - Clipped:: {{date}}
  - {{selection}}
```

**Validation:** Paste imports correctly into Tana

#### FR-19: Live Preview (NEW)

Show real-time preview of Tana Paste output in clip dialog.

**Validation:** Preview matches actual Tana import result

## Non-Functional Requirements

### Performance
- Quick clip (no AI): < 2 seconds
- Clip with metadata fetch: < 3 seconds
- Clip with AI summary: < 8 seconds
- Full article extraction: < 5 seconds

### Reliability
- Works offline with Tana Paste clipboard fallback
- Graceful degradation when AI provider unavailable
- Retry with exponential backoff for network failures

### Privacy
- **Default:** No data sent to external AI services
- **Optional:** Claude API or local Ollama for AI features
- All templates and preferences stored locally
- No analytics or tracking

### UX
- Single hotkey for quick clip (most common flow)
- Keyboard navigation throughout (like Readwise)
- Live preview updates as user edits
- Persistent toast notifications with undo option

### Accessibility
- Full keyboard navigation
- Screen reader compatible
- High contrast mode support

## Key Entities

| Entity | Description | Key Attributes |
|--------|-------------|----------------|
| WebClip | Captured page | url, title, description, highlights[], content, summary, keypoints[], image |
| Highlight | Text selection | text, position, timestamp |
| Template | Clip format | name, supertag, fields, triggers[], variables |
| Supertag | Tana category | name, fields[], icon |
| DomainPreference | Saved settings | domain, defaultSupertag, defaultTemplate |
| AIProvider | AI service | type (claude/ollama/disabled), endpoint, model |

## Success Criteria

### MVP (Phase 1) ✅ COMPLETE
- [x] Clip from browser works for 6 browsers (Safari, Chrome, Arc, Brave, Firefox, Zen)
- [x] Creates valid Tana nodes with URL field
- [x] Selection capture works reliably (Safari requires JS permission)
- [x] Offline fallback to Tana Paste clipboard
- [x] Supertag selection UI is intuitive
- [x] Live preview of Tana Paste format
- [x] Smart browser detection using window z-order

### Enhanced (Phase 2) ✅ COMPLETE
- [x] Full article extraction with Readability
- [x] Multi-highlight support
- [x] Domain preference memory (last used supertag)
- [x] Smart supertag detection - scan workspace for clip-friendly tags (URL field, text fields for notes/summary)
- [x] Dynamic field mapping based on detected supertag schema
- [x] Reading time display

### AI-Powered (Phase 3)
- [ ] AI summarization (Claude or Ollama)
- [ ] Key points extraction
- [ ] Auto-tagging suggestions
- [ ] Natural language extraction

## Assumptions

- User has supertag-cli installed and configured
- Tana workspace has #bookmark or similar supertag defined
- AppleScript access granted for browser automation
- Raycast has accessibility permissions
- **NEW:** For AI features, user has Claude API key or Ollama installed

## Architecture Notes

### Dependencies
```
@mozilla/readability   - Article extraction
turndown               - HTML to markdown
turndown-plugin-gfm    - Tables, strikethrough, task lists
```

### AI Integration
```typescript
interface AIProvider {
  summarize(content: string): Promise<string>;
  extractKeyPoints(content: string): Promise<string[]>;
  suggestTags(content: string, existingTags: string[]): Promise<string[]>;
  extract(content: string, prompt: string): Promise<string>;
}

// Implementations
class ClaudeProvider implements AIProvider { ... }
class OllamaProvider implements AIProvider { ... }
class DisabledProvider implements AIProvider { ... } // Returns empty/null
```

### Template Format
```json
{
  "name": "GitHub Repository",
  "triggers": ["github.com/*/"],
  "supertag": "#repository",
  "fields": {
    "URL": "{{url}}",
    "Description": "{{description}}",
    "Language": "{{meta:og:language}}",
    "Stars": "{{selector:.starring-container-button}}"
  },
  "content": "{{selection}}"
}
```

## [NEEDS CLARIFICATION]

- ~~Should clips support images (og:image as attachment)?~~ → **Yes, included**
- Should there be a "reading list" queue before Tana sync?
  -> no
- Integration with existing "Capture to Tana" command or separate?
  -> separate
- Should AI features require explicit opt-in per clip or be configurable default?
  -> by default. have a settings dialog for local ollama or API key for Claude

## Out of Scope (for now)

- ~~Full page content extraction (Readability-style)~~ → **Now in scope**
- PDF clipping (consider Phase 4)
- Screenshot capture (consider Phase 4)
- Sync status/history view
- Bulk import of bookmarks
- Browser extension (Raycast-only for now)
- Persistent web highlighting (would require browser extension)

## References

### Competitive Research
- [Notion Web Clipper](https://www.notion.com/web-clipper) - AI summarization, database integration
- [Readwise Reader](https://readwise.io/read) - Keyboard-first, native web highlighting
- [Obsidian Web Clipper](https://obsidian.md/clipper) - Templates, variables, AI interpreter
- [Roam Highlighter](https://github.com/GitMurf/roam-highlighter) - Multi-highlight, live preview
- [Tana Paste Examples](https://github.com/tanainc/tana-paste-examples) - Official Tana format

### Technical
- [Mozilla Readability](https://github.com/mozilla/readability) - Article extraction
- [Turndown](https://github.com/mixmark-io/turndown) - HTML to markdown
- [clip2tana](https://github.com/aubirdgine/clip2tana-jb) - Existing Tana clipper reference
