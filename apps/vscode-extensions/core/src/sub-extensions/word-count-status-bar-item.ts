import {
  type SubExtension,
  type SubExtensionCallback,
} from '@prosemark/vscode-extension-integrator/types';
import * as vscode from 'vscode';
import { registerSubExtension } from '../sub-extension-manager';
import type { WordCountVSCodeProcs } from '../common';

const extId = 'core.word-count';

class WordCountStatusBarItem implements SubExtension<
  typeof extId,
  WordCountVSCodeProcs
> {
  #statusBarItem: vscode.StatusBarItem;

  constructor(document: vscode.TextDocument) {
    this.#statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100,
    );
    this.#statusBarItem.tooltip = "Current ProseMark document's word count";
    const { wordCount, charCount } = this.#getInitWordAndCharCount(document);
    this.#updateWordCount(wordCount, charCount);
    this.#statusBarItem.show();
  }

  #getInitWordAndCharCount(document: vscode.TextDocument) {
    const text = document.getText();
    const textTrimmed = text.trim();
    const wordCount = textTrimmed.length ? textTrimmed.split(/\s+/).length : 0;
    const charCount = text.length;
    return {
      wordCount,
      charCount,
    };
  }

  #updateWordCount(wordCount: number, charCount: number) {
    this.#statusBarItem.text = `Word Count: ${wordCount.toString()}, Char Count: ${charCount.toString()}`;
  }

  getExtensionId(): typeof extId {
    return extId;
  }

  procMap: WordCountVSCodeProcs = {
    updateWordCount: (wordCount, charCount) => {
      this.#updateWordCount(wordCount, charCount);
    },
  };

  onEditorShown(): void {
    this.#statusBarItem.show();
  }

  onEditorHidden(): void {
    this.#statusBarItem.hide();
  }

  dispose(): void {
    this.#statusBarItem.dispose();
  }
}

export const createWordCountStatusBarItem: SubExtensionCallback<
  typeof extId,
  Record<string, never>,
  WordCountVSCodeProcs
> = (document) => {
  return new WordCountStatusBarItem(document);
};

export const registerWordCountStatusBarItem = (): void => {
  registerSubExtension(
    extId,
    createWordCountStatusBarItem as SubExtensionCallback<
      typeof extId,
      unknown,
      unknown
    >,
  );
};
