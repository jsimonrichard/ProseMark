/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { EditorView, keymap } from '@codemirror/view';
import { markdown } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import {
  prosemarkBasicSetup,
  prosemarkLightThemeSetup,
  prosemarkMarkdownSyntaxExtensions,
} from '@prosemark/core';
import * as ProseMark from '@prosemark/core';
import { htmlBlockExtension } from '@prosemark/render-html';
import { GFM } from '@lezer/markdown';
import {
  pastePlainTextExtension,
  pasteRichTextExtension,
} from '@prosemark/paste-rich-text';
import { syntaxTree } from '@codemirror/language';
import initDoc from './initDoc.md?raw';
import { createSpellcheckHarness } from './spellcheck';

declare global {
  interface Window {
    debugEditor?: EditorView;
    ProseMark?: typeof ProseMark;
    runDebugSpellcheck?: () => Promise<void>;
  }
}

const logOutput = document.getElementById('log-output');
if (!(logOutput instanceof HTMLPreElement)) {
  throw new Error('Could not find log output container');
}

const log = (message: string) => {
  const stamp = new Date().toISOString().slice(11, 23);
  const line = `[${stamp}] ${message}`;
  logOutput.textContent = `${line}\n${logOutput.textContent ?? ''}`.slice(0, 12000);
  console.log(line);
};

const spellcheck = createSpellcheckHarness(log);

const editorParent = document.getElementById('codemirror-container');
if (!(editorParent instanceof HTMLDivElement)) {
  throw new Error('Could not find editor container');
}

const editor = new EditorView({
  extensions: [
    markdown({
      codeLanguages: languages,
      extensions: [GFM, prosemarkMarkdownSyntaxExtensions],
    }),
    prosemarkBasicSetup(),
    prosemarkLightThemeSetup(),
    htmlBlockExtension,
    pasteRichTextExtension(),
    pastePlainTextExtension(),
    ...spellcheck.extensions,
    keymap.of([
      {
        key: 'Alt-p',
        run: (view) => {
          log(syntaxTree(view.state).toString());
          return true;
        },
      },
    ]),
  ],
  doc: initDoc,
  parent: editorParent,
});

editorParent.addEventListener('click', () => {
  if (
    document.activeElement !== editorParent &&
    !editorParent.contains(document.activeElement)
  ) {
    editor.focus();
  }
});

void spellcheck.runSpellcheck(editor, 0);

const codeFenceFixture = `# Code fence stress fixture

\`\`\`ts
const tehValue = 1;
function recieveMessage() {
  return 'accomodate';
}
\`\`\`

Some trailing text for selections.
`;

const findFirstFenceBodyRange = (
  text: string,
): { from: number; to: number } | undefined => {
  const openStart = text.indexOf('```');
  if (openStart < 0) return undefined;
  const openEnd = text.indexOf('\n', openStart);
  if (openEnd < 0) return undefined;
  const closeStart = text.indexOf('\n```', openEnd + 1);
  if (closeStart < 0 || closeStart <= openEnd + 1) return undefined;
  return { from: openEnd + 1, to: closeStart };
};

const requireButton = (id: string): HTMLButtonElement => {
  const node = document.getElementById(id);
  if (!(node instanceof HTMLButtonElement)) {
    throw new Error(`Expected button #${id}`);
  }
  return node;
};

requireButton('load-code-fence-fixture').addEventListener('click', () => {
  editor.dispatch({
    changes: { from: 0, to: editor.state.doc.length, insert: codeFenceFixture },
    selection: { anchor: 0 },
  });
  log('Loaded fenced-code fixture.');
});

requireButton('select-code-fence-body').addEventListener('click', () => {
  const text = editor.state.doc.toString();
  const range = findFirstFenceBodyRange(text);
  if (!range) {
    log('No fenced code block found.');
    return;
  }
  editor.dispatch({
    selection: { anchor: range.from, head: range.to },
  });
  editor.focus();
  log('Selected first fenced-code body range.');
});

requireButton('stress-selection').addEventListener('click', () => {
  const text = editor.state.doc.toString();
  const range = findFirstFenceBodyRange(text);
  if (!range) {
    log('No fenced code block found.');
    return;
  }
  for (let i = 0; i < 30; i++) {
    const from = range.from + (i % 3);
    const to = Math.max(from + 1, range.to - (i % 5));
    editor.dispatch({ selection: { anchor: from, head: to } });
  }
  editor.focus();
  log('Ran selection stress loop across fenced-code body.');
});

requireButton('run-spellcheck-now').addEventListener('click', () => {
  void spellcheck.runSpellcheck(editor, 0);
});

requireButton('simulate-outdated-spellcheck').addEventListener('click', () => {
  spellcheck.simulateOutdatedApply(editor);
});

requireButton('clear-spellcheck').addEventListener('click', () => {
  spellcheck.clearIssues(editor);
});

const autoSpellcheckCheckbox = document.getElementById('auto-spellcheck');
if (!(autoSpellcheckCheckbox instanceof HTMLInputElement)) {
  throw new Error('Expected #auto-spellcheck checkbox');
}
autoSpellcheckCheckbox.addEventListener('change', () => {
  spellcheck.setAutoRefresh(autoSpellcheckCheckbox.checked);
});

const staleGuardCheckbox = document.getElementById('stale-guard');
if (!(staleGuardCheckbox instanceof HTMLInputElement)) {
  throw new Error('Expected #stale-guard checkbox');
}
staleGuardCheckbox.addEventListener('change', () => {
  spellcheck.setStaleGuard(staleGuardCheckbox.checked);
});

const delayInput = document.getElementById('spellcheck-delay-ms');
if (!(delayInput instanceof HTMLInputElement)) {
  throw new Error('Expected #spellcheck-delay-ms input');
}
delayInput.addEventListener('change', () => {
  const parsed = Number.parseInt(delayInput.value, 10);
  spellcheck.setArtificialDelayMs(Number.isNaN(parsed) ? 0 : parsed);
});

requireButton('print-tree').addEventListener('click', () => {
  log(syntaxTree(editor.state).toString());
});

requireButton('clear-log').addEventListener('click', () => {
  logOutput.textContent = '';
});

window.addEventListener('error', (event) => {
  log(
    `window.error: ${event.message || 'Unknown error'}${
      event.error instanceof Error ? ` :: ${event.error.stack ?? event.error.message}` : ''
    }`,
  );
});

window.addEventListener('unhandledrejection', (event) => {
  log(
    `unhandledrejection: ${
      event.reason instanceof Error ? event.reason.stack ?? event.reason.message : String(event.reason)
    }`,
  );
});

window.debugEditor = editor;
window.ProseMark = ProseMark;
window.runDebugSpellcheck = async () => {
  await spellcheck.runSpellcheck(editor, 0);
};
log('Debug app initialized.');
