import type * as CSpell from './cspell-types';

export interface VSCodeExtensionProcMap extends Record<string, any> {
  addWordToUserDictionary: (word: string) => void;
  addWordToWorkspaceDictionary: (word: string) => void;
  requestSpellCheckSuggestions: (word: string) => void;
}

export interface WebviewProcMap extends Record<string, any> {
  setup: () => void;
  updateInfo: (res: CSpell.CheckDocumentResult) => void;
}
