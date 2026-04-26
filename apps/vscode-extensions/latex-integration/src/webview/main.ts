import type { WebviewProcMap } from '../common';
import {
  appendToExtraCodeMirrorExtensions,
  registerWebviewMessageHandler,
  runWhenProseMarkViewReady,
} from '@prosemark/vscode-extension-integrator/webview';
import type {
  CallbackFromProcMap,
  WebviewVSCodeApiWithPostMessage,
} from '@prosemark/vscode-extension-integrator/types';

import './style.css';

let latexSetupDone = false;

const installLatexExtensions = async (): Promise<void> => {
  const view = window.proseMark?.view;
  if (!view || latexSetupDone) {
    return;
  }
  latexSetupDone = true;

  const latex = await import('@prosemark/latex');
  appendToExtraCodeMirrorExtensions(view, [
    ...latex.latexMarkdownSyntaxTheme,
    ...latex.latexMarkdownEditorExtensions(),
  ]);
};

const procs: WebviewProcMap = {
  setup: () =>
    new Promise<void>((resolve) => {
      runWhenProseMarkViewReady(async () => {
        await installLatexExtensions();
        resolve();
      });
    }),
};

registerWebviewMessageHandler(
  'latex-integration',
  procs,
  window.proseMark?.vscode as WebviewVSCodeApiWithPostMessage<
    CallbackFromProcMap<'latex-integration', WebviewProcMap>
  >,
);
