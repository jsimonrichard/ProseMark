import type { WebviewProcMap } from '../common';
import {
  appendToExtraCodeMirrorExtensions,
  registerWebviewMessageHandler,
} from '@prosemark/vscode-extension-integrator/webview';
import type {
  CallbackFromProcMap,
  WebviewVSCodeApiWithPostMessage,
} from '@prosemark/vscode-extension-integrator/types';
import {
  latexMarkdownEditorExtensions,
  latexMarkdownSyntaxTheme,
} from '@prosemark/latex';

import './mathjax-preload';
import './style.css';

// Peer dependency of @prosemark/latex; bundled into webview.js by Vite at build time.
import 'mathjax/tex-svg.js';

import { disableMathJaxA11y } from './disable-mathjax-a11y';

const latexExtensions = [
  ...latexMarkdownSyntaxTheme,
  ...latexMarkdownEditorExtensions({
    mathJaxLoadMode: 'static-import',
    output: 'svg',
  }),
];

let latexSetupDone = false;

const procs: WebviewProcMap = {
  setup: async () => {
    const view = window.proseMark?.view;
    if (!view) {
      console.warn('[ProseMark] latex-integration setup: no view');
      return;
    }
    if (latexSetupDone) {
      return;
    }
    latexSetupDone = true;

    try {
      await disableMathJaxA11y();
      appendToExtraCodeMirrorExtensions(view, latexExtensions);
    } catch (err: unknown) {
      console.error('[ProseMark] latex-integration setup failed', err);
      throw err;
    }
  },
};

registerWebviewMessageHandler(
  'latex-integration',
  procs,
  window.proseMark?.vscode as WebviewVSCodeApiWithPostMessage<
    CallbackFromProcMap<'latex-integration', WebviewProcMap>
  >,
);
