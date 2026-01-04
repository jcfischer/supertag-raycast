# Changelog

All notable changes to KAI Raycast integration are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **TDD Test Suite** - Comprehensive test coverage with 41 passing tests
  - CLI function tests (20 tests) - all wrapper functions with error handling
  - Nested nodes tests (10 tests) - multi-level nesting up to 4+ levels deep
  - Schema cache tests (11 tests) - cache loading, invalidation, error handling
  - Test scripts added: `npm test` and `npm run test:watch`
  - Uses Bun's built-in test runner for fast execution

- **Name Field in Capture** - Clearer parent/child structure
  - New Name field (required) for parent node
  - Children field (optional) for nested content
  - Separates parent name from child structure
  - Supports creating simple nodes (name only) or complex hierarchies

- **Schema Cache (Spec 081)** - Fast file-based schema loading for 20-50x performance improvement
  - New `SchemaCache` class reads schema-registry.json directly from filesystem
  - Form rendering now <10ms vs 200-500ms with CLI spawning
  - mtime-based cache invalidation automatically refreshes after sync
  - Graceful fallback to CLI if cache unavailable or corrupted
  - Development logging for cache hit/miss tracking
  - 11 tests passing for cache loading, invalidation, and error handling
  - Requires supertag-cli 1.5.0+ for enhanced schema-registry.json with target supertags

- **Create New Entries for Reference Fields** - Inline node creation from form fields
  - Reference fields now show both dropdown (select existing) and text field (create new)
  - Type a name in "Or create new" field to automatically create node with correct supertag
  - Example: In Resource form, typing "John Doe" in Author field creates new person node
  - New nodes created asynchronously before main form submission
  - Provides seamless workflow without leaving the form

### Changed

- **Reference Field Target Supertags** - Use stored target supertag from CLI instead of field name heuristics
  - Updated `SupertagField` interface to include `targetSupertagId` and `targetSupertagName`
  - Form now uses `field.targetSupertagName` to load dropdown options for reference fields
  - Removes dependency on `extractSupertagFromFieldName()` heuristic function
  - Fixes "Options from Supertag" fields where field name doesn't match target supertag
  - Requires supertag-cli 1.5.0+ for target supertag metadata
  - Example: "Company" field now correctly loads options from "company" supertag

### Fixed

- **Name Field Text Selection Bug** - Implemented two-screen flow to prevent dynamic field insertion issues
  - Screen 1: Simple name input with background schema/options loading
  - Screen 2: Full form with all fields pre-rendered (no dynamic insertion)
  - Fixes critical UX issue where fast typers would accidentally clear the name field
  - Workaround for known Raycast bug with dynamic form field insertion
  - Schema and options now preload during name entry for instant Screen 2 rendering

- **Multi-Level Nested Nodes** - Fixed recursive children conversion for unlimited depth
  - Nested children now work correctly at all levels (tested to 4+ levels)
  - Fixed `tanaNodeToApiNode` in supertag-cli to recursively convert children
  - Previously only converted 1 level deep, grandchildren were lost
  - Children array property now properly recognized by JSON parser
  - Added comprehensive tests verifying multi-level nesting

- **Better Error Handling** - Improved error messages in CLI functions
  - `listSupertags` now captures and reports stderr output
  - More descriptive error messages with context
  - Parse errors include details for debugging
  - Exit codes reported with helpful context

- **Company Field Dropdown** - Company field dropdown now populates correctly
  - Previously empty due to field name mismatch (Company vs company)
  - Now reads actual target supertag from Tana field definition
