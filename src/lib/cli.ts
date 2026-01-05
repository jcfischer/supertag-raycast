import { execa, type ExecaError } from "execa";
import { homedir } from "os";

/**
 * Generic CLI response type for supertag operations
 */
export interface CLIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Path to supertag CLI binary
 */
export const SUPERTAG_PATH =
  process.env.SUPERTAG_PATH || `${homedir()}/bin/supertag`;

/**
 * Create Tana node directly via supertag-cli
 */
export async function captureTana(
  text: string,
  supertag: "todo" | "note" | "idea" = "todo",
): Promise<CLIResponse<{ message: string; nodeCreated: boolean }>> {
  try {
    const { stdout, exitCode } = await execa(
      SUPERTAG_PATH,
      ["create", supertag, text],
      {
        timeout: 10000,
        reject: false,
        env: {
          ...process.env,
          PATH: `${homedir()}/bin:/usr/local/bin:/opt/homebrew/bin:${process.env.PATH || ""}`,
        },
      },
    );

    if (exitCode === 0) {
      return {
        success: true,
        data: {
          message: `Created ${supertag} in Tana`,
          nodeCreated: true,
        },
      };
    }

    return {
      success: false,
      error: stdout || `supertag create failed with exit code ${exitCode}`,
    };
  } catch (error) {
    const execaError = error as ExecaError;
    return {
      success: false,
      error: execaError.message || "Failed to create Tana node",
    };
  }
}

/**
 * Create plain Tana node using Tana Paste format
 * Sends Tana Paste content via stdin to supertag-cli
 */
export async function capturePlainNode(
  tanaPaste: string,
): Promise<CLIResponse<{ message: string; nodeCreated: boolean }>> {
  try {
    const { stdout, stderr, exitCode } = await execa(SUPERTAG_PATH, ["post"], {
      input: tanaPaste,
      timeout: 10000,
      reject: false,
      env: {
        ...process.env,
        PATH: `${homedir()}/bin:/usr/local/bin:/opt/homebrew/bin:${process.env.PATH || ""}`,
      },
    });

    if (exitCode === 0) {
      return {
        success: true,
        data: {
          message: "Created node in Tana",
          nodeCreated: true,
        },
      };
    }

    return {
      success: false,
      error:
        stderr || stdout || `supertag post failed with exit code ${exitCode}`,
    };
  } catch (error) {
    const execaError = error as ExecaError;
    return {
      success: false,
      error: execaError.message || "Failed to create Tana node",
    };
  }
}

/**
 * Supertag info from supertag-cli
 */
export interface SupertagInfo {
  tagName: string;
  tagId: string;
  count: string;
}

export interface SupertagField {
  fieldName: string;
  fieldLabelId: string;
  originTagName: string;
  depth: number;
  inferredDataType:
    | "text"
    | "date"
    | "reference"
    | "options"
    | "number"
    | "checkbox";
  targetSupertagId?: string;
  targetSupertagName?: string;
}

export interface SupertagSchema {
  tagId: string;
  tagName: string;
  fields: SupertagField[];
}

/**
 * List top supertags by usage
 */
export async function listSupertags(
  limit = 100,
): Promise<CLIResponse<SupertagInfo[]>> {
  try {
    const { stdout, stderr, exitCode } = await execa(
      SUPERTAG_PATH,
      ["tags", "top", "--json", "--limit", String(limit)],
      {
        timeout: 10000,
        reject: false,
        env: {
          ...process.env,
          PATH: `${homedir()}/bin:/usr/local/bin:/opt/homebrew/bin:${process.env.PATH || ""}`,
        },
      },
    );

    if (exitCode === 0 && stdout) {
      try {
        const tags = JSON.parse(stdout) as SupertagInfo[];
        return { success: true, data: tags };
      } catch (parseError) {
        return {
          success: false,
          error: `Failed to parse supertags: ${parseError instanceof Error ? parseError.message : "Unknown error"}`,
        };
      }
    }

    return {
      success: false,
      error:
        stderr || stdout || `Failed to list supertags (exit code ${exitCode})`,
    };
  } catch (error) {
    const execaError = error as ExecaError;
    return {
      success: false,
      error: `CLI error: ${execaError.message || "Unknown error"}${execaError.stderr ? `\n${execaError.stderr}` : ""}`,
    };
  }
}

/**
 * Get fields for a supertag
 */
export async function getSupertag(
  tagName: string,
): Promise<CLIResponse<SupertagSchema>> {
  try {
    const { stdout, stderr, exitCode } = await execa(
      SUPERTAG_PATH,
      ["tags", "fields", tagName, "--all", "--json"],
      {
        timeout: 10000,
        reject: false,
        env: {
          ...process.env,
          PATH: `${homedir()}/bin:/usr/local/bin:/opt/homebrew/bin:${process.env.PATH || ""}`,
        },
      },
    );

    if (exitCode === 0 && stdout) {
      try {
        // Extract JSON from output (may have warning messages before it)
        const jsonMatch = stdout.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const schema = JSON.parse(jsonMatch[0]) as SupertagSchema;
          return { success: true, data: schema };
        }
        return { success: false, error: "No schema found in output" };
      } catch {
        return { success: false, error: "Failed to parse supertag schema" };
      }
    }

    return {
      success: false,
      error: stderr || `Failed to get supertag (exit ${exitCode})`,
    };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Child node structure for Tana Input API
 */
export interface TanaChildNode {
  name: string;
  id?: string; // For references
  children?: TanaChildNode[]; // Nested children
}

/**
 * Create Tana node with fields and optional children
 * Uses supertag create for simple nodes, or supertag post for nodes with children
 */
export async function createTanaNode(
  supertag: string,
  name: string,
  fields?: Record<string, string>,
  children?: TanaChildNode[],
): Promise<CLIResponse<{ message: string }>> {
  try {
    // If we have children, use supertag create with --children flags
    // The create command handles field mapping and supertag resolution
    const args: string[] = ["create", supertag];

    if (fields && Object.keys(fields).length > 0) {
      // Use --json for name and fields
      const jsonPayload = { name, ...fields };
      args.push("--json", JSON.stringify(jsonPayload));
    } else {
      args.push(name);
    }

    // Add children via --children flags
    if (children && children.length > 0) {
      for (const child of children) {
        if (child.id || (child.children && child.children.length > 0)) {
          // Reference or nested children - use JSON format
          args.push("--children", JSON.stringify(child));
        } else {
          // Plain text child
          args.push("--children", child.name);
        }
      }
    }

    const { stdout, stderr, exitCode } = await execa(SUPERTAG_PATH, args, {
      timeout: 30000,
      reject: false,
      env: {
        ...process.env,
        PATH: `${homedir()}/bin:/usr/local/bin:/opt/homebrew/bin:${process.env.PATH || ""}`,
      },
    });

    if (exitCode === 0) {
      return {
        success: true,
        data: { message: `Created ${supertag}: ${name}` },
      };
    }

    return {
      success: false,
      error: stderr || stdout || `Failed to create node (exit ${exitCode})`,
    };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Option with ID and display text
 */
export interface FieldOption {
  id: string;
  text: string;
}

/**
 * Get unique option values for a field (returns ID and text)
 */
export async function getFieldOptions(
  fieldName: string,
): Promise<CLIResponse<FieldOption[]>> {
  try {
    const { stdout, exitCode } = await execa(
      SUPERTAG_PATH,
      ["fields", "values", fieldName, "--json", "--limit", "100"],
      {
        timeout: 10000,
        reject: false,
        env: {
          ...process.env,
          PATH: `${homedir()}/bin:/usr/local/bin:/opt/homebrew/bin:${process.env.PATH || ""}`,
        },
      },
    );

    if (exitCode === 0 && stdout) {
      try {
        const values = JSON.parse(stdout) as Array<{
          valueNodeId: string;
          valueText: string;
        }>;
        // Extract unique options by ID
        const seen = new Set<string>();
        const unique: FieldOption[] = [];
        for (const v of values) {
          if (v.valueNodeId && v.valueText && !seen.has(v.valueNodeId)) {
            seen.add(v.valueNodeId);
            unique.push({ id: v.valueNodeId, text: v.valueText });
          }
        }
        return { success: true, data: unique };
      } catch {
        return { success: false, error: "Failed to parse field options" };
      }
    }

    return {
      success: false,
      error: `Failed to get field options (exit ${exitCode})`,
    };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Get nodes with a specific supertag (for "options from supertag" fields)
 * Uses lowercase tag name for case-insensitive matching
 */
export async function getNodesBySupertag(
  tagName: string,
  limit = 200,
): Promise<CLIResponse<FieldOption[]>> {
  try {
    // Use lowercase for case-insensitive tag matching
    const normalizedTagName = tagName.toLowerCase();
    const { stdout, exitCode } = await execa(
      SUPERTAG_PATH,
      [
        "search",
        "--tag",
        normalizedTagName,
        "--include-descendants",
        "--json",
        "--limit",
        String(limit),
        "--select",
        "id,name",
      ],
      {
        timeout: 10000,
        reject: false,
        env: {
          ...process.env,
          PATH: `${homedir()}/bin:/usr/local/bin:/opt/homebrew/bin:${process.env.PATH || ""}`,
        },
      },
    );

    if (exitCode === 0 && stdout) {
      try {
        const nodes = JSON.parse(stdout) as Array<{ id: string; name: string }>;
        const options: FieldOption[] = nodes.map((n) => ({
          id: n.id,
          text: n.name,
        }));
        return { success: true, data: options };
      } catch {
        return { success: false, error: "Failed to parse nodes" };
      }
    }

    return { success: false, error: `Failed to get nodes (exit ${exitCode})` };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Extract potential supertag name from field name
 * e.g., "⚙️ Vault" -> "Vault", "Focus" -> "Focus"
 */
export function extractSupertagFromFieldName(fieldName: string): string | null {
  // Remove emoji prefixes and clean up
  const cleaned = fieldName.replace(/^[^\w]+/, "").trim();
  return cleaned || null;
}
