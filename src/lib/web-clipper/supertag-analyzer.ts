import type { CachedSupertag } from "../schema-cache";

/**
 * Scoring weights for clip-friendly supertags
 */
const SCORES = {
  URL_FIELD: 10,
  TEXT_FIELD: 5,
  AUTHOR_FIELD: 2,
  DESCRIPTION_FIELD: 3,
};

/**
 * Field name patterns for detection
 */
const PATTERNS = {
  URL: /^(url|link|source|href)/i,
  TEXT: /^(notes?|summary|highlights?|snapshot|content|excerpt|description|text)/i,
  AUTHOR: /^(author|creator|by|writer)/i,
  DESCRIPTION: /^(description|summary|about|overview)/i,
};

/**
 * Analysis result for a single supertag
 */
export interface AnalyzedSupertag {
  /** Original supertag */
  supertag: CachedSupertag;
  /** Clip-friendliness score (higher = better for clipping) */
  score: number;
  /** Whether the supertag has a URL-type field */
  hasUrlField: boolean;
  /** Name of the URL field if found */
  urlFieldName?: string;
  /** Text fields suitable for selection/notes */
  textFields: string[];
  /** Whether the supertag has an author field */
  hasAuthorField: boolean;
  /** Name of the author field if found */
  authorFieldName?: string;
  /** Description field name if found */
  descriptionFieldName?: string;
}

/**
 * Options for finding clip-friendly supertags
 */
export interface FindOptions {
  /** Minimum score to include (default: 0) */
  minScore?: number;
  /** Maximum number of results (default: unlimited) */
  limit?: number;
}

/**
 * Analyze a supertag for clip-friendliness
 *
 * Scoring:
 * - URL field: +10 points
 * - Text field (notes/summary/highlight): +5 points each
 * - Author field: +2 points
 * - Description field: +3 points
 */
export function analyzeSupertag(supertag: CachedSupertag): AnalyzedSupertag {
  let score = 0;
  let hasUrlField = false;
  let urlFieldName: string | undefined;
  const textFields: string[] = [];
  let hasAuthorField = false;
  let authorFieldName: string | undefined;
  let descriptionFieldName: string | undefined;

  for (const field of supertag.fields) {
    // Check for URL field
    if (
      field.dataType === "url" ||
      PATTERNS.URL.test(field.name) ||
      field.name.toLowerCase().includes("url")
    ) {
      if (!hasUrlField) {
        hasUrlField = true;
        urlFieldName = field.name;
        score += SCORES.URL_FIELD;
      }
    }

    // Check for text fields (notes, summary, highlight, etc.)
    if (PATTERNS.TEXT.test(field.name)) {
      textFields.push(field.name);
      score += SCORES.TEXT_FIELD;
    }

    // Check for author field
    if (PATTERNS.AUTHOR.test(field.name)) {
      if (!hasAuthorField) {
        hasAuthorField = true;
        authorFieldName = field.name;
        score += SCORES.AUTHOR_FIELD;
      }
    }

    // Check for description field (separate from general text fields)
    if (PATTERNS.DESCRIPTION.test(field.name) && !descriptionFieldName) {
      descriptionFieldName = field.name;
      score += SCORES.DESCRIPTION_FIELD;
    }
  }

  return {
    supertag,
    score,
    hasUrlField,
    urlFieldName,
    textFields,
    hasAuthorField,
    authorFieldName,
    descriptionFieldName,
  };
}

/**
 * Find and rank clip-friendly supertags
 *
 * @param supertags - All available supertags
 * @param options - Filtering and limiting options
 * @returns Ranked list of analyzed supertags, highest score first
 */
export function findClipFriendlySupertags(
  supertags: CachedSupertag[],
  options: FindOptions = {},
): AnalyzedSupertag[] {
  const { minScore = 0, limit } = options;

  // Analyze all supertags
  const analyzed = supertags.map(analyzeSupertag);

  // Filter by minimum score
  const filtered = analyzed.filter((a) => a.score >= minScore);

  // Sort by score descending
  filtered.sort((a, b) => b.score - a.score);

  // Apply limit if specified
  if (limit !== undefined) {
    return filtered.slice(0, limit);
  }

  return filtered;
}

/**
 * Get the best text field for storing selection/highlight
 *
 * Priority: notes > summary > highlight > snapshot > first text field
 */
export function getBestTextFieldName(analyzed: AnalyzedSupertag): string | undefined {
  const priority = ["Notes", "Summary", "Highlight", "Snapshot"];

  for (const preferred of priority) {
    const found = analyzed.textFields.find(
      (f) => f.toLowerCase() === preferred.toLowerCase(),
    );
    if (found) return found;
  }

  // Fall back to first text field
  return analyzed.textFields[0];
}
