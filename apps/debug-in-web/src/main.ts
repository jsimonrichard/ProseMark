/* eslint-disable @typescript-eslint/no-non-null-assertion */
import './style.css';
import { EditorSelection } from '@codemirror/state';
import { EditorView, drawSelection } from '@codemirror/view';
import { markdown } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import {
  prosemarkBasicSetup,
  prosemarkLightThemeSetup,
  prosemarkMarkdownSyntaxExtensions,
} from '@prosemark/core';
import * as ProseMark from '@prosemark/core';
import { GFM } from '@lezer/markdown';
import initDoc from './initDoc.md?raw';

declare global {
  interface Window {
    debugEditor?: EditorView;
    ProseMark?: typeof ProseMark;
  }
}

const logOutput = document.getElementById('log-output');
if (!(logOutput instanceof HTMLPreElement)) {
  throw new Error('Missing #log-output');
}

const log = (message: string) => {
  const stamp = new Date().toISOString().slice(11, 23);
  const line = `[${stamp}] ${message}`;
  logOutput.textContent = `${line}\n${logOutput.textContent ?? ''}`.slice(0, 16000);
  console.log(line);
};

const editorParent = document.getElementById('codemirror-container');
if (!(editorParent instanceof HTMLDivElement)) {
  throw new Error('Missing #codemirror-container');
}

const editor = new EditorView({
  extensions: [
    markdown({
      codeLanguages: languages,
      extensions: [GFM, prosemarkMarkdownSyntaxExtensions],
    }),
    drawSelection(),
    prosemarkBasicSetup(),
    prosemarkLightThemeSetup(),
  ],
  doc: initDoc,
  parent: editorParent,
});

const measureCaret = () => {
  const { head } = editor.state.selection.main;
  const assoc = editor.state.selection.main.assoc;
  const before = editor.coordsAtPos(head, -1);
  const after = editor.coordsAtPos(head, 1);
  const atAssoc = editor.coordsAtPos(head, assoc || 1);
  const layer = editor.dom.querySelector('.cm-cursorLayer');
  const primary = layer?.querySelector('.cm-cursor-primary');
  const rect = primary?.getBoundingClientRect();
  log(
    `head=${String(head)} assoc=${String(assoc)} slice=${JSON.stringify(editor.state.sliceDoc(Math.max(0, head - 1), Math.min(editor.state.doc.length, head + 1)))}`,
  );
  log(`coordsAtPos(head,-1)=${before ? JSON.stringify(before) : 'null'}`);
  log(`coordsAtPos(head, 1)=${after ? JSON.stringify(after) : 'null'}`);
  log(`coordsAtPos(head, assoc)=${atAssoc ? JSON.stringify(atAssoc) : 'null'}`);
  log(
    `.cm-cursor-primary: ${rect ? `w=${String(rect.width)} h=${String(rect.height)} l=${String(rect.left)} t=${String(rect.top)}` : 'none'}`,
  );
};

const requireButton = (id: string): HTMLButtonElement => {
  const el = document.getElementById(id);
  if (!(el instanceof HTMLButtonElement)) throw new Error(`Missing #${id}`);
  return el;
};

const tabLineFixture = [
  'Indented with tabs (leading tab on this line):',
  '\tone\ttwo\tthree',
  '',
  'End.',
].join('\n');

requireButton('fixture-tab-line').addEventListener('click', () => {
  editor.dispatch({
    changes: { from: 0, to: editor.state.doc.length, insert: tabLineFixture },
    selection: EditorSelection.single(0),
  });
  editor.focus();
  log('Loaded tab-indented line fixture.');
});

requireButton('fixture-a-tab-b').addEventListener('click', () => {
  editor.dispatch({
    changes: { from: 0, to: editor.state.doc.length, insert: 'a\tb' },
    selection: EditorSelection.cursor(1),
  });
  editor.focus();
  log('Loaded a\\tb with caret before tab (pos 1).');
});

requireButton('caret-before-tab').addEventListener('click', () => {
  const doc = editor.state.doc.toString();
  const i = doc.indexOf('\t');
  if (i < 0) {
    log('No tab in document.');
    return;
  }
  editor.dispatch({ selection: EditorSelection.cursor(i, 1) });
  editor.focus();
  log(`Caret before tab at pos ${String(i)} (assoc 1).`);
});

requireButton('caret-after-tab').addEventListener('click', () => {
  const doc = editor.state.doc.toString();
  const i = doc.indexOf('\t');
  if (i < 0) {
    log('No tab in document.');
    return;
  }
  editor.dispatch({ selection: EditorSelection.cursor(i + 1, -1) });
  editor.focus();
  log(`Caret after tab at pos ${String(i + 1)} (assoc -1).`);
});

requireButton('caret-start-doc').addEventListener('click', () => {
  editor.dispatch({ selection: EditorSelection.single(0) });
  editor.focus();
  log('Caret at document start.');
});

requireButton('measure-caret').addEventListener('click', () => {
  editor.focus();
  requestAnimationFrame(() => {
    measureCaret();
  });
});

requireButton('clear-log').addEventListener('click', () => {
  logOutput.textContent = '';
});

window.debugEditor = editor;
window.ProseMark = ProseMark;

log('debug-in-web ready (drawSelection on). window.debugEditor');
