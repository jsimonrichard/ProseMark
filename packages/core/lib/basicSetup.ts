import { keymap, dropCursor, EditorView, type ViewUpdate } from '@codemirror/view';
import { type Extension } from '@codemirror/state';
import {
  indentOnInput,
  bracketMatching,
  foldGutter,
  foldKeymap,
} from '@codemirror/language';
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from '@codemirror/commands';
import { searchKeymap } from '@codemirror/search';
import {
  autocompletion,
  completionKeymap,
  closeBrackets,
  closeBracketsKeymap,
} from '@codemirror/autocomplete';
import { lintKeymap } from '@codemirror/lint';
import { defaultHideExtensions } from './hide';
import { defaultFoldableSyntaxExtensions } from './fold';
import { clickLinkExtension, defaultClickLinkHandler } from './clickLink';
import {
  codeBlockDecorationsExtension,
  codeFenceTheme,
} from './codeFenceExtension';
import {
  baseSyntaxHighlights,
  baseTheme,
  generalSyntaxHighlights,
  lightTheme,
} from './syntaxHighlighting';
import { softIndentExtension } from './softIndentExtension';
import { fixedTabWidthExtension } from './tabWidthExtension';
import { revealBlockOnArrowExtension } from './revealBlockOnArrow';
export { prosemarkMarkdownSyntaxExtensions } from './markdown';

export const prosemarkBasicSetup = (): Extension => [
  // ProseMark Setup
  defaultHideExtensions,
  defaultFoldableSyntaxExtensions,
  revealBlockOnArrowExtension,
  clickLinkExtension,
  defaultClickLinkHandler,
  fixedTabWidthExtension,
  softIndentExtension,
  codeBlockDecorationsExtension,

  // Basic CodeMirror Setup
  history(),
  dropCursor(),
  indentOnInput(),
  bracketMatching(),
  closeBrackets(),
  autocompletion(),
  keymap.of([
    ...closeBracketsKeymap,
    ...defaultKeymap,
    ...searchKeymap,
    ...historyKeymap,
    ...foldKeymap,
    ...completionKeymap,
    ...lintKeymap,
    indentWithTab,
  ]),
  foldGutter({
    // Default fold gutter only rebuilds on doc/viewport/fold changes. Async
    // block widgets (e.g. LaTeX) change line heights without any of those, so
    // gutter markers keep stale height/margin and misalign with content.
    foldingChanged: (update: ViewUpdate) => update.geometryChanged,
  }),
  EditorView.lineWrapping,
];

export const prosemarkBaseThemeSetup = (): Extension => [
  baseSyntaxHighlights,
  generalSyntaxHighlights,
  baseTheme,
  codeFenceTheme,
];

export const prosemarkLightThemeSetup = (): Extension => [
  prosemarkBaseThemeSetup(),
  lightTheme,
];
