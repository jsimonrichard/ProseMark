import * as vscode from 'vscode';
import type {
  CallProc,
  CallProcWithReturnValue,
  SubExtension,
  SubExtensionCallback,
} from '@prosemark/vscode-extension-integrator/types';
import type * as CSpell from './cspell-types';
import type { VSCodeExtensionProcMap, WebviewProcMap } from './common';

export const extId = 'cspell-integration';

export class CSpellIntegration implements SubExtension<
  typeof extId,
  VSCodeExtensionProcMap
> {
  #extensionUri: vscode.Uri;
  #documentUri: vscode.Uri;
  #cSpellApi: CSpell.ExtensionApi;
  #callProcAndForget: CallProc<WebviewProcMap>;
  #callProcWithReturnValue: CallProcWithReturnValue<WebviewProcMap>;
  #cSpellcheckTimer: NodeJS.Timeout | undefined;

  constructor(
    extensionUri: vscode.Uri,
    cSpellApi: CSpell.ExtensionApi,
    document: vscode.TextDocument,
    callProcAndForget: CallProc<WebviewProcMap>,
    callProcWithReturnValue: CallProcWithReturnValue<WebviewProcMap>,
  ) {
    this.#extensionUri = extensionUri;
    this.#cSpellApi = cSpellApi;
    this.#documentUri = document.uri;
    this.#callProcAndForget = callProcAndForget;
    this.#callProcWithReturnValue = callProcWithReturnValue;
  }

  getExtensionId(): typeof extId {
    return extId;
  }

  getWebviewScriptUri(): vscode.Uri {
    return vscode.Uri.joinPath(this.#extensionUri, 'dist', 'main.iife.js');
  }

  getWebviewStyleUri(): vscode.Uri {
    return vscode.Uri.joinPath(this.#extensionUri, 'dist', 'main.css');
  }

  getLocalResourceRoots(): vscode.Uri[] {
    return [this.#extensionUri];
  }

  onReady(): void {
    const onReady = async () => {
      await this.#callProcWithReturnValue('setup');
      await this.#spellcheck();
    };
    onReady().catch((e: unknown) => {
      console.error(e);
    });
  }

  async #spellcheck() {
    const res = await this.#cSpellApi.checkDocument({
      uri: this.#documentUri.toString(),
    });
    this.#callProcAndForget('updateInfo', res);
  }

  #debouncedSpellcheck() {
    if (this.#cSpellcheckTimer) {
      clearTimeout(this.#cSpellcheckTimer);
    }

    this.#cSpellcheckTimer = setTimeout(() => {
      this.#cSpellcheckTimer = undefined;
      this.#spellcheck().catch((e: unknown) => {
        console.error(e);
      });
    }, 500);
  }

  onTextDocumentChange(): void {
    this.#debouncedSpellcheck();
  }

  procMap: VSCodeExtensionProcMap = {
    addWordToUserDictionary: async (word) => {
      await this.#cSpellApi.addWordToUserDictionary(word);
      // Re-trigger spellcheck to update issues
      setTimeout(() => {
        this.#spellcheck().catch((e: unknown) => {
          console.error(e);
        });
      }, 100);
    },
    addWordToWorkspaceDictionary: async (word) => {
      await this.#cSpellApi.addWordToWorkspaceDictionary(
        word,
        this.#documentUri,
      );
      // Re-trigger spellcheck to update issues
      setTimeout(() => {
        this.#spellcheck().catch((e: unknown) => {
          console.error(e);
        });
      }, 100);
    },
    requestSpellcheckSuggestions: async (word) => {
      const doc = { uri: this.#documentUri.toString() };
      const suggestions = (
        await this.#cSpellApi
          .cSpellClient()
          .serverApi.spellingSuggestions(word, doc)
      ).suggestions;

      return suggestions;
    },
  };
}

export function createCSpellIntegration(
  extensionUri: vscode.Uri,
  cSpellApi: CSpell.ExtensionApi,
): SubExtensionCallback<typeof extId, WebviewProcMap, VSCodeExtensionProcMap> {
  return (document, callProcAndForget, callProcWithReturnValue) => {
    return new CSpellIntegration(
      extensionUri,
      cSpellApi,
      document,
      callProcAndForget,
      callProcWithReturnValue,
    );
  };
}
