import { execa } from "execa";
import type { BrowserTab } from "./types";

/**
 * Supported browser names
 */
export type BrowserName = "Safari" | "Google Chrome" | "Arc" | "Firefox" | "Zen" | "Brave Browser";

/**
 * AppleScript templates for each browser
 */
const BROWSER_SCRIPTS: Record<BrowserName, { tab: string; selection: string }> = {
  Safari: {
    tab: `
      tell application "Safari"
        set theURL to URL of current tab of front window
        set theTitle to name of current tab of front window
        return theURL & "\n" & theTitle
      end tell
    `,
    selection: `
      tell application "Safari"
        try
          -- This requires "Allow JavaScript from Apple Events" in Safari's Develop menu
          set theSelection to do JavaScript "window.getSelection().toString()" in current tab of front window
          if theSelection is missing value then
            return ""
          end if
          return theSelection
        on error errMsg
          -- JavaScript might be disabled or permission not granted
          return ""
        end try
      end tell
    `,
  },
  "Google Chrome": {
    tab: `
      tell application "Google Chrome"
        set theURL to URL of active tab of front window
        set theTitle to title of active tab of front window
        return theURL & "\n" & theTitle
      end tell
    `,
    selection: `
      tell application "Google Chrome"
        set theSelection to execute active tab of front window javascript "window.getSelection().toString()"
        return theSelection
      end tell
    `,
  },
  Arc: {
    tab: `
      tell application "Arc"
        set theURL to URL of active tab of front window
        set theTitle to title of active tab of front window
        return theURL & "\n" & theTitle
      end tell
    `,
    selection: `
      tell application "Arc"
        set theSelection to execute active tab of front window javascript "window.getSelection().toString()"
        return theSelection
      end tell
    `,
  },
  Firefox: {
    // Firefox doesn't expose tab URL via AppleScript - only window title available
    // URL must be entered manually or pasted from clipboard
    tab: `
      tell application "Firefox"
        set theTitle to name of front window
        -- Remove " - Mozilla Firefox" suffix if present
        if theTitle ends with " - Mozilla Firefox" then
          set theTitle to text 1 thru -19 of theTitle
        end if
        if theTitle ends with " — Mozilla Firefox" then
          set theTitle to text 1 thru -19 of theTitle
        end if
      end tell

      -- Try to get URL from clipboard (user may have copied it)
      try
        set clipContent to the clipboard as text
        if clipContent starts with "http" then
          return clipContent & "\n" & theTitle
        end if
      end try

      -- Return placeholder URL - user must enter manually
      return "https://\n" & theTitle
    `,
    selection: `
      -- Firefox selection not available without activating the app
      -- Return empty - user can paste selection manually
      return ""
    `,
  },
  Zen: {
    // Zen is Firefox-based, same limitations apply
    tab: `
      tell application "Zen"
        set theTitle to name of front window
        -- Remove " - Zen" suffix if present
        if theTitle ends with " - Zen" then
          set theTitle to text 1 thru -7 of theTitle
        end if
        if theTitle ends with " — Zen" then
          set theTitle to text 1 thru -7 of theTitle
        end if
      end tell

      -- Try to get URL from clipboard (user may have copied it)
      try
        set clipContent to the clipboard as text
        if clipContent starts with "http" then
          return clipContent & "\n" & theTitle
        end if
      end try

      -- Return placeholder URL - user must enter manually
      return "https://\n" & theTitle
    `,
    selection: `
      -- Zen selection not available without activating the app
      -- Return empty - user can paste selection manually
      return ""
    `,
  },
  "Brave Browser": {
    // Brave is Chromium-based, works like Chrome
    tab: `
      tell application "Brave Browser"
        set theURL to URL of active tab of front window
        set theTitle to title of active tab of front window
        return theURL & "\n" & theTitle
      end tell
    `,
    selection: `
      tell application "Brave Browser"
        set theSelection to execute active tab of front window javascript "window.getSelection().toString()"
        return theSelection
      end tell
    `,
  },
};

/**
 * Get list of supported browsers
 */
export function getSupportedBrowsers(): BrowserName[] {
  return ["Safari", "Google Chrome", "Arc", "Brave Browser", "Firefox", "Zen"];
}

/**
 * Detect which supported browser was most recently active
 * Uses CGWindowListCopyWindowInfo to get actual window z-order (front to back)
 */
export async function detectFrontmostBrowser(): Promise<BrowserName | null> {
  try {
    // Use Swift to query CoreGraphics for window z-order
    // This gives us windows in front-to-back order, so the first browser we find is frontmost
    const swiftCode = `
import Cocoa
import CoreGraphics

let browsers: Set<String> = ["Safari", "Google Chrome", "Arc", "Firefox", "Zen", "Brave Browser"]
let options = CGWindowListOption(arrayLiteral: .excludeDesktopElements, .optionOnScreenOnly)
if let windowList = CGWindowListCopyWindowInfo(options, kCGNullWindowID) as? [[String: Any]] {
    for window in windowList {
        if let owner = window["kCGWindowOwnerName"] as? String,
           let layer = window["kCGWindowLayer"] as? Int,
           browsers.contains(owner) && layer == 0 {
            print(owner)
            break
        }
    }
}
`;

    const { stdout } = await execa("swift", ["-e", swiftCode], {
      timeout: 5000,
    });

    const browserName = stdout.trim();
    if (browserName && isValidBrowserName(browserName)) {
      return browserName as BrowserName;
    }

    return null;
  } catch {
    // Fallback to checking which browsers have windows open
    return detectFrontmostBrowserFallback();
  }
}

/**
 * Check if a string is a valid browser name
 */
function isValidBrowserName(name: string): name is BrowserName {
  const validNames: BrowserName[] = ["Safari", "Google Chrome", "Arc", "Firefox", "Zen", "Brave Browser"];
  return validNames.includes(name as BrowserName);
}

/**
 * Fallback detection - check which browsers have windows open
 */
async function detectFrontmostBrowserFallback(): Promise<BrowserName | null> {
  const browsersToTry: BrowserName[] = ["Arc", "Zen", "Brave Browser", "Google Chrome", "Safari", "Firefox"];

  for (const browser of browsersToTry) {
    try {
      const hasWindow = await browserHasWindow(browser);
      if (hasWindow) {
        return browser;
      }
    } catch {
      continue;
    }
  }

  return null;
}

/**
 * Check if a browser has at least one window open
 */
async function browserHasWindow(browser: BrowserName): Promise<boolean> {
  try {
    const { stdout } = await execa("osascript", [
      "-e",
      `
      tell application "System Events"
        if not (exists process "${browser}") then return false
      end tell
      tell application "${browser}"
        return (count of windows) > 0
      end tell
    `,
    ]);
    return stdout.trim() === "true";
  } catch {
    return false;
  }
}

/**
 * Get active tab information from the frontmost browser
 */
export async function getActiveTab(browser?: BrowserName): Promise<BrowserTab> {
  const targetBrowser = browser || (await detectFrontmostBrowser());

  if (!targetBrowser) {
    // Try browsers in order of likelihood
    for (const b of getSupportedBrowsers()) {
      try {
        return await getTabFromBrowser(b);
      } catch {
        continue;
      }
    }
    throw new Error("No supported browser found");
  }

  return getTabFromBrowser(targetBrowser);
}

/**
 * Get tab info from a specific browser
 */
async function getTabFromBrowser(browser: BrowserName): Promise<BrowserTab> {
  const script = BROWSER_SCRIPTS[browser].tab;

  try {
    const { stdout } = await execa("osascript", ["-e", script], {
      timeout: 5000,
    });

    const lines = stdout.trim().split("\n");
    if (lines.length < 2) {
      throw new Error(`Invalid response from ${browser}`);
    }

    let url = lines[0].trim();
    const title = lines.slice(1).join("\n").trim(); // Title might have newlines

    // Firefox returns placeholder "https://" when URL not available
    // In that case, leave empty for user to fill in
    if (url === "https://") {
      url = "";
    } else {
      // Validate URL for other browsers
      new URL(url); // Throws if invalid
    }

    return {
      url,
      title: title || "Untitled",
      browser,
    };
  } catch (error) {
    throw new Error(
      `Failed to get tab from ${browser}: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Get selected text from the frontmost browser
 */
export async function getSelection(browser?: BrowserName): Promise<string | null> {
  const targetBrowser = browser || (await detectFrontmostBrowser());

  if (!targetBrowser) {
    return null;
  }

  try {
    const script = BROWSER_SCRIPTS[targetBrowser].selection;
    const { stdout } = await execa("osascript", ["-e", script], {
      timeout: 5000,
    });

    const selection = stdout.trim();
    return selection || null;
  } catch {
    return null;
  }
}

/**
 * Check if a browser is running
 */
export async function isBrowserRunning(browser: BrowserName): Promise<boolean> {
  try {
    const { stdout } = await execa("osascript", [
      "-e",
      `
      tell application "System Events"
        return (name of processes) contains "${browser}"
      end tell
    `,
    ]);
    return stdout.trim() === "true";
  } catch {
    return false;
  }
}
