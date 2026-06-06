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

type LatexWebviewVscodeApi = WebviewVSCodeApiWithPostMessage<
  CallbackFromProcMap<'latex-integration', WebviewProcMap>
>;

const isLatexWebviewVscodeApi = (
  value: unknown,
): value is LatexWebviewVscodeApi => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  if (!('postMessage' in value)) {
    return false;
  }
  return typeof value.postMessage === 'function';
};

let latexSetupDone = false;

const procs: WebviewProcMap = {
  // eslint-disable-next-line @typescript-eslint/require-await -- async setup matches other integrations
  setup: async ({ mathJaxPackageUrl }) => {
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
      appendToExtraCodeMirrorExtensions(view, [
        ...latexMarkdownSyntaxTheme,
        ...latexMarkdownEditorExtensions({
          mathJaxLoadMode: 'url-import',
          mathJaxPackageUrl,
          output: 'svg',
        }),
      ]);
    } catch (err: unknown) {
      console.error('[ProseMark] latex-integration setup failed', err);
      throw err;
    }
  },
};

const vscodeApi = window.proseMark?.vscode;
if (isLatexWebviewVscodeApi(vscodeApi)) {
  registerWebviewMessageHandler('latex-integration', procs, vscodeApi);
} else {
  console.error('[ProseMark] latex-integration: vscode API is not available');
}
