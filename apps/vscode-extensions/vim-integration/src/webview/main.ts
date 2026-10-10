import { Compartment } from '@codemirror/state';
import { vim } from '@replit/codemirror-vim';
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

const vimCompartment = new Compartment();
let vimCompartmentInstalled = false;

const procs: WebviewProcMap = {
  setup: (vimModeEnabled) => {
    const view = window.proseMark?.view;
    if (!view) {
      console.warn('[ProseMark] vim-integration setup: no view');
      return Promise.resolve();
    }

    const next = vimModeEnabled ? vim() : [];

    try {
      if (!vimCompartmentInstalled) {
        appendToExtraCodeMirrorExtensions(view, [vimCompartment.of(next)]);
        vimCompartmentInstalled = true;
      } else {
        view.dispatch({
          effects: vimCompartment.reconfigure(next),
        });
      }
      return Promise.resolve();
    } catch (err: unknown) {
      console.error('[ProseMark] vim-integration setup failed', err);
      return Promise.reject(err instanceof Error ? err : new Error(String(err)));
    }
  },
};

registerWebviewMessageHandler(
  'vim-integration',
  procs,
  window.proseMark?.vscode as WebviewVSCodeApiWithPostMessage<
    CallbackFromProcMap<'vim-integration', WebviewProcMap>
  >,
);
