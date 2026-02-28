import {
  type CallProc,
  type Change,
  type SubExtension,
  type SubExtensionCallback,
} from '@prosemark/vscode-extension-integrator/types';
import * as vscode from 'vscode';
import type {
  FrontendError,
  VSCodeExtensionProcMap,
  WebviewProcMap,
} from '../common';
import path from 'path';

const extId = 'core';

export class Core implements SubExtension<
  typeof extId,
  VSCodeExtensionProcMap
> {
  #extensionUri: vscode.Uri;
  #document: vscode.TextDocument;
  #callProcAndForget: CallProc<WebviewProcMap>;
  #isApplyingWebviewUpdate = false;
  #pendingWebviewUpdates: Promise<void> = Promise.resolve();
  #hasShownFatalErrorMessage = false;

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
    if (!this.#isApplyingWebviewUpdate && changes.length) {
      this.#callProcAndForget('update', changes);
    }
  }

  procMap: VSCodeExtensionProcMap = {
    update: (changes) => {
      this.#enqueueWebviewUpdate(changes);
    },
    linkClick: (link) => {
      void this.#followLink(link, this.#document.uri);
    },
    requestFullDocument: () => {
      return Promise.resolve(this.#document.getText());
    },
    reportFrontendError: (error) => {
      this.#handleFrontendError(error);
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

  #enqueueWebviewUpdate(changes: Change[]) {
    if (changes.length === 0) {
      return;
    }

    this.#pendingWebviewUpdates = this.#pendingWebviewUpdates
      .catch((error: unknown) => {
        console.error(
          'Encountered an error in a previous webview update:',
          error,
        );
      })
      .then(async () => {
        this.#isApplyingWebviewUpdate = true;
        try {
          const result = await this.#updateTextDocument(changes);
          if (!result) {
            this.#recoverFromStateMismatch(
              'VS Code rejected an update from the ProseMark webview.',
            );
          }
        } catch (error: unknown) {
          console.error(
            'Encountered an error while trying to update the document:',
            error,
          );
          this.#recoverFromStateMismatch(
            'Applying an update from the ProseMark webview failed.',
            error,
          );
        } finally {
          this.#isApplyingWebviewUpdate = false;
        }
      });
  }

  #recoverFromStateMismatch(reason: string, error?: unknown) {
    this.#callProcAndForget('set', this.#document.getText());
    this.#handleFrontendError({
      source: 'vscode-extension',
      severity: 'recoverable',
      message: 'ProseMark detected an editor state mismatch and re-synced.',
      details: `${reason}${error ? ` ${this.#formatUnknownError(error)}` : ''}`,
    });
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

  #handleFrontendError(error: FrontendError): void {
    const details = error.details ? `\n${error.details}` : '';
    const logMessage = `[${error.source}] ${error.message}${details}`;
    if (error.severity === 'fatal') {
      console.error(logMessage);
      void this.#showFatalFrontendErrorMessage();
      return;
    }

    console.warn(logMessage);
  }

  async #showFatalFrontendErrorMessage() {
    if (this.#hasShownFatalErrorMessage) {
      return;
    }
    this.#hasShownFatalErrorMessage = true;
    const choice = await vscode.window.showErrorMessage(
      'ProseMark encountered a serious editor error. It may still recover, but you may need to reopen this editor (or reload VS Code) if it remains broken.',
      'Reopen ProseMark Editor',
      'Open Webview DevTools',
    );

    try {
      if (choice === 'Reopen ProseMark Editor') {
        await vscode.commands.executeCommand(
          'vscode.openWith',
          this.#document.uri,
          'prosemark.editor',
        );
      } else if (choice === 'Open Webview DevTools') {
        await vscode.commands.executeCommand(
          'workbench.action.webview.openDeveloperTools',
        );
      }
    } catch (error: unknown) {
      console.error(
        'Failed while handling ProseMark frontend error action:',
        error,
      );
    }
  }

  #formatUnknownError(error: unknown): string {
    if (error instanceof Error) {
      return `${error.message}${error.stack ? `\n${error.stack}` : ''}`;
    }
    return typeof error === 'string' ? error : JSON.stringify(error);
  }
}

export function createCore(
  extensionUri: vscode.Uri,
): SubExtensionCallback<typeof extId, unknown, unknown> {
  return (document, callProcAndForget, _callProcWithReturnValue) => {
    return new Core(extensionUri, document, callProcAndForget);
  };
}
