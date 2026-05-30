import { SubExtensionCallbackManager } from '@prosemark/vscode-extension-integrator';
import type { SubExtensionCallback } from '@prosemark/vscode-extension-integrator/types';

export const subExtensionCallbackManager = new SubExtensionCallbackManager();

// Where sub extensions hook into the ProseMark editor
export const registerSubExtension: <VSCodeProcMap, WebviewProcMap>(
  extId: string,
  subExtensionCallback: SubExtensionCallback<
    string,
    WebviewProcMap,
    VSCodeProcMap
  >,
) => void = subExtensionCallbackManager.registerSubExtension.bind(
  subExtensionCallbackManager,
);
