import type { WebviewProcMap } from '../common';
import { registerWebviewMessageHandler } from '@prosemark/vscode-extension-integrator/webview';
import type {
  CallbackFromProcMap,
  WebviewVSCodeApiWithPostMessage,
} from '@prosemark/vscode-extension-integrator/types';
import { StateEffect } from '@codemirror/state';

import './style.css';

const procs: WebviewProcMap = {
  setup: async () => {
    const view = window.proseMark?.view;
    if (!view) {
      return;
    }
    const latex = await import('@prosemark/latex');
    view.dispatch({
      effects: StateEffect.appendConfig.of([
        ...latex.latexMarkdownSyntaxTheme,
        ...latex.latexMarkdownEditorExtensions(),
      ]),
    });
  },
};

registerWebviewMessageHandler(
  'latex-integration',
  procs,
  window.proseMark?.vscode as WebviewVSCodeApiWithPostMessage<
    CallbackFromProcMap<'latex-integration', WebviewProcMap>
  >,
);
