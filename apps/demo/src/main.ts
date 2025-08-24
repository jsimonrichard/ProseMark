/* eslint-disable @typescript-eslint/no-non-null-assertion */
import './style.css';
import { basicSetup } from 'codemirror';
import { EditorView, keymap } from '@codemirror/view';
import { markdown } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import {
  prosemarkBasicSetup,
  prosemarkBaseThemeSetup,
  prosemarkMarkdownSyntaxExtensions,
  defaultClickLinkHandler,
} from '@prosemark/core';
import * as ProseMark from '@prosemark/core';
import { htmlBlockExtension } from '@prosemark/render-html';
import { indentWithTab } from '@codemirror/commands';
import { GFM } from '@lezer/markdown';
import {
  defaultHighlightStyle,
  syntaxHighlighting,
  syntaxTree,
} from '@codemirror/language';
import { printTree, traverseTree } from '@lezer-unofficial/printer';
import initDoc from './initDoc.md?raw';
import { traverseTreePlugin } from './traverseTreePlugin';

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div>
    <div id="codemirror-container"></div>
  </div>
`;

const editor = new EditorView({
  extensions: [
    basicSetup,
    markdown({
      codeLanguages: languages,
      extensions: [GFM, prosemarkMarkdownSyntaxExtensions],
    }),
    EditorView.lineWrapping,
    prosemarkBasicSetup(),
    prosemarkBaseThemeSetup(),
    defaultClickLinkHandler,
    keymap.of([
      indentWithTab,
      {
        key: 'Alt-p',
        run: (view) => {
          console.log(
            printTree(syntaxTree(view.state), view.state.doc.toString()),
          );
          return true;
        },
      },
    ]),
    traverseTreePlugin,
  ],
  doc: initDoc,
  parent: document.getElementById('codemirror-container')!,
});

// for easier debugging
Object.assign(window, { editor, ProseMark });
