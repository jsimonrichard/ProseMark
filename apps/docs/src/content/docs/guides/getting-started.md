---
title: Getting Started
description: A guide for getting started with the ProseMark libraries.
---

This guide describes how to get a basic instance of ProseMark running on a web app. It's equivalent to our [Demo](/demo).

:::note
ProseMark is a set of extensions for, not a replacement of, [CodeMirror](https://codemirror.net/). This guide won't require a deep knowledge of CodeMirror, but we strongly recommend getting familiar with its system and terminology. A comprehensive overview of its functionality can be found in CodeMirror's [System Guide](https://codemirror.net/docs/guide/).
:::

## Installing ProseMark

The main npm package for ProseMark is `@prosemark/core`; install that using your package manager of choice. You may also be interested in installing these optional ProseMark packages:

- `@prosemark/render-html`: renders HTML tags within the markdown content. Supports most standard attributes; sanitized using [DOMPurify](https://github.com/cure53/DOMPurify).
- `@prosemark/paste-rich-text`: allows pasting rich text as markdown.
- `@prosemark/spellcheck-fronted`: adds UI for spellchecking.

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
    // Render HTML blocks (optional)
    htmlBlockExtension
  ]
})
```

ProseMark can be styled using CSS variables. The following CSS is used in our demo:

```css
:root {
  font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
  line-height: 1.5;
  font-weight: 400;

  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;

  --pm-header-mark-color: oklch(82.8% 0.111 230.318);
  --pm-link-color: oklch(58.8% 0.158 241.966);
  --pm-muted-color: oklch(37.2% 0.044 257.287);
  --pm-code-background-color: oklch(92.9% 0.013 255.508);
  --pm-code-btn-background-color: oklch(86.9% 0.022 252.894);
  --pm-code-btn-hover-background-color: oklch(70.4% 0.04 256.788);
  --pm-blockquote-vertical-line-background-color: oklch(70.4% 0.04 256.788);

  --pm-syntax-link: oklch(62.75% 0.188 259.38);
  --pm-syntax-keyword: oklch(58.13% 0.248 297.57);
  --pm-syntax-atom: oklch(51.29% 0.219 260.63);
  --pm-syntax-literal: oklch(57.38% 0.111 170.31);
  --pm-syntax-string: oklch(54.86% 0.184 25.53);
  --pm-syntax-regexp: oklch(65.88% 0.184 43.8);
  --pm-syntax-definition-variable: oklch(45.32% 0.171 260.3);
  --pm-syntax-local-variable: oklch(64.13% 0.09 184.42);
  --pm-syntax-type-namespace: oklch(49.1% 0.091 165.52);
  --pm-syntax-class-name: oklch(64.42% 0.11 168.83);
  --pm-syntax-special-variable-macro: oklch(52.58% 0.212 282.71);
  --pm-syntax-definition-property: oklch(42.1% 0.142 260.08);
  --pm-syntax-comment: oklch(62.79% 0.022 252.89);
  --pm-syntax-invalid: oklch(64.62% 0.203 29.2);
  --pm-cursor-color: black;

  --pm-spellcheck-tooltip-background: oklch(100% 0 0);
  --pm-spellcheck-tooltip-border: oklch(82% 0.005 264);
  --pm-spellcheck-tooltip-text: oklch(30% 0.02 264);
  --pm-spellcheck-tooltip-error: oklch(55% 0.22 29);
  --pm-spellcheck-tooltip-hover: oklch(96% 0.005 264);
  --pm-spellcheck-tooltip-actions-border: oklch(82% 0.005 264);
  --pm-spellcheck-tooltip-font-size: 0.9rem;
}

:root[data-theme='dark'] {
  --pm-header-mark-color: oklch(44.3% 0.11 240.79);
  --pm-link-color: oklch(58.8% 0.158 241.966);
  --pm-muted-color: oklch(55.4% 0.046 257.417);
  --pm-code-background-color: oklch(27.9% 0.041 260.031);
  --pm-code-btn-background-color: oklch(37.2% 0.044 257.287);
  --pm-code-btn-hover-background-color: oklch(44.6% 0.043 257.281);
  --pm-blockquote-vertical-line-background-color: oklch(44.6% 0.043 257.281);

  --pm-syntax-link: oklch(73.24% 0.17 258.63);
  --pm-syntax-keyword: oklch(70.05% 0.217 296.83);
  --pm-syntax-atom: oklch(65.69% 0.2 259.93);
  --pm-syntax-literal: oklch(71.27% 0.101 169.93);
  --pm-syntax-string: oklch(68.53% 0.164 25.1);
  --pm-syntax-regexp: oklch(76.88% 0.16 43.42);
  --pm-syntax-definition-variable: oklch(61.42% 0.158 259.6);
  --pm-syntax-local-variable: oklch(75.88% 0.082 184.11);
  --pm-syntax-type-namespace: oklch(64.51% 0.083 165.19);
  --pm-syntax-class-name: oklch(76.14% 0.1 168.52);
  --pm-syntax-special-variable-macro: oklch(66.67% 0.193 282.06);
  --pm-syntax-definition-property: oklch(58.92% 0.132 259.4);
  --pm-syntax-comment: oklch(74.9% 0.02 252.89);
  --pm-syntax-invalid: oklch(75.93% 0.182 28.91);
  --pm-cursor-color: white;

  --pm-spellcheck-tooltip-background: oklch(25% 0.02 264);
  --pm-spellcheck-tooltip-border: oklch(40% 0.02 264);
  --pm-spellcheck-tooltip-text: oklch(75% 0.02 264);
  --pm-spellcheck-tooltip-error: oklch(65% 0.22 29);
  --pm-spellcheck-tooltip-hover: oklch(35% 0.02 264);
  --pm-spellcheck-tooltip-actions-border: oklch(40% 0.02 264);
}

#codemirror-container {
  min-height: 100px;
  width: 100%;
  --font: Inter;
  * {
    margin-top: 0px;
  }
}
```
