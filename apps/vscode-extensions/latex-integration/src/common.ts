/** VS Code extension host: no procedures exposed to the webview for LaTeX. */
export type VSCodeExtensionProcMap = Record<string, never>;

export interface WebviewProcMap {
  /** Absolute webview URL for the copied `mathjax` package root (see build script). */
  setup: (mathJaxPackageUrl: string) => Promise<void>;
}
