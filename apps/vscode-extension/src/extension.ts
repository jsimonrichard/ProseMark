import * as vscode from 'vscode';
import {
  SubExtensionCallbackManager,
  SubExtensionManager,
} from '@prosemark/vscode-extension-integrator';

import type { AnyMessageOrCallback } from '@prosemark/vscode-extension-integrator/types';

const subExtensionCallbackManager = new SubExtensionCallbackManager();

// Where sub extensions hook into the ProseMark editor
export const registerSubExtension =
  subExtensionCallbackManager.registerSubExtension.bind(
    subExtensionCallbackManager,
  );

import './sub-extensions/word-count-status-bar-item.ts';
import { createCore } from './sub-extensions/core.ts';

export function activate(context: vscode.ExtensionContext): void {
  const createCore_ = createCore(context.extensionUri);
  registerSubExtension('core', createCore_);

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
  #documentUri: vscode.Uri;
  #subExtensionsManager: SubExtensionManager;
  #hasFocusedOnWebview = false;
  #changeDocumentSubscription: vscode.Disposable;
  #viewStateSubscription: vscode.Disposable;

  constructor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
  ) {
    this.#documentUri = document.uri;

    // Set up sub extensions manager
    this.#subExtensionsManager =
      subExtensionCallbackManager.buildExtensionManager(
        webviewPanel.webview,
        document,
      );

    // Set up webview
    webviewPanel.webview.options = {
      enableScripts: true,
    };
    webviewPanel.webview.html = this.#getHtmlForWebview();

    // Set up handlers
    this.#changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(
      (e) => {
        if (e.document.uri !== this.#documentUri) {
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
