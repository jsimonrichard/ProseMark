---
title: Fold, Hide, & Theming Extensions
description: A reference for the types of ProseMark extensions.
---

Most of ProseMark's CodeMirror extensions fall into one of three categories:

- Fold Extensions
- Hide Extensions
- Theme & Syntax Highlighting Extensions

## Fold Extensions

These extensions replace part of the markdown text with a [CodeMirror widget](https://codemirror.net/docs/ref/#view.Decoration%5Ereplace). This includes the bullets in unordered lists, emojis, horizontal rules, images, and the checkboxes in task lists.

To create your own, you can extend `foldableSyntaxFacet` like so:

```javascript
import { Decoration, WidgetType } from '@codemirror/view';
import { foldableSyntaxFacet } from '@prosemark/core';

class BulletPoint extends WidgetType {
  toDOM() {
    const span = document.createElement('span');
    span.className = 'cm-rendered-list-mark';
    span.innerHTML = '•';
    return span;
  }

  ignoreEvent(_event: Event) {
    return false;
  }
}

export const myCustomFoldExtension = foldableSyntaxFacet.of({
  nodePath: 'BulletList/ListItem/ListMark', // the path selecting the appropriate syntax nodes
  // Add the decoration
  onFold: (_state, node) => {
    // Skip task nodes
    const cursor = node.node.cursor();
    if (cursor.nextSibling() && cursor.name === 'Task') return;

    // Create the widget decoration
    return Decoration.replace({ widget: new BulletPoint() }).range(
      node.from,
      node.to,
    );
  },
});
```

This will replace all list marks which are inside list items which are inside bullet lists with a widget containing `•`.

## Hide Extensions

These extensions simply hide syntax elements that shouldn't be displayed _unless_ the cursor selection includes that syntax. This allows syntax to be accessible, but hidden when not being edited.

To create your own, extend `hidableNodeFacet`:

```javascript
import { Decoration } from '@codemirror/view';
import { hidableNodeFacet } from '@prosemark/core';

export const myHideExtension = hidableNodeFacet.of({
  nodeName: ['StrongEmphasis', 'Emphasis'],
  subNodeNameToHide: 'EmphasisMark',
});
```

This extension hides all `EmphasisMark` nodes that are inside `StrongEmphasis` or `Emphasis` (italics) nodes.

### Pointer coordinates (`visiblePosAtCoords`)

Hide marks use CSS `font-size: 0`, so the characters stay in the document and in CodeMirror’s tile tree, but they collapse to zero width. CodeMirror’s [`posAtCoords`](https://codemirror.net/docs/ref/#view.EditorView.posAtCoords) still treats those zero-width boxes as hit targets, which makes caret placement on busy lines (links, nested emphasis) unstable.

There is **no** CodeMirror facet to replace `posAtCoords` itself. ProseMark therefore:

1. Ships [`visiblePosAtCoords`](/api/prosemark/core/functions/visibleposatcoords/) — the same closest-horizontally / midpoint rule as CodeMirror, but only over clusters with a positive client box. Use this anywhere a host would call `view.posAtCoords` (custom handlers, tooltips, etc.).
2. Installs an internal [`mouseSelectionStyle`](https://codemirror.net/docs/ref/#view.EditorView%5EmouseSelectionStyle) on `hideExtension` so normal clicks and drag-selections use that mapper. That is the supported extension point for pointer → selection; it is not a second “guess” pass over a failed `posAtCoords`.

When a line has no collapsed clusters, `visiblePosAtCoords` delegates to CodeMirror unchanged. The pure hit-test helper [`posFromVisibleCharRects`](/api/prosemark/core/functions/posfromvisiblecharrects/) is also exported for tests and advanced hosts.

## Theme Extensions

Hiding syntax isn't enough to make markdown text look "rendered." We also need to give it some style. This can be done using theme extensions and syntax highlighting extensions.

### Syntax Highlighting

Syntax highlighting extensions apply styles or classes to the text corresponding with various syntax tags. They can be made using `@codemirror/language`:

```javascript
import {
  HighlightStyle,
  syntaxHighlighting,
} from '@codemirror/language';
import { markdownTags } from '@prosemark/core';

export syntaxHighlighting(
  HighlightStyle.define([
    {
      tag: tags.strong,
      fontWeight: 'bold',
    },
    {
      tag: markdownTags.headerMark,
      color: 'var(--pm-header-mark-color)',
    },
    ...
  ])
)
```

The `@prosemark/core` library provides `markdownTags`, which has some tags corresponding to markdown-specific syntax nodes like `HeaderMark` (represented by `markdownTags.headerMark`). For this to work, [`additionalMarkdownSyntaxTags`](/api/prosemark/core/variables/additionalmarkdownsyntaxtags/) from `@prosemark/core` must be provided as a _markdown_ extension (it's included in [`prosemarkMarkdownSyntaxExtensions`](/api/prosemark/core/variables/prosemarkmarkdownsyntaxextensions/), as shown on our [Getting Started](/guides/getting-started) page). If you also render HTML blocks, include [`renderHtmlMarkdownSyntaxExtensions`](/api/prosemark/render-html/variables/renderhtmlmarkdownsyntaxextensions/) from `@prosemark/render-html` so that HTML blocks with multi-line breaks are parsed as single blocks. Dollar-delimited math (`$...$` / `$$...$$`) is parsed by [`mathMarkdownSyntaxExtension`](/api/prosemark/core/variables/mathmarkdownsyntaxextension/), which is included in [`prosemarkMarkdownSyntaxExtensions`](/api/prosemark/core/variables/prosemarkmarkdownsyntaxextensions/); add [`latexMarkdownEditorExtensions`](/api/prosemark/latex/functions/latexmarkdowneditorextensions/) from `@prosemark/latex` when you want MathJax rendering for those `Math` nodes (see the [LaTeX math guide](/guides/latex-math/)).

### Theme Extensions

To manage CSS classes using CodeMirror (especially classes used in various Widgets), use a theme extension:

```javascript
import { EditorView } from '@codemirror/view';

export const myThemeExtension = EditorView.theme({
  '.cm-rendered-link': {
    textDecoration: 'underline',
    cursor: 'pointer',
    color: 'var(--pm-link-color)',
  },
  ...
})
```
