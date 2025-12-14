import * as vscode from 'vscode';
import type {
  AnyCallbackMessage,
  AnyCallProc,
  AnyCallProcWithReturnValue,
  AnyMessageOrCallback,
  AnySubExtension,
  ProcMap,
  SubExtensionCallback,
} from './types';

export class SubExtensionCallbackManager {
  #subExtensionCallbacks: Record<string, SubExtensionCallback> = {};

  registerSubExtension(
    extId: string,
    subExtensionCallback: SubExtensionCallback,
  ): void {
    this.#subExtensionCallbacks[extId] = subExtensionCallback;
  }

  buildExtensionManager(webview: vscode.Webview): SubExtensionManager {
    return new SubExtensionManager(this.#subExtensionCallbacks, webview);
  }
}

export class SubExtensionManager {
  #subExtensions: Record<string, AnySubExtension>;
  #webview: vscode.Webview;
  #callbackMap = new Map<string, (value: unknown) => void>();

  constructor(
    subExtensionCallbacks: Record<string, SubExtensionCallback>,
    webview: vscode.Webview,
  ) {
    this.#webview = webview;

    const extensions: Record<string, AnySubExtension> = {};
    for (const [key, callback] of Object.entries(subExtensionCallbacks)) {
      extensions[key] = callback(
        this.#callProcAndForget(key),
        this.#callProcWithReturnValue(key),
      );
    }

    this.#subExtensions = extensions;
  }

  getExtensionScriptTags(): string {
    const html = Object.entries(this.#subExtensions)
      .map(([_key, ext]) => {
        if (!ext.getWebviewScriptUri) {
          return null;
        }
        const scriptUri = this.#webview
          .asWebviewUri(ext.getWebviewScriptUri())
          .toString();
        return `<script src="${scriptUri}"></script>`;
      })
      .filter((s) => !!s)
      .join('\n');
    return html;
  }

  getExtensionStyleTags(): string {
    const html = Object.entries(this.#subExtensions)
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
    return html;
  }

  handleWebviewMessage(message: AnyMessageOrCallback): void {
    const parts = message.type.split(':');
    if (parts.length === 2) {
      const [extId, methodName] = parts as [string, string];
      const subExtension = this.#subExtensions[extId];
      if (!subExtension) {
        return;
      }
      if (methodName in subExtension.procMap) {
        const proc = subExtension.procMap[methodName];
        if (proc instanceof Function) {
          const res = proc(message.value);

          if (res instanceof Promise && 'callbackId' in message) {
            res
              .then((r) => {
                this.#webview.postMessage({
                  type: `${extId}:${methodName}:callback`,
                  callbackId: message.callbackId,
                  value: r as unknown,
                } as AnyCallbackMessage);
              })
              .catch((e: unknown) => {
                this.#webview.postMessage({
                  type: `${extId}:${methodName}:callbackError`,
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
      const [extId, _methodName, callbackId] = parts as [
        string,
        string,
        string,
      ];
      const subExtension = this.#subExtensions[extId];
      if (!subExtension) {
        return;
      }

      if (callbackId in this.#callbackMap) {
        const callback = this.#callbackMap.get(callbackId);
        if (callback) {
          callback(message.value);
          this.#callbackMap.delete(callbackId);
        }
      }
    }
  }

  #callProcAndForget(extId: string): AnyCallProc {
    return (procName, ...args) => {
      this.#webview.postMessage({
        type: `${extId}:${procName}`,
        value: args.length > 0 ? (args[0] as unknown) : undefined,
      });
    };
  }

  #callProcWithReturnValue(extId: string): AnyCallProcWithReturnValue {
    return (procName, ...args) => {
      const callbackId = Math.random().toString(36).slice(2);
      const promise = new Promise<
        ProcMap<string>[typeof procName] extends (arg: unknown) => infer R
          ? R
          : never
      >((resolve, reject) => {
        if (!window.vscodeExtensionIntegrator?.callbackMap) {
          return;
        }
        this.#callbackMap.set(
          `${callbackId}:success`,
          resolve as (value: unknown) => void,
        );
        this.#callbackMap.set(`${callbackId}:error`, reject);
      });

      this.#webview.postMessage({
        type: `${extId}:${procName}`,
        callbackId,
        value: args.length > 0 ? (args[0] as unknown) : undefined,
      });

      return promise;
    };
  }
}
