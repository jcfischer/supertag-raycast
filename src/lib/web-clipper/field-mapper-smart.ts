/**
 * Smart Field Mapper for Web Clipper
 *
 * Maps template fields to actual supertag schema fields based on semantic similarity.
 * This allows templates to work with any user's Tana workspace, regardless of field naming.
 */

import type { CachedSupertag, CachedField } from "../schema-cache";

/**
 * Field mapping aliases - template field name to possible schema field names
 * Order matters: first match wins
 */
const FIELD_ALIASES: Record<string, string[]> = {
  // URL variations
  URL: [
    "URL",
    "Url",
    "url",
    "Link",
    "link",
    "Source",
    "source",
    "Href",
    "href",
  ],

  // Author variations
  Author: [
    "Author",
    "author",
    "Creator",
    "creator",
    "By",
    "by",
    "Writer",
    "writer",
  ],
  Channel: [
    "Channel",
    "channel",
    "Author",
    "author",
    "Creator",
    "creator",
    "By",
    "by",
  ],

  // Description variations
  Description: [
    "Description",
    "description",
    "Excerpt",
    "excerpt",
    "About",
    "about",
    "Overview",
    "overview",
  ],

  // Summary variations (for AI-generated summaries)
  Summary: [
    "Summary",
    "summary",
    "Abstract",
    "abstract",
    "Synopsis",
    "synopsis",
    "TL;DR",
    "tldr",
    "Description",
    "description",
  ],

  // Title variations
  Title: ["Title", "title", "Name", "name", "Headline", "headline"],

  // Date variations
  Clipped: [
    "Clipped",
    "clipped",
    "Date",
    "date",
    "Added",
    "added",
    "Created",
    "created",
    "Saved",
    "saved",
  ],

  // Reading time variations
  "Reading Time": [
    "Reading Time",
    "reading time",
    "ReadTime",
    "readtime",
    "Duration",
    "duration",
    "Length",
    "length",
    "Time",
    "time",
  ],

  // Site variations
  Site: [
    "Site",
    "site",
    "Source",
    "source",
    "Website",
    "website",
    "Domain",
    "domain",
  ],
  Subreddit: [
    "Subreddit",
    "subreddit",
    "Community",
    "community",
    "Forum",
    "forum",
    "Site",
    "site",
  ],
};

/**
 * Result of smart field mapping
 */
export interface SmartFieldMapping {
  /** Original template field name -> actual schema field name */
  fieldMap: Record<string, string>;
  /** Fields that couldn't be mapped (template field names) */
  unmappedFields: string[];
  /** Whether all fields were successfully mapped */
  isComplete: boolean;
}

/**
 * Find the best matching field in a supertag schema
 */
function findMatchingField(
  templateFieldName: string,
  schemaFields: CachedField[],
): string | null {
  // Get aliases for this template field, or use just the field name
  const aliases = FIELD_ALIASES[templateFieldName] || [templateFieldName];

  // Try each alias
  for (const alias of aliases) {
    const match = schemaFields.find(
      (f) => f.name.toLowerCase() === alias.toLowerCase(),
    );
    if (match) {
      return match.name;
    }
  }

  // Try partial matching as fallback (field name contains alias or vice versa)
  for (const alias of aliases) {
    const match = schemaFields.find(
      (f) =>
        f.name.toLowerCase().includes(alias.toLowerCase()) ||
        alias.toLowerCase().includes(f.name.toLowerCase()),
    );
    if (match) {
      return match.name;
    }
  }

  return null;
}

/**
 * Create a smart field mapping from template fields to supertag schema
 *
 * @param templateFields - Field names used by the template (e.g., ["URL", "Channel", "Description"])
 * @param supertag - The cached supertag schema to map to
 * @returns Mapping from template field names to actual schema field names
 */
export function createSmartFieldMapping(
  templateFields: string[],
  supertag: CachedSupertag,
): SmartFieldMapping {
  const fieldMap: Record<string, string> = {};
  const unmappedFields: string[] = [];

  for (const templateField of templateFields) {
    const schemaField = findMatchingField(templateField, supertag.fields);
    if (schemaField) {
      fieldMap[templateField] = schemaField;
    } else {
      // Use template field name as-is if no match found
      fieldMap[templateField] = templateField;
      unmappedFields.push(templateField);
    }
  }

  return {
    fieldMap,
    unmappedFields,
    isComplete: unmappedFields.length === 0,
  };
}

/**
 * Apply smart field mapping to rendered template fields
 *
 * @param fields - Rendered fields from template (template field name -> value)
 * @param mapping - Smart field mapping to apply
 * @returns New fields object with schema field names
 */
export function applySmartFieldMapping(
  fields: Record<string, string>,
  mapping: SmartFieldMapping,
): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [templateField, value] of Object.entries(fields)) {
    const schemaField = mapping.fieldMap[templateField] || templateField;
    result[schemaField] = value;
  }

  return result;
}

/**
 * Get all field names from a template's fields definition
 */
export function getTemplateFieldNames(
  templateFields: Record<string, string>,
): string[] {
  return Object.keys(templateFields);
}
