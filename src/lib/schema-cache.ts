/**
 * SchemaCache - File-based schema registry cache for Raycast
 *
 * Spec 081: Schema cache for faster Raycast form rendering
 *
 * Provides fast file-based access to supertag schemas without spawning CLI processes.
 * Uses mtime-based cache invalidation to stay fresh after syncs.
 *
 * Performance: <1ms file read + JSON parse vs ~300ms CLI spawn
 */

import { readFileSync, existsSync, statSync } from "fs";
import { join } from "path";
import { homedir } from "os";

/**
 * Cached field definition matching schema-registry.json format
 */
export interface CachedField {
  /** Field attribute ID */
  attributeId: string;
  /** Human-readable field name */
  name: string;
  /** Normalized name for matching */
  normalizedName: string;
  /** Optional description */
  description?: string;
  /** Inferred data type */
  dataType?: string;
  /** Target supertag for reference fields (Spec 081) */
  targetSupertag?: {
    /** Target supertag ID */
    id: string;
    /** Target supertag name */
    name: string;
  };
  /** Origin supertag name (for inherited fields) - added during collection */
  originTagName?: string;
  /** Inheritance depth (0 = own field, 1+ = inherited) - added during collection */
  depth?: number;
}

/**
 * Cached supertag schema matching schema-registry.json format
 */
export interface CachedSupertag {
  /** Supertag ID */
  id: string;
  /** Human-readable name */
  name: string;
  /** Normalized name */
  normalizedName: string;
  /** Optional description */
  description?: string;
  /** Optional color */
  color?: string;
  /** Fields for this supertag */
  fields: CachedField[];
  /** Parent supertag IDs (inheritance) */
  extends?: string[];
}

/**
 * Schema registry file format (from supertag-cli)
 */
interface SchemaRegistryFile {
  version: number;
  supertags: CachedSupertag[];
}

/**
 * SchemaCache provides fast file-based access to supertag schemas
 *
 * Features:
 * - Direct file read (no CLI spawning)
 * - In-memory caching after first load
 * - mtime-based cache invalidation
 * - Graceful fallback on errors
 *
 * Usage:
 * ```typescript
 * const cache = new SchemaCache();
 * const person = cache.getSupertag("person");
 * if (person) {
 *   // Use person.fields
 * }
 * ```
 */
export class SchemaCache {
  private workspace: string;
  private schemaPath: string;
  private cache: Map<string, CachedSupertag> | null = null;
  private lastMtime: number | null = null;

  constructor(workspace?: string) {
    this.workspace = workspace || "main";
    this.schemaPath = join(
      homedir(),
      ".local",
      "share",
      "supertag",
      "workspaces",
      this.workspace,
      "schema-registry.json"
    );
  }

  /**
   * Get supertag schema by name with all fields (including inherited)
   * Returns null if not found or on error
   */
  getSupertag(tagName: string): CachedSupertag | null {
    this.refreshIfNeeded();
    const supertag = this.cache?.get(tagName);
    if (!supertag) return null;

    // Collect all fields including inherited ones
    const allFields = this.collectInheritedFields(supertag, new Set());

    return {
      ...supertag,
      fields: allFields,
    };
  }

  /**
   * Recursively collect fields from supertag and all parents
   * Prevents duplicates and infinite loops
   */
  private collectInheritedFields(
    supertag: CachedSupertag,
    visited: Set<string>,
    depth: number = 0
  ): CachedField[] {
    // Prevent infinite loops
    if (visited.has(supertag.id)) return [];
    visited.add(supertag.id);

    const allFields: CachedField[] = [];
    const seenFieldNames = new Set<string>();

    // Add own fields first (they take precedence)
    for (const field of supertag.fields) {
      if (!seenFieldNames.has(field.name)) {
        seenFieldNames.add(field.name);
        allFields.push({
          ...field,
          originTagName: supertag.name,
          depth: depth,
        });
      }
    }

    // Add inherited fields from parents
    if (supertag.extends && this.cache) {
      for (const parentId of supertag.extends) {
        // Find parent by ID
        const parent = Array.from(this.cache.values()).find(s => s.id === parentId);
        if (parent) {
          const parentFields = this.collectInheritedFields(parent, visited, depth + 1);
          for (const field of parentFields) {
            // Only add if not already present (child fields override)
            if (!seenFieldNames.has(field.name)) {
              seenFieldNames.add(field.name);
              allFields.push(field);
            }
          }
        }
      }
    }

    return allFields;
  }

  /**
   * Get all supertags (for list views)
   * Returns empty array if cache unavailable
   */
  getAllSupertags(): CachedSupertag[] {
    this.refreshIfNeeded();
    return this.cache ? Array.from(this.cache.values()) : [];
  }

  /**
   * Check if schema file changed and reload if needed
   * Called automatically before each access
   */
  private refreshIfNeeded(): void {
    try {
      if (!existsSync(this.schemaPath)) {
        // File doesn't exist - clear cache
        this.cache = null;
        this.lastMtime = null;
        return;
      }

      const stats = statSync(this.schemaPath);
      const currentMtime = stats.mtimeMs;

      // Load if cache is empty or file changed
      if (!this.cache || this.lastMtime !== currentMtime) {
        this.loadSchemas();
        this.lastMtime = currentMtime;
      }
    } catch (error) {
      // On error, keep existing cache if available
      console.error("[SchemaCache] Error checking file mtime:", error);
    }
  }

  /**
   * Load schemas from file into memory
   * Called on first access and after file changes
   */
  private loadSchemas(): void {
    try {
      const content = readFileSync(this.schemaPath, "utf-8");
      const data: SchemaRegistryFile = JSON.parse(content);

      // Build name-based lookup map
      const newCache = new Map<string, CachedSupertag>();
      for (const supertag of data.supertags) {
        newCache.set(supertag.name, supertag);
      }

      this.cache = newCache;
    } catch (error) {
      console.error("[SchemaCache] Error loading schemas:", error);
      // On parse error, clear cache to force fallback
      this.cache = null;
    }
  }
}
