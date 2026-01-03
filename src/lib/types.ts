import { z } from "zod";

/**
 * Standard CLI response from k CLI
 */
export const CLIResponseSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: z.string().optional(),
  metadata: z
    .object({
      tokens: z.number().optional(),
      duration: z.number().optional(),
    })
    .optional(),
});

export type CLIResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    tokens?: number;
    duration?: number;
  };
};

/**
 * Context export result
 */
export const ContextExportResultSchema = z.object({
  profile: z.enum(["minimal", "standard", "full"]),
  format: z.enum(["md", "json", "txt"]),
  content: z.string(),
  tokenCount: z.number(),
  files: z.array(z.string()),
});

export type ContextExportResult = z.infer<typeof ContextExportResultSchema>;

/**
 * Tana node creation result
 */
export const TanaCreateResultSchema = z.object({
  message: z.string(),
  supertag: z.string(),
  name: z.string(),
  paste: z.string(),
});

export type TanaCreateResult = z.infer<typeof TanaCreateResultSchema>;

/**
 * Briefing data
 */
export const BriefingDataSchema = z.object({
  date: z.string(),
  calendar: z.array(
    z.object({
      time: z.string(),
      title: z.string(),
      location: z.string().optional(),
    })
  ),
  tasks: z.array(
    z.object({
      title: z.string(),
      project: z.string().optional(),
      priority: z.string().optional(),
    })
  ),
  unreadEmails: z.number(),
  reminders: z.array(z.string()),
});

export type BriefingData = z.infer<typeof BriefingDataSchema>;

/**
 * KAI command definition
 */
export const KaiCommandSchema = z.object({
  name: z.string(),
  description: z.string(),
  usage: z.string(),
  category: z.enum(["session", "context", "mcp", "tools"]),
});

export type KaiCommand = z.infer<typeof KaiCommandSchema>;

/**
 * Commands list response
 */
export const CommandsListResponseSchema = z.object({
  commands: z.array(KaiCommandSchema),
  total: z.number(),
});

export type CommandsListResponse = z.infer<typeof CommandsListResponseSchema>;

/**
 * Profile options for context export
 */
export const PROFILES = ["minimal", "standard", "full"] as const;
export type Profile = (typeof PROFILES)[number];

/**
 * Supertag options for Tana capture
 */
export const SUPERTAGS = ["todo", "note", "idea"] as const;
export type Supertag = (typeof SUPERTAGS)[number];
