import type * as CSpell from './cspell-types';

export interface VSCodeExtensionProcMap extends Record<string, any> {
  addWordToUserDictionary: (word: string) => Promise<undefined>;
  addWordToWorkspaceDictionary: (word: string) => Promise<undefined>;
  requestSpellCheckSuggestions: (word: string) => Promise<CSpell.Suggestion[]>;
}

export interface WebviewProcMap extends Record<string, any> {
  setup: () => void;
  updateInfo: (res: CSpell.CheckDocumentResult) => void;
}
