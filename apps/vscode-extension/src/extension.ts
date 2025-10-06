import * as vscode from 'vscode';
import * as path from 'path';
import {
  exhaustiveMatchingGuard,
  type Change,
  type VSCodeMessage,
  type WebViewMessage,
} from './common';

export function activate(context: vscode.ExtensionContext): void {
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
    const _editor = new ProseMarkEditor(
      this.context.extensionUri,
      document,
      webviewPanel,
    );
  }
}

class ProseMarkEditor {
  private documentUri: vscode.Uri;
  private isUpdatingFromWebview = false;
  private wordCountStatusBarItem: vscode.StatusBarItem;
  private changeDocumentSubscription: vscode.Disposable;
  private viewStateSubscription: vscode.Disposable;

  constructor(
    private extensionUri: vscode.Uri,
    document: vscode.TextDocument,
    private webviewPanel: vscode.WebviewPanel,
  ) {
    this.documentUri = document.uri;

    // Set up webview
    webviewPanel.webview.options = {
      enableScripts: true,
    };
    webviewPanel.webview.html = this.getHtmlForWebview();

    // Set up word count status bar
    this.wordCountStatusBarItem = this.initWordCountStatusBar();
    const { wordCount, charCount } = this.getInitWordAndCharCount(document);
    this.updateWordCount(wordCount, charCount);
    this.wordCountStatusBarItem.show();

    // Set up handlers
    this.changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(
      (e) => this.handleTextDocumentChange(e.contentChanges),
    );
    this.viewStateSubscription = webviewPanel.onDidChangeViewState((e) => {
      if (e.webviewPanel.visible) {
        this.postMessageToWebview({ type: 'focus' });
        this.wordCountStatusBarItem.show();
      } else {
        this.wordCountStatusBarItem.hide();
      }
    });

    webviewPanel.onDidDispose(() => {
      this.dispose();
    });

    webviewPanel.webview.onDidReceiveMessage((m: WebViewMessage) => {
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
  }

  private getHtmlForWebview(): string {
    const scriptUri = this.webviewPanel.webview
      .asWebviewUri(
        vscode.Uri.joinPath(this.extensionUri, 'dist', 'main.iife.js'),
      )
      .toString();
    const styleUri = this.webviewPanel.webview
      .asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'dist', 'main.css'))
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
    this.changeDocumentSubscription.dispose();
    this.viewStateSubscription.dispose();
    this.wordCountStatusBarItem.dispose();
  }

  private postMessageToWebview(msg: VSCodeMessage) {
    return this.webviewPanel.webview.postMessage(msg);
  }

  private handleWebViewMessage(msg: WebViewMessage) {
    switch (msg.type) {
      case 'update':
        this.isUpdatingFromWebview = true;
        this.updateTextDocument(msg.value)
          .catch((e: unknown) => {
            console.error(
              'Encountered an error while trying to update the document:',
              e,
            );
          })
          .finally(() => {
            this.isUpdatingFromWebview = false;
          });
        return;
      case 'linkClick':
        void this.followLink(msg.value, this.documentUri);
        return;
      case 'updateWordCountMsg':
        this.updateWordCount(msg.value.wordCount, msg.value.charCount);
        return;
    }
    return exhaustiveMatchingGuard(msg);
  }

  private async handleTextDocumentChange(
    contentChanges: readonly vscode.TextDocumentContentChangeEvent[],
  ) {
    // If this change came from outside the webview, update the webview
    if (!this.isUpdatingFromWebview && contentChanges.length) {
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
        this.documentUri,
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

  private initWordCountStatusBar() {
    const wordCountStatusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100,
    );
    wordCountStatusBarItem.tooltip = "Current ProseMark document's word count";
    return wordCountStatusBarItem;
  }

  private updateWordCount(wordCount: number, charCount: number) {
    this.wordCountStatusBarItem.text = `Word Count: ${wordCount.toString()}, Char Count: ${charCount.toString()}`;
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
