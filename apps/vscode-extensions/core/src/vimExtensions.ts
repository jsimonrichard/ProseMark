import * as vscode from 'vscode';

/**
 * Single list of normal-editor vim extensions that turn ProseMark vim mode on
 * when `prosemark.vimModeEnabled` is unset. Do not branch on these ids elsewhere.
 */
export const KNOWN_VIM_EXTENSION_IDS = [
  'vscodevim.vim',
  'asvetliakov.vscode-neovim',
] as const;

export type KnownVimExtensionId = (typeof KNOWN_VIM_EXTENSION_IDS)[number];

/**
 * Resolve whether the webview should install the vim keymap.
 * Explicit setting wins; when unset, follow known vim-extension presence.
 */
export function resolveVimModeEnabled(
  setting: boolean | undefined,
  knownVimExtensionEnabled: boolean,
): boolean {
  if (setting === true) {
    return true;
  }
  if (setting === false) {
    return false;
  }
  return knownVimExtensionEnabled;
}

export function isKnownVimExtensionEnabled(): boolean {
  return KNOWN_VIM_EXTENSION_IDS.some(
    (id) => vscode.extensions.getExtension(id) !== undefined,
  );
}

/**
 * Read `prosemark.vimModeEnabled` and known vim-extension presence.
 * Unset (no user/workspace value) means follow detection.
 */
export function getVimModeEnabledFromWorkspace(): boolean {
  const config = vscode.workspace.getConfiguration('prosemark');
  const inspected = config.inspect<boolean>('vimModeEnabled');
  const setting =
    inspected?.workspaceFolderValue ??
    inspected?.workspaceValue ??
    inspected?.globalValue;

  return resolveVimModeEnabled(setting, isKnownVimExtensionEnabled());
}
