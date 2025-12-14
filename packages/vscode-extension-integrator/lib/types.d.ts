/* eslint-disable @typescript-eslint/no-explicit-any */

import type * as vscode from 'vscode';

export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

export type ProcMap<KS extends string> = Record<
  KS,
  (arg?: any) => undefined | Promise<any>
>;

type AddValueFromArray<A extends unknown[]> = A extends []
  ? object
  : A extends [infer V]
    ? { value: V }
    : { value?: A[0] };

export type MessageFromProcMap<
  ExtId extends string,
  KS extends string,
  P extends ProcMap<KS>,
> = {
  [K in keyof P]: K extends KS
    ? P[K] extends (...args: infer A) => undefined
      ? Prettify<{ type: `${ExtId}:${K}` } & AddValueFromArray<A>>
      : P[K] extends (...args: infer A) => Promise<any>
        ? Prettify<
            {
              type: `${ExtId}:${K}`;
              callbackId: string;
            } & AddValueFromArray<A>
          >
        : // when ProcMap<string> is passed, this is chosen
          P[K] extends (...args: infer A) => Promise<any> | undefined
          ? Prettify<
              {
                type: `${ExtId}:${K}`;
                callbackId?: string;
              } & AddValueFromArray<A>
            >
          : never
    : never;
}[KS];

export type CallbackResponse<ExtId extends string, KS extends string, R> =
  | {
      type: `${ExtId}:${KS}:callback`;
      callbackId: string;
      value: R;
    }
  | {
      type: `${ExtId}:${KS}:callbackError`;
      callbackId: string;
      value: string;
    };

export type CallbackFromProcMap<
  ExtId extends string,
  KS extends string,
  P extends ProcMap<KS>,
> = {
  [K in keyof P]: K extends KS
    ? P[K] extends (arg: infer _A) => Promise<infer R>
      ? CallbackResponse<ExtId, K, R>
      : // when ProcMap<string> is passed, this is chosen. It's the same as the above (for now)
        P[K] extends (arg: infer A) => Promise<infer R> | undefined
        ? CallbackResponse<ExtId, K, R>
        : never
    : never;
}[KS];

export type AnyCallbackMessage = CallbackResponse<
  string,
  string,
  ProcMap<string>
>;

export type AnyMessageOrCallback =
  | MessageFromProcMap<string, string, ProcMap<string>>
  | CallbackFromProcMap<string, string, ProcMap<string>>;

export interface WebviewVSCodeApiWithPostMessage<MsgType> {
  postMessage: (msg: MsgType) => void;
}

export type ProcNamesWithoutReturnValue<
  KS extends string,
  PM extends ProcMap<KS>,
> = {
  [K in keyof PM]: PM[K] extends (arg: unknown) => void ? K : never;
}[KS];

export type ProcNamesWithReturnValue<
  KS extends string,
  PM extends ProcMap<KS>,
> = {
  [K in keyof PM]: PM[K] extends (arg: unknown) => Promise<any>
    ? K
    : PM[K] extends (arg: unknown) => undefined // not void since everything extends () => void
      ? never
      : K;
}[KS];

export type CallProc<KS extends string, PM extends ProcMap<KS>> = <
  ProcName extends ProcNamesWithoutReturnValue<KS, PM>,
>(
  procName: ProcName,
  ...args: PM[ProcName] extends (...args: infer A) => unknown ? A : []
) => void;

export type AnyCallProc = CallProc<string, ProcMap<string>>;

export type CallProcWithReturnValue<
  KS extends string,
  PM extends ProcMap<KS>,
> = <ProcName extends ProcNamesWithReturnValue<KS, PM>>(
  procName: ProcName,
  ...args: PM[ProcName] extends (...args: infer A) => unknown ? A : []
) => Promise<
  PM[ProcName] extends (arg: unknown) => Promise<infer R>
    ? R
    : PM[ProcName] extends (arg: unknown) => undefined
      ? never
      : any
>;

export type AnyCallProcWithReturnValue = CallProcWithReturnValue<
  string,
  ProcMap<string>
>;

export interface SubExtension<
  ExtId extends string,
  KS extends string,
  PM extends ProcMap<KS>,
> {
  getExtensionId(): ExtId;
  getWebviewScriptUri?(): vscode.Uri;
  getWebviewStyleUri?(): vscode.Uri;
  procMap: PM;
  dispose?(): void;
}

export type AnySubExtension = SubExtension<string, string, ProcMap<string>>;

export type SubExtensionCallback = <
  ExtId extends string,
  KS extends string,
  PM extends ProcMap<KS>,
>(
  callProcAndForget: CallProc<KS, PM>,
  callProcWithReturnValue: CallProcWithReturnValue<KS, PM>,
) => SubExtension<ExtId, KS, PM>;
