import { EditorView } from '@codemirror/view';
import { markdown } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import {
  prosemarkBasicSetup,
  prosemarkBaseThemeSetup,
  prosemarkMarkdownSyntaxExtensions,
  clickLinkHandler,
} from '@prosemark/core';
import { htmlBlockExtension } from '@prosemark/render-html';
import {
  pastePlainTextExtension,
  pasteRichTextExtension,
} from '@prosemark/paste-rich-text';
import { GFM } from '@lezer/markdown';
import { Compartment, EditorState, StateEffect } from '@codemirror/state';
import type { Change, WebviewProcMap, WordCountWebviewProcs } from '../common';
import './style.css';
import { indentUnit } from '@codemirror/language';
import {
  registerWebviewMessageHandler,
  registerWebviewMessagePoster,
} from '@prosemark/vscode-extension-integrator/webview';
import * as CodeMirrorState from '@codemirror/state';
import * as CodeMirrorView from '@codemirror/view';

declare const acquireVsCodeApi: () => unknown;

window.proseMark ??= {};
window.proseMark.vscode = acquireVsCodeApi();
window.proseMark.extraCodeMirrorExtensions = new Compartment();
// Register external modules to be available to other scripts in the webview
window.proseMark.externalModules = {
  '@codemirror/view': CodeMirrorView,
  '@codemirror/state': CodeMirrorState,
};

const { callProcAndForget, callProcWithReturnValue: _callProcWithReturnValue } =
  registerWebviewMessagePoster<'core', WebviewProcMap>(
    'core',
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    window.proseMark.vscode as any,
  );

const { callProcAndForget: callWordCountProc } = registerWebviewMessagePoster<
  'core.word-count',
  WordCountWebviewProcs
>(
  'core.word-count',
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  window.proseMark.vscode as any,
);

// Send updates to VS Code about text changes and word count
const updateVSCodeExtension = EditorView.updateListener.of((update) => {
  if (update.docChanged || update.selectionSet) {
    const doc = update.state.doc.toString();
    const selection = update.state.selection.main;
    const textToAnalyze = selection.empty
      ? doc
      : update.state.doc.sliceString(selection.from, selection.to);
    const wordCount =
      textToAnalyze.trim().length === 0
        ? 0
        : textToAnalyze.trim().split(/\s+/).length;
    const charCount = textToAnalyze.length;
    callWordCountProc('updateWordCount', wordCount, charCount);
  }

  if (update.docChanged && window.proseMark?.view) {
    update.transactions
      .filter((t) => !t.isUserEvent('updateFromVSCode'))
      .map((t) => {
        const changes: Change[] = [];

        t.changes.iterChanges((fromA, toA, _fromB, _toB, inserted) => {
          // calculate line and char (col) numbers from document position
          const fromLine = t.startState.doc.lineAt(fromA);
          const toLine = t.startState.doc.lineAt(toA);
          changes.push({
            // switch to 0-based line numbers
            fromLine: fromLine.number - 1,
            fromChar: fromA - fromLine.from,
            toLine: toLine.number - 1,
            toChar: toA - toLine.from,
            insert: inserted.toString(),
          });
        });

        callProcAndForget('update', changes);
      });
  }
});

const buildEditor = (text: string, vimModeEnabled?: boolean) => {
  const state = EditorState.create({
    doc: text,
    extensions: [
      vimModeEnabled ? [] : [], // A no-op for now
      markdown({
        codeLanguages: languages,
        extensions: [GFM, prosemarkMarkdownSyntaxExtensions],
      }),
      prosemarkBasicSetup(),
      prosemarkBaseThemeSetup(),
      clickLinkHandler.of((url) => {
        callProcAndForget('linkClick', url);
      }),
      htmlBlockExtension,
      pasteRichTextExtension(
        (_event, view, _pastedRangeFrom, pastedRangeTo) => {
          // Because a parent of the CodeMirror scrolls (and not CodeMirror itself)
          // we'll need to manually scroll the end of the selection into view.
          const cursorCoords = view.coordsAtPos(pastedRangeTo);
          if (cursorCoords) {
            document.body.scrollTo({
              top: cursorCoords.top - document.body.clientHeight / 2,
            });
          }
        },
      ),
      pastePlainTextExtension((view, _pastedRangeFrom, pastedRangeTo) => {
        // Because a parent of the CodeMirror scrolls (and not CodeMirror itself)
        // we'll need to manually scroll the end of the selection into view.
        const cursorCoords = view.coordsAtPos(pastedRangeTo);
        if (cursorCoords) {
          document.body.scrollTo({
            top: cursorCoords.top - document.body.clientHeight / 2,
          });
        }
      }),
      updateVSCodeExtension,
      window.proseMark?.extraCodeMirrorExtensions?.of([]) ?? [],
    ],
  });

  const parent = document.querySelector('#codemirror-container');
  if (!parent) {
    throw new Error('Parent element for ProseMark container not found!');
  }
  const view_ = new EditorView({
    state,
    parent,
  });
  parent.addEventListener('click', () => {
    if (
      document.activeElement !== parent &&
      !parent.contains(document.activeElement)
    ) {
      view_.focus(); // Explicitly focus the editor view
    }
  });
  return view_;
};

const procs: WebviewProcMap = {
  init: (text, { vimModeEnabled, ...dynamicConfig }) => {
    window.proseMark ??= {};
    window.proseMark.view = buildEditor(text, vimModeEnabled);
    procs.setDynamicConfig(dynamicConfig);
    procs.focus();
  },
  set: (text) => {
    window.proseMark?.view?.dispatch({
      changes: {
        from: 0,
        to: window.proseMark.view.state.doc.length,
        insert: text,
      },
      userEvent: 'updateFromVSCode',
    });
  },
  update: (changes) => {
    if (!window.proseMark?.view) {
      throw new Error(
        'ProseMark state and view should have been built already',
      );
    }

    window.proseMark.view.dispatch({
      changes: changes.map((c) => {
        // Calculate document position using line and char (col) numbers
        // switch to 1-based line numbers

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const fromLine = window.proseMark!.view!.state.doc.line(c.fromLine + 1);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const toLine = window.proseMark!.view!.state.doc.line(c.toLine + 1);

        return {
          from: fromLine.from + c.fromChar,
          to: toLine.from + c.toChar,
          insert: c.insert,
        };
      }),
      userEvent: 'updateFromVSCode',
    });
  },
  focus: () => window.proseMark?.view?.focus(),
  setDynamicConfig: (dynamicConfig) => {
    const { tabSize = 2, insertSpaces = true } = dynamicConfig;
    const indentUnit_ = insertSpaces ? ' '.repeat(tabSize) : '\t';
    if (window.proseMark?.view) {
      const indentEffect = StateEffect.appendConfig.of([
        EditorState.tabSize.of(tabSize),
        indentUnit.of(indentUnit_),
      ]);
      window.proseMark.view.dispatch({ effects: indentEffect });
    }
    return;
  },
};

// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
registerWebviewMessageHandler('core', procs, window.proseMark.vscode as any);
