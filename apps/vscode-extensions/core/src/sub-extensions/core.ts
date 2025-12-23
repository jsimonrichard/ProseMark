import {
  type CallProc,
  type Change,
  type SubExtension,
  type SubExtensionCallback,
} from '@prosemark/vscode-extension-integrator/types';
import * as vscode from 'vscode';
import type { VSCodeExtensionProcMap, WebviewProcMap } from '../common';
import path from 'path';

const extId = 'core';

export class Core implements SubExtension<
  typeof extId,
  VSCodeExtensionProcMap
> {
  #extensionUri: vscode.Uri;
  #document: vscode.TextDocument;
  #callProcAndForget: CallProc<WebviewProcMap>;
  #isUpdatingFromWebview = false;

  constructor(
    extensionUri: vscode.Uri,
    document: vscode.TextDocument,
    callProcAndForget: CallProc<WebviewProcMap>,
  ) {
    this.#extensionUri = extensionUri;
    this.#document = document;
    this.#callProcAndForget = callProcAndForget;
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
    const initConfig = this.#getInitConfig();

    this.#callProcAndForget('init', this.#document.getText(), initConfig);
  }

  #getInitConfig() {
    const editorConfig = vscode.workspace.getConfiguration('editor');
    const tabSize = editorConfig.get<number>('tabSize', 2);
    const insertSpaces = editorConfig.get<boolean>('insertSpaces', true);

    // const config = vscode.workspace.getConfiguration('prosemark');
    // const vimModeEnabled = config.get<boolean>('vimModeEnabled', false);

    return {
      vimModeEnabled: false,
      tabSize,
      insertSpaces,
    };
  }

  onTextDocumentChange(changes: Change[]): void {
    if (!this.#isUpdatingFromWebview && changes.length) {
      this.#callProcAndForget('update', changes);
    }
  }

  procMap: VSCodeExtensionProcMap = {
    update: (changes) => {
      this.#isUpdatingFromWebview = true;
      this.#updateTextDocument(changes)
        .catch((e: unknown) => {
          console.error(
            'Encountered an error while trying to update the document:',
            e,
          );
        })
        .finally(() => {
          this.#isUpdatingFromWebview = false;
        });
    },
    linkClick: (link) => {
      void this.#followLink(link, this.#document.uri);
    },
  };

  async #updateTextDocument(changes: Change[]) {
    const edit = new vscode.WorkspaceEdit();
    for (const change of changes) {
      edit.replace(
        this.#document.uri,
        new vscode.Range(
          change.fromLine,
          change.fromChar,
          change.toLine,
          change.toChar,
        ),
        change.insert,
      );
    }
    const result = await vscode.workspace.applyEdit(edit);
    return result;
  }

  /// Follow a link within the markdown document, relative to the current document
  async #followLink(link: string, currentDocumentUri: vscode.Uri) {
    const uri = vscode.Uri.parse(link);

    if (uri.scheme === 'file') {
      // use this instead of uri directly since uri.path may have an extra `/`
      let fileUri;
      if (link.startsWith('file://')) {
        fileUri = uri;
      } else if (path.isAbsolute(link)) {
        fileUri = vscode.Uri.file(link);
      } else {
        fileUri = vscode.Uri.file(
          path.join(path.dirname(currentDocumentUri.path), link),
        );
      }
      await vscode.commands.executeCommand('vscode.open', fileUri);
    } else if (uri.scheme === 'http' || uri.scheme === 'https') {
      await vscode.env.openExternal(uri);
    } else {
      vscode.commands.executeCommand('vscode.open', uri);
    }
  }

  onEditorShown(): void {
    this.#callProcAndForget('focus');
  }
}

export function createCore(
  extensionUri: vscode.Uri,
): SubExtensionCallback<typeof extId, unknown, unknown> {
  return (document, callProcAndForget, _callProcWithReturnValue) => {
    return new Core(extensionUri, document, callProcAndForget);
  };
}
