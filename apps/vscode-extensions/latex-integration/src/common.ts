/** VS Code extension host: no procedures exposed to the webview for LaTeX. */
export type VSCodeExtensionProcMap = Record<string, never>;

export interface LatexSetupConfig {
  mathJaxPackageUrl: string;
  /**
   * When false, MathJax skips SRE speech/enrichment. Stock VS Code must pass
   * false (webview workers cannot `importScripts` extension resources); Cursor
   * can pass true. See `host-mathjax-a11y.ts`.
   */
  enableMathJaxA11y: boolean;
}

export interface WebviewProcMap {
  setup: (config: LatexSetupConfig) => Promise<void>;
}
