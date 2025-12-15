import * as vscode from 'vscode';
import type {
  CallProc,
  CallProcWithReturnValue,
  SubExtension,
  SubExtensionCallback,
} from '@prosemark/vscode-extension-integrator/types';
import type * as CSpell from './cspell-types';
import type { VSCodeExtensionProcMap, WebviewProcMap } from './common';

export const extId = 'prosemark.cspell-integration';

export class CSpellIntegration
  implements SubExtension<typeof extId, VSCodeExtensionProcMap>
{
  #documentUri: vscode.Uri;
  #cSpellApi: CSpell.ExtensionApi;
  #callProcAndForget: CallProc<WebviewProcMap>;
  #callProcWithReturnValue: CallProcWithReturnValue<WebviewProcMap>;
  #cSpellCheckTimer: NodeJS.Timeout | undefined;

  constructor(
    cSpellApi: CSpell.ExtensionApi,
    document: vscode.TextDocument,
    callProcAndForget: CallProc<WebviewProcMap>,
    callProcWithReturnValue: CallProcWithReturnValue<WebviewProcMap>,
  ) {
    this.#cSpellApi = cSpellApi;
    this.#documentUri = document.uri;
    this.#callProcAndForget = callProcAndForget;
    this.#callProcWithReturnValue = callProcWithReturnValue;
  }

  getExtensionId(): typeof extId {
    return extId;
  }

  onReady(): void {
    this.#callProcAndForget('setup');
    this.#spellCheck();
  }

  async #spellCheck() {
    const res = await this.#cSpellApi?.checkDocument({
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
      this.#spellCheck();
    });
  }

  onTextDocumentChange(): void {
    this.#debouncedSpellCheck();
  }

  procMap: VSCodeExtensionProcMap = {
    addWordToUserDictionary: async (word) => {
      await this.#cSpellApi?.addWordToUserDictionary(word);
    },
    addWordToWorkspaceDictionary: async (word) => {
      await this.#cSpellApi?.addWordToWorkspaceDictionary(
        word,
        this.#documentUri,
      );
    },
    requestSpellCheckSuggestions: async (word) => {
      const doc = { uri: this.#documentUri.toString() };
      const suggestions = await this.#cSpellApi
        ?.cSpellClient()
        .serverApi.spellingSuggestions(word, doc);

      return suggestions;
    },
  };
}

export function createCSpellIntegration(
  cSpellApi: CSpell.ExtensionApi,
): SubExtensionCallback<typeof extId, WebviewProcMap, VSCodeExtensionProcMap> {
  return (document, callProcAndForget, callProcWithReturnValue) => {
    return new CSpellIntegration(
      cSpellApi,
      document,
      callProcAndForget,
      callProcWithReturnValue,
    );
  };
}
