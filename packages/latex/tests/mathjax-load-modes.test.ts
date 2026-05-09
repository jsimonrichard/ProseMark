import assert from 'node:assert';
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import {
  awaitMathJaxAfterStaticImport,
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

  test('awaitMathJaxAfterStaticImport resolves when startup.promise resolves', async () => {
    (
      globalThis as unknown as {
        MathJax: { startup: { promise: Promise<void> } };
      }
    ).MathJax = {
      startup: { promise: Promise.resolve() },
    };
    await awaitMathJaxAfterStaticImport();
  });

  test('awaitMathJaxAfterStaticImport is idempotent', async () => {
    (
      globalThis as unknown as {
        MathJax: { startup: { promise: Promise<void> } };
      }
    ).MathJax = {
      startup: { promise: Promise.resolve() },
    };
    await awaitMathJaxAfterStaticImport();
    await awaitMathJaxAfterStaticImport();
  });

  test('awaitMathJaxAfterStaticImport throws without startup.promise', async () => {
    (globalThis as unknown as { MathJax: Record<string, never> }).MathJax = {};
    await assert.rejects(awaitMathJaxAfterStaticImport(), /startup\.promise/);
  });

  test('awaitMathJaxAfterStaticImport rejects output flip after first load', async () => {
    (
      globalThis as unknown as {
        MathJax: { startup: { promise: Promise<void> } };
      }
    ).MathJax = {
      startup: { promise: Promise.resolve() },
    };
    await awaitMathJaxAfterStaticImport('svg');
    expect(() => {
      void awaitMathJaxAfterStaticImport('html');
    }).toThrow(/output mode/);
  });
});
