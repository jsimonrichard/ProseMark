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
  requestFullDocument: () => Promise<string>;
  reportFrontendError: (error: FrontendError) => void;
}

export type WebviewMessage = MessageFromProcMap<'core', VSCodeExtensionProcMap>;

export interface DynamicConfig {
  tabSize?: number;
  insertSpaces?: boolean;
}

export interface WebviewProcMap {
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
}

export interface WordCountVSCodeProcs {
  updateWordCount: (wordCount: number, charCount: number) => void;
}

export type VSCodeExtMessage = MessageFromProcMap<'core', WebviewProcMap>;

export interface FrontendError {
  message: string;
  source: string;
  severity: 'recoverable' | 'fatal';
  details?: string;
}

export const exhaustiveMatchingGuard = (_: never): never => {
  throw new Error('Should not have reached here!');
};
