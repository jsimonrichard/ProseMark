/// <reference types="bun" />
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import {
  mathJaxPackageUrlFromWebviewScript,
  preconfigureMathJaxLoader,
  resetLatexMathJaxStateForTests,
} from '../lib/main.ts';

function installBrowserGlobals(): void {
  const g = globalThis as unknown as {
    window: typeof globalThis;
    document: Record<string, unknown>;
  };
  g.window = globalThis;
  g.document = {};
}

beforeEach(() => {
  installBrowserGlobals();
  resetLatexMathJaxStateForTests();
});

afterEach(() => {
  resetLatexMathJaxStateForTests();
  delete (globalThis as unknown as { window?: unknown }).window;
  delete (globalThis as unknown as { document?: unknown }).document;
  delete (globalThis as unknown as { MathJax?: unknown }).MathJax;
});

describe('MathJax load helpers', () => {
  test('mathJaxPackageUrlFromWebviewScript resolves sibling mathjax dir', () => {
    const script = {
      src: 'https://example.test/dist/webview/webview.js',
    } as HTMLScriptElement;
    expect(mathJaxPackageUrlFromWebviewScript({ script })).toBe(
      'https://example.test/dist/webview/mathjax',
    );
  });

  test('mathJaxPackageUrlFromWebviewScript picks script by src substring', () => {
    const g = globalThis as unknown as {
      document: { getElementsByTagName: () => HTMLScriptElement[] };
    };
    g.document = {
      getElementsByTagName: () => [
        {
          src: 'https://example.test/cspell-integration/webview.js',
        } as HTMLScriptElement,
        {
          src: 'https://example.test/latex-integration/webview.js',
        } as HTMLScriptElement,
      ],
    };
    expect(
      mathJaxPackageUrlFromWebviewScript({
        scriptSrcIncludes: 'latex-integration',
      }),
    ).toBe('https://example.test/latex-integration/mathjax');
  });

  test('preconfigureMathJaxLoader sets loader paths', () => {
    preconfigureMathJaxLoader('https://example.test/mj');
    expect(
      (
        globalThis as unknown as {
          MathJax: { loader: { paths: { mathjax: string } } };
        }
      ).MathJax.loader.paths.mathjax,
    ).toBe('https://example.test/mj');
  });
});
