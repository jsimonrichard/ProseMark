import type * as CSpell from './cspell-types';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type VSCodeExtensionProcMap = {
  addWordToUserDictionary: (word: string) => Promise<undefined>;
  addWordToWorkspaceDictionary: (word: string) => Promise<undefined>;
  requestSpellCheckSuggestions: (word: string) => Promise<CSpell.Suggestion[]>;
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type WebviewProcMap = {
  setup: () => Promise<undefined>;
  updateInfo: (res: CSpell.CheckDocumentResult) => undefined;
};
