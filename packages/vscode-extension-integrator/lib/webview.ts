import type { EditorView } from '@codemirror/view';
import type {
  CallbackFromProcMap,
  CallProc,
  CallProcWithReturnValue,
  MessageFromProcMap,
  ProcMap,
  WebviewVSCodeApiWithPostMessage,
} from './types';

export const registerWebviewMessageHandler = <
  ExtId extends string,
  WebviewKS extends string,
  WebviewProcMap extends ProcMap<WebviewKS>,
>(
  extId: ExtId,
  procMap: WebviewProcMap,
  vscode: WebviewVSCodeApiWithPostMessage<
    CallbackFromProcMap<ExtId, WebviewKS, WebviewProcMap>
  >,
): void => {
  window.addEventListener('message', (event) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const message_: object = event.data;
    if (
      !('type' in message_) ||
      !(typeof message_.type === 'string') ||
      !message_.type.startsWith(`${extId}:`)
    ) {
      return;
    }

    const message = message_ as MessageFromProcMap<
      ExtId,
      WebviewKS,
      WebviewProcMap
    >;

    // This could be a proc call or a callback
    const methodName_ = message.type.slice(`${extId}:`.length);
    if (!(methodName_ in procMap)) {
      return;
    }
    const methodName = methodName_ as WebviewKS;

    // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
    let res: Promise<unknown> | void;
    if ('value' in message) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      res = procMap[methodName](message.value as any);
    } else {
      res = procMap[methodName]();
    }

    if (res instanceof Promise && 'callbackId' in message) {
      res
        .then((r) => {
          vscode.postMessage({
            type: `${extId}:${methodName}:callback`,
            callbackId: message.callbackId,
            value: r,
          } as CallbackFromProcMap<ExtId, WebviewKS, WebviewProcMap>);
        })
        .catch((e: unknown) => {
          vscode.postMessage({
            type: `${extId}:${methodName}:callbackError`,
            callbackId: message.callbackId,
            value: typeof e === 'string' ? e : JSON.stringify(e),
          } as CallbackFromProcMap<ExtId, WebviewKS, WebviewProcMap>);
        });
    }
  });
};

export interface VSCodeExtensionIntegratorGlobals {
  callbackMap?: Map<string, (value: unknown) => void>;
  view?: EditorView;
}

declare global {
  export interface Window {
    vscodeExtensionIntegrator?: VSCodeExtensionIntegratorGlobals;
  }
}

export const registerWebviewMessagePoster = <
  ExtId extends string,
  VSCodeKS extends string,
  VSCodeProcMap extends ProcMap<VSCodeKS>,
>(
  extId: ExtId,
  vscode: WebviewVSCodeApiWithPostMessage<
    MessageFromProcMap<ExtId, VSCodeKS, VSCodeProcMap>
  >,
): {
  callProcAndForget: CallProc<VSCodeKS, VSCodeProcMap>;
  callProcWithReturnValue: CallProcWithReturnValue<VSCodeKS, VSCodeProcMap>;
} => {
  window.vscodeExtensionIntegrator ??= {};
  window.vscodeExtensionIntegrator.callbackMap ??= new Map();

  window.addEventListener('message', (event) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const message_: object = event.data;
    if (
      !('type' in message_) ||
      !(typeof message_.type === 'string') ||
      !message_.type.startsWith(`${extId}:`)
    ) {
      return;
    }

    const message = message_ as CallbackFromProcMap<
      ExtId,
      VSCodeKS,
      VSCodeProcMap
    >;

    if (message.type.endsWith(':callback')) {
      const callbackId = `${message.callbackId}:success`;
      const callback =
        window.vscodeExtensionIntegrator?.callbackMap?.get(callbackId);
      if (callback) {
        callback(message.value);
        window.vscodeExtensionIntegrator?.callbackMap?.delete(callbackId);
      }
    } else if (message.type.endsWith(':callbackError')) {
      const callbackId = `${message.callbackId}:error`;
      const callback =
        window.vscodeExtensionIntegrator?.callbackMap?.get(callbackId);
      if (callback) {
        callback(message.value);
        window.vscodeExtensionIntegrator?.callbackMap?.delete(callbackId);
      }
    }
  });

  const callProcAndForget: CallProc<VSCodeKS, VSCodeProcMap> = (
    procName,
    ...args
  ) => {
    vscode.postMessage({
      type: `${extId}:${procName}`,
      value: args.length > 0 ? args[0] : undefined,
    } as MessageFromProcMap<ExtId, VSCodeKS, VSCodeProcMap>);
  };

  const callProcWithReturnValue: CallProcWithReturnValue<
    VSCodeKS,
    VSCodeProcMap
  > = (procName, ...args) => {
    const callbackId = Math.random().toString(36).slice(2);
    const promise = new Promise<
      VSCodeProcMap[typeof procName] extends (arg: unknown) => Promise<infer R>
        ? R
        : never
    >((resolve, reject) => {
      if (!window.vscodeExtensionIntegrator?.callbackMap) {
        return;
      }
      window.vscodeExtensionIntegrator.callbackMap.set(
        `${callbackId}:success`,
        resolve as (value: unknown) => void,
      );
      window.vscodeExtensionIntegrator.callbackMap.set(
        `${callbackId}:error`,
        reject,
      );
    });
    vscode.postMessage({
      type: `${extId}:${procName}`,
      callbackId,
      value: args.length > 0 ? args[0] : undefined,
    } as MessageFromProcMap<ExtId, VSCodeKS, VSCodeProcMap>);

    return promise;
  };

  return {
    callProcAndForget,
    callProcWithReturnValue,
  };
};
