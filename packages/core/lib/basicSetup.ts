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
import { defaultHideExtensions, escapeMarkdownSyntaxExtension } from './hide';
import {
  emojiMarkdownSyntaxExtension,
  defaultFoldableSyntaxExtensions,
} from './fold';
import { clickLinkExtension, defaultClickLinkHandler } from './clickLink';
import {
  codeBlockDecorationsExtension,
  codeFenceTheme,
} from './codeFenceExtension';
import {
  additionalMarkdownSyntaxTags,
  baseSyntaxHighlights,
  baseTheme,
  generalSyntaxHighlights,
  lightTheme,
} from './syntaxHighlighting';
import { softIndentExtension } from './softIndentExtension';
import { revealBlockOnArrowExtension } from './revealBlockOnArrow';

export const prosemarkMarkdownSyntaxExtensions = [
  additionalMarkdownSyntaxTags,
  escapeMarkdownSyntaxExtension,
  emojiMarkdownSyntaxExtension,
];

export const prosemarkBasicSetup = (): Extension => [
  // ProseMark Setup
  defaultHideExtensions,
  defaultFoldableSyntaxExtensions,
  revealBlockOnArrowExtension,
  clickLinkExtension,
  defaultClickLinkHandler,
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
  foldGutter(),
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
