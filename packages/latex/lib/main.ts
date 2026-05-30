import { Decoration, EditorView, WidgetType } from '@codemirror/view';
import {
  foldableSyntaxFacet,
  selectAllDecorationsOnSelectExtension,
} from '@prosemark/core';
import type { EditorState, Extension } from '@codemirror/state';
import type { SyntaxNodeRef } from '@lezer/common';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';

import { latexMathDelimiterTag, latexMathFormulaTag } from './markdown';

export {
  latexMathDelimiterTag,
  latexMathFormulaTag,
  latexMathMarkdownSyntaxExtension,
} from './markdown';

const WIDGET_CLASS = 'cm-latex-math';
const WIDGET_ERROR_CLASS = `${WIDGET_CLASS}-error`;
const WIDGET_ERROR_MESSAGE_CLASS = `${WIDGET_CLASS}-error-message`;
const WIDGET_ERROR_SOURCE_CLASS = `${WIDGET_CLASS}-error-source`;

/** Keep in sync with the default {@link mathjaxPackageRoot} CDN version. */
const MATHJAX_VERSION = '4.1.1';

const mathjaxPackageRoot = (): string =>
  `https://cdn.jsdelivr.net/npm/mathjax@${MATHJAX_VERSION}`;

/** Absolute module URL for MathJax’s combined startup bundle (no bare specifier). */
const mathJaxStartupModuleUrl = (
  packageUrl: string,
  file: 'tex-svg.js' | 'tex-chtml.js',
): string => {
  const base = packageUrl.replace(/\/+$/, '');
  return `${base}/${file}`;
};

export type LatexMathOutput = 'svg' | 'html';

/**
 * How `@prosemark/latex` loads MathJax startup.
 *
 * - **`url-import`**: this package sets `window.MathJax`, then dynamically imports
 *   `tex-svg.js` / `tex-chtml.js` from {@link LatexMarkdownEditorOptions.mathJaxPackageUrl}
 *   (default: jsDelivr).
 * - **`static-import`**: your app loads MathJax first (e.g. side-effect
 *   `import 'mathjax/tex-svg.js'` before creating the editor). This package then
 *   waits on `startup.promise` when widgets need it. {@link LatexMarkdownEditorOptions.mathJaxPackageUrl}
 *   is not used. Call {@link preconfigureMathJaxLoader} before that import if you need
 *   a custom `loader.paths.mathjax`.
 */
export type MathJaxLoadMode = 'url-import' | 'static-import';

export interface LatexMarkdownEditorOptions {
  /**
   * How formulas are rendered. `svg` uses MathJax SVG (`tex-svg-nofont.js`).
   * `html` uses CHTML (`tex-chtml-nofont.js`) when SVG is problematic.
   */
  output?: LatexMathOutput;
  /**
   * Max entries for the in-memory render cache (cloned DOM per hit). Helps when
   * the same formula is re-folded while moving the caret. Set to `0` to disable.
   * @default 128
   */
  renderCacheSize?: number;
  /**
   * How MathJax is initialized. Defaults to `url-import`.
   */
  mathJaxLoadMode?: MathJaxLoadMode;
  /**
   * When {@link mathJaxLoadMode} is **`url-import`** (default): base URL for
   * MathJax’s package root (the folder that contains `tex-svg.js` /
   * `tex-chtml.js`), used for `loader.paths.mathjax` and for loading the startup
   * bundle. Must be an absolute URL the **browser** can load (e.g. `https://…`
   * or a same-origin path such as `https://my.app/assets/mathjax` or a VS Code
   * webview `vscode-resource:` URL). No trailing slash is required.
   *
   * **Omit** to use the default jsDelivr URL for the version constant in this
   * package (you are not required to match that version if you pass your own URL).
   *
   * When {@link mathJaxLoadMode} is **`static-import`**, this option is **ignored**
   * (configure `window.MathJax` yourself; see {@link preconfigureMathJaxLoader}).
   */
  mathJaxPackageUrl?: string;
}

interface MathJaxReady {
  tex2svgPromise: (
    tex: string,
    options: { display: boolean },
  ) => Promise<HTMLElement>;
  tex2chtmlPromise?: (
    tex: string,
    options: { display: boolean },
  ) => Promise<HTMLElement>;
  startup: { promise: Promise<void> };
}

interface MathJaxConfig {
  options?: { skipStartupTypeset?: boolean };
  loader?: { paths?: Record<string, string> };
  tex?: Record<string, unknown>;
  svg?: Record<string, unknown>;
  startup?: Record<string, unknown>;
}

declare global {
  interface Window {
    MathJax?: MathJaxReady | MathJaxConfig;
  }
}

/** Sentinel for {@link configuredPackageUrl} when using `static-import` mode. */
const STATIC_IMPORT_PACKAGE_KEY = 'static-import';

let loadedOutput: LatexMathOutput | null = null;
let loadedLoadMode: MathJaxLoadMode | null = null;
let mathJaxReady: Promise<void> | null = null;
let configuredPackageUrl: string | null = null;

/**
 * Assign `window.MathJax` loader options **before** a static
 * `import 'mathjax/tex-svg.js'` or `import 'mathjax/tex-chtml.js'` so MathJax can
 * resolve extra modules (fonts, input jax, etc.).
 */
export function preconfigureMathJaxLoader(packageUrl: string): void {
  if (typeof window === 'undefined') {
    throw new Error(
      'preconfigureMathJaxLoader requires a browser environment (window).',
    );
  }
  window.MathJax = {
    options: {
      skipStartupTypeset: true,
    },
    loader: {
      paths: {
        mathjax: packageUrl,
      },
    },
  };
}

async function awaitMathJaxStartupPromise(): Promise<void> {
  const mj = window.MathJax as MathJaxReady | undefined;
  const ready = mj?.startup.promise;
  if (!ready) {
    throw new Error('MathJax is not ready (missing startup.promise).');
  }
  await ready;
}

const ensureMathJax = (
  output: LatexMathOutput,
  loadMode: MathJaxLoadMode,
  packageUrl: string,
): Promise<void> => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error(
      '@prosemark/latex requires a browser environment (window/document).',
    );
  }

  const configKey =
    loadMode === 'static-import' ? STATIC_IMPORT_PACKAGE_KEY : packageUrl;

  if (
    loadedOutput === output &&
    loadedLoadMode === loadMode &&
    configuredPackageUrl === configKey &&
    mathJaxReady
  ) {
    return mathJaxReady;
  }

  if (loadedOutput !== null && loadedOutput !== output) {
    throw new Error(
      'MathJax output mode is fixed after the first load; do not mix svg and html in one page.',
    );
  }

  if (loadedLoadMode !== null && loadedLoadMode !== loadMode) {
    throw new Error(
      'mathJaxLoadMode is fixed after the first MathJax load in this page.',
    );
  }

  if (
    loadMode === 'url-import' &&
    configuredPackageUrl !== null &&
    configuredPackageUrl !== packageUrl
  ) {
    throw new Error(
      'mathJaxPackageUrl is fixed after the first MathJax load in this page.',
    );
  }

  loadedOutput = output;
  loadedLoadMode = loadMode;
  configuredPackageUrl = configKey;
  mathJaxReady = (async () => {
    if (loadMode === 'static-import') {
      await awaitMathJaxStartupPromise();
      return;
    }

    // Pre-load config (no `version`): MathJax moves this object to `config` and
    // replaces `window.MathJax` with the API. Do not set `tex` / `svg` here —
    // those would land only under `config` and break input/output jax setup.
    //
    // When the combined component is bundled (Vite/Rollup), its default
    // `loader.paths.mathjax` becomes `/`, so MathJax tries to fetch extra
    // modules from the app origin (`/input/...`, etc.) and `tex2svgPromise`
    // never resolves. Point `mathjax` at the published package tree instead.
    window.MathJax = {
      options: {
        skipStartupTypeset: true,
      },
      loader: {
        paths: {
          mathjax: packageUrl,
        },
      },
    };

    const bundleUrl =
      output === 'svg'
        ? mathJaxStartupModuleUrl(packageUrl, 'tex-svg.js')
        : mathJaxStartupModuleUrl(packageUrl, 'tex-chtml.js');
    // Runtime URL (not a bare specifier) so pre-built `@prosemark/latex` works in
    // Vite/browsers without resolving `mathjax` from node_modules.
    await import(/* @vite-ignore */ bundleUrl);

    await awaitMathJaxStartupPromise();
  })();

  return mathJaxReady;
};

/**
 * @internal Resets load state (unit tests only).
 */
export function resetLatexMathJaxStateForTests(): void {
  loadedOutput = null;
  loadedLoadMode = null;
  mathJaxReady = null;
  configuredPackageUrl = null;
}

interface RenderCacheEntry {
  node: HTMLElement;
}

/** Move key to MRU end in O(1) using a Map as insertion-ordered list. */
class RenderLru {
  private readonly max: number;
  private readonly map = new Map<string, RenderCacheEntry>();

  constructor(max: number) {
    this.max = max;
  }

  get(key: string): HTMLElement | undefined {
    const ent = this.map.get(key);
    if (!ent) return undefined;
    this.map.delete(key);
    this.map.set(key, ent);
    return ent.node;
  }

  set(key: string, node: HTMLElement): void {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, { node });
    while (this.map.size > this.max) {
      const iter = this.map.keys().next();
      if (iter.done) break;
      this.map.delete(iter.value);
    }
  }
}

let renderCache: RenderLru | null = null;

const cacheKey = (
  output: LatexMathOutput,
  display: boolean,
  tex: string,
): string => `${output}\n${display ? '1' : '0'}\n${tex}`;

const renderOrCloneFromCache = async (
  tex: string,
  display: boolean,
  output: LatexMathOutput,
): Promise<HTMLElement> => {
  const key = cacheKey(output, display, tex);
  const cached = renderCache?.get(key);
  if (cached) {
    return cached.cloneNode(true) as HTMLElement;
  }

  const mj = window.MathJax as MathJaxReady | undefined;
  if (!mj) {
    throw new Error('MathJax is not loaded');
  }

  let node: HTMLElement;
  if (output === 'html') {
    const fn = mj.tex2chtmlPromise;
    if (!fn) {
      throw new Error('MathJax HTML output is not loaded (tex-chtml bundle).');
    }
    node = await fn.call(mj, tex, { display });
  } else {
    node = await mj.tex2svgPromise(tex, { display });
  }

  const errMsg = extractMathJaxRenderError(node);
  if (errMsg) {
    throw new Error(errMsg);
  }

  renderCache?.set(key, node);
  return node.cloneNode(true) as HTMLElement;
};

const blockMathEstimatedHeightPx = 72;

/**
 * MathJax renders TeX errors inline (red on yellow) instead of rejecting
 * `tex2svgPromise` / `tex2chtmlPromise`. Detect those nodes so we can show
 * ProseMark's themed error UI instead.
 *
 * @internal Exported for unit tests.
 */
const trimAttr = (el: Element, name: string): string | null => {
  const value = el.getAttribute(name);
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed || null;
};

const trimText = (el: Element | null): string | null => {
  if (!el) return null;
  const text = el.textContent;
  if (!text) return null;
  const trimmed = text.trim();
  return trimmed || null;
};

export function extractMathJaxRenderError(root: ParentNode): string | null {
  const attrError = root.querySelector('[data-mjx-error]');
  if (attrError) {
    const msg = trimAttr(attrError, 'data-mjx-error');
    if (msg) return msg;
  }

  const mjxMerror = root.querySelector('mjx-merror');
  if (mjxMerror) {
    const msg =
      trimAttr(mjxMerror, 'data-mjx-error') ??
      trimAttr(mjxMerror, 'title') ??
      trimText(mjxMerror);
    if (msg) return msg;
  }

  const svgMerror = root.querySelector('[data-mml-node="merror"]');
  if (svgMerror) {
    const title = trimText(svgMerror.querySelector('title'));
    if (title) return title;
    const msg = trimText(svgMerror);
    if (msg) return msg;
  }

  return null;
}

/**
 * Normalizes MathJax / loader failures into a single user-visible message.
 *
 * @internal Exported for unit tests.
 */
export function formatLatexRenderError(err: unknown): string {
  if (err instanceof Error) {
    const msg = err.message.trim();
    return msg || 'LaTeX render failed';
  }
  if (typeof err === 'string') {
    const msg = err.trim();
    return msg || 'LaTeX render failed';
  }
  if (err && typeof err === 'object' && 'message' in err) {
    const raw = (err as { message?: unknown }).message;
    const msg = typeof raw === 'string' ? raw.trim() : String(raw).trim();
    if (msg) return msg;
  }
  return 'LaTeX render failed';
}

/** Populates a math widget with error message and source TeX. */
const populateLatexMathErrorDom = (
  wrap: HTMLElement,
  tex: string,
  err: unknown,
  display: boolean,
): void => {
  const message = formatLatexRenderError(err);

  const messageEl = document.createElement(display ? 'div' : 'span');
  messageEl.className = WIDGET_ERROR_MESSAGE_CLASS;
  messageEl.setAttribute('role', 'alert');
  messageEl.textContent = message;

  const sourceEl = document.createElement('code');
  sourceEl.className = WIDGET_ERROR_SOURCE_CLASS;
  sourceEl.textContent = tex;

  wrap.replaceChildren(messageEl, sourceEl);
  wrap.classList.add(WIDGET_ERROR_CLASS);
  wrap.setAttribute('title', message);
};

const latexWidgetResizeObservers = new WeakMap<HTMLElement, ResizeObserver>();

class LatexMathWidget extends WidgetType {
  constructor(
    public readonly tex: string,
    public readonly display: boolean,
    public readonly output: LatexMathOutput,
    public readonly loadMode: MathJaxLoadMode,
    public readonly packageUrl: string,
  ) {
    super();
  }

  eq(other: LatexMathWidget): boolean {
    return (
      this.tex === other.tex &&
      this.display === other.display &&
      this.output === other.output &&
      this.loadMode === other.loadMode &&
      this.packageUrl === other.packageUrl
    );
  }

  get estimatedHeight(): number {
    return this.display ? blockMathEstimatedHeightPx : -1;
  }

  toDOM(view: EditorView): HTMLElement {
    const wrap = document.createElement(this.display ? 'div' : 'span');
    wrap.className = WIDGET_CLASS;
    wrap.setAttribute('data-latex', this.tex);
    wrap.setAttribute('data-display', this.display ? 'block' : 'inline');

    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => {
        view.requestMeasure();
      });
      ro.observe(wrap);
      latexWidgetResizeObservers.set(wrap, ro);
    }

    void ensureMathJax(this.output, this.loadMode, this.packageUrl)
      .then(() => renderOrCloneFromCache(this.tex, this.display, this.output))
      .then((node) => {
        wrap.replaceChildren(node);
        view.requestMeasure();
      })
      .catch((err: unknown) => {
        populateLatexMathErrorDom(wrap, this.tex, err, this.display);
        view.requestMeasure();
      });

    return wrap;
  }

  ignoreEvent(): boolean {
    return false;
  }

  destroy(dom: HTMLElement): void {
    latexWidgetResizeObservers.get(dom)?.disconnect();
    latexWidgetResizeObservers.delete(dom);
    dom.remove();
  }
}

const latexMathSourceTheme = EditorView.theme({
  '.cm-latex-math-delimiter': {
    color: 'var(--pm-latex-math-delimiter-color, var(--pm-link-color))',
  },
  '.cm-latex-math-formula': {
    color: 'var(--pm-latex-math-formula-color, inherit)',
    fontFamily: `var(
      --pm-latex-math-formula-font,
      var(
        --pm-code-font,
        ui-monospace,
        SFMono-Regular,
        Menlo,
        Monaco,
        Consolas,
        'Liberation Mono',
        'Courier New',
        monospace
      )
    )`,
    fontSize: '0.92em',
  },
});

/**
 * Syntax highlighting for raw `$...$` / `$$...$$` spans before they are replaced
 * by rendered math widgets. Add next to {@link prosemarkBaseThemeSetup} or your
 * editor theme so delimiter and formula regions pick up theme variables.
 */
export const latexMathSyntaxHighlighting = syntaxHighlighting(
  HighlightStyle.define([
    {
      tag: latexMathDelimiterTag,
      class: 'cm-latex-math-delimiter',
    },
    {
      tag: latexMathFormulaTag,
      class: 'cm-latex-math-formula',
    },
  ]),
);

const latexMathWidgetTheme = EditorView.theme({
  [`.${WIDGET_CLASS}`]: {
    display: 'inline-block',
    verticalAlign: 'middle',
  },
  [`.${WIDGET_CLASS}[data-display="block"]`]: {
    display: 'block',
    textAlign: 'center',
    // Block widget docs: no vertical *margins* (they confuse layout); padding is OK.
    padding: '0.5em 0',
  },
  [`.${WIDGET_CLASS}-error`]: {
    color:
      'var(--pm-latex-math-error-color, var(--pm-syntax-invalid, #c62828))',
    backgroundColor:
      'var(--pm-latex-math-error-background-color, rgb(128 128 128 / 0.12))',
    fontFamily: `var(
      --pm-latex-math-formula-font,
      var(
        --pm-code-font,
        ui-monospace,
        SFMono-Regular,
        Menlo,
        Monaco,
        Consolas,
        'Liberation Mono',
        'Courier New',
        monospace
      )
    )`,
    borderRadius: '0.4rem',
    padding: '0.2rem',
    maxWidth: '100%',
    boxSizing: 'border-box',
  },
  [`.${WIDGET_CLASS}[data-display="block"].${WIDGET_CLASS}-error`]: {
    textAlign: 'left',
    padding: '0.5em 0.2rem',
  },
  [`.${WIDGET_CLASS}-error[data-display="inline"]`]: {
    display: 'inline',
    verticalAlign: 'baseline',
  },
  [`.${WIDGET_ERROR_MESSAGE_CLASS}`]: {
    fontSize: '0.85em',
    lineHeight: 1.35,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  [`.${WIDGET_CLASS}-error[data-display="block"] .${WIDGET_ERROR_MESSAGE_CLASS}`]:
    {
      marginBottom: '0.25em',
    },
  [`.${WIDGET_CLASS}-error[data-display="inline"] .${WIDGET_ERROR_MESSAGE_CLASS}`]:
    {
      display: 'inline',
    },
  [`.${WIDGET_ERROR_SOURCE_CLASS}`]: {
    fontFamily: 'inherit',
    fontSize: '0.92em',
    lineHeight: 1.35,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    opacity: 0.9,
  },
  [`.${WIDGET_CLASS}-error[data-display="block"] .${WIDGET_ERROR_SOURCE_CLASS}`]:
    {
      display: 'block',
    },
  [`.${WIDGET_CLASS}-error[data-display="inline"] .${WIDGET_ERROR_SOURCE_CLASS}`]:
    {
      display: 'inline',
      marginInlineStart: '0.25em',
    },
});

/**
 * CodeMirror extensions that replace core **`Math`** syntax nodes with rendered
 * MathJax output.
 *
 * @remarks
 * **Markdown parser:** widgets attach only to `Math` nodes. Enable math in the
 * Markdown config with **`prosemarkMarkdownSyntaxExtensions`** (includes
 * **`mathMarkdownSyntaxExtension`**) from **`@prosemark/core`**, or add
 * **`mathMarkdownSyntaxExtension`** from **`@prosemark/core`** or
 * {@link latexMathMarkdownSyntaxExtension} from this package to
 * **`markdown({ extensions: [...] })`**. Without that, `$...$` / `$$...$$` are not
 * parsed as math and these extensions have nothing to render.
 *
 * Add {@link latexMathSyntaxHighlighting} (via {@link latexMarkdownSyntaxTheme})
 * for delimiter/formula source coloring.
 */
export function latexMarkdownEditorExtensions(
  options: LatexMarkdownEditorOptions = {},
): ReturnType<typeof foldableSyntaxFacet.of>[] {
  const output: LatexMathOutput = options.output ?? 'svg';
  const loadMode: MathJaxLoadMode = options.mathJaxLoadMode ?? 'url-import';
  const packageUrl =
    loadMode === 'url-import'
      ? (options.mathJaxPackageUrl ?? mathjaxPackageRoot())
      : '';
  const cacheSize = options.renderCacheSize ?? 128;
  renderCache = cacheSize > 0 ? new RenderLru(cacheSize) : null;

  return [
    foldableSyntaxFacet.of({
      nodePath: 'Math',
      buildDecorations: (state: EditorState, node: SyntaxNodeRef) => {
        const opensDouble =
          state.doc.sliceString(node.from, node.from + 2) === '$$';
        const innerFrom = opensDouble ? node.from + 2 : node.from + 1;
        const innerTo = opensDouble ? node.to - 2 : node.to - 1;
        const body = state.doc.sliceString(innerFrom, innerTo);
        const tex = body.trim();
        if (!tex) return;

        // `$$...$$` always block; `$ ... $` with inner padding block; tight `$...$` inline.
        const display = opensDouble || /^\s|\s$/.test(body);

        return Decoration.replace({
          widget: new LatexMathWidget(
            tex,
            display,
            output,
            loadMode,
            packageUrl,
          ),
          block: display,
          inclusive: true,
          // Skipped by revealBlockOnArrowExtension so ↑ through blank lines after math is normal.
          proseMarkSkipAdjacentArrowReveal: true,
        }).range(node.from, node.to);
      },
    }),
    latexMathWidgetTheme,
    selectAllDecorationsOnSelectExtension(WIDGET_CLASS),
  ];
}

/**
 * Convenience bundle: source highlighting theme + delimiter/formula tag
 * styles. Does not include {@link latexMarkdownEditorExtensions} (widgets).
 */
export const latexMarkdownSyntaxTheme: Extension[] = [
  latexMathSyntaxHighlighting,
  latexMathSourceTheme,
];
