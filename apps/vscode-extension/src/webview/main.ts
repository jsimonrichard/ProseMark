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
import { EditorState, StateEffect } from '@codemirror/state';
import type {
  Change,
  VSCodeMessage,
  VSCodeProcMap,
  WebViewMessage,
} from '../common';
import './style.css';
import { indentUnit } from '@codemirror/language';
// import { vim } from '@replit/codemirror-vim';

interface VSCodeAPI {
  postMessage: (m: WebViewMessage) => void;
}

declare const acquireVsCodeApi: () => VSCodeAPI;
const vscode: VSCodeAPI = acquireVsCodeApi();

let view: EditorView | undefined;

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
    vscode.postMessage({
      type: 'updateWordCountMsg',
      value: {
        wordCount,
        charCount,
      },
    });
  }

  if (update.docChanged && view) {
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

        vscode.postMessage({
          type: 'update',
          value: changes,
        });
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
        vscode.postMessage({ type: 'linkClick', value: url });
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

const procs: VSCodeProcMap = {
  init: ({ text, vimModeEnabled, ...dynamicConfig }) => {
    view = buildEditor(text, vimModeEnabled);
    procs.setDynamicConfig(dynamicConfig);
    procs.focus();
  },
  set: (text) => {
    view?.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: text },
      userEvent: 'updateFromVSCode',
    });
  },
  update: (changes) => {
    if (!view) {
      throw new Error(
        'ProseMark state and view should have been rebuilt already',
      );
    }

    view.dispatch({
      changes: changes.map((c) => {
        // Calculate document position using line and char (col) numbers
        // switch to 1-based line numbers

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const fromLine = view!.state.doc.line(c.fromLine + 1);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const toLine = view!.state.doc.line(c.toLine + 1);

        return {
          from: fromLine.from + c.fromChar,
          to: toLine.from + c.toChar,
          insert: c.insert,
        };
      }),
      userEvent: 'updateFromVSCode',
    });
  },
  focus: () => view?.focus(),
  setDynamicConfig: (dynamicConfig) => {
    const { tabSize = 2, insertSpaces = true } = dynamicConfig;
    const indentUnit_ = insertSpaces ? ' '.repeat(tabSize) : '\t';
    if (view) {
      const indentEffect = StateEffect.appendConfig.of([
        EditorState.tabSize.of(tabSize),
        indentUnit.of(indentUnit_),
      ]);
      view.dispatch({ effects: indentEffect });
    }
    return;
  },
};

window.addEventListener('message', (event) => {
  const message = event.data as VSCodeMessage;
  console.log('frontend received message:', message);
  if ('value' in message) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    procs[message.type](message.value as any);
  } else {
    procs[message.type]();
  }
});
