/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `capture-tana` command */
  export type CaptureTana = ExtensionPreferences & {}
  /** Preferences accessible in the `create-tana-node` command */
  export type CreateTanaNode = ExtensionPreferences & {}
  /** Preferences accessible in the `clip-web` command */
  export type ClipWeb = ExtensionPreferences & {
  /** AI Provider - AI provider for summarization and key point extraction */
  "aiProvider": "disabled" | "claude" | "ollama" | "raycast",
  /** Claude API Key - Anthropic API key (starts with sk-ant-) */
  "claudeApiKey"?: string,
  /** Ollama Endpoint - Ollama API endpoint */
  "ollamaEndpoint": string,
  /** Ollama Model - Model to use for AI features (must be installed locally) */
  "ollamaModel": "llama3.2" | "llama3.2:1b" | "llama3.2:3b" | "llama3.1:8b" | "llama3.1:70b" | "mistral" | "mixtral" | "gemma2:9b" | "gemma2:27b" | "qwen2.5:7b" | "phi3" | "codellama:7b",
  /** Auto Features - Automatically generate summary when extracting article */
  "autoSummarize": boolean,
  /** undefined - Automatically extract key points when extracting article */
  "autoExtractKeypoints": boolean,
  /** undefined - Save full article text to Tana (otherwise only AI summary/keypoints are saved) */
  "autoSaveFullText": boolean
}
}

declare namespace Arguments {
  /** Arguments passed to the `capture-tana` command */
  export type CaptureTana = {}
  /** Arguments passed to the `create-tana-node` command */
  export type CreateTanaNode = {}
  /** Arguments passed to the `clip-web` command */
  export type ClipWeb = {}
}

