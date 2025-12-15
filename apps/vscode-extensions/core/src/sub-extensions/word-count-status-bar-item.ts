import {
  type SubExtension,
  type SubExtensionCallback,
} from '@prosemark/vscode-extension-integrator/types';
import * as vscode from 'vscode';
import { registerSubExtension } from '../extension';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type WordCountProcs = {
  updateWordCount: (wordCount: number, charCount: number) => undefined;
};

const extId = 'word-count-status-bar-item';

class WordCountStatusBarItem
  implements SubExtension<typeof extId, WordCountProcs>
{
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

  procMap: WordCountProcs = {
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
  WordCountProcs
> = (document) => {
  return new WordCountStatusBarItem(document);
};

registerSubExtension(extId, createWordCountStatusBarItem);
