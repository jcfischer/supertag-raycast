import { open } from "@raycast/api";

/**
 * Open Terminal.app with a command
 */
export async function openInTerminal(command: string): Promise<void> {
  // Use AppleScript to open Terminal and run command
  const script = `
    tell application "Terminal"
      activate
      do script "${command.replace(/"/g, '\\"')}"
    end tell
  `;

  // Execute via osascript
  const { execa } = await import("execa");
  await execa("osascript", ["-e", script]);
}

/**
 * Open Terminal.app and run k with arguments
 */
export async function openKInTerminal(args: string[] = []): Promise<void> {
  const kPath = process.env.K_PATH || `${process.env.HOME}/bin/k`;
  const command = [kPath, ...args].join(" ");
  await openInTerminal(command);
}

/**
 * Resume last Claude session in Terminal
 */
export async function resumeSession(): Promise<void> {
  await openKInTerminal(["--resume"]);
}

/**
 * Open Claude with specific prompt in Terminal
 */
export async function openPromptInTerminal(prompt: string): Promise<void> {
  await openKInTerminal(["prompt", `"${prompt.replace(/"/g, '\\"')}"`]);
}
