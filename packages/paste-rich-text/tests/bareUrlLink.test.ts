/// <reference types="bun" />
import { describe, expect, test } from 'bun:test';
import { createPasteTurndownService } from '../lib/main.ts';

describe('paste HTML links', () => {
  const turndown = createPasteTurndownService();

  test('emits a bare URL when label equals href', () => {
    const html =
      '<a href="http://arxiv.org/abs/2609.21190v2">http://arxiv.org/abs/2609.21190v2</a>';
    expect(turndown.turndown(html)).toBe('http://arxiv.org/abs/2609.21190v2');
  });

  test('keeps markdown links when label differs from href', () => {
    const html = '<a href="https://codemirror.net/">CodeMirror 6</a>';
    expect(turndown.turndown(html)).toBe(
      '[CodeMirror 6](https://codemirror.net/)',
    );
  });

  test('emits bare https openreview-style URLs', () => {
    const url = 'https://openreview.net/forum?id=Sp8Ah1I8Ui';
    expect(turndown.turndown(`<a href="${url}">${url}</a>`)).toBe(url);
  });
});
