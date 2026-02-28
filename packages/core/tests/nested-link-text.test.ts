import { describe, expect, it } from 'bun:test';
import { parser, GFM } from '@lezer/markdown';
import { prosemarkMarkdownSyntaxExtensions } from '../lib/basicSetup.ts';

type ParsedNode = {
  from: number;
  to: number;
  text: string;
};

const markdownParser = parser.configure([GFM, prosemarkMarkdownSyntaxExtensions]);

function collectNodes(source: string, name: string): ParsedNode[] {
  const nodes: ParsedNode[] = [];

  markdownParser.parse(source).iterate({
    enter(node) {
      if (node.name !== name) return;
      nodes.push({
        from: node.from,
        to: node.to,
        text: source.slice(node.from, node.to),
      });
    },
  });

  return nodes;
}

describe('nested markdown links in link text', () => {
  it('treats nested inline links as plain link text', () => {
    const source = '[outer [inner](https://inner.com)](https://outer.com)';

    expect(collectNodes(source, 'Link')).toEqual([
      { from: 0, to: source.length, text: source },
    ]);
    expect(collectNodes(source, 'URL').map((node) => node.text)).toEqual([
      'https://outer.com',
    ]);
  });

  it('allows bracketed text inside link text without creating inner links', () => {
    const source = '[outer [inner] text](https://outer.com)';

    expect(collectNodes(source, 'Link')).toEqual([
      { from: 0, to: source.length, text: source },
    ]);
    expect(collectNodes(source, 'URL').map((node) => node.text)).toEqual([
      'https://outer.com',
    ]);
  });

  it('keeps normal links and raw URLs unchanged', () => {
    const normalLink = '[inner](https://inner.com)';
    const rawUrl = 'text https://inner.com';

    expect(collectNodes(normalLink, 'URL').map((node) => node.text)).toEqual([
      'https://inner.com',
    ]);
    expect(collectNodes(rawUrl, 'URL').map((node) => node.text)).toEqual([
      'https://inner.com',
    ]);
  });
});
