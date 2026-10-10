/** VS Code extension host: no procedures exposed to the webview for vim. */
export type VSCodeExtensionProcMap = Record<string, never>;

export interface WebviewProcMap {
  setup: (vimModeEnabled: boolean) => Promise<void>;
}
