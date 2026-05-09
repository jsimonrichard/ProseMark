import type { WebviewProcMap } from '../common';
import {
  appendToExtraCodeMirrorExtensions,
  registerWebviewMessageHandler,
} from '@prosemark/vscode-extension-integrator/webview';
import type {
  CallbackFromProcMap,
  WebviewVSCodeApiWithPostMessage,
} from '@prosemark/vscode-extension-integrator/types';

import './style.css';

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

    try {
      // Bundle MathJax tex-svg into webview.js (Vite resolves `mathjax/...` from npm).
      await import('mathjax/tex-svg.js');
      const latex = await import('@prosemark/latex');
      appendToExtraCodeMirrorExtensions(view, [
        ...latex.latexMarkdownSyntaxTheme,
        ...latex.latexMarkdownEditorExtensions({
          mathJaxLoadMode: 'static-import',
          output: 'svg',
        }),
      ]);
      latexSetupDone = true;
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
