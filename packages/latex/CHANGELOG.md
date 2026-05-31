# @prosemark/latex

## 0.0.2

### Patch Changes

- 24ca7ca: Update `@codemirror/view` to `^6.42.1`.
- 24ca7ca: Show LaTeX render errors inline in the editor with configurable `--pm-latex-math-error-color` and `--pm-latex-math-error-background-color` CSS variables. Defaults use red text on a semi-transparent gray pill styled like inline code. TeX parse errors from MathJax are detected and routed through the same UI instead of MathJax's built-in yellow error styling.
- 24ca7ca: Document that math widgets require `mathMarkdownSyntaxExtension` / `latexMathMarkdownSyntaxExtension` or `prosemarkMarkdownSyntaxExtensions` in the Markdown parser; expand README Usage and `latexMarkdownEditorExtensions` API notes.
- 24ca7ca: Improve MathJax integration for bundled apps and pre-built `@prosemark/latex`:
  - **Default (`url-import`)**: load the startup component via an absolute URL from `mathJaxPackageUrl` (default jsDelivr) instead of a bare `import('mathjax/...')`, so Vite and browsers work with the published package; remove the direct `mathjax` dependency and add an optional peer.
  - **`static-import`**: add `mathJaxLoadMode` so apps bundle MathJax with their own bundler; export `preconfigureMathJaxLoader`; `mathJaxPackageUrl` applies only to `url-import`.
  - Document load modes; add a Bun test for `preconfigureMathJaxLoader`.

- 24ca7ca: Fix soft-indent layout when inline `$...$` math appears on list, blockquote, task, or indented lines.

  `@prosemark/latex` renders inline math as `display: inline` on `cm-soft-indent-line` so hanging indent does not misplace MathJax widgets.

- 4c06b33: Published packages no longer include `devDependencies` in their npm registry manifest; CI strips `devDependencies` before `bun pm pack` so workspace-only dev tooling is not resolved at publish time.
- Updated dependencies [24ca7ca]
- Updated dependencies [24ca7ca]
- Updated dependencies [24ca7ca]
- Updated dependencies [4c06b33]
  - @prosemark/core@0.0.8

## 0.0.1

### Patch Changes

- 182818f: Add **`mathMarkdownSyntaxExtension`** to `@prosemark/core`: Lezer nodes **`Math`**, **`MathMark`**, **`MathFormula`** for `$...$` / `$$...$$`, exported tags **`mathDelimiterTag`** / **`mathFormulaTag`**, included in **`prosemarkMarkdownSyntaxExtensions`**. Add **`@lezer/highlight`** as a core dependency.

  Add **`@prosemark/latex`**: MathJax widgets for those **`Math`** nodes, delimiter/formula highlighting theme, optional LRU render cache, **`requestMeasure`** / **`ResizeObserver`** for block math. Re-export the syntax as **`latexMath*`** for consumers who only install latex. Hybrid display rules: `$$...$$` always block; padded single-dollar block; tight single-dollar inline.

  Skip adjacent-line arrow jumps for math replace widgets (`proseMarkSkipAdjacentArrowReveal`) so moving up through blank lines after math behaves normally.

  Rebuild the fold gutter when geometry changes (`foldGutter({ foldingChanged: (u) => u.geometryChanged })`) so async block-widget height updates do not leave fold markers misaligned with lines.

- Updated dependencies [182818f]
- Updated dependencies [40ad801]
  - @prosemark/core@0.0.7
