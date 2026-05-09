/** VS Code extension host: no procedures exposed to the webview for LaTeX. */
export type VSCodeExtensionProcMap = Record<string, never>;

export interface WebviewProcMap {
  setup: () => Promise<void>;
}
