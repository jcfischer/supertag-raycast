# Supertag Raycast Extension

Quick access to Tana via supertag-cli from Raycast.

## Commands

| Command | Description | Mode |
|---------|-------------|------|
| **Clip Web Page to Tana** | **Clip browser tab with URL, title, and selection** | **Form** |
| **Capture to Tana** | **Quick capture with nested node support** | **Form** |
| **Create Tana Node** | **Dynamic form for any supertag with field support** | **List + Form** |

### Clip Web Page to Tana

Clip the current browser tab to Tana with automatic metadata extraction:

- **Smart browser detection** - Automatically detects frontmost browser using window z-order
- **URL & Title** - Automatically captured from active tab
- **Selection** - Captures selected text from the page
- **Metadata** - Fetches Open Graph title, description, author
- **Supertag picker** - Choose from built-in or your custom supertags
- **Live preview** - See the Tana Paste format before saving

**Supported browsers:** Safari, Chrome, Arc, Brave, Firefox, Zen

#### Browser Setup

**Safari** requires JavaScript permissions for selection capture:
1. Go to **Safari > Settings > Advanced**
2. Check **"Show features for web developers"**
3. In the **Develop** menu, check **"Allow JavaScript from Apple Events"**

**Firefox** and **Zen** have limited support (Firefox-based browsers don't expose tab data via AppleScript):
- Only page title is captured automatically
- Copy the URL to clipboard before clipping, or enter it manually
- Selection capture is not available

**Chrome**, **Arc**, and **Brave** work without additional setup.

### Capture to Tana Features

The **Capture to Tana** command provides quick plain node creation with children:

- **Name field** - Main node name (required)
- **Children field** - Optional nested children with unlimited depth
- **Multi-level nesting** - Use indentation with "-" to create hierarchy
  - Indentation (spaces/tabs) determines nesting level
  - Lines with or without "-" prefix both work
- **No supertag required** - Creates plain nodes without tags
- **Tana Paste format** - Generates proper `%%tana%%` format for fallback
- **Manual fallback** - Copy Tana Paste to clipboard if CLI fails

**Example - Node with children:**
```
Name: Project Plan
Children:
  - Phase 1
    - Task 1.1
      - Subtask 1.1.1
  - Phase 2
```

**Example - Deep nesting (unlimited depth):**
```
Name: Engineering Roadmap
Children:
  - Q1 2026
    - Backend
      - API Refactor
        - Authentication endpoints
        - Rate limiting
      - Database optimization
    - Frontend
      - UI redesign
        - Component library
  - Q2 2026
    - Mobile app
```

**Generated JSON (sent to Tana Input API):**
```json
[{
  "name": "Engineering Roadmap",
  "children": [{
    "name": "Q1 2026",
    "children": [
      {
        "name": "Backend",
        "children": [
          {
            "name": "API Refactor",
            "children": [
              {"name": "Authentication endpoints"},
              {"name": "Rate limiting"}
            ]
          },
          {"name": "Database optimization"}
        ]
      },
      {
        "name": "Frontend",
        "children": [
          {
            "name": "UI redesign",
            "children": [{"name": "Component library"}]
          }
        ]
      }
    ]
  }]
}]
```

**Key points:**
- Name field creates the parent node
- Children field is optional (for plain nodes without children)
- Indentation (2 spaces recommended) determines nesting level
- Unlimited nesting depth supported (tested to 4+ levels)
- Empty lines in children are ignored

### Create Tana Node Features

The **Create Tana Node** command provides a dynamic form builder for Tana:

- **Supertag picker** - Browse all supertags sorted by usage count
- **Dynamic field generation** - Form fields automatically generated from supertag schema
- **Fast schema loading** - File-based schema cache (<10ms) instead of CLI spawning (200-500ms)
- **Smart field types**:
  - Text fields for simple input
  - Date pickers (timezone-aware, no off-by-one errors)
  - Checkboxes for boolean fields
  - **Dropdowns for reference fields** - Populated from existing field values
  - **"Options from supertag" support** - Dropdowns populated from related supertags (e.g., Company field shows all company nodes)
- **Case-insensitive matching** - Finds options regardless of capitalization
- **Inherited fields** - Shows fields from parent supertags (recursive collection)
- **Direct API integration** - Creates nodes via Tana Input API

**Performance:** Schema cache provides 20-50x faster form loading by reading `schema-registry.json` directly instead of spawning CLI processes. Automatically falls back to CLI if cache unavailable.

## Prerequisites

- [Raycast](https://raycast.com/) installed
- `supertag` CLI ([supertag-cli](https://github.com/jcfischer/supertag-cli)) installed at `~/bin/supertag`
- Tana workspace synced via supertag-cli

## Installation

### Development

```bash
cd ~/work/supertag-raycast
npm install
npm run dev  # Opens extension in Raycast
```

### Local Installation

```bash
npm run build
# Then import via Raycast > Extensions > + > Import Extension
```

## Architecture

```
supertag-raycast
├── src/
│   ├── capture-tana.tsx        # Form command for quick capture
│   ├── create-tana-node.tsx    # List + Dynamic form command
│   └── lib/
│       ├── cli.ts              # supertag CLI wrappers (execa)
│       ├── schema-cache.ts     # File-based schema registry cache
│       ├── types.ts            # Supertag type definitions
│       ├── fallbacks.ts        # Error handling utilities
│       └── terminal.ts         # Terminal launcher
```

## How It Works

Commands call the `supertag` CLI and parse the response:

```typescript
// Example: Capture to Tana with nested nodes
const tanaPaste = buildTanaPaste(`
Parent task
- First subtask
  - Nested item
`);
const result = await capturePlainNode(tanaPaste);
if (result.success) {
  showToast({ title: "Created node in Tana" });
}

// Example: Create structured node with fields
const result = await createTanaNode("meeting", "Weekly Sync", {
  Date: "2026-01-06",
  Status: "Scheduled"
});
```

## Fallback Behavior

When CLI commands fail:
1. Show error toast
2. Offer "Open in Terminal" action
3. For Tana capture: offer to copy Tana Paste manually

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| SUPERTAG_PATH | ~/bin/supertag | Path to supertag CLI binary |

## Dependencies

- `@raycast/api` - Raycast extension SDK
- `execa` - Execute CLI commands (supertag)
- `zod` - Validate responses

## Known Issues & Fixes

### Date Fields
- ✅ **Fixed**: Date picker now uses local timezone (no more off-by-one errors)
- Previously: Selecting 2026-01-06 would save as 2025-01-05

### Name Field Reset
- ✅ **Fixed**: User input preserved during async schema loading
- Previously: Name field would clear when form finished loading

### Missing Options in Dropdowns
- ✅ **Fixed**: Case-insensitive tag matching + increased limit to 200
- Example: "Company" field now finds lowercase "company" supertag nodes

### Performance Improvements
- ✅ **Spec 081**: Schema cache provides 20-50x performance improvement
- File-based cache reads `schema-registry.json` directly (<10ms)
- Automatic fallback to CLI if cache unavailable

## Related

- [supertag-cli](https://github.com/jcfischer/supertag-cli) - The CLI that powers this extension
