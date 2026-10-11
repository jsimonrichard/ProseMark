/**
 * Whether this editor host can run MathJax’s SRE speech worker.
 *
 * MathJax boots SRE with a blob worker whose body calls `importScripts` on
 * `sre/speech-worker.js` at the MathJax package URL. Stock VS Code webviews
 * allow blob/`data:` workers but **forbid** `importScripts` (and dynamic
 * `import`) of extension / webview resource URLs — see
 * https://code.visualstudio.com/api/extension-guides/webview#using-web-workers
 *
 * When that call fails, `tex2svgPromise` never settles and math widgets stay
 * empty. Cursor’s webview allows the `importScripts`, so SRE can stay on there.
 *
 * Fail closed: only known-good hosts enable a11y; unknown forks stay off so
 * math still renders.
 */
export function hostSupportsMathJaxSreImportScripts(appName: string): boolean {
  return appName.toLowerCase().includes('cursor');
}
