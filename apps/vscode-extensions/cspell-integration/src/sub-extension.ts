import * as vscode from 'vscode';
import type {
  CallProc,
  SubExtension,
  SubExtensionCallback,
} from '@prosemark/vscode-extension-integrator/types';
import type * as CSpell from './cspell-types';
import type { VSCodeExtensionProcMap, WebviewProcMap } from './common';

export const extId = 'cspell-integration';

export class CSpellIntegration
  implements SubExtension<typeof extId, VSCodeExtensionProcMap>
{
  #extensionUri: vscode.Uri;
  #documentUri: vscode.Uri;
  #cSpellApi: CSpell.ExtensionApi;
  #callProcAndForget: CallProc<WebviewProcMap>;
  #cSpellCheckTimer: NodeJS.Timeout | undefined;

  constructor(
    extensionUri: vscode.Uri,
    cSpellApi: CSpell.ExtensionApi,
    document: vscode.TextDocument,
    callProcAndForget: CallProc<WebviewProcMap>,
  ) {
    this.#extensionUri = extensionUri;
    this.#cSpellApi = cSpellApi;
    this.#documentUri = document.uri;
    this.#callProcAndForget = callProcAndForget;
  }

  getExtensionId(): typeof extId {
    return extId;
  }

  getWebviewScriptUri(): vscode.Uri {
    return vscode.Uri.joinPath(this.#extensionUri, 'dist', 'webview.iife.js');
  }

  getLocalResourceRoots(): vscode.Uri[] {
    return [this.#extensionUri];
  }

  onReady(): void {
    console.warn('cspell onReady');
    this.#callProcAndForget('setup');
    this.#spellCheck().catch((e: unknown) => {
      console.error(e);
    });
  }

  async #spellCheck() {
    const res = await this.#cSpellApi.checkDocument({
      uri: this.#documentUri.toString(),
    });
    this.#callProcAndForget('cSpellUpdateInfo', res);
  }

  #debouncedSpellCheck() {
    if (this.#cSpellCheckTimer) {
      clearTimeout(this.#cSpellCheckTimer);
    }

    this.#cSpellCheckTimer = setTimeout(() => {
      this.#cSpellCheckTimer = undefined;
      this.#spellCheck().catch((e: unknown) => {
        console.error(e);
      });
    });
  }

  onTextDocumentChange(): void {
    this.#debouncedSpellCheck();
  }

  procMap: VSCodeExtensionProcMap = {
    addWordToUserDictionary: async (word) => {
      await this.#cSpellApi.addWordToUserDictionary(word);
    },
    addWordToWorkspaceDictionary: async (word) => {
      await this.#cSpellApi.addWordToWorkspaceDictionary(
        word,
        this.#documentUri,
      );
    },
    requestSpellCheckSuggestions: async (word) => {
      const doc = { uri: this.#documentUri.toString() };
      const suggestions = await this.#cSpellApi
        .cSpellClient()
        .serverApi.spellingSuggestions(word, doc);

      return suggestions;
    },
  };
}

export function createCSpellIntegration(
  extensionUri: vscode.Uri,
  cSpellApi: CSpell.ExtensionApi,
): SubExtensionCallback<typeof extId, WebviewProcMap, VSCodeExtensionProcMap> {
  return (document, callProcAndForget) => {
    return new CSpellIntegration(
      extensionUri,
      cSpellApi,
      document,
      callProcAndForget,
    );
  };
}
