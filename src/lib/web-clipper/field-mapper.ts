import type { AnalyzedSupertag } from "./supertag-analyzer";

/**
 * Data from a web clip to be mapped to fields
 */
export interface ClipData {
  url: string;
  title: string;
  selection?: string;
  author?: string;
  description?: string;
}

/**
 * Options for field mapping
 */
export interface MapOptions {
  /** Format URL as markdown link [title](url) */
  formatUrlAsLink?: boolean;
}

/**
 * Map clip data to supertag fields dynamically
 *
 * Uses the analyzed supertag to determine which fields to populate:
 * - URL → first url-type field
 * - Selection → text field (Notes > Summary > Highlight > Snapshot)
 * - Author → author/creator field
 *
 * @param clip - Data from the web clip
 * @param analyzed - Analyzed supertag with field information
 * @param options - Mapping options
 * @returns Record of field names to values
 */
export function mapClipToFields(
  clip: ClipData,
  analyzed: AnalyzedSupertag,
  options: MapOptions = {},
): Record<string, string> {
  const fields: Record<string, string> = {};

  // Map URL field
  if (analyzed.hasUrlField && analyzed.urlFieldName) {
    if (options.formatUrlAsLink) {
      fields[analyzed.urlFieldName] = `[${clip.title}](${clip.url})`;
    } else {
      fields[analyzed.urlFieldName] = clip.url;
    }
  }

  // Map selection to best text field
  if (clip.selection && analyzed.textFields.length > 0) {
    const textFieldName = getBestTextField(analyzed.textFields);
    if (textFieldName) {
      fields[textFieldName] = clip.selection;
    }
  }

  // Map author
  if (clip.author && analyzed.hasAuthorField && analyzed.authorFieldName) {
    fields[analyzed.authorFieldName] = clip.author;
  }

  // Map description if there's a dedicated field
  if (clip.description && analyzed.descriptionFieldName) {
    fields[analyzed.descriptionFieldName] = clip.description;
  }

  return fields;
}

/**
 * Get the best text field for storing selection/highlight
 *
 * Priority: Notes > Summary > Highlight > Snapshot > first field
 */
function getBestTextField(textFields: string[]): string | undefined {
  const priority = ["Notes", "Summary", "Highlight", "Snapshot"];

  for (const preferred of priority) {
    const found = textFields.find(
      (f) => f.toLowerCase() === preferred.toLowerCase(),
    );
    if (found) return found;
  }

  // Fall back to first text field
  return textFields[0];
}

/**
 * Create a default field mapping for when no schema is available
 * Falls back to common field names
 */
export function createDefaultMapping(
  clip: ClipData,
  options: MapOptions = {},
): Record<string, string> {
  const fields: Record<string, string> = {};

  // Default URL field
  if (options.formatUrlAsLink) {
    fields.URL = `[${clip.title}](${clip.url})`;
  } else {
    fields.URL = clip.url;
  }

  // Default selection field
  if (clip.selection) {
    fields.Notes = clip.selection;
  }

  // Default author field
  if (clip.author) {
    fields.Author = clip.author;
  }

  // Default description field
  if (clip.description) {
    fields.Description = clip.description;
  }

  return fields;
}
