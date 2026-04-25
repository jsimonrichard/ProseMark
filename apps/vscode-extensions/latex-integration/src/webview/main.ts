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
    latexSetupDone = true;

    const latex = await import('@prosemark/latex');
    appendToExtraCodeMirrorExtensions(view, [
      ...latex.latexMarkdownSyntaxTheme,
      ...latex.latexMarkdownEditorExtensions(),
    ]);
  },
};

registerWebviewMessageHandler(
  'latex-integration',
  procs,
  window.proseMark?.vscode as WebviewVSCodeApiWithPostMessage<
    CallbackFromProcMap<'latex-integration', WebviewProcMap>
  >,
);
