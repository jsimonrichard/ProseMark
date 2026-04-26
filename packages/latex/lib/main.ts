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

/** Keep in sync with the `mathjax` dependency in package.json. */
const MATHJAX_VERSION = '4.1.1';

const mathjaxPackageRoot = (): string =>
  `https://cdn.jsdelivr.net/npm/mathjax@${MATHJAX_VERSION}`;

export type LatexMathOutput = 'svg' | 'html';

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
   * Base URL for MathJax’s dynamic loader (`loader.paths.mathjax`), e.g. a copy
   * of the `mathjax` package on your own host. Defaults to jsDelivr for the
   * version pinned in this package.
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

let loadedOutput: LatexMathOutput | null = null;
let mathJaxReady: Promise<void> | null = null;
let configuredPackageUrl: string | null = null;

const ensureMathJax = (
  output: LatexMathOutput,
  packageUrl: string,
): Promise<void> => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error(
      '@prosemark/latex requires a browser environment (window/document).',
    );
  }

  if (
    loadedOutput === output &&
    configuredPackageUrl === packageUrl &&
    mathJaxReady
  ) {
    return mathJaxReady;
  }

  if (loadedOutput !== null && loadedOutput !== output) {
    throw new Error(
      'MathJax output mode is fixed after the first load; do not mix svg and html in one page.',
    );
  }

  if (configuredPackageUrl !== null && configuredPackageUrl !== packageUrl) {
    throw new Error(
      'mathJaxPackageUrl is fixed after the first MathJax load in this page.',
    );
  }

  loadedOutput = output;
  configuredPackageUrl = packageUrl;
  mathJaxReady = (async () => {
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

    if (output === 'svg') {
      await import('mathjax/tex-svg.js');
    } else {
      await import('mathjax/tex-chtml.js');
    }

    const mj = window.MathJax as MathJaxReady | undefined;
    const ready = mj?.startup.promise;
    if (!ready) {
      throw new Error('MathJax failed to initialize');
    }
    await ready;
  })();

  return mathJaxReady;
};

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

  renderCache?.set(key, node);
  return node.cloneNode(true) as HTMLElement;
};

const blockMathEstimatedHeightPx = 72;

const latexWidgetResizeObservers = new WeakMap<HTMLElement, ResizeObserver>();

class LatexMathWidget extends WidgetType {
  constructor(
    public readonly tex: string,
    public readonly display: boolean,
    public readonly output: LatexMathOutput,
    public readonly packageUrl: string,
  ) {
    super();
  }

  eq(other: LatexMathWidget): boolean {
    return (
      this.tex === other.tex &&
      this.display === other.display &&
      this.output === other.output &&
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

    void ensureMathJax(this.output, this.packageUrl)
      .then(() => renderOrCloneFromCache(this.tex, this.display, this.output))
      .then((node) => {
        wrap.replaceChildren(node);
        view.requestMeasure();
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        wrap.textContent = this.tex;
        wrap.title = msg;
        wrap.classList.add(`${WIDGET_CLASS}-error`);
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
    color: '#b00020',
    fontFamily: 'monospace',
  },
});

/**
 * CodeMirror extensions that replace core `Math` syntax nodes (from
 * {@link latexMathMarkdownSyntaxExtension} / `mathMarkdownSyntaxExtension`)
 * with rendered formulas. Add {@link latexMathSyntaxHighlighting} for source coloring.
 */
export function latexMarkdownEditorExtensions(
  options: LatexMarkdownEditorOptions = {},
): ReturnType<typeof foldableSyntaxFacet.of>[] {
  const output: LatexMathOutput = options.output ?? 'svg';
  const packageUrl = options.mathJaxPackageUrl ?? mathjaxPackageRoot();
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
          widget: new LatexMathWidget(tex, display, output, packageUrl),
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
