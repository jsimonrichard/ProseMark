---
"@prosemark/core": patch
---

Refactor markdown-specific logic into a dedicated `lib/markdown` module with
centralized exports for tags and markdown syntax extensions.

Parse YAML frontmatter using a dedicated `Frontmatter` node (instead of
reusing fenced-code metadata), and simplify detection to require a top-line
`---` with a closing `---` later in the document.

Include the nested-link-as-plain-text extension in the default markdown
extension bundle so nested link syntax inside link labels is handled
consistently.
