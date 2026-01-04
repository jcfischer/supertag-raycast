# Changelog

All notable changes to KAI Raycast integration are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- **Reference Field Target Supertags** - Use stored target supertag from CLI instead of field name heuristics
  - Updated `SupertagField` interface to include `targetSupertagId` and `targetSupertagName`
  - Form now uses `field.targetSupertagName` to load dropdown options for reference fields
  - Removes dependency on `extractSupertagFromFieldName()` heuristic function
  - Fixes "Options from Supertag" fields where field name doesn't match target supertag
  - Requires supertag-cli 1.5.0+ for target supertag metadata
  - Example: "Company" field now correctly loads options from "company" supertag

### Fixed

- **Company Field Dropdown** - Company field dropdown now populates correctly
  - Previously empty due to field name mismatch (Company vs company)
  - Now reads actual target supertag from Tana field definition
