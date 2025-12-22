import type * as CSpell from './cspell-types';

export interface VSCodeExtensionProcMap {
  addWordToUserDictionary: (word: string) => Promise<void>;
  addWordToWorkspaceDictionary: (word: string) => Promise<void>;
  requestSpellcheckSuggestions: (word: string) => Promise<CSpell.Suggestion[]>;
}

export interface WebviewProcMap {
  setup: () => Promise<void>;
  updateInfo: (res: CSpell.CheckDocumentResult) => void;
}
