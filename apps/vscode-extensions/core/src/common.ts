import type { MessageFromProcMap } from '@prosemark/vscode-extension-integrator/types';

export interface Change {
  fromLine: number;
  fromChar: number;
  toLine: number;
  toChar: number;
  insert: string;
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type VSCodeExtensionProcMap = {
  update: (changes: Change[]) => undefined;
  linkClick: (link: string) => undefined;
};

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
  ) => undefined;
  set: (text: string) => undefined;
  update: (changes: Change[]) => undefined;
  focus: () => undefined;
  setDynamicConfig: (dynamicConfig: DynamicConfig) => undefined;
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type WordCountVSCodeProcs = {
  updateWordCount: (wordCount: number, charCount: number) => undefined;
};

export type VSCodeExtMessage = MessageFromProcMap<'core', WebviewProcMap>;

export const exhaustiveMatchingGuard = (_: never): never => {
  throw new Error('Should not have reached here!');
};
