import { EditorView, keymap } from '@codemirror/view';
import { markdown } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import {
  prosemarkBasicSetup,
  prosemarkBaseThemeSetup,
  prosemarkMarkdownSyntaxExtensions,
  clickLinkHandler,
} from '@prosemark/core';
import { htmlBlockExtension } from '@prosemark/render-html';
import { GFM } from '@lezer/markdown';
import { EditorState, StateEffect } from '@codemirror/state';
import type { VSCodeMessage, VSCodeProcMap, WebViewMessage } from '../common';
import './style.css';
import { indentUnit } from '@codemirror/language';

type VSCodeAPI = {
  postMessage: (m: WebViewMessage) => void;
};

declare const acquireVsCodeApi: () => any;
const vscode: VSCodeAPI = acquireVsCodeApi();

const buildState = (text: string, vimModeEnabled?: boolean) => {
  return EditorState.create({
    doc: text,
    extensions: [
      vimModeEnabled ? [] : [],
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
      // Send client updates back to VS Code
      EditorView.updateListener.of((update) => {
        if (update.docChanged && view) {
          update.transactions
            .filter((t) => !t.isUserEvent('updateFromVSCode'))
            .map((t) => {
              let changes: any[] = [];

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
      }),
    ],
  });
};

const buildView = (state: EditorState) => {
  const parent = document.querySelector('#codemirror-container');
  if (!parent) {
    throw new Error('Parent element for ProseMark container not found!');
  }
  const view = new EditorView({
    state,
    parent,
  });
  parent?.addEventListener('click', () => {
    if (
      document.activeElement !== parent &&
      !parent.contains(document.activeElement)
    ) {
      view.focus(); // Explicitly focus the editor view
    }
  });
  return view;
};

let state: EditorState | undefined;
let view: EditorView | undefined;

const procs: VSCodeProcMap = {
  init: ({ text, vimModeEnabled, ...dynamicConfig }) => {
    state = buildState(text, vimModeEnabled);
    view = buildView(state);
    procs.setDynamicConfig(dynamicConfig);
  },
  set: (text) => {
    view?.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: text },
      userEvent: 'updateFromVSCode',
    });
  },
  update: (changes) => {
    if (!state || !view) {
      throw new Error(
        'ProseMark state and view should have been rebuilt already',
      );
    }

    view.dispatch({
      changes: changes.map((c) => {
        // Calculate document position using line and char (col) numbers
        // switch to 1-based line numbers
        const fromLine = state!.doc.line(c.fromLine + 1);
        const toLine = state!.doc.line(c.toLine + 1);
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
    console.log('Trying to update tab size!');
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
  if ('value' in message) {
    procs[message.type](message.value as any);
  } else {
    procs[message.type]();
  }
});
