# @prosemark/core

## 0.0.5

### Patch Changes

- eb433ce: Fix soft-indent jitter described in issue #96 by rendering tab characters with a fixed-width widget (4ch), keeping indent measurements stable.
- 3c0e35c: Improve inline code rendering and theming consistency.
  - add and document `--pm-code-font` so code spans and fenced code blocks can use a custom monospace stack
  - keep inline code pill styling stable when spellcheck marks overlap code content
  - keep inline code marks visible during editing, and include backticks inside the code pill while editing
  - set spellcheck decorations to high precedence so spellcheck underlines render correctly within styled inline code

- 7e1f596: Refactor markdown-specific logic into a dedicated `lib/markdown` module with
  centralized exports for tags and markdown syntax extensions.

  Parse YAML frontmatter using a dedicated `Frontmatter` node (instead of
  reusing fenced-code metadata), and simplify detection to require a top-line
  `---` with a closing `---` later in the document.

  Include the nested-link-as-plain-text extension in the default markdown
  extension bundle so nested link syntax inside link labels is handled
  consistently.

- 8be2705: Treat nested markdown links inside link text as plain text instead of parsing
  them as inner links, while preserving other inline formatting like bold text.
- b732e28: Improve editor state stability across ProseMark core and VS Code extensions.

  Key fixes include:
  - serialized webview-to-document updates to avoid race conditions during rapid edits
  - safer mismatch recovery and improved frontend error reporting in the VS Code extension
  - spellcheck decoration/state synchronization hardening to prevent stale out-of-range ranges
  - fenced-code selection stability improvements while preserving expected marker edit UX

## 0.0.4

### Patch Changes

- 07b95ec: Set up soft indentation for paragraphs, lists, tasks, and blockquotes
- 07b95ec: Support em- and en-dashes
- 07b95ec: Fix horizontal rule styling
- 07b95ec: Make it possible to arrow down/up into hidden content
- 07b95ec: Make it possible to view images while editing the image link (and support block-layout images)
- 07b95ec: Improved the formatting of and the syntax hiding for blockquotes

## 0.0.3

### Patch Changes

- b99496e: Change CI process so that workspace dependencies are correcly resolved during publishing

## 0.0.2

### Patch Changes

- b3a35fb: Use latest version of @lezer/common
- b3a35fb: - Add a VS Code Extension using ProseMark to edit markdown files
  - Make the link click handler in @prosemark/core configurable
