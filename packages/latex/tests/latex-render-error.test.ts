import { describe, expect, test } from 'bun:test';
import { formatLatexRenderError } from '../lib/main.ts';

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
