---
"@prosemark/core": patch
"@prosemark/spellcheck-frontend": patch
"vscode-prosemark": patch
---

Improve inline code rendering and theming consistency.

- add and document `--pm-code-font` so code spans and fenced code blocks can use a custom monospace stack
- keep inline code pill styling stable when spellcheck marks overlap code content
- keep inline code marks visible during editing, and include backticks inside the code pill while editing
- set spellcheck decorations to high precedence so spellcheck underlines render correctly within styled inline code
