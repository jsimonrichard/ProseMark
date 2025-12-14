import * as vscode from 'vscode';
import * as path from 'path';
import {
  type Change,
  type VSCodeExtensionProcMap,
  type VSCodeExtMessage,
  type WebviewMessage,
} from './common.ts';

import type * as CSpell from './cspell-types';

export function activate(context: vscode.ExtensionContext): void {
  const cSpellExtension = vscode.extensions.getExtension<CSpell.ExtensionApi>(
    'streetsidesoftware.code-spell-checker',
  );
  if (!cSpellExtension) {
    throw new Error('Code Spell Checker extension not found');
  }

  const cSpellApi = cSpellExtension.exports;

  context.subscriptions.push();
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
export function deactivate(): void {}
