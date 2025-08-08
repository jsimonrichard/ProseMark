import * as vscode from 'vscode';
import type { WebViewMessage } from './common';

export function activate(context: vscode.ExtensionContext) {
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

  private isUpdating = false;

  constructor(private readonly context: vscode.ExtensionContext) {}

  public async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken,
  ): Promise<void> {
    console.info('Resolving custom text editor for', document.uri.toString());
    webviewPanel.webview.options = {
      enableScripts: true,
    };
    webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);

    const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(
      (e) => {
        if (
          e.document.uri.toString() === document.uri.toString() &&
          !this.isUpdating &&
          e.contentChanges
        ) {
          webviewPanel.webview.postMessage({
            type: 'update',
            changes: e.contentChanges.map((c) => ({
              fromLine: c.range.start.line,
              fromChar: c.range.start.character,
              toLine: c.range.end.line,
              toChar: c.range.end.character,
              insert: c.text,
            })),
          });
        }
      },
    );

    webviewPanel.onDidDispose(() => {
      changeDocumentSubscription.dispose();
    });

    webviewPanel.webview.onDidReceiveMessage((e) => {
      switch (e.type) {
        case 'update':
          this.updateTextDocument(document, e.changes);
          return;
      }
    });

    webviewPanel.webview.postMessage({
      type: 'set',
      text: document.getText(),
    });
  }

  private getHtmlForWebview(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'main.js'),
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'src', 'style.css'),
    );

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

  private async updateTextDocument(
    document: vscode.TextDocument,
    changes: WebViewMessage['changes'],
  ) {
    this.isUpdating = true;
    const edit = new vscode.WorkspaceEdit();
    for (const change of changes) {
      edit.replace(
        document.uri,
        new vscode.Range(
          change.fromLine,
          change.fromChar,
          change.toLine,
          change.toChar,
        ),
        change.insert ?? '',
      );
    }
    const result = await vscode.workspace.applyEdit(edit);
    this.isUpdating = false;
    return result;
  }
}

export function deactivate() {}
