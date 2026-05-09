import * as vscode from 'vscode';
import type {
  CallProc,
  CallProcWithReturnValue,
  SubExtension,
  SubExtensionCallback,
} from '@prosemark/vscode-extension-integrator/types';
import type { VSCodeExtensionProcMap, WebviewProcMap } from './common';

export const extId = 'latex-integration';

export class LatexIntegration implements SubExtension<
  typeof extId,
  VSCodeExtensionProcMap
> {
  #extensionUri: vscode.Uri;
  #callProcWithReturnValue: CallProcWithReturnValue<WebviewProcMap>;

  constructor(
    extensionUri: vscode.Uri,
    _document: vscode.TextDocument,
    _callProcAndForget: CallProc<WebviewProcMap>,
    callProcWithReturnValue: CallProcWithReturnValue<WebviewProcMap>,
  ) {
    this.#extensionUri = extensionUri;
    this.#callProcWithReturnValue = callProcWithReturnValue;
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
      'vscode-prosemark-latex-integration.css',
    );
  }

  getLocalResourceRoots(): vscode.Uri[] {
    return [this.#extensionUri];
  }

  onReady(): void {
    void this.#callProcWithReturnValue('setup').catch((e: unknown) => {
      console.error(e);
    });
  }

  procMap: VSCodeExtensionProcMap = {};
}

export function createLatexIntegration(
  extensionUri: vscode.Uri,
): SubExtensionCallback<typeof extId, WebviewProcMap, VSCodeExtensionProcMap> {
  return (document, callProcAndForget, callProcWithReturnValue) => {
    return new LatexIntegration(
      extensionUri,
      document,
      callProcAndForget,
      callProcWithReturnValue,
    );
  };
}
