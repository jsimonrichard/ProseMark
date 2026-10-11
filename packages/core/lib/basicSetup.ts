import { keymap, dropCursor, EditorView } from '@codemirror/view';
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
import { prosemarkMarkdownFormattingKeymap } from './markdownFormattingKeymap';
export { prosemarkMarkdownSyntaxExtensions } from './markdown';

export interface ProsemarkBasicSetupOptions {
  /**
   * Include CodeMirror document history and its keybindings.
   * Default true. Pass false when a host (e.g. VS Code TextDocument) owns undo/redo.
   */
  history?: boolean;
}

export const prosemarkBasicSetup = (
  options: ProsemarkBasicSetupOptions = {},
): Extension => {
  const includeHistory = options.history !== false;
  return [
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
    ...(includeHistory ? [history()] : []),
    dropCursor(),
    indentOnInput(),
    bracketMatching(),
    closeBrackets(),
    autocompletion(),
    keymap.of([
      ...prosemarkMarkdownFormattingKeymap,
      ...closeBracketsKeymap,
      ...defaultKeymap,
      ...searchKeymap,
      ...(includeHistory ? historyKeymap : []),
      ...foldKeymap,
      ...completionKeymap,
      ...lintKeymap,
      indentWithTab,
    ]),
    foldGutter(),
    EditorView.lineWrapping,
  ];
};

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
