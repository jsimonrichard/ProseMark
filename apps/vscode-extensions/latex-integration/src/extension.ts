import * as vscode from 'vscode';
import { type ProseMarkExtensionApi } from '@prosemark/vscode-extension-integrator/types';

import { createLatexIntegration, extId } from './sub-extension.ts';

export function activate(context: vscode.ExtensionContext): void {
  const proseMarkExtension =
    vscode.extensions.getExtension<ProseMarkExtensionApi>(
      'jsimonrichard.vscode-prosemark',
    );
  if (!proseMarkExtension) {
    throw new Error('ProseMark extension not found');
  }
  const proseMarkApi = proseMarkExtension.exports;

  const createLatexIntegration_ = createLatexIntegration(
    context.extensionUri,
  );
  proseMarkApi.registerSubExtension(extId, createLatexIntegration_);
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
export function deactivate(): void {}
