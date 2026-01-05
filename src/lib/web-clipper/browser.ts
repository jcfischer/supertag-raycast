import { execa } from "execa";
import type { BrowserTab } from "./types";

/**
 * Supported browser names
 */
export type BrowserName =
  | "Safari"
  | "Google Chrome"
  | "Arc"
  | "Firefox"
  | "Zen"
  | "Brave Browser";

/**
 * AppleScript templates for each browser
 */
const BROWSER_SCRIPTS: Record<BrowserName, { tab: string; selection: string }> =
  {
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
  const validNames: BrowserName[] = [
    "Safari",
    "Google Chrome",
    "Arc",
    "Firefox",
    "Zen",
    "Brave Browser",
  ];
  return validNames.includes(name as BrowserName);
}

/**
 * Fallback detection - check which browsers have windows open
 */
async function detectFrontmostBrowserFallback(): Promise<BrowserName | null> {
  const browsersToTry: BrowserName[] = [
    "Arc",
    "Zen",
    "Brave Browser",
    "Google Chrome",
    "Safari",
    "Firefox",
  ];

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
  // Special handling for Arc - check for Little Arc windows
  if (browser === "Arc") {
    try {
      return await getArcTabWithLittleArcSupport();
    } catch {
      // Fall through to standard method if Little Arc detection fails
    }
  }

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
      `Failed to get tab from ${browser}: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Get tab info from Arc with support for Little Arc pop-up windows.
 * Little Arc windows are not exposed via Arc's AppleScript, but can be detected
 * via System Events. Uses "Copy URL" menu command as fallback.
 */
async function getArcTabWithLittleArcSupport(): Promise<BrowserTab> {
  // Get the System Events "main" window (which could be a Little Arc window)
  const { stdout: sysEventsMainWindow } = await execa(
    "osascript",
    [
      "-e",
      `
      tell application "System Events"
        tell process "Arc"
          set mainWindow to (first window whose value of attribute "AXMain" is true)
          return name of mainWindow
        end tell
      end tell
    `,
    ],
    { timeout: 5000 },
  );
  const mainWindowTitle = sysEventsMainWindow.trim();

  // Try Arc's native AppleScript to get the front window title
  let arcFrontWindowTitle = "";
  try {
    const { stdout: arcTitle } = await execa(
      "osascript",
      [
        "-e",
        `
        tell application "Arc"
          return title of active tab of front window
        end tell
      `,
      ],
      { timeout: 5000 },
    );
    arcFrontWindowTitle = arcTitle.trim();
  } catch {
    // Arc's native AppleScript failed - likely a Little Arc window
  }

  // Check if the titles match - if not, we're in a Little Arc window
  const isLittleArc =
    !arcFrontWindowTitle || mainWindowTitle !== arcFrontWindowTitle;

  if (isLittleArc) {
    // Use "Copy URL" menu item via System Events for Little Arc
    const { stdout: url } = await execa(
      "osascript",
      [
        "-e",
        `
        tell application "System Events"
          tell process "Arc"
            click menu item "Copy URL" of menu "Edit" of menu bar 1
            delay 0.2
            return the clipboard
          end tell
        end tell
      `,
      ],
      { timeout: 5000 },
    );

    const cleanUrl = url.trim();
    new URL(cleanUrl); // Validate URL

    // Extract page title from window title (remove " — " prefix if present for downloads pages, etc.)
    let pageTitle = mainWindowTitle;
    if (pageTitle.includes(" — ")) {
      // Window title format is often "Page Title — Site Name" or "Download — Page Title"
      const parts = pageTitle.split(" — ");
      pageTitle = parts.length > 1 ? parts.slice(1).join(" — ") : parts[0];
    }

    return {
      url: cleanUrl,
      title: pageTitle || "Untitled",
      browser: "Arc",
    };
  }

  // Not a Little Arc window - use standard Arc AppleScript
  const { stdout } = await execa("osascript", ["-e", BROWSER_SCRIPTS.Arc.tab], {
    timeout: 5000,
  });

  const lines = stdout.trim().split("\n");
  if (lines.length < 2) {
    throw new Error("Invalid response from Arc");
  }

  const urlStr = lines[0].trim();
  const title = lines.slice(1).join("\n").trim();
  new URL(urlStr); // Validate URL

  return {
    url: urlStr,
    title: title || "Untitled",
    browser: "Arc",
  };
}

/**
 * Get selected text from the frontmost browser
 */
export async function getSelection(
  browser?: BrowserName,
): Promise<string | null> {
  const targetBrowser = browser || (await detectFrontmostBrowser());

  if (!targetBrowser) {
    return null;
  }

  try {
    const script = BROWSER_SCRIPTS[targetBrowser].selection;
    const { stdout } = await execa("osascript", ["-e", script], {
      timeout: 5000,
    });

    let selection = stdout.trim();

    // Strip surrounding quotes that AppleScript may add
    if (
      (selection.startsWith('"') && selection.endsWith('"')) ||
      (selection.startsWith("'") && selection.endsWith("'"))
    ) {
      selection = selection.slice(1, -1);
    }

    // Also handle the literal empty string '""'
    if (selection === '""' || selection === "''") {
      return null;
    }

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
