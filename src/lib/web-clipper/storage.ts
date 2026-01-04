import type { ClipTemplate, DomainPreference, AIConfig, WebClip } from "./types";
import { DEFAULT_AI_CONFIG } from "./types";

/**
 * Storage keys for LocalStorage
 */
export const STORAGE_KEYS = {
  templates: "webclip:templates",
  domainPrefs: "webclip:domainPrefs",
  aiConfig: "webclip:aiConfig",
  recentClips: "webclip:recent",
} as const;

/**
 * Interface for storage backend (Raycast LocalStorage compatible)
 */
export interface StorageInterface {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

/**
 * Maximum number of recent clips to store
 */
const MAX_RECENT_CLIPS = 10;

/**
 * Storage service for web clipper data
 */
export class WebClipStorage {
  constructor(private storage: StorageInterface) {}

  // === Templates ===

  /**
   * Get all custom templates
   */
  async getTemplates(): Promise<ClipTemplate[]> {
    const data = await this.storage.getItem(STORAGE_KEYS.templates);
    if (!data) return [];
    try {
      return JSON.parse(data) as ClipTemplate[];
    } catch {
      return [];
    }
  }

  /**
   * Save a template (create or update)
   */
  async saveTemplate(template: ClipTemplate): Promise<void> {
    const templates = await this.getTemplates();
    const index = templates.findIndex((t) => t.id === template.id);
    if (index >= 0) {
      templates[index] = template;
    } else {
      templates.push(template);
    }
    await this.storage.setItem(STORAGE_KEYS.templates, JSON.stringify(templates));
  }

  /**
   * Delete a template by ID
   */
  async deleteTemplate(id: string): Promise<void> {
    const templates = await this.getTemplates();
    const filtered = templates.filter((t) => t.id !== id);
    await this.storage.setItem(STORAGE_KEYS.templates, JSON.stringify(filtered));
  }

  // === Domain Preferences ===

  /**
   * Get all domain preferences
   */
  async getAllDomainPreferences(): Promise<Record<string, DomainPreference>> {
    const data = await this.storage.getItem(STORAGE_KEYS.domainPrefs);
    if (!data) return {};
    try {
      return JSON.parse(data) as Record<string, DomainPreference>;
    } catch {
      return {};
    }
  }

  /**
   * Get preference for a specific domain
   */
  async getDomainPreference(domain: string): Promise<DomainPreference | null> {
    const prefs = await this.getAllDomainPreferences();
    return prefs[domain] ?? null;
  }

  /**
   * Save domain preference
   */
  async saveDomainPreference(pref: DomainPreference): Promise<void> {
    const prefs = await this.getAllDomainPreferences();
    prefs[pref.domain] = pref;
    await this.storage.setItem(STORAGE_KEYS.domainPrefs, JSON.stringify(prefs));
  }

  // === AI Config ===

  /**
   * Get AI configuration
   */
  async getAIConfig(): Promise<AIConfig> {
    const data = await this.storage.getItem(STORAGE_KEYS.aiConfig);
    if (!data) return DEFAULT_AI_CONFIG;
    try {
      return JSON.parse(data) as AIConfig;
    } catch {
      return DEFAULT_AI_CONFIG;
    }
  }

  /**
   * Save AI configuration
   */
  async saveAIConfig(config: AIConfig): Promise<void> {
    await this.storage.setItem(STORAGE_KEYS.aiConfig, JSON.stringify(config));
  }

  // === Recent Clips ===

  /**
   * Get recent clips (ordered by clippedAt, newest first)
   */
  async getRecentClips(): Promise<WebClip[]> {
    const data = await this.storage.getItem(STORAGE_KEYS.recentClips);
    if (!data) return [];
    try {
      const clips = JSON.parse(data) as WebClip[];
      // Sort by clippedAt descending
      return clips.sort((a, b) => new Date(b.clippedAt).getTime() - new Date(a.clippedAt).getTime());
    } catch {
      return [];
    }
  }

  /**
   * Add a clip to recent history
   */
  async addRecentClip(clip: WebClip): Promise<void> {
    const clips = await this.getRecentClips();
    // Add new clip at the beginning
    clips.unshift(clip);
    // Limit to MAX_RECENT_CLIPS
    const limited = clips.slice(0, MAX_RECENT_CLIPS);
    await this.storage.setItem(STORAGE_KEYS.recentClips, JSON.stringify(limited));
  }

  /**
   * Clear recent clips
   */
  async clearRecentClips(): Promise<void> {
    await this.storage.removeItem(STORAGE_KEYS.recentClips);
  }
}

/**
 * Create storage instance with Raycast LocalStorage
 * Note: This should be called from Raycast extension context
 */
export function createRaycastStorage(): StorageInterface {
  // This will be imported from @raycast/api in the actual extension
  // For now, return a placeholder that will be replaced
  return {
    getItem: async () => null,
    setItem: async () => {},
    removeItem: async () => {},
  };
}
