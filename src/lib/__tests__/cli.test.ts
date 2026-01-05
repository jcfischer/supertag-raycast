/**
 * CLI Functions Tests
 *
 * TDD tests for supertag-cli wrapper functions
 */

import { describe, it, expect, mock } from "bun:test";
import type { ExecaError } from "execa";

// Mock execa before importing cli
const mockExeca = mock((path: string, args: string[], options?: any) => {
  return Promise.resolve({ stdout: "", stderr: "", exitCode: 0 });
});

mock.module("execa", () => ({
  execa: mockExeca,
}));

import {
  listSupertags,
  getSupertag,
  createTanaNode,
  capturePlainNode,
  getFieldOptions,
  getNodesBySupertag,
  extractSupertagFromFieldName,
  type SupertagInfo,
  type SupertagSchema,
  type FieldOption,
} from "../cli";

describe("listSupertags", () => {
  it("should return parsed supertags on success", async () => {
    const mockData: SupertagInfo[] = [
      { tagName: "todo", tagId: "todo-id", count: "100" },
      { tagName: "note", tagId: "note-id", count: "50" },
    ];

    mockExeca.mockResolvedValueOnce({
      stdout: JSON.stringify(mockData),
      exitCode: 0,
    });

    const result = await listSupertags(10);

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockData);
    expect(result.error).toBeUndefined();
  });

  it("should handle invalid JSON response", async () => {
    mockExeca.mockResolvedValueOnce({
      stdout: "not json",
      exitCode: 0,
    });

    const result = await listSupertags(10);

    expect(result.success).toBe(false);
    expect(result.error).toContain("Failed to parse supertags");
  });

  it("should handle CLI failure", async () => {
    mockExeca.mockResolvedValueOnce({
      stdout: "",
      exitCode: 1,
    });

    const result = await listSupertags(10);

    expect(result.success).toBe(false);
    expect(result.error).toContain("Failed to list supertags");
  });

  it("should handle execa error", async () => {
    const error = new Error("Command failed") as ExecaError;
    mockExeca.mockRejectedValueOnce(error);

    const result = await listSupertags(10);

    expect(result.success).toBe(false);
    expect(result.error).toContain("Command failed");
  });
});

describe("getSupertag", () => {
  it("should return schema on success", async () => {
    const mockSchema: SupertagSchema = {
      tagId: "todo-id",
      tagName: "todo",
      fields: [
        {
          fieldName: "Status",
          fieldLabelId: "status-id",
          originTagName: "todo",
          depth: 0,
          inferredDataType: "text",
        },
      ],
    };

    mockExeca.mockResolvedValueOnce({
      stdout: JSON.stringify(mockSchema),
      exitCode: 0,
    });

    const result = await getSupertag("todo");

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockSchema);
  });

  it("should extract JSON from output with warnings", async () => {
    const mockSchema: SupertagSchema = {
      tagId: "todo-id",
      tagName: "todo",
      fields: [],
    };

    mockExeca.mockResolvedValueOnce({
      stdout: `Warning: something\n${JSON.stringify(mockSchema)}`,
      exitCode: 0,
    });

    const result = await getSupertag("todo");

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockSchema);
  });

  it("should handle missing JSON in output", async () => {
    mockExeca.mockResolvedValueOnce({
      stdout: "No JSON here",
      exitCode: 0,
    });

    const result = await getSupertag("todo");

    expect(result.success).toBe(false);
    expect(result.error).toBe("No schema found in output");
  });
});

describe("capturePlainNode", () => {
  it("should successfully post JSON to Tana", async () => {
    mockExeca.mockResolvedValueOnce({
      stdout: "",
      exitCode: 0,
    });

    const result = await capturePlainNode('[{"name":"test"}]');

    expect(result.success).toBe(true);
    expect(result.data?.message).toBe("Created node in Tana");
    expect(result.data?.nodeCreated).toBe(true);
  });

  it("should handle API errors", async () => {
    mockExeca.mockResolvedValueOnce({
      stdout: "",
      stderr: "API error",
      exitCode: 1,
    });

    const result = await capturePlainNode('[{"name":"test"}]');

    expect(result.success).toBe(false);
    expect(result.error).toContain("API error");
  });
});

describe("createTanaNode", () => {
  it("should create node without fields", async () => {
    mockExeca.mockResolvedValueOnce({
      stdout: "",
      exitCode: 0,
    });

    const result = await createTanaNode("todo", "Buy milk");

    expect(result.success).toBe(true);
    expect(result.data?.message).toContain("Created todo: Buy milk");
  });

  it("should create node with fields using JSON", async () => {
    mockExeca.mockResolvedValueOnce({
      stdout: "",
      exitCode: 0,
    });

    const result = await createTanaNode("meeting", "Weekly Sync", {
      Status: "Done",
      Date: "2026-01-06",
    });

    expect(result.success).toBe(true);
  });

  it("should handle creation errors", async () => {
    mockExeca.mockResolvedValueOnce({
      stdout: "",
      stderr: "Creation failed",
      exitCode: 1,
    });

    const result = await createTanaNode("todo", "Test");

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });
});

describe("getFieldOptions", () => {
  it("should return unique field options", async () => {
    const mockResponse = [
      { valueNodeId: "id1", valueText: "Option 1" },
      { valueNodeId: "id2", valueText: "Option 2" },
      { valueNodeId: "id1", valueText: "Option 1" }, // Duplicate
    ];

    mockExeca.mockResolvedValueOnce({
      stdout: JSON.stringify(mockResponse),
      exitCode: 0,
    });

    const result = await getFieldOptions("Status");

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(2);
    expect(result.data).toEqual([
      { id: "id1", text: "Option 1" },
      { id: "id2", text: "Option 2" },
    ]);
  });

  it("should filter out entries without ID or text", async () => {
    const mockResponse = [
      { valueNodeId: "id1", valueText: "Option 1" },
      { valueNodeId: "", valueText: "No ID" },
      { valueNodeId: "id3", valueText: "" },
    ];

    mockExeca.mockResolvedValueOnce({
      stdout: JSON.stringify(mockResponse),
      exitCode: 0,
    });

    const result = await getFieldOptions("Status");

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
  });
});

describe("getNodesBySupertag", () => {
  it("should return nodes with lowercase tag matching", async () => {
    const mockNodes = [
      { id: "id1", name: "Company 1" },
      { id: "id2", name: "Company 2" },
    ];

    mockExeca.mockResolvedValueOnce({
      stdout: JSON.stringify(mockNodes),
      exitCode: 0,
    });

    const result = await getNodesBySupertag("Company", 100);

    expect(result.success).toBe(true);
    expect(result.data).toEqual([
      { id: "id1", text: "Company 1" },
      { id: "id2", text: "Company 2" },
    ]);

    // Should call with lowercase
    expect(mockExeca).toHaveBeenCalledWith(
      expect.any(String),
      expect.arrayContaining(["--tag", "company"]),
      expect.any(Object),
    );
  });

  it("should handle search errors", async () => {
    mockExeca.mockResolvedValueOnce({
      stdout: "",
      exitCode: 1,
    });

    const result = await getNodesBySupertag("Company");

    expect(result.success).toBe(false);
  });
});

describe("extractSupertagFromFieldName", () => {
  it("should remove emoji prefixes", () => {
    expect(extractSupertagFromFieldName("⚙️ Vault")).toBe("Vault");
    expect(extractSupertagFromFieldName("📦 Package")).toBe("Package");
  });

  it("should handle field names without emojis", () => {
    expect(extractSupertagFromFieldName("Company")).toBe("Company");
    expect(extractSupertagFromFieldName("Status")).toBe("Status");
  });

  it("should handle empty/whitespace-only input", () => {
    expect(extractSupertagFromFieldName("")).toBe(null);
    expect(extractSupertagFromFieldName("   ")).toBe(null);
  });

  it("should remove multiple leading non-word characters", () => {
    expect(extractSupertagFromFieldName("⚙️🔧 Tool")).toBe("Tool");
  });
});
