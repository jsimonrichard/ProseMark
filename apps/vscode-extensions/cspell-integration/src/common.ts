import type * as CSpell from './cspell-types';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type VSCodeExtensionProcMap = {
  addWordToUserDictionary: (word: string) => Promise<void>;
  addWordToWorkspaceDictionary: (word: string) => Promise<void>;
  requestSpellCheckSuggestions: (word: string) => Promise<CSpell.Suggestion[]>;
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type WebviewProcMap = {
  setup: () => Promise<void>;
  updateInfo: (res: CSpell.CheckDocumentResult) => void;
};
