import * as vscode from 'vscode';
import type {
  AnyCallbackMessage,
  AnyCallProc,
  AnyCallProcWithReturnValue,
  AnyMessageOrCallback,
  AnySubExtension,
  AnySubExtensionCallback,
  CallProcPromiseInner,
  Change,
  MessageFromProcMap,
  ProcMap,
} from './types';

export class SubExtensionCallbackManager {
  #subExtensionCallbacks: Record<string, AnySubExtensionCallback> = {};

  registerSubExtension(
    extId: string,
    subExtensionCallback: AnySubExtensionCallback,
  ): void {
    if (extId.includes(':')) {
      throw new Error('Extension ID cannot contain a colon');
    }

    this.#subExtensionCallbacks[extId] = subExtensionCallback;
  }

  buildExtensionManager(
    webview: vscode.Webview,
    document: vscode.TextDocument,
  ): SubExtensionManager {
    return new SubExtensionManager(
      this.#subExtensionCallbacks,
      webview,
      document,
    );
  }
}

export class SubExtensionManager {
  #subExtensions: Record<string, AnySubExtension>;
  #webview: vscode.Webview;
  #callbackMap = new Map<
    string,
    {
      success: (value: unknown) => void;
      error: (value: unknown) => void;
    }
  >();

  constructor(
    subExtensionCallbacks: Record<string, AnySubExtensionCallback>,
    webview: vscode.Webview,
    document: vscode.TextDocument,
  ) {
    this.#webview = webview;

    const extensions: Record<string, AnySubExtension> = {};
    for (const [key, callback] of Object.entries(subExtensionCallbacks)) {
      extensions[key] = callback(
        document,
        this.#callProcAndForget(key),
        this.#callProcWithReturnValue(key),
      );
    }

    this.#subExtensions = extensions;
  }

  getExtensionScriptTags(): string {
    let scriptTags = '';

    // Add core script tag first
    if ('core' in this.#subExtensions) {
      if (this.#subExtensions['core'].getWebviewScriptUri) {
        scriptTags += scriptTagFromUri(
          this.#webview,
          this.#subExtensions['core'].getWebviewScriptUri(),
        );
      }
    }

    scriptTags += Object.entries(this.#subExtensions)
      .filter(([key, _ext]) => key !== 'core')
      .map(([_key, ext]) => {
        if (!ext.getWebviewScriptUri) {
          return null;
        }
        return scriptTagFromUri(this.#webview, ext.getWebviewScriptUri());
      })
      .filter((s) => !!s)
      .join('\n');

    return scriptTags;
  }

  getExtensionStyleTags(): string {
    let styleTags = '';

    // Add core style tag first (not a big deal, but why not)
    if ('core' in this.#subExtensions) {
      if (this.#subExtensions['core'].getWebviewStyleUri) {
        styleTags += styleTagFromUri(
          this.#webview,
          this.#subExtensions['core'].getWebviewStyleUri(),
        );
      }
    }

    styleTags += Object.entries(this.#subExtensions)
      .filter(([key, _ext]) => key !== 'core')
      .map(([_key, ext]) => {
        if (!ext.getWebviewStyleUri) {
          return null;
        }
        const styleUri = this.#webview
          .asWebviewUri(ext.getWebviewStyleUri())
          .toString();
        return `<link rel="stylesheet" href="${styleUri}">`;
      })
      .filter((s) => !!s)
      .join('\n');

    return styleTags;
  }

  getLocalResourceRoots(): vscode.Uri[] {
    return Object.values(this.#subExtensions).flatMap(
      (ext) => ext.getLocalResourceRoots?.() ?? [],
    );
  }

  onReady(): void {
    for (const extension of Object.values(this.#subExtensions)) {
      extension.onReady?.();
    }
  }

  onTextDocumentChange(
    contentChanges: readonly vscode.TextDocumentContentChangeEvent[],
  ): void {
    const changes: Change[] = contentChanges.map((c) => ({
      fromLine: c.range.start.line,
      fromChar: c.range.start.character,
      toLine: c.range.end.line,
      toChar: c.range.end.character,
      insert: c.text,
    }));

    for (const extension of Object.values(this.#subExtensions)) {
      extension.onTextDocumentChange?.(changes);
    }
  }

  onWebviewMessage(message_: AnyMessageOrCallback): void {
    const parts = message_.type.split(':');
    if (parts.length === 2) {
      const message = message_ as MessageFromProcMap<string, ProcMap>;

      const [extId, methodName] = parts as [string, string];
      const subExtension = this.#subExtensions[extId];
      if (!subExtension) {
        return;
      }
      if (methodName in subExtension.procMap) {
        const proc = subExtension.procMap[methodName];
        if (proc instanceof Function) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          const res = proc(...message.value);

          if (res instanceof Promise && 'callbackId' in message) {
            res
              .then((r) => {
                this.#webview.postMessage({
                  type: `${extId}:${methodName}-callback:success`,
                  callbackId: message.callbackId,
                  value: r as unknown,
                } as AnyCallbackMessage);
              })
              .catch((e: unknown) => {
                this.#webview.postMessage({
                  type: `${extId}:${methodName}-callback:error`,
                  callbackId: message.callbackId,
                  value: typeof e === 'string' ? e : JSON.stringify(e),
                } as AnyCallbackMessage);
              });
          }
        }
      } else {
        console.warn(
          `Sub extension ${extId} does not have a proc named ${methodName}`,
        );
      }
    } else if (parts.length === 3) {
      const message = message_ as AnyCallbackMessage;
      const [extId, _methodName, callbackStatus] = parts as [
        string,
        string,
        'success' | 'error',
      ];
      if (!(extId in this.#subExtensions)) {
        return;
      }

      const callbacks = this.#callbackMap.get(message.callbackId);
      if (callbacks) {
        callbacks[callbackStatus](message.value);
        this.#callbackMap.delete(message.callbackId);
      } else {
        console.warn(
          `Sub extension ${extId} does not have a callback named ${message.callbackId}`,
        );
      }
    }
  }

  #callProcAndForget(extId: string): AnyCallProc {
    return (procName, ...args) => {
      this.#webview.postMessage({
        type: `${extId}:${procName}`,
        value: args.length > 0 ? (args as unknown[]) : undefined,
      });
    };
  }

  #callProcWithReturnValue(extId: string): AnyCallProcWithReturnValue {
    return (procName, ...args) => {
      const callbackId = Math.random().toString(36).slice(2);
      const promise = new Promise<CallProcPromiseInner<ProcMap, string>>(
        (resolve, reject) => {
          this.#callbackMap.set(callbackId, {
            success: resolve as (value: unknown) => void,
            error: reject,
          });
        },
      );

      this.#webview.postMessage({
        type: `${extId}:${procName}`,
        callbackId,
        value: args.length > 0 ? (args as unknown[]) : undefined,
      });

      return promise;
    };
  }

  dispose(): void {
    for (const extension of Object.values(this.#subExtensions)) {
      extension.dispose?.();
    }
  }

  onEditorShown(): void {
    for (const extension of Object.values(this.#subExtensions)) {
      extension.onEditorShown?.();
    }
  }

  onEditorHidden(): void {
    for (const extension of Object.values(this.#subExtensions)) {
      extension.onEditorHidden?.();
    }
  }
}

const scriptTagFromUri = (webview: vscode.Webview, uri: vscode.Uri): string => {
  const scriptUri = webview.asWebviewUri(uri);
  return `<script src="${scriptUri.toString()}"></script>`;
};

const styleTagFromUri = (webview: vscode.Webview, uri: vscode.Uri): string => {
  const scriptUri = webview.asWebviewUri(uri);
  return `<link rel="stylesheet" href="${scriptUri.toString()}">`;
};
