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
  mathJaxPackageUrlFromWebviewScript,
} from '@prosemark/latex';

import './style.css';

let latexSetupDone = false;

const procs: WebviewProcMap = {
  setup: () => {
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
      const mathJaxPackageUrl = mathJaxPackageUrlFromWebviewScript();
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
