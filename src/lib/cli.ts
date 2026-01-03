import { execa } from "execa";
import { CLIResponseSchema, type CLIResponse } from "./types";

/**
 * Path to k CLI binary
 */
const K_PATH = process.env.K_PATH || `${process.env.HOME}/bin/k`;

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
    const { stdout } = await execa(K_PATH, [command, ...args, "--json"], {
      timeout,
      reject: true,
    });

    const parsed = JSON.parse(stdout);
    const validated = CLIResponseSchema.parse(parsed);

    return validated as CLIResponse<T>;
  } catch (error) {
    if (error instanceof Error) {
      // Check for timeout
      if (error.message.includes("timed out")) {
        return {
          success: false,
          error: `Command timed out after ${timeout}ms`,
        };
      }

      // Check for command not found
      if (error.message.includes("ENOENT")) {
        return {
          success: false,
          error: `k CLI not found at ${K_PATH}. Make sure kai-launcher is installed.`,
        };
      }

      // Parse error from stderr if available
      if ("stderr" in error && typeof error.stderr === "string") {
        try {
          const errJson = JSON.parse(error.stderr);
          return {
            success: false,
            error: errJson.error || error.message,
          };
        } catch {
          return {
            success: false,
            error: error.stderr || error.message,
          };
        }
      }

      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: "Unknown error occurred",
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
    const { stdout } = await execa(K_PATH, ["--version"], { timeout: 5000 });
    return {
      available: true,
      version: stdout.trim(),
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
 * Create Tana node
 */
export async function captureTana(
  text: string,
  supertag: "todo" | "note" | "idea" = "todo"
): Promise<CLIResponse<{ message: string; paste: string }>> {
  return runCLI("tana", ["create", text, "--supertag", supertag]);
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
