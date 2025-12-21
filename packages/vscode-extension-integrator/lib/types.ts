/* eslint-disable @typescript-eslint/no-explicit-any */

import type * as vscode from 'vscode';

export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

// 2.  The union of every legal procedure shape.
export type AnyProc =
  | ((...args: any[]) => void)
  | ((...args: any[]) => Promise<void>)
  | ((...args: any[]) => Promise<any>);

// eslint-disable-next-line @typescript-eslint/consistent-indexed-object-style
export type AnyProcMap = object;

export type CompleteProcMap = Record<string, AnyProc>;

// type ExtractVoid<T> = T extends (...args: any[]) => infer R
//   ? // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
//     R extends void
//     ? T
//     : never
//   : never;

// type ExtractPromiseVoid<T> = T extends (...args: any[]) => Promise<infer R>
//   ? // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
//     R extends void
//     ? T
//     : never
//   : never;

type IsOnlyVoid<T> = (
  T extends (...args: any[]) => infer R
    ? // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
      R extends void
      ? 'void'
      : 'not void'
    : 'not a function'
) extends 'void'
  ? true
  : false;

type IsOnlyPromiseVoid<T> = (
  T extends (...args: any[]) => Promise<infer R>
    ? // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
      R extends void
      ? 'void'
      : 'not void'
    : 'not a promise function'
) extends 'void'
  ? true
  : false;

type IsOnlyPromise<T> = (
  T extends (...args: any[]) => Promise<any>
    ? 'promise'
    : 'not a promise function'
) extends 'promise'
  ? true
  : false;

type ChooseFromReturnValue<M, V, PV, P, Default = never> =
  IsOnlyVoid<M> extends true
    ? V
    : IsOnlyPromiseVoid<M> extends true
      ? PV
      : IsOnlyPromise<M> extends true
        ? P
        : M extends AnyProc
          ? Prettify<V | PV | P>
          : Default;

type GetArgs<M, Default = never> = M extends (...args: infer A) => any
  ? A
  : Default;

type GetPromiseReturnType<M, Default = never> = M extends (
  ...args: any[]
) => Promise<infer R>
  ? R
  : Default;

type AddValueFromArray<A extends unknown[]> = A extends []
  ? object
  : { value: A };

type NoColon<T extends string> = T extends `${string}:${string}` ? never : T;

export type MessageFromProcMap<ExtId extends string, P = CompleteProcMap> = {
  [K in Extract<keyof P, string>]: ChooseFromReturnValue<
    P[K],
    // return void
    Prettify<
      { type: `${NoColon<ExtId>}:${K}` } & AddValueFromArray<GetArgs<P[K]>>
    >,
    // return Promise<void>
    Prettify<
      {
        type: `${NoColon<ExtId>}:${K}`;
        callbackId: string;
      } & AddValueFromArray<GetArgs<P[K]>>
    >,
    // return Promise<any>
    Prettify<
      {
        type: `${NoColon<ExtId>}:${K}`;
        callbackId: string;
      } & AddValueFromArray<GetArgs<P[K]>>
    >
  >;
}[Extract<keyof P, string>];

export type CallbackResponse<ExtId extends string, KS extends string, R> =
  | {
      type: `${NoColon<ExtId>}:${KS}-callback:success`;
      callbackId: string;
      value: R;
    }
  | {
      type: `${NoColon<ExtId>}:${KS}-callback:error`;
      callbackId: string;
      value: string;
    };

export type CallbackFromProcMap<ExtId extends string, P = CompleteProcMap> = {
  [K in Extract<keyof P, string>]: ChooseFromReturnValue<
    P[K],
    never,
    CallbackResponse<ExtId, K, undefined>,
    CallbackResponse<ExtId, K, GetPromiseReturnType<P[K]>>
  >;
}[Extract<keyof P, string>];

export type AnyCallbackMessage = CallbackFromProcMap<string>;

export type AnyMessageOrCallback =
  | MessageFromProcMap<string>
  | CallbackFromProcMap<string>;

export interface WebviewVSCodeApiWithPostMessage<MsgType> {
  postMessage: (msg: MsgType) => void;
}

export type ProcNamesWithoutReturnValue<PM> = {
  [K in Extract<keyof PM, string>]: PM[K] extends (...args: any[]) => undefined
    ? K
    : PM[K] extends (...args: any[]) => Promise<any>
      ? never
      : K;
}[Extract<keyof PM, string>];

export type ProcNamesWithReturnValue<PM> = {
  [K in Extract<keyof PM, string>]: PM[K] extends (
    ...args: any[]
  ) => Promise<any>
    ? K
    : PM[K] extends (...args: any[]) => undefined
      ? never
      : K;
}[Extract<keyof PM, string>];

export type CallProc<PM = CompleteProcMap> = <
  ProcName extends ProcNamesWithoutReturnValue<PM>,
>(
  procName: ProcName & string,
  ...args: PM[ProcName] extends (...args: infer A) => unknown ? A : []
) => void;

export type AnyCallProc = CallProc;

export type CallProcPromiseInner<
  PM,
  ProcName extends ProcNamesWithReturnValue<PM>,
> = PM[ProcName] extends (...args: any[]) => Promise<infer R>
  ? R
  : PM[ProcName] extends (...args: any[]) => undefined
    ? never
    : any;

export type CallProcWithReturnValue<PM = CompleteProcMap> = <
  ProcName extends ProcNamesWithReturnValue<PM>,
>(
  procName: ProcName & string,
  ...args: PM[ProcName] extends (...args: infer A) => unknown ? A : []
) => Promise<CallProcPromiseInner<PM, ProcName>>;

export type AnyCallProcWithReturnValue = CallProcWithReturnValue;

export interface Change {
  fromLine: number;
  fromChar: number;
  toLine: number;
  toChar: number;
  insert: string;
}

export interface SubExtension<ExtId extends string, VSCodePM> {
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

export type UnknownSubExtension = SubExtension<string, unknown>;

export type SubExtensionCallback<ExtId extends string, WebviewPM, VSCodePM> = (
  document: vscode.TextDocument,
  callProcAndForget: CallProc<WebviewPM>,
  callProcWithReturnValue: CallProcWithReturnValue<WebviewPM>,
) => SubExtension<ExtId, VSCodePM>;

export interface ProseMarkExtensionApi {
  registerSubExtension<VSCodePM, WebviewPM>(
    extId: string,
    subExtensionCallback: SubExtensionCallback<string, WebviewPM, VSCodePM>,
  ): void;
}
