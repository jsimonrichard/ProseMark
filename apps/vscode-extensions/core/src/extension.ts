import * as vscode from 'vscode';
import { SubExtensionManager } from '@prosemark/vscode-extension-integrator';

import type {
  AnyMessageOrCallback,
  ProseMarkExtensionApi,
} from '@prosemark/vscode-extension-integrator/types';
import './sub-extensions/word-count-status-bar-item.js';
import { createCore } from './sub-extensions/core.js';
import {
  registerSubExtension,
  subExtensionCallbackManager,
} from './sub-extension-manager';
import { registerWordCountStatusBarItem } from './sub-extensions/word-count-status-bar-item';

export function activate(
  context: vscode.ExtensionContext,
): ProseMarkExtensionApi {
  const createCore_ = createCore(context.extensionUri);

  registerSubExtension('core', createCore_);
  registerWordCountStatusBarItem();

  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider(
      'prosemark.editor',
      new ProseMarkEditorProvider(context),
      {
        webviewOptions: {
          retainContextWhenHidden: true,
        },
      },
    ),
  );

  return {
    registerSubExtension,
  };
}

class ProseMarkEditorProvider implements vscode.CustomTextEditorProvider {
  public static readonly viewType = 'prosemark.editor';

  constructor(private readonly context: vscode.ExtensionContext) {}

  public resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken,
  ): void {
    const _editor = new ProseMarkEditor(document, webviewPanel);
  }
}

class ProseMarkEditor {
  #document: vscode.TextDocument;
  #subExtensionsManager: SubExtensionManager;
  #webviewPanel: vscode.WebviewPanel;
  #hasFocusedOnWebview = false;
  #changeDocumentSubscription: vscode.Disposable;
  #viewStateSubscription: vscode.Disposable;

  constructor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
  ) {
    this.#document = document;
    this.#webviewPanel = webviewPanel;

    const onSubsequentRegister = (nextExtensionIds: string[]) => {
      // Reload the editor to apply the new sub-extensions
      void reloadCustomEditor(this.#document, nextExtensionIds);
    };

    this.#subExtensionsManager =
      subExtensionCallbackManager.buildExtensionManager(
        this.#webviewPanel.webview,
        this.#document,
        onSubsequentRegister,
      );
    this.#webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: this.#subExtensionsManager.getLocalResourceRoots(),
    };
    this.#webviewPanel.webview.html = this.#getHtmlForWebview();

    // Set up handlers
    this.#changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(
      (e) => {
        if (e.document.uri !== this.#document.uri) {
          return;
        }
        this.#subExtensionsManager.onTextDocumentChange(e.contentChanges);
      },
    );
    this.#viewStateSubscription = webviewPanel.onDidChangeViewState((e) => {
      if (e.webviewPanel.visible && !this.#hasFocusedOnWebview) {
        this.#subExtensionsManager.onEditorShown();
        this.#hasFocusedOnWebview = true;
      } else if (!e.webviewPanel.visible) {
        this.#subExtensionsManager.onEditorHidden();
        this.#hasFocusedOnWebview = false;
      }
    });

    webviewPanel.onDidDispose(() => {
      this.#dispose();
    });

    webviewPanel.webview.onDidReceiveMessage((m: AnyMessageOrCallback) => {
      this.#subExtensionsManager.onWebviewMessage(m);
    });

    this.#subExtensionsManager.onReady();
  }

  #getHtmlForWebview(): string {
    return /* html */ `
      <!DOCTYPE html>
      <html lang="en" style="height: 100%">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>ProseMark</title>
        ${this.#subExtensionsManager.getExtensionStyleTags()}
      </head>
      <body style="height: 100%">
        <div id="codemirror-container"></div>
        ${this.#subExtensionsManager.getExtensionScriptTags()}
      </body>
      </html>
    `;
  }

  #dispose() {
    this.#subExtensionsManager.dispose();
    this.#changeDocumentSubscription.dispose();
    this.#viewStateSubscription.dispose();
  }
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
export function deactivate(): void {}

async function reloadCustomEditor(
  document: vscode.TextDocument,
  nextExtensionIds: string[],
) {
  const tabs = vscode.window.tabGroups.all
    .flatMap((g) => g.tabs)
    .filter(
      (t) =>
        t.input instanceof vscode.TabInputCustom &&
        t.input.uri.toString() === document.uri.toString(),
    );

  if (tabs.length === 0) {
    return;
  }

  if (document.isDirty) {
    const choice = await vscode.window.showInformationMessage(
      `The file ${document.fileName} has unsaved changes, and needs to be reloaded
      for the ${nextExtensionIds.join(', ')} ProseMark sub-extension(s) to take effect. Save before reloading?`,
      { modal: true },
      'Save',
      "Don't Save",
      'Cancel',
    );

    if (choice === 'Cancel') {
      return;
    }

    if (choice === 'Save') {
      await vscode.commands.executeCommand('workbench.action.files.save');
    } else {
      // Don't Save
      await vscode.commands.executeCommand('workbench.action.files.revert');
    }
  }

  const viewColumn = tabs[0]?.group.viewColumn;
  await vscode.commands.executeCommand('workbench.action.closeActiveEditor'); // close it
  await vscode.commands.executeCommand(
    'vscode.openWith',
    document.uri,
    'prosemark.editor',
    viewColumn,
  );
  await vscode.window.showInformationMessage(
    `File ${document.fileName} has been re-opened successfully for
    the ${nextExtensionIds.join(', ')} ProseMark sub-extension(s).`,
  );
}
