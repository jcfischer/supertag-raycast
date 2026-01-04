# KAI Raycast Extension

Quick access to KAI AI assistant capabilities from Raycast.

## Commands

| Command | Description | Mode |
|---------|-------------|------|
| Export Context | Export personal context to clipboard | No View |
| Capture to Tana | Quick capture with supertag selection | Form |
| **Create Tana Node** | **Dynamic form for any supertag with field support** | **List + Form** |
| Ask KAI | Ask a question, get inline or terminal response | Form + Detail |
| Today's Briefing | Show daily summary (calendar, tasks, email) | Detail |
| KAI Commands | Browse and launch k CLI commands | List |

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
- `k` CLI (kai-launcher) installed at `~/bin/k`
- `supertag` CLI (supertag-cli) installed at `~/work/supertag-cli/supertag`
- KAI infrastructure set up
- Tana workspace synced (required for Create Tana Node command)

## Installation

### Development

```bash
cd ~/work/kai-raycast
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
kai-raycast
├── src/
│   ├── export-context.tsx      # No-view command
│   ├── capture-tana.tsx        # Form command
│   ├── create-tana-node.tsx    # List + Dynamic form command
│   ├── ask-kai.tsx             # Form + Detail command
│   ├── briefing.tsx            # Detail command
│   ├── commands.tsx            # List command
│   └── lib/
│       ├── cli.ts              # k + supertag CLI wrappers (execa)
│       ├── schema-cache.ts     # File-based schema registry cache
│       ├── types.ts            # Zod schemas
│       ├── fallbacks.ts        # Error handling utilities
│       └── terminal.ts         # Terminal launcher
```

## How It Works

All commands call the `k` CLI with `--json` flag and parse the response:

```typescript
// Example: Export context
const result = await exportContext("minimal");
if (result.success) {
  await Clipboard.copy(result.data.content);
}
```

## Fallback Behavior

When CLI commands fail:
1. Show error toast
2. Offer "Open in Terminal" action
3. For Tana capture: offer to copy Tana Paste manually

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| K_PATH | ~/bin/k | Path to k CLI binary |
| SUPERTAG_PATH | ~/work/supertag-cli/supertag | Path to supertag CLI binary |

## Dependencies

- `@raycast/api` - Raycast extension SDK
- `execa` - Execute CLI commands (k and supertag)
- `zod` - Validate CLI responses

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

## Related

- [kai-launcher](../kai-launcher) - The `k` CLI that powers this extension
- [KAI Skills](~/.claude/skills) - Full KAI infrastructure
