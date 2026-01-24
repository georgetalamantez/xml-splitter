# XML Splitting Utility: Technical Requirements Summary

This document summarizes the technical requirements and design decisions for the XML splitting utility as discussed in the Gemini thread "Splitting XML files".

## 1. Runtime and Environment
- **Platform**: Node.js
- **Module System**: ES Modules (`.mjs` format)
- **Key Libraries**:
    - `@xmldom/xmldom`: For `DOMParser` and `XMLSerializer`.
    - `xpath`: For precise, namespace-agnostic node selection.
    - `fs` & `path`: Standard Node.js modules for file and path management.

## 2. Core Splitting Logic
- **Heading-Based Splitting**: The utility splits large XML files based on a specified "heading level" tag.
- **Namespace Agnostic**: Uses XPath `//*[local-name()='${headingLevel}']` to handle XML with or without namespaces (e.g., XHTML).
- **Structural Preservation**:
    - Identifies heading nodes and collects all subsequent sibling nodes until the next heading of the same level or the end of the parent.
    - Ensures each chunk remains a valid XML fragment.

## 3. Output Configuration
- **Root Wrapping**: Each split chunk is wrapped in a `<section>` tag to maintain well-formedness.
- **Filename Generation**:
    - Prefix: 3-digit zero-padded sequence (e.g., `001_`).
    - Content: Sanitized text from the heading tag (non-alphanumeric removed, spaces to underscores).
    - Example: `001_Introduction_to_XML.xml`.
- **Directory**: Configurable output folder (defaults to `sections`).

## 4. Configuration (Environment Variables)
- `INPUT_FILE`: (Required) Path to the source XML.
- `HEADING_LEVEL`: (Optional) Tag name to split by (default: `h2`).
- `OUTPUT_DIR`: (Optional) Target directory (default: `sections`).

## 5. Design Rationale
Using a DOM-based approach with XPath is preferred over Regex or text-splitting to correctly handle the hierarchical nature of XML and remain robust against namespace variations.
