---
title: Getting Started
description: A guide for getting started with the ProseMark libraries.
---

This guide describes how to get a basic instance of ProseMark running on a web app. It's equivalent to our [Demo](/demo).

:::note
ProseMark is a set of extensions for, not a replacement of, [CodeMirror](https://codemirror.net/). This guide won't require a deep knowledge of CodeMirror, but we strongly recommend getting familiar with its system and terminology. A comprehensive overview of its functionality can be found in CodeMirror's [System Guide](https://codemirror.net/docs/guide/).
:::

## Installing ProseMark

The main npm package for ProseMark is `@prosemark/core`; install that using your package manager of choice. You may also be interested in installing these ProseMark packages:

- `@prosemark/render-html`: renders HTML tags within the markdown content. Supports most standard attributes; sanitized using [DOMPurify](https://github.com/cure53/DOMPurify).
- `@prosemark/paste-rich-text`: allows pasting rich text as markdown.
- `@prosemark/spellcheck-frontend`: underlines and suggestion tooltips for misspellings you compute yourself (no bundled dictionary). See [Features](/reference/features/#prosemarkspellcheck-frontend) and [Styling](/reference/styling/) (spellcheck variables).

You will also need to install some standard CodeMirror packages:

```bash
npm install @codemirror/view @codemirror/lang-markdown @lezer/markdown @codemirror/language-data
```

## Setting Up the Editor

We'll start by creating the DOM element to which we can mount the CodeMirror editor. In vanilla HTML/CSS/JavaScript, this would look something like this:

```html
...
<div id="codemirror-container"></div>
...
```

Then, in our JavaScript file, we'll set up the CodeMirror editor object. Here, we're assuming that you have a bundler set up that supports ESM imports.

```javascript
import { EditorView } from '@codemirror/view';
import { markdown } from '@codemirror/lang-markdown';
import { GFM } from '@lezer/markdown';

import {
  prosemarkBasicSetup,
  prosemarkBaseThemeSetup,
  prosemarkMarkdownSyntaxExtensions,
} from '@prosemark/core';
import { htmlBlockExtension } from '@prosemark/render-html';

const editor = new EditorView({
  doc: "# Hello World",
  parent: document.getElementById('codemirror-container')!,
  extensions: [
    // Adds support for the Markdown language
    markdown({
      // adds support for standard syntax highlighting inside code fences
      codeLanguages: languages,
      extensions: [
        // GitHub Flavored Markdown (support for autolinks, strikethroughs)
        GFM,
        // additional parsing tags for existing markdown features, backslash escapes, emojis
        prosemarkMarkdownSyntaxExtensions,
      ]
    }),
    // Basic prosemark extensions
    prosemarkBasicSetup(),
    // Theme extensions
    prosemarkBaseThemeSetup(),
    // Render HTML blocks
    htmlBlockExtension
  ]
})
```

ProseMark can be styled with **`--pm-*` CSS variables**. Variable names, roles, and a full light/dark example are on the [Styling](/reference/styling/) reference page.
