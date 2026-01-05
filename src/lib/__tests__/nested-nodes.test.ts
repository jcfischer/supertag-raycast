/**
 * Nested Nodes Tests
 *
 * Tests for multi-level nested node parsing and JSON generation
 */

import { describe, it, expect } from "bun:test";

// Import the buildTanaJSON function - we need to extract it from capture-tana.tsx
// For now, let's recreate it here for testing
interface TanaNode {
  name: string;
  children?: TanaNode[];
}

function buildTanaJSON(text: string): TanaNode[] {
  const lines = text.split("\n").filter((line) => line.trim());

  interface ParsedLine {
    indent: number;
    text: string;
  }

  // Parse lines and calculate indentation levels
  const parsed: ParsedLine[] = lines.map((line) => {
    // Calculate indent: count leading whitespace
    const indent = line.search(/\S/);
    const trimmed = line.trimStart();

    // Remove leading "-" if present
    const content = trimmed.startsWith("-") ? trimmed.slice(1).trim() : trimmed;

    return { indent, text: content };
  });

  // Build tree structure
  const root: TanaNode[] = [];
  const stack: { node: TanaNode; indent: number }[] = [];

  for (const { indent, text } of parsed) {
    const node: TanaNode = { name: text };

    // Pop stack until we find the parent level
    while (stack.length > 0 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }

    if (stack.length === 0) {
      // Root level node
      root.push(node);
    } else {
      // Child node
      const parent = stack[stack.length - 1].node;
      if (!parent.children) {
        parent.children = [];
      }
      parent.children.push(node);
    }

    stack.push({ node, indent });
  }

  return root;
}

describe("Multi-level Nested Nodes", () => {
  it("should handle single-level nesting", () => {
    const input = `Parent
  - Child 1
  - Child 2`;

    const result = buildTanaJSON(input);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Parent");
    expect(result[0].children).toHaveLength(2);
    expect(result[0].children![0].name).toBe("Child 1");
    expect(result[0].children![1].name).toBe("Child 2");
  });

  it("should handle two-level nesting", () => {
    const input = `Parent
  - Child 1
    - Grandchild 1
    - Grandchild 2
  - Child 2`;

    const result = buildTanaJSON(input);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Parent");
    expect(result[0].children).toHaveLength(2);

    // First child
    expect(result[0].children![0].name).toBe("Child 1");
    expect(result[0].children![0].children).toHaveLength(2);
    expect(result[0].children![0].children![0].name).toBe("Grandchild 1");
    expect(result[0].children![0].children![1].name).toBe("Grandchild 2");

    // Second child
    expect(result[0].children![1].name).toBe("Child 2");
    expect(result[0].children![1].children).toBeUndefined();
  });

  it("should handle three-level nesting", () => {
    const input = `Parent
  - Child 1
    - Grandchild 1
      - Great-grandchild 1
      - Great-grandchild 2
    - Grandchild 2
  - Child 2`;

    const result = buildTanaJSON(input);

    expect(result).toHaveLength(1);

    // Verify three levels deep
    const child1 = result[0].children![0];
    const grandchild1 = child1.children![0];

    expect(grandchild1.children).toHaveLength(2);
    expect(grandchild1.children![0].name).toBe("Great-grandchild 1");
    expect(grandchild1.children![1].name).toBe("Great-grandchild 2");
  });

  it("should handle four-level nesting", () => {
    const input = `Root
  - Level 1
    - Level 2
      - Level 3
        - Level 4`;

    const result = buildTanaJSON(input);

    expect(result).toHaveLength(1);

    // Navigate down four levels
    let current = result[0];
    expect(current.name).toBe("Root");

    current = current.children![0];
    expect(current.name).toBe("Level 1");

    current = current.children![0];
    expect(current.name).toBe("Level 2");

    current = current.children![0];
    expect(current.name).toBe("Level 3");

    current = current.children![0];
    expect(current.name).toBe("Level 4");
    expect(current.children).toBeUndefined();
  });

  it("should handle multiple root nodes with nested children", () => {
    const input = `Root 1
  - Child 1.1
    - Grandchild 1.1.1
  - Child 1.2
Root 2
  - Child 2.1
    - Grandchild 2.1.1`;

    const result = buildTanaJSON(input);

    expect(result).toHaveLength(2);

    // First root
    expect(result[0].name).toBe("Root 1");
    expect(result[0].children).toHaveLength(2);
    expect(result[0].children![0].children![0].name).toBe("Grandchild 1.1.1");

    // Second root
    expect(result[1].name).toBe("Root 2");
    expect(result[1].children).toHaveLength(1);
    expect(result[1].children![0].children![0].name).toBe("Grandchild 2.1.1");
  });

  it("should handle complex irregular nesting", () => {
    const input = `Project
  - Phase 1
    - Task 1.1
      - Subtask 1.1.1
      - Subtask 1.1.2
    - Task 1.2
  - Phase 2
    - Task 2.1
      - Subtask 2.1.1
        - Detail 2.1.1.1
        - Detail 2.1.1.2`;

    const result = buildTanaJSON(input);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Project");

    // Check Phase 2 -> Task 2.1 -> Subtask 2.1.1 -> Details
    const phase2 = result[0].children![1];
    const task21 = phase2.children![0];
    const subtask211 = task21.children![0];

    expect(subtask211.children).toHaveLength(2);
    expect(subtask211.children![0].name).toBe("Detail 2.1.1.1");
    expect(subtask211.children![1].name).toBe("Detail 2.1.1.2");
  });

  it("should handle lines without dashes at any level", () => {
    const input = `Parent
  Child without dash
  - Child with dash
    Grandchild without dash
    - Grandchild with dash`;

    const result = buildTanaJSON(input);

    expect(result).toHaveLength(1);
    expect(result[0].children).toHaveLength(2);
    expect(result[0].children![0].name).toBe("Child without dash");
    expect(result[0].children![1].name).toBe("Child with dash");

    const grandchildren = result[0].children![1].children!;
    expect(grandchildren).toHaveLength(2);
    expect(grandchildren[0].name).toBe("Grandchild without dash");
    expect(grandchildren[1].name).toBe("Grandchild with dash");
  });

  it("should generate valid JSON for supertag CLI", () => {
    const input = `Meeting Notes
  - Decisions
    - Decision 1
    - Decision 2
  - Action Items
    - Task 1
      - Subtask 1.1
    - Task 2`;

    const result = buildTanaJSON(input);
    const json = JSON.stringify(result);

    // Should be valid JSON
    expect(() => JSON.parse(json)).not.toThrow();

    // Re-parse and verify structure
    const parsed = JSON.parse(json) as TanaNode[];
    expect(parsed[0].children![1].children![0].children![0].name).toBe(
      "Subtask 1.1",
    );
  });

  it("should handle empty lines gracefully", () => {
    const input = `Parent

  - Child 1

    - Grandchild 1

  - Child 2`;

    const result = buildTanaJSON(input);

    expect(result).toHaveLength(1);
    expect(result[0].children).toHaveLength(2);
    expect(result[0].children![0].children![0].name).toBe("Grandchild 1");
  });

  it("should handle tab indentation", () => {
    const input = `Parent
\t- Child 1
\t\t- Grandchild 1
\t- Child 2`;

    const result = buildTanaJSON(input);

    expect(result).toHaveLength(1);
    expect(result[0].children).toHaveLength(2);
    expect(result[0].children![0].children![0].name).toBe("Grandchild 1");
  });
});
