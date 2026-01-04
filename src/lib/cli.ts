import { execa, type ExecaError } from "execa";
import { CLIResponseSchema, type CLIResponse } from "./types";
import { homedir } from "os";

/**
 * Path to k CLI binary
 */
const K_PATH = process.env.K_PATH || `${homedir()}/bin/k`;

/**
 * Default timeout for CLI commands (10 seconds)
 */
const DEFAULT_TIMEOUT = 10000;

/**
 * Execute a k CLI command and parse JSON response
 */
export async function runCLI<T>(
  command: string,
  args: string[] = [],
  options: { timeout?: number } = {}
): Promise<CLIResponse<T>> {
  const timeout = options.timeout || DEFAULT_TIMEOUT;

  try {
    const { stdout, stderr, exitCode } = await execa(K_PATH, [command, ...args, "--json"], {
      timeout,
      reject: false, // Don't throw on non-zero exit
      env: {
        ...process.env,
        // Ensure PATH includes common locations
        PATH: `${homedir()}/bin:/usr/local/bin:/opt/homebrew/bin:${process.env.PATH || ""}`,
      },
    });

    // Try to parse stdout as JSON first
    if (stdout) {
      try {
        const parsed = JSON.parse(stdout);
        const validated = CLIResponseSchema.parse(parsed);
        return validated as CLIResponse<T>;
      } catch {
        // stdout wasn't valid JSON
      }
    }

    // If we have stderr or non-zero exit, return error
    if (exitCode !== 0) {
      return {
        success: false,
        error: stderr || stdout || `Command exited with code ${exitCode}`,
      };
    }

    return {
      success: false,
      error: "No valid response from CLI",
    };
  } catch (error) {
    const execaError = error as ExecaError;

    // Check for timeout
    if (execaError.timedOut) {
      return {
        success: false,
        error: `Command timed out after ${timeout}ms`,
      };
    }

    // Check for command not found
    if (execaError.code === "ENOENT") {
      return {
        success: false,
        error: `k CLI not found at ${K_PATH}. Make sure kai-launcher is installed.`,
      };
    }

    return {
      success: false,
      error: execaError.message || "Unknown error occurred",
    };
  }
}

/**
 * Check if k CLI is available
 */
export async function checkCLI(): Promise<{
  available: boolean;
  version?: string;
  error?: string;
}> {
  try {
    const { stdout, exitCode } = await execa(K_PATH, ["--version"], {
      timeout: 5000,
      reject: false,
      env: {
        ...process.env,
        PATH: `${homedir()}/bin:/usr/local/bin:/opt/homebrew/bin:${process.env.PATH || ""}`,
      },
    });
    if (exitCode === 0) {
      return {
        available: true,
        version: stdout.trim(),
      };
    }
    return {
      available: false,
      error: "k CLI returned non-zero exit code",
    };
  } catch (error) {
    return {
      available: false,
      error:
        error instanceof Error
          ? error.message
          : "k CLI not found",
    };
  }
}

/**
 * Export context to clipboard
 */
export async function exportContext(
  profile: "minimal" | "standard" | "full" = "minimal"
): Promise<CLIResponse<{ content: string; tokenCount: number }>> {
  return runCLI("context", ["export", "--profile", profile]);
}

/**
 * Path to supertag CLI binary (use direct path, not symlink)
 */
const SUPERTAG_PATH = process.env.SUPERTAG_PATH || `${homedir()}/work/supertag-cli/supertag`;

/**
 * Create Tana node directly via supertag-cli
 */
export async function captureTana(
  text: string,
  supertag: "todo" | "note" | "idea" = "todo"
): Promise<CLIResponse<{ message: string; nodeCreated: boolean }>> {
  try {
    const { stdout, exitCode } = await execa(SUPERTAG_PATH, ["create", supertag, text], {
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
  inferredDataType: "text" | "date" | "reference" | "options" | "number" | "checkbox";
}

export interface SupertagSchema {
  tagId: string;
  tagName: string;
  fields: SupertagField[];
}

/**
 * List top supertags by usage
 */
export async function listSupertags(limit = 100): Promise<CLIResponse<SupertagInfo[]>> {
  try {
    const { stdout, exitCode } = await execa(
      SUPERTAG_PATH,
      ["tags", "top", "--json", "--limit", String(limit)],
      {
        timeout: 10000,
        reject: false,
        env: {
          ...process.env,
          PATH: `${homedir()}/bin:/usr/local/bin:/opt/homebrew/bin:${process.env.PATH || ""}`,
        },
      }
    );

    if (exitCode === 0 && stdout) {
      try {
        const tags = JSON.parse(stdout) as SupertagInfo[];
        return { success: true, data: tags };
      } catch {
        return { success: false, error: "Failed to parse supertags" };
      }
    }

    return { success: false, error: `Failed to list supertags (exit ${exitCode})` };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Get fields for a supertag
 */
export async function getSupertag(tagName: string): Promise<CLIResponse<SupertagSchema>> {
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
      }
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

    return { success: false, error: stderr || `Failed to get supertag (exit ${exitCode})` };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Create Tana node with fields
 */
export async function createTanaNode(
  supertag: string,
  name: string,
  fields?: Record<string, string>
): Promise<CLIResponse<{ message: string }>> {
  try {
    let args: string[];

    if (fields && Object.keys(fields).length > 0) {
      // When using --json, name must be inside the JSON object
      const jsonPayload = { name, ...fields };
      args = ["create", supertag, "--json", JSON.stringify(jsonPayload)];
    } else {
      // Simple case: just name as argument
      args = ["create", supertag, name];
    }

    const { stdout, stderr, exitCode } = await execa(SUPERTAG_PATH, args, {
      timeout: 15000,
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

    return { success: false, error: stderr || stdout || `Failed to create node (exit ${exitCode})` };
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
export async function getFieldOptions(fieldName: string): Promise<CLIResponse<FieldOption[]>> {
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
      }
    );

    if (exitCode === 0 && stdout) {
      try {
        const values = JSON.parse(stdout) as Array<{ valueNodeId: string; valueText: string }>;
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

    return { success: false, error: `Failed to get field options (exit ${exitCode})` };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Get nodes with a specific supertag (for "options from supertag" fields)
 * Uses lowercase tag name for case-insensitive matching
 */
export async function getNodesBySupertag(tagName: string, limit = 200): Promise<CLIResponse<FieldOption[]>> {
  try {
    // Use lowercase for case-insensitive tag matching
    const normalizedTagName = tagName.toLowerCase();
    const { stdout, exitCode } = await execa(
      SUPERTAG_PATH,
      ["search", "--tag", normalizedTagName, "--json", "--limit", String(limit)],
      {
        timeout: 10000,
        reject: false,
        env: {
          ...process.env,
          PATH: `${homedir()}/bin:/usr/local/bin:/opt/homebrew/bin:${process.env.PATH || ""}`,
        },
      }
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

/**
 * Get daily briefing
 */
export async function getBriefing(): Promise<CLIResponse<unknown>> {
  return runCLI("briefing", []);
}

/**
 * List available commands
 */
export async function listCommands(): Promise<
  CLIResponse<{ commands: unknown[]; total: number }>
> {
  return runCLI("commands", ["list"]);
}

/**
 * Execute a prompt
 */
export async function executePrompt(
  query: string
): Promise<CLIResponse<{ response: string; query: string }>> {
  return runCLI("prompt", [query], { timeout: 60000 }); // 60s for prompts
}
