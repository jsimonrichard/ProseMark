/** Keep in sync with `@myriaddreamin/typst-ts-*` in `package.json`. */
export const TYPST_TS_VERSION = '0.7.0-rc2';

const jsdelivrWasmUrl = (packageName: string, file: string): string =>
  `https://cdn.jsdelivr.net/npm/${packageName}@${TYPST_TS_VERSION}/${file}`;

/** Default compiler `.wasm` URL (jsDelivr, pinned to {@link TYPST_TS_VERSION}). */
export const defaultCompilerWasmUrl = (): string =>
  jsdelivrWasmUrl(
    '@myriaddreamin/typst-ts-web-compiler',
    'pkg/typst_ts_web_compiler_bg.wasm',
  );

/** Default renderer `.wasm` URL (jsDelivr, pinned to {@link TYPST_TS_VERSION}). */
export const defaultRendererWasmUrl = (): string =>
  jsdelivrWasmUrl(
    '@myriaddreamin/typst-ts-renderer',
    'pkg/typst_ts_renderer_bg.wasm',
  );

/** jsDelivr WASM URLs for {@link typstMarkdownEditorExtensions} options. */
export const jsdelivrTypstWasmUrls = (): {
  compilerWasmUrl: string;
  rendererWasmUrl: string;
} => ({
  compilerWasmUrl: defaultCompilerWasmUrl(),
  rendererWasmUrl: defaultRendererWasmUrl(),
});
