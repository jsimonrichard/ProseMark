import * as vscode from 'vscode';
import * as path from 'path';
import {
  exhaustiveMatchingGuard,
  type Change,
  type WebViewMessage,
} from './common';

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
      const type = e.type as WebViewMessage['type'];
      switch (type) {
        case 'update':
          this.updateTextDocument(document, e.changes);
          return;
        case 'link_click':
          this.followLink(e.link, document.uri);
          return;
      }
      return exhaustiveMatchingGuard(type);
    });

    webviewPanel.webview.postMessage({
      type: 'set',
      text: document.getText(),
    });
  }

  private getHtmlForWebview(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'main.iife.js'),
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'main.css'),
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
    changes: Change[],
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

export function deactivate() {}
