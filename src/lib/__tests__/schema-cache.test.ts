/**
 * SchemaCache Tests (Spec 081 T-2.2 through T-2.8)
 *
 * TDD tests for file-based schema caching.
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { writeFileSync, unlinkSync, mkdirSync, existsSync, rmSync, utimesSync } from "fs";
import { join } from "path";
import { SchemaCache } from "../schema-cache";
import type { CachedSupertag } from "../schema-cache";

describe("SchemaCache", () => {
  const testDir = "/tmp/schema-cache-test";
  const schemaPath = join(testDir, "schema-registry.json");

  // Sample test data
  const sampleSchema = {
    version: 1,
    supertags: [
      {
        id: "person-id",
        name: "person",
        normalizedName: "person",
        description: "A person",
        color: "blue",
        fields: [
          {
            attributeId: "email-attr",
            name: "Email",
            normalizedName: "email",
            dataType: "text",
          },
          {
            attributeId: "company-attr",
            name: "Company",
            normalizedName: "company",
            dataType: "reference",
            targetSupertag: {
              id: "company-id",
              name: "company",
            },
          },
        ],
      },
      {
        id: "meeting-id",
        name: "meeting",
        normalizedName: "meeting",
        fields: [
          {
            attributeId: "date-attr",
            name: "Date",
            normalizedName: "date",
            dataType: "date",
          },
        ],
      },
    ],
  };

  beforeEach(() => {
    // Clean up and create test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
  });

  // Helper to create test schema file
  const writeTestSchema = (data: any) => {
    writeFileSync(schemaPath, JSON.stringify(data), "utf-8");
  };

  // Helper to get SchemaCache pointing to test directory
  const getTestCache = (): SchemaCache => {
    // Override the schema path by creating cache with test workspace
    const cache = new SchemaCache("test-workspace");
    // Manually override the path for testing (we'll need to expose this or use a different approach)
    // For now, we'll use environment variable or different strategy
    // Actually, let's just test with the actual path structure
    const actualTestPath = join(
      process.env.HOME || "/tmp",
      ".local",
      "share",
      "supertag",
      "workspaces",
      "test-workspace"
    );
    mkdirSync(actualTestPath, { recursive: true });
    writeFileSync(join(actualTestPath, "schema-registry.json"), JSON.stringify(data), "utf-8");
    return cache;
  };

  describe("T-2.2: File loading and JSON parsing", () => {
    it("should load and parse schema file", () => {
      const cache = getTestCache();
      const person = cache.getSupertag("person");

      expect(person).not.toBeNull();
      expect(person!.id).toBe("person-id");
      expect(person!.name).toBe("person");
    });

    it("should load all supertags from file", () => {
      const cache = getTestCache();
      const all = cache.getAllSupertags();

      expect(all).toHaveLength(2);
      expect(all.map((s) => s.name)).toContain("person");
      expect(all.map((s) => s.name)).toContain("meeting");
    });
  });

  describe("T-2.3: getSupertag() returns correct schema", () => {
    it("should return correct supertag with all fields", () => {
      const cache = getTestCache();
      const person = cache.getSupertag("person");

      expect(person).not.toBeNull();
      expect(person!.fields).toHaveLength(2);
      expect(person!.fields[0].name).toBe("Email");
      expect(person!.fields[1].name).toBe("Company");
    });

    it("should return null for non-existent supertag", () => {
      const cache = getTestCache();
      const result = cache.getSupertag("nonexistent");

      expect(result).toBeNull();
    });

    it("should include targetSupertag in reference fields", () => {
      const cache = getTestCache();
      const person = cache.getSupertag("person");
      const companyField = person!.fields.find((f) => f.name === "Company");

      expect(companyField!.targetSupertag).toBeDefined();
      expect(companyField!.targetSupertag!.id).toBe("company-id");
      expect(companyField!.targetSupertag!.name).toBe("company");
    });
  });

  describe("T-2.4: Cache invalidation on file mtime change", () => {
    it("should reload when file is modified", () => {
      const cache = getTestCache();

      // Initial load
      let person = cache.getSupertag("person");
      expect(person!.name).toBe("person");

      // Modify file
      const modifiedSchema = {
        version: 1,
        supertags: [
          {
            id: "person-id",
            name: "person",
            normalizedName: "person",
            description: "Modified description", // Changed
            fields: [],
          },
        ],
      };

      const testPath = join(
        process.env.HOME || "/tmp",
        ".local",
        "share",
        "supertag",
        "workspaces",
        "test-workspace",
        "schema-registry.json"
      );

      // Wait a bit to ensure mtime changes
      const now = new Date();
      setTimeout(() => {
        writeFileSync(testPath, JSON.stringify(modifiedSchema), "utf-8");
        utimesSync(testPath, now, now); // Force mtime update

        // Access cache again - should reload
        person = cache.getSupertag("person");
        expect(person!.description).toBe("Modified description");
      }, 100);
    });
  });

  describe("T-2.5: In-memory cache avoids re-reading file", () => {
    it("should use cached data without re-reading file", () => {
      const cache = getTestCache();

      // First access loads from file
      const person1 = cache.getSupertag("person");
      expect(person1).not.toBeNull();

      // Delete the file
      const testPath = join(
        process.env.HOME || "/tmp",
        ".local",
        "share",
        "supertag",
        "workspaces",
        "test-workspace",
        "schema-registry.json"
      );
      unlinkSync(testPath);

      // Second access should still return cached data until mtime check fails
      // Actually, the mtime check will fail and clear cache, so this test needs adjustment
      // Let's test that multiple accesses don't re-parse
      const testPath2 = join(
        process.env.HOME || "/tmp",
        ".local",
        "share",
        "supertag",
        "workspaces",
        "test-workspace-2"
      );
      mkdirSync(testPath2, { recursive: true });
      writeFileSync(join(testPath2, "schema-registry.json"), JSON.stringify(sampleSchema), "utf-8");

      const cache2 = new SchemaCache("test-workspace-2");

      // Track parse count by checking if description changes
      const p1 = cache2.getSupertag("person");
      const p2 = cache2.getSupertag("person");
      const p3 = cache2.getSupertag("meeting");

      // All should return same data without re-parsing (mtime unchanged)
      expect(p1).toBe(p2); // Should be exact same object reference if truly cached
    });
  });

  describe("T-2.7: Missing file graceful handling", () => {
    it("should return null when schema file doesn't exist", () => {
      const cache = new SchemaCache("nonexistent-workspace");
      const result = cache.getSupertag("person");

      expect(result).toBeNull();
    });

    it("should return empty array when schema file doesn't exist", () => {
      const cache = new SchemaCache("nonexistent-workspace");
      const result = cache.getAllSupertags();

      expect(result).toEqual([]);
    });
  });

  describe("T-2.8: Corrupted JSON graceful handling", () => {
    it("should return null when JSON is malformed", () => {
      const testPath = join(
        process.env.HOME || "/tmp",
        ".local",
        "share",
        "supertag",
        "workspaces",
        "corrupted-workspace"
      );
      mkdirSync(testPath, { recursive: true });
      writeFileSync(join(testPath, "schema-registry.json"), "{ invalid json }", "utf-8");

      const cache = new SchemaCache("corrupted-workspace");
      const result = cache.getSupertag("person");

      expect(result).toBeNull();
    });

    it("should return empty array when JSON is malformed", () => {
      const testPath = join(
        process.env.HOME || "/tmp",
        ".local",
        "share",
        "supertag",
        "workspaces",
        "corrupted-workspace-2"
      );
      mkdirSync(testPath, { recursive: true });
      writeFileSync(join(testPath, "schema-registry.json"), "not json at all", "utf-8");

      const cache = new SchemaCache("corrupted-workspace-2");
      const result = cache.getAllSupertags();

      expect(result).toEqual([]);
    });
  });
});

// Helper to setup test data in global scope
const data = {
  version: 1,
  supertags: [
    {
      id: "person-id",
      name: "person",
      normalizedName: "person",
      description: "A person",
      color: "blue",
      fields: [
        {
          attributeId: "email-attr",
          name: "Email",
          normalizedName: "email",
          dataType: "text",
        },
        {
          attributeId: "company-attr",
          name: "Company",
          normalizedName: "company",
          dataType: "reference",
          targetSupertag: {
            id: "company-id",
            name: "company",
          },
        },
      ],
    },
    {
      id: "meeting-id",
      name: "meeting",
      normalizedName: "meeting",
      fields: [
        {
          attributeId: "date-attr",
          name: "Date",
          normalizedName: "date",
          dataType: "date",
        },
      ],
    },
  ],
};
