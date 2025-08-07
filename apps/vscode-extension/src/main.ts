import { EditorView, keymap } from '@codemirror/view';
import { markdown } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import {
  prosemarkBasicSetup,
  prosemarkBaseThemeSetup,
  prosemarkMarkdownSyntaxExtensions,
} from '@prosemark/core';
import { htmlBlockExtension } from '@prosemark/render-html';
import { GFM } from '@lezer/markdown';
import { EditorState } from '@codemirror/state';
import type { VSCodeMessage, WebViewMessage } from './common';

type VSCodeAPI = {
  postMessage: (m: WebViewMessage) => void;
};

declare const acquireVsCodeApi: () => any;
const vscode: VSCodeAPI = acquireVsCodeApi();

const buildState = (text: string) => {
  return EditorState.create({
    doc: text,
    extensions: [
      markdown({
        codeLanguages: languages,
        extensions: [GFM, prosemarkMarkdownSyntaxExtensions],
      }),
      prosemarkBasicSetup(),
      prosemarkBaseThemeSetup(),
      htmlBlockExtension,
      // Send client updates back to VS Code
      EditorView.updateListener.of((update) => {
        if (update.docChanged && view) {
          update.transactions
            .filter((t) => !t.isUserEvent('updateFromVSCode'))
            .map((t) => {
              let changes: any[] = [];

              t.changes.iterChanges((fromA, toA, _fromB, _toB, inserted) => {
                const fromLine = update.state.doc.lineAt(fromA).number;
                const toLine = update.state.doc.lineAt(toA).number;
                changes.push({
                  fromLine,
                  fromChar: fromA - fromLine,
                  toLine,
                  toChar: toA - toLine,
                  insert: inserted,
                });
              });

              vscode.postMessage({
                type: 'update',
                changes,
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
  return new EditorView({
    state,
    parent,
  });
};

let state: EditorState | undefined;
let view: EditorView | undefined;

window.addEventListener('message', (event) => {
  const message = event.data as VSCodeMessage;
  console.log('Received message from extension:', message);

  switch (message.type) {
    case 'set':
      const { text } = message;
      let shouldDispatch = true;
      if (!state) {
        state = buildState(text);
        shouldDispatch = false;
      }
      if (!view) {
        view = buildView(state);
      }
      if (shouldDispatch) {
        view?.dispatch({
          changes: { from: 0, to: view.state.doc.length, insert: text },
          userEvent: 'updateFromVSCode',
        });
      }
      break;

    case 'update':
      if (!state || !view) {
        throw new Error(
          'ProseMark state and view should have been rebuilt already',
        );
      }

      const { changes } = message;
      view.dispatch({
        changes: changes.map((c) => {
          const fromLine = state!.doc.line(c.fromLine);
          const toLine = state!.doc.line(c.toLine);
          return {
            from: fromLine.from + c.fromChar,
            to: toLine.from + c.toChar,
            insert: c.insert,
          };
        }),
        userEvent: 'updateFromVSCode',
      });

      return;
  }
});
