---
id: "080"
feature: "Web Clipper to Tana"
status: "draft"
created: "2026-01-04"
---

# Specification: Web Clipper to Tana

## Overview

Add web clipping capabilities to the kai-raycast extension, enabling users to save web pages, articles, and selections directly to Tana from Raycast. Captures URL, title, content/selection, and metadata as structured Tana nodes with appropriate supertags.

## User Scenarios

### Scenario 1: Clip Current Browser Tab

**As a** researcher browsing the web
**I want to** save the current browser tab to Tana with one hotkey
**So that** I can capture interesting content without leaving my workflow

**Acceptance Criteria:**
- [ ] Hotkey captures active browser tab (URL + title)
- [ ] Works with Safari, Chrome, Arc, and Firefox
- [ ] Creates Tana node with #bookmark or #article supertag
- [ ] Shows confirmation toast with node title
- [ ] Allows quick supertag selection before saving

### Scenario 2: Clip with Selected Text

**As a** user who found a specific passage
**I want to** clip the page with my text selection as a highlight
**So that** I can remember why I saved this page

**Acceptance Criteria:**
- [ ] Captures selected text from browser
- [ ] Stores selection as child node or field in Tana
- [ ] Falls back to page description if no selection
- [ ] Preserves basic formatting (bold, links)

### Scenario 3: Quick Clip from URL

**As a** user with a URL in clipboard
**I want to** clip it directly without opening the browser
**So that** I can save links shared via chat/email quickly

**Acceptance Criteria:**
- [ ] Detects URL in clipboard automatically
- [ ] Fetches page title and metadata
- [ ] Allows editing before save
- [ ] Creates structured Tana node

### Scenario 4: Clip to Specific Supertag

**As a** user organizing content by type
**I want to** choose which supertag to apply when clipping
**So that** my clips are properly categorized in Tana

**Acceptance Criteria:**
- [ ] Dropdown shows available supertags from Tana
- [ ] Remembers last used supertag per domain
- [ ] Supports: #bookmark, #article, #resource, #reference
- [ ] Can add custom fields based on supertag schema

## Functional Requirements

### FR-1: Browser Tab Extraction

Extract URL and title from the active browser tab using AppleScript.

**Validation:** Returns correct URL and title for Safari, Chrome, Arc, Firefox

### FR-2: Selection Capture

Capture selected text from the active browser window.

**Validation:** Selection text matches what user highlighted

### FR-3: Metadata Fetching

Fetch Open Graph metadata (og:title, og:description, og:image) for URLs.

**Validation:** Metadata matches page meta tags

### FR-4: Tana Node Creation

Create structured nodes via supertag-cli with URL, title, description fields.

**Validation:** Node appears in Tana with correct fields populated

### FR-5: Supertag Schema Support

Load supertag fields dynamically to show relevant input fields.

**Validation:** Shows correct fields for #bookmark vs #article

### FR-6: Domain Memory

Remember preferred supertag per domain for faster repeat clips.

**Validation:** Second clip from same domain pre-selects previous supertag

## Non-Functional Requirements

- **Performance:** Clip action completes within 3 seconds
- **Reliability:** Works offline with clipboard fallback (Tana Paste)
- **Privacy:** No data sent to external services (local processing only)
- **UX:** Single hotkey for most common flow

## Key Entities

| Entity | Description | Key Attributes |
|--------|-------------|----------------|
| WebClip | Captured page | url, title, description, selection |
| Supertag | Tana category | name, fields, icon |
| DomainPreference | Saved settings | domain, defaultSupertag |

## Success Criteria

- [ ] Clip from browser works for 4 major browsers
- [ ] Creates valid Tana nodes with URL field
- [ ] Selection capture works reliably
- [ ] Offline fallback to Tana Paste clipboard
- [ ] Supertag selection UI is intuitive

## Assumptions

- User has supertag-cli installed and configured
- Tana workspace has #bookmark or similar supertag defined
- AppleScript access granted for browser automation
- Raycast has accessibility permissions

## [NEEDS CLARIFICATION]

- Should clips support images (og:image as attachment)?
- Should there be a "reading list" queue before Tana sync?
- Integration with existing "Capture to Tana" command or separate?

## Out of Scope

- Full page content extraction (Readability-style)
- PDF clipping
- Screenshot capture
- Sync status/history view
- Bulk import of bookmarks
