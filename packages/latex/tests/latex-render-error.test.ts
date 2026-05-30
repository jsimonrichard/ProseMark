import { describe, expect, test } from 'bun:test';
import {
  extractMathJaxRenderError,
  formatLatexRenderError,
} from '../lib/main.ts';

function mockRoot(
  querySelector: (selector: string) => Element | null,
): ParentNode {
  return { querySelector } as unknown as ParentNode;
}

describe('formatLatexRenderError', () => {
  test('uses Error.message', () => {
    expect(
      formatLatexRenderError(
        new Error('TeX parse error: Undefined control sequence \\foo'),
      ),
    ).toBe('TeX parse error: Undefined control sequence \\foo');
  });

  test('trims whitespace', () => {
    expect(formatLatexRenderError(new Error('  bad input  '))).toBe(
      'bad input',
    );
  });

  test('handles plain strings', () => {
    expect(formatLatexRenderError('MathJax is not loaded')).toBe(
      'MathJax is not loaded',
    );
  });

  test('reads message from plain objects', () => {
    expect(formatLatexRenderError({ message: 'loader failed' })).toBe(
      'loader failed',
    );
  });

  test('falls back when message is empty', () => {
    expect(formatLatexRenderError(new Error('   '))).toBe(
      'LaTeX render failed',
    );
    expect(formatLatexRenderError(null)).toBe('LaTeX render failed');
  });
});

describe('extractMathJaxRenderError', () => {
  test('reads data-mjx-error attribute', () => {
    const root = mockRoot((selector) => {
      if (selector === '[data-mjx-error]') {
        return {
          getAttribute: (name: string) =>
            name === 'data-mjx-error'
              ? 'Extra open brace or missing close brace'
              : null,
        } as Element;
      }
      return null;
    });

    expect(extractMathJaxRenderError(root)).toBe(
      'Extra open brace or missing close brace',
    );
  });

  test('falls back to mjx-merror text', () => {
    const root = mockRoot((selector) => {
      if (selector === '[data-mjx-error]') return null;
      if (selector === 'mjx-merror') {
        return {
          getAttribute: () => null,
          textContent: 'Undefined control sequence \\foo',
        } as Element;
      }
      return null;
    });

    expect(extractMathJaxRenderError(root)).toBe(
      'Undefined control sequence \\foo',
    );
  });

  test('returns null for successful output', () => {
    const root = mockRoot(() => null);
    expect(extractMathJaxRenderError(root)).toBeNull();
  });
});
