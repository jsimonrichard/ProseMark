import * as vscode from 'vscode';
import { type ProseMarkExtensionApi } from '@prosemark/vscode-extension-integrator/types';

import type * as CSpell from './cspell-types';
import { createCSpellIntegration, extId } from './sub-extension.ts';

export function activate(context: vscode.ExtensionContext): void {
  // Get ProseMark API
  const proseMarkExtension =
    vscode.extensions.getExtension<ProseMarkExtensionApi>(
      'jsimonrichard.vscode-prosemark',
    );
  if (!proseMarkExtension) {
    throw new Error('ProseMark extension not found');
  }
  const proseMarkApi = proseMarkExtension.exports;

  // Get Code Spell Checker API
  const cSpellExtension = vscode.extensions.getExtension<CSpell.ExtensionApi>(
    'streetsidesoftware.code-spell-checker',
  );
  if (!cSpellExtension) {
    throw new Error('Code Spell Checker extension not found');
  }
  const cSpellApi = cSpellExtension.exports;

  // Register CSpell integration
  const createCSpellIntegration_ = createCSpellIntegration(
    context.extensionUri,
    cSpellApi,
  );
  proseMarkApi.registerSubExtension(extId, createCSpellIntegration_);
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
export function deactivate(): void {}
