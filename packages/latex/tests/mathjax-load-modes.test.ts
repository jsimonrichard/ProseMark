/// <reference types="bun" />
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import {
  preconfigureMathJaxLoader,
  resetLatexMathJaxStateForTests,
} from '../lib/main.ts';

function getConfiguredMathJaxPackageUrl(): string {
  const mathJaxPackageUrl = (
    globalThis as typeof globalThis & {
      MathJax?: { loader?: { paths?: { mathjax?: string } } };
    }
  ).MathJax?.loader?.paths?.mathjax;
  if (typeof mathJaxPackageUrl !== 'string') {
    throw new Error('expected MathJax loader.paths.mathjax on globalThis');
  }
  return mathJaxPackageUrl;
}

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
  test('preconfigureMathJaxLoader sets loader paths', () => {
    preconfigureMathJaxLoader('https://example.test/mj');
    expect(getConfiguredMathJaxPackageUrl()).toBe('https://example.test/mj');
  });
});
