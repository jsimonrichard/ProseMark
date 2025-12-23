import { SubExtensionCallbackManager } from '@prosemark/vscode-extension-integrator';

export const subExtensionCallbackManager = new SubExtensionCallbackManager();

// Where sub extensions hook into the ProseMark editor
export const registerSubExtension =
  subExtensionCallbackManager.registerSubExtension.bind(
    subExtensionCallbackManager,
  );
