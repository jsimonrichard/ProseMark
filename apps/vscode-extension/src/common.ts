type ProcMapToMessage<P extends Record<string, (arg?: any) => any>> = {
  [K in keyof P]: P[K] extends (arg: unknown) => any
    ? { type: K }
    : P[K] extends (arg: infer A) => any
      ? {
          type: K;
          value: A;
        }
      : { type: K };
}[keyof P];

type ProcMap = Record<string, (arg: any) => any>;
type Message = ProcMapToMessage<ProcMap>;

export type Change = {
  fromLine: number;
  fromChar: number;
  toLine: number;
  toChar: number;
  insert: string;
};

export type WebviewProcMap = {
  update: (changes: Change[]) => void;
  linkClick: (link: string) => void;
};

export type WebViewMessage = ProcMapToMessage<WebviewProcMap>;

export type DynamicConfig = {
  tabSize?: number;
  insertSpaces?: boolean;
};

export type VSCodeProcMap = {
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
};

export type VSCodeMessage = ProcMapToMessage<VSCodeProcMap>;

export const exhaustiveMatchingGuard = (_: never): never => {
  throw new Error('Should not have reached here!');
};
