import * as vscode from 'vscode';
import type {
  CallProc,
  CallProcWithReturnValue,
  SubExtension,
  SubExtensionCallback,
} from '@prosemark/vscode-extension-integrator/types';
import type { VSCodeExtensionProcMap, WebviewProcMap } from './common';

export const extId = 'vim-integration';

export class VimIntegration implements SubExtension<
  typeof extId,
  VSCodeExtensionProcMap
> {
  #extensionUri: vscode.Uri;
  #callProcWithReturnValue: CallProcWithReturnValue<WebviewProcMap>;
  #configSubscription: vscode.Disposable;

  constructor(
    extensionUri: vscode.Uri,
    _document: vscode.TextDocument,
    _callProcAndForget: CallProc<WebviewProcMap>,
    callProcWithReturnValue: CallProcWithReturnValue<WebviewProcMap>,
  ) {
    this.#extensionUri = extensionUri;
    this.#callProcWithReturnValue = callProcWithReturnValue;
    this.#configSubscription = vscode.workspace.onDidChangeConfiguration(
      (event) => {
        if (!event.affectsConfiguration('prosemark.vimModeEnabled')) {
          return;
        }
        this.#applyVimSetting();
      },
    );
  }

  getExtensionId(): typeof extId {
    return extId;
  }

  getWebviewScriptUri(): vscode.Uri {
    return vscode.Uri.joinPath(
      this.#extensionUri,
      'dist',
      'webview',
      'webview.js',
    );
  }

  getWebviewStyleUri(): vscode.Uri {
    return vscode.Uri.joinPath(
      this.#extensionUri,
      'dist',
      'webview',
      'vscode-prosemark-vim-integration.css',
    );
  }

  getLocalResourceRoots(): vscode.Uri[] {
    return [this.#extensionUri];
  }

  onReady(): void {
    this.#applyVimSetting();
  }

  dispose(): void {
    this.#configSubscription.dispose();
  }

  #applyVimSetting(): void {
    const vimModeEnabled = vscode.workspace
      .getConfiguration('prosemark')
      .get<boolean>('vimModeEnabled', true);

    void this.#callProcWithReturnValue('setup', vimModeEnabled).catch(
      (e: unknown) => {
        console.error(e);
      },
    );
  }

  procMap: VSCodeExtensionProcMap = {};
}

export function createVimIntegration(
  extensionUri: vscode.Uri,
): SubExtensionCallback<typeof extId, WebviewProcMap, VSCodeExtensionProcMap> {
  return (document, callProcAndForget, callProcWithReturnValue) => {
    return new VimIntegration(
      extensionUri,
      document,
      callProcAndForget,
      callProcWithReturnValue,
    );
  };
}
