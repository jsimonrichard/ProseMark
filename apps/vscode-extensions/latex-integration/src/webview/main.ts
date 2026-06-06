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

import './style.css';

// Peer dependency of @prosemark/latex; bundled into webview.js by Vite at build time.
import 'mathjax/tex-svg.js';

const latexExtensions = [
  ...latexMarkdownSyntaxTheme,
  ...latexMarkdownEditorExtensions({
    mathJaxLoadMode: 'static-import',
    output: 'svg',
  }),
];

let latexSetupDone = false;

const procs: WebviewProcMap = {
  setup: () => {
    const view = window.proseMark?.view;
    if (!view) {
      console.warn('[ProseMark] latex-integration setup: no view');
      return Promise.resolve();
    }
    if (latexSetupDone) {
      return Promise.resolve();
    }
    latexSetupDone = true;

    try {
      appendToExtraCodeMirrorExtensions(view, latexExtensions);
    } catch (err: unknown) {
      console.error('[ProseMark] latex-integration setup failed', err);
      throw err;
    }
    return Promise.resolve();
  },
};

registerWebviewMessageHandler(
  'latex-integration',
  procs,
  window.proseMark?.vscode as WebviewVSCodeApiWithPostMessage<
    CallbackFromProcMap<'latex-integration', WebviewProcMap>
  >,
);
