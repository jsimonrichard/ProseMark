type ProcMapToMessage<
  KS extends string,
  P extends Record<KS, (arg?: any) => any>,
> = {
  [K in keyof P]: P[K] extends (arg: unknown) => any
    ? { type: K }
    : P[K] extends (arg: infer A) => any
      ? {
          type: K;
          value: A;
        }
      : { type: K };
}[keyof P];

export interface Change {
  fromLine: number;
  fromChar: number;
  toLine: number;
  toChar: number;
  insert: string;
}

export interface WebviewProcMap {
  update: (changes: Change[]) => void;
  linkClick: (link: string) => void;
  updateWordCountMsg: (v: { wordCount: number; charCount: number }) => void;
}

export type WebViewMessage = ProcMapToMessage<
  keyof WebviewProcMap,
  WebviewProcMap
>;

export interface DynamicConfig {
  tabSize?: number;
  insertSpaces?: boolean;
}

export interface VSCodeProcMap {
  init: (
    v: {
      text: string;
      vimModeEnabled?: boolean;
    } & DynamicConfig,
  ) => void;
  set: (text: string) => void;
  update: (changes: Change[]) => void;
  focus: () => void;
  setDynamicConfig: (dynamicConfig: DynamicConfig) => void;
}

export type VSCodeMessage = ProcMapToMessage<
  keyof VSCodeProcMap,
  VSCodeProcMap
>;

export const exhaustiveMatchingGuard = (_: never): never => {
  throw new Error('Should not have reached here!');
};
