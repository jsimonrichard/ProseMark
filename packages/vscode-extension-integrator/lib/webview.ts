import type { EditorView } from '@codemirror/view';
import type { Compartment } from '@codemirror/state';
import type {
  CallbackFromProcMap,
  CallProc,
  CallProcWithReturnValue,
  MessageFromProcMap,
  ProcMap,
  WebviewVSCodeApiWithPostMessage,
} from './types';
import type { EXTERNAL_MODULES } from './rolldown-plugin';

export interface ProseMarkGlobals {
  callbackMap?: Map<
    string,
    {
      success: (value: unknown) => void;
      error: (value: unknown) => void;
    }
  >;
  view?: EditorView;
  vscode?: unknown;
  extraCodeMirrorExtensions?: Compartment;
  externalModules?: Record<(typeof EXTERNAL_MODULES)[number], unknown>;
}

declare global {
  export interface Window {
    proseMark?: ProseMarkGlobals;
  }
}

export const registerWebviewMessageHandler = <
  ExtId extends string,
  WebviewProcMap extends ProcMap,
>(
  extId: ExtId,
  procMap: WebviewProcMap,
  vscode: WebviewVSCodeApiWithPostMessage<
    CallbackFromProcMap<ExtId, WebviewProcMap>
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

    const message = message_ as MessageFromProcMap<ExtId, WebviewProcMap>;

    // This could be a proc call or a callback
    const methodName = message.type.slice(`${extId}:`.length);
    if (!(methodName in procMap)) {
      // this also catches callbacks
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
    let res: Promise<unknown> | void;
    if ('value' in message) {
      res = procMap[methodName]?.(...message.value);
    } else {
      res = procMap[methodName]?.();
    }

    if (res instanceof Promise && 'callbackId' in message) {
      res
        .then((r) => {
          vscode.postMessage({
            type: `${extId}:${methodName}-callback:success`,
            callbackId: message.callbackId,
            value: r,
          } as CallbackFromProcMap<ExtId, WebviewProcMap>);
        })
        .catch((e: unknown) => {
          vscode.postMessage({
            type: `${extId}:${methodName}-callback:error`,
            callbackId: message.callbackId,
            value: typeof e === 'string' ? e : JSON.stringify(e),
          } as CallbackFromProcMap<ExtId, WebviewProcMap>);
        });
    }
  });
};

export const registerWebviewMessagePoster = <
  ExtId extends string,
  VSCodeProcMap extends ProcMap,
>(
  extId: ExtId,
  vscode: WebviewVSCodeApiWithPostMessage<
    MessageFromProcMap<ExtId, VSCodeProcMap>
  >,
): {
  callProcAndForget: CallProc<VSCodeProcMap>;
  callProcWithReturnValue: CallProcWithReturnValue<VSCodeProcMap>;
} => {
  window.proseMark ??= {};
  window.proseMark.callbackMap ??= new Map();

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

    const message = message_ as CallbackFromProcMap<ExtId, VSCodeProcMap>;
    const [_extId, methodName, callbackStatus] = message.type.split(':') as [
      string,
      string,
      'success' | 'error',
    ];

    if (!methodName.endsWith('-callback')) {
      return;
    }

    const callbacks = window.proseMark?.callbackMap?.get(message.callbackId);
    if (callbacks) {
      callbacks[callbackStatus](message.value);
      window.proseMark?.callbackMap?.delete(message.callbackId);
    }
  });

  const callProcAndForget: CallProc<VSCodeProcMap> = (procName, ...args) => {
    vscode.postMessage({
      type: `${extId}:${procName}`,
      value: args.length > 0 ? args : undefined,
    } as MessageFromProcMap<ExtId, VSCodeProcMap>);
  };

  const callProcWithReturnValue: CallProcWithReturnValue<VSCodeProcMap> = (
    procName,
    ...args
  ) => {
    const callbackId = Math.random().toString(36).slice(2);
    const promise = new Promise<
      VSCodeProcMap[typeof procName] extends (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...args: any[]
      ) => Promise<infer R>
        ? R
        : never
    >((resolve, reject) => {
      if (!window.proseMark?.callbackMap) {
        return;
      }
      window.proseMark.callbackMap.set(callbackId, {
        success: resolve as (value: unknown) => void,
        error: reject,
      });
    });
    vscode.postMessage({
      type: `${extId}:${procName}`,
      callbackId,
      value: args.length > 0 ? args : undefined,
    } as MessageFromProcMap<ExtId, VSCodeProcMap>);

    return promise;
  };

  return {
    callProcAndForget,
    callProcWithReturnValue,
  };
};
