import type { MessageFromProcMap } from '@prosemark/vscode-extension-integrator/types';

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
}

export type WebviewMessage = MessageFromProcMap<'core', VSCodeExtensionProcMap>;

export interface DynamicConfig {
  tabSize?: number;
  insertSpaces?: boolean;
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type WebviewProcMap = {
  init: (
    text: string,
    initConfig: {
      vimModeEnabled?: boolean;
    } & DynamicConfig,
  ) => void;
  set: (text: string) => void;
  update: (changes: Change[]) => void;
  focus: () => void;
  setDynamicConfig: (dynamicConfig: DynamicConfig) => void;
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type WordCountVSCodeProcs = {
  updateWordCount: (wordCount: number, charCount: number) => void;
};

export type VSCodeExtMessage = MessageFromProcMap<'core', WebviewProcMap>;

export const exhaustiveMatchingGuard = (_: never): never => {
  throw new Error('Should not have reached here!');
};
