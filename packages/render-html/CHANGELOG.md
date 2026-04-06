# @prosemark/render-html

## 0.0.7

### Patch Changes

- 14c9eff: Move HTML-specific markdown parsing for multi-line-break HTML blocks from `@prosemark/core` into `@prosemark/render-html`.

  `@prosemark/render-html` now exports `renderHtmlMarkdownSyntaxExtensions` for use alongside core markdown extensions, and integrations were updated to include both extension arrays.

- 0208c90: Add `eq()` methods to widget classes so unchanged widgets can reuse existing DOM nodes instead of re-rendering on unrelated editor updates. This reduces unnecessary widget churn and avoids repeated failed-image reload attempts when cursor movement does not change widget content.
- Updated dependencies [14c9eff]
- Updated dependencies [0208c90]
  - @prosemark/core@0.0.6

## 0.0.6

### Patch Changes

- Updated dependencies [eb433ce]
- Updated dependencies [3c0e35c]
- Updated dependencies [7e1f596]
- Updated dependencies [8be2705]
- Updated dependencies [b732e28]
  - @prosemark/core@0.0.5

## 0.0.5

### Patch Changes

- 07b95ec: Make it possible to arrow down/up into hidden content
- 07b95ec: Make it possible to view images while editing the image link (and support block-layout images)
- Updated dependencies [07b95ec]
- Updated dependencies [07b95ec]
- Updated dependencies [07b95ec]
- Updated dependencies [07b95ec]
- Updated dependencies [07b95ec]
- Updated dependencies [07b95ec]
  - @prosemark/core@0.0.4

# 0.0.4

Skipped (publishing error)

## 0.0.3

### Patch Changes

- b99496e: Change CI process so that workspace dependencies are correcly resolved during publishing
- Updated dependencies [b99496e]
  - @prosemark/core@0.0.3

## 0.0.2

### Patch Changes

- Updated dependencies [b3a35fb]
- Updated dependencies [b3a35fb]
  - @prosemark/core@0.0.2
