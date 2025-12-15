/* eslint-disable @typescript-eslint/no-explicit-any */

import type * as vscode from 'vscode';

export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

export type ProcMap = Record<
  string,
  (...args: any[]) => undefined | Promise<any>
>;

type AddValueFromArray<A extends unknown[]> = A extends []
  ? object
  : { value: A };

type NoColon<T extends string> = T extends `${string}:${string}` ? never : T;

export type MessageFromProcMap<ExtId extends string, P extends ProcMap> = {
  [K in Extract<keyof P, string>]: P[K] extends (...args: infer A) => undefined
    ? Prettify<{ type: `${NoColon<ExtId>}:${K}` } & AddValueFromArray<A>>
    : P[K] extends (...args: infer A) => Promise<any>
      ? Prettify<
          {
            type: `${NoColon<ExtId>}:${K}`;
            callbackId: string;
          } & AddValueFromArray<A>
        >
      : // when ProcMap<string> is passed, this is chosen
        P[K] extends (...args: infer A) => Promise<any> | undefined
        ? Prettify<
            {
              type: `${NoColon<ExtId>}:${K}`;
              callbackId?: string;
            } & AddValueFromArray<A>
          >
        : never;
}[Extract<keyof P, string>];

export type CallbackResponse<ExtId extends string, KS extends string, R> =
  | {
      type: `${NoColon<ExtId>}:${KS}:callback`;
      callbackId: string;
      value: R;
    }
  | {
      type: `${NoColon<ExtId>}:${KS}:callbackError`;
      callbackId: string;
      value: string;
    };

export type CallbackFromProcMap<ExtId extends string, P extends ProcMap> = {
  [K in Extract<keyof P, string>]: P[K] extends (
    ...args: any[]
  ) => Promise<infer R>
    ? CallbackResponse<ExtId, K, R>
    : // when ProcMap<string> is passed, this is chosen. It's the same as the above (for now)
      P[K] extends (...args: any[]) => Promise<infer R> | undefined
      ? CallbackResponse<ExtId, K, R>
      : never;
}[Extract<keyof P, string>];

export type AnyCallbackMessage = CallbackFromProcMap<string, ProcMap>;

export type AnyMessageOrCallback =
  | MessageFromProcMap<string, ProcMap>
  | CallbackFromProcMap<string, ProcMap>;

export interface WebviewVSCodeApiWithPostMessage<MsgType> {
  postMessage: (msg: MsgType) => void;
}

export type ProcNamesWithoutReturnValue<PM extends ProcMap> = {
  [K in Extract<keyof PM, string>]: PM[K] extends (...args: any[]) => undefined
    ? K
    : PM[K] extends (...args: any[]) => Promise<any>
      ? never
      : K;
}[Extract<keyof PM, string>];

export type ProcNamesWithReturnValue<PM extends ProcMap> = {
  [K in Extract<keyof PM, string>]: PM[K] extends (
    ...args: any[]
  ) => Promise<any>
    ? K
    : PM[K] extends (...args: any[]) => undefined
      ? never
      : K;
}[Extract<keyof PM, string>];

export type CallProc<PM extends ProcMap> = <
  ProcName extends ProcNamesWithoutReturnValue<PM>,
>(
  procName: ProcName & string,
  ...args: PM[ProcName] extends (...args: infer A) => unknown ? A : []
) => void;

export type AnyCallProc = CallProc<ProcMap>;

export type CallProcPromiseInner<
  PM extends ProcMap,
  ProcName extends ProcNamesWithReturnValue<PM>,
> = PM[ProcName] extends (...args: any[]) => Promise<infer R>
  ? R
  : PM[ProcName] extends (...args: any[]) => undefined
    ? never
    : any;

export type CallProcWithReturnValue<PM extends ProcMap> = <
  ProcName extends ProcNamesWithReturnValue<PM>,
>(
  procName: ProcName & string,
  ...args: PM[ProcName] extends (...args: infer A) => unknown ? A : []
) => Promise<CallProcPromiseInner<PM, ProcName>>;

export type AnyCallProcWithReturnValue = CallProcWithReturnValue<ProcMap>;

export interface Change {
  fromLine: number;
  fromChar: number;
  toLine: number;
  toChar: number;
  insert: string;
}

export interface SubExtension<ExtId extends string, VSCodePM extends ProcMap> {
  getExtensionId(): ExtId;
  getWebviewScriptUri?(): vscode.Uri;
  getWebviewStyleUri?(): vscode.Uri;
  getLocalResourceRoots?(): vscode.Uri[];
  procMap: VSCodePM;
  onReady?(): void;
  onEditorShown?(): void;
  onEditorHidden?(): void;
  onTextDocumentChange?(changes: Change[]): void;
  dispose?(): void;
}

export type AnySubExtension = SubExtension<string, ProcMap>;

export type SubExtensionCallback<
  ExtId extends string,
  WebviewPM extends ProcMap,
  VSCodePM extends ProcMap,
> = (
  document: vscode.TextDocument,
  callProcAndForget: CallProc<WebviewPM>,
  callProcWithReturnValue: CallProcWithReturnValue<WebviewPM>,
) => SubExtension<ExtId, VSCodePM>;

export type AnySubExtensionCallback = SubExtensionCallback<
  string,
  ProcMap,
  ProcMap
>;

export interface ProseMarkExtensionApi {
  registerSubExtension: (
    extId: string,
    subExtensionCallback: AnySubExtensionCallback,
  ) => void;
}
