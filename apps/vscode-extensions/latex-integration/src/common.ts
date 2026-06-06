/** VS Code extension host: no procedures exposed to the webview for LaTeX. */
export type VSCodeExtensionProcMap = Record<string, never>;

export interface LatexSetupConfig {
  mathJaxPackageUrl: string;
}

export interface WebviewProcMap {
  setup: (config: LatexSetupConfig) => Promise<void>;
}
