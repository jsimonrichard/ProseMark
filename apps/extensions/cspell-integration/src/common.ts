import type * as CSpell from './cspell-types';

export interface Change {
  fromLine: number;
  fromChar: number;
  toLine: number;
  toChar: number;
  insert: string;
}

export interface VSCodeExtensionProcMap {
  addWordToUserDictionary: (word: string) => void;
  addWordToWorkspaceDictionary: (word: string) => void;
  requestSpellCheckSuggestions: (word: string) => void;
}

export interface WebviewProcMap {
  doneAddingWord: (word: string) => void;
  updateInfo: (res: CSpell.CheckDocumentResult) => void;
  provideSpellCheckSuggestions: (v: {
    word: string;
    suggestions: CSpell.Suggestion[];
  }) => void;
}

export type WebviewMessage = ProcMapToMessage<
  keyof VSCodeExtensionProcMap,
  VSCodeExtensionProcMap
>;

export interface DynamicConfig {
  tabSize?: number;
  insertSpaces?: boolean;
}

export type VSCodeExtMessage = ProcMapToMessage<
  keyof WebviewProcMap,
  WebviewProcMap
>;

export const exhaustiveMatchingGuard = (_: never): never => {
  throw new Error('Should not have reached here!');
};
