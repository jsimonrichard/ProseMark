import type * as CSpell from './cspell-types.d.ts';

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

export interface VSCodeExtensionProcMap {
  update: (changes: Change[]) => void;
  linkClick: (link: string) => void;
  updateWordCountMsg: (v: { wordCount: number; charCount: number }) => void;

  // Code Spell Check methods
  cSpellAddWordToUserDictionary: (word: string) => void;
  cSpellAddWordToWorkspaceDictionary: (word: string) => void;
  cSpellRequestSpellCheckSuggestions: (word: string) => void;
}

export type WebviewMessage = ProcMapToMessage<
  keyof VSCodeExtensionProcMap,
  VSCodeExtensionProcMap
>;

export interface DynamicConfig {
  tabSize?: number;
  insertSpaces?: boolean;
}

export interface WebviewProcMap {
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

  // Code Spell Check methods
  cSpellDoneAddingWord: (word: string) => void;
  cSpellUpdateInfo: (res: CSpell.CheckDocumentResult) => void;
  cSpellProvideSpellCheckSuggestions: (v: {
    word: string;
    suggestions: CSpell.Suggestion[];
  }) => void;
}

export type VSCodeExtMessage = ProcMapToMessage<
  keyof WebviewProcMap,
  WebviewProcMap
>;

export const exhaustiveMatchingGuard = (_: never): never => {
  throw new Error('Should not have reached here!');
};
