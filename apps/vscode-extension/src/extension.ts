import * as vscode from 'vscode';
import * as path from 'path';
import {
  type Change,
  type VSCodeExtensionProcMap,
  type VSCodeExtMessage,
  type WebviewMessage,
} from './common';

import type * as CSpell from './cspell-types.d.ts';

export function activate(context: vscode.ExtensionContext): void {
  let cSpellApi: CSpell.ExtensionApi | undefined;
  try {
    // This getExtension API is throwing an exception even though it's supposed to return undefined (I think)
    const cSpellExtension = vscode.extensions.getExtension<CSpell.ExtensionApi>(
      'streetsidesoftware.code-spell-checker',
    );
    if (!cSpellExtension) {
      throw new Error('Code Spell Checker extension not found');
    }

    cSpellApi = cSpellExtension.exports;
  } catch (_) {
    vscode.window.showErrorMessage(
      'Spell Check in ProseMark requires the Code Spell Checker extension to be installed.',
    );
  }

  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider(
      'prosemark.editor',
      new ProseMarkEditorProvider(context, cSpellApi),
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

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly cSpellApi: CSpell.ExtensionApi | undefined,
  ) {}

  public resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken,
  ): void {
    const _editor = new ProseMarkEditor(
      this.context.extensionUri,
      document,
      webviewPanel,
      this.cSpellApi,
    );
  }
}

class ProseMarkEditor {
  #extensionUri: vscode.Uri;
  #documentUri: vscode.Uri;
  #webviewPanel: vscode.WebviewPanel;
  #isUpdatingFromWebview = false;
  #hasFocusedOnWebview = false;
  #wordCountStatusBarItem: vscode.StatusBarItem;
  #changeDocumentSubscription: vscode.Disposable;
  #viewStateSubscription: vscode.Disposable;
  #cSpellApi: CSpell.ExtensionApi | undefined;
  #cSpellCheckTimer: NodeJS.Timeout | undefined;

  constructor(
    extensionUri: vscode.Uri,
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    cSpellApi: CSpell.ExtensionApi | undefined,
  ) {
    this.#extensionUri = extensionUri;
    this.#documentUri = document.uri;
    this.#webviewPanel = webviewPanel;
    this.#cSpellApi = cSpellApi;

    // Set up webview
    webviewPanel.webview.options = {
      enableScripts: true,
    };
    webviewPanel.webview.html = this.getHtmlForWebview();

    // Set up word count status bar
    this.#wordCountStatusBarItem = this.initWordCountStatusBar();
    const { wordCount, charCount } = this.getInitWordAndCharCount(document);
    this.updateWordCount(wordCount, charCount);
    this.#wordCountStatusBarItem.show();

    // Set up handlers
    this.#changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(
      async (e) => {
        if (e.document.uri !== this.#documentUri) {
          return;
        }
        await this.handleTextDocumentChange(e.contentChanges);
      },
    );
    this.#viewStateSubscription = webviewPanel.onDidChangeViewState((e) => {
      if (e.webviewPanel.visible && !this.#hasFocusedOnWebview) {
        this.postMessageToWebview({ type: 'focus' });
        this.#wordCountStatusBarItem.show();
        this.#hasFocusedOnWebview = true;
      } else if (!e.webviewPanel.visible) {
        this.#wordCountStatusBarItem.hide();
        this.#hasFocusedOnWebview = false;
      }
    });

    webviewPanel.onDidDispose(() => {
      this.dispose();
    });

    webviewPanel.webview.onDidReceiveMessage((m: WebviewMessage) => {
      this.handleWebViewMessage(m);
    });

    // Send VS Code editor settings to the webview
    const initConfig = this.getInitConfig();

    this.postMessageToWebview({
      type: 'init',
      value: {
        text: document.getText(),
        ...initConfig,
      },
    });
    this.spellCheck();
  }

  private getHtmlForWebview(): string {
    const scriptUri = this.#webviewPanel.webview
      .asWebviewUri(
        vscode.Uri.joinPath(this.#extensionUri, 'dist', 'main.iife.js'),
      )
      .toString();
    const styleUri = this.#webviewPanel.webview
      .asWebviewUri(vscode.Uri.joinPath(this.#extensionUri, 'dist', 'main.css'))
      .toString();

    return /* html */ `
      <!DOCTYPE html>
      <html lang="en" style="height: 100%">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>ProseMark</title>
        <link rel="stylesheet" href="${styleUri}">
      </head>
      <body style="height: 100%">
        <div id="codemirror-container"></div>
        <script src="${scriptUri}"></script>
      </body>
      </html>
    `;
  }

  private dispose() {
    this.#changeDocumentSubscription.dispose();
    this.#viewStateSubscription.dispose();
    this.#wordCountStatusBarItem.dispose();
  }

  private postMessageToWebview(msg: VSCodeExtMessage) {
    return this.#webviewPanel.webview.postMessage(msg);
  }

  private procMap: VSCodeExtensionProcMap = {
    update: (changes) => {
      this.#isUpdatingFromWebview = true;
      this.updateTextDocument(changes)
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
      void this.followLink(link, this.#documentUri);
    },
    updateWordCountMsg: ({ wordCount, charCount }) => {
      this.updateWordCount(wordCount, charCount);
    },
    cSpellAddWordToUserDictionary: (word) => {
      this.#cSpellApi
        ?.addWordToUserDictionary(word)
        .then(() =>
          this.postMessageToWebview({
            type: 'cSpellDoneAddingWord',
            value: word,
          }),
        )
        .catch((e: unknown) => {
          console.error(e);
        });
    },
    cSpellAddWordToWorkspaceDictionary: (word) => {
      this.#cSpellApi
        ?.addWordToWorkspaceDictionary(word, this.#documentUri)
        .then(() =>
          this.postMessageToWebview({
            type: 'cSpellDoneAddingWord',
            value: word,
          }),
        )
        .catch((e: unknown) => {
          console.error(e);
        });
    },
    cSpellRequestSpellCheckSuggestions: (word) => {
      const doc = { uri: this.#documentUri.toString() };
      this.#cSpellApi
        ?.cSpellClient()
        .serverApi.spellingSuggestions(word, doc)
        .then((suggestions: CSpell.Suggestion[]) => {
          this.postMessageToWebview({
            type: 'cSpellProvideSpellCheckSuggestions',
            value: {
              word,
              suggestions,
            },
          });
        })
        .catch((e: unknown) => {
          console.error(e);
        });
    },
  };

  private handleWebViewMessage(msg: WebviewMessage) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    this.procMap[msg.type](msg.value as any);
  }

  private async handleTextDocumentChange(
    contentChanges: readonly vscode.TextDocumentContentChangeEvent[],
  ) {
    this.debouncedSpellCheck();

    // If this change came from outside the webview, update the webview
    if (!this.#isUpdatingFromWebview && contentChanges.length) {
      await this.postMessageToWebview({
        type: 'update',
        value: contentChanges.map((c) => ({
          fromLine: c.range.start.line,
          fromChar: c.range.start.character,
          toLine: c.range.end.line,
          toChar: c.range.end.character,
          insert: c.text,
        })),
      });
    }
  }

  private async updateTextDocument(changes: Change[]) {
    const edit = new vscode.WorkspaceEdit();
    for (const change of changes) {
      edit.replace(
        this.#documentUri,
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

  private debouncedSpellCheck() {
    if (this.#cSpellCheckTimer) {
      clearTimeout(this.#cSpellCheckTimer);
    }

    this.#cSpellCheckTimer = setTimeout(() => {
      this.#cSpellCheckTimer = undefined;
      this.spellCheck();
    });
  }

  private spellCheck() {
    this.#cSpellApi
      ?.checkDocument({
        uri: this.#documentUri.toString(),
      })
      .then((res) => {
        this.postMessageToWebview({
          type: 'cSpellUpdateInfo',
          value: res,
        });
      })
      .catch((e: unknown) => {
        console.error(e);
      });
  }

  private initWordCountStatusBar() {
    const wordCountStatusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100,
    );
    wordCountStatusBarItem.tooltip = "Current ProseMark document's word count";
    return wordCountStatusBarItem;
  }

  private updateWordCount(wordCount: number, charCount: number) {
    this.#wordCountStatusBarItem.text = `Word Count: ${wordCount.toString()}, Char Count: ${charCount.toString()}`;
  }

  private getInitWordAndCharCount(document: vscode.TextDocument) {
    const text = document.getText();
    const textTrimmed = text.trim();
    const wordCount = textTrimmed.length ? textTrimmed.split(/\s+/).length : 0;
    const charCount = text.length;
    return {
      wordCount,
      charCount,
    };
  }

  private getInitConfig() {
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

  /// Follow a link within the markdown document, relative to the current document
  private async followLink(link: string, currentDocumentUri: vscode.Uri) {
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
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
export function deactivate(): void {}
