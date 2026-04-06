import { describe, expect, test } from 'bun:test';
import { GFM, parser } from '@lezer/markdown';
import type { SyntaxNode } from '@lezer/common';
import {
  prosemarkMarkdownSyntaxExtensions,
} from '../lib/markdown/index.ts';
import {
  multiParHTMLBlockMarkdownSyntaxExtension,
  renderHtmlMarkdownSyntaxExtensions,
} from '../../render-html/lib/markdown.ts';

const markdownParser = parser.configure([
  GFM,
  prosemarkMarkdownSyntaxExtensions,
  renderHtmlMarkdownSyntaxExtensions,
]);

const topLevelBlockNames = (node: SyntaxNode): string[] => {
  const names: string[] = [];
  for (let child = node.firstChild; child; child = child.nextSibling) {
    names.push(child.name);
  }
  return names;
};

describe('MultiParHTMLBlock behavior across blank lines', () => {
  test('is no longer exported by core markdown syntax bundle', () => {
    expect(prosemarkMarkdownSyntaxExtensions).not.toContain(
      multiParHTMLBlockMarkdownSyntaxExtension,
    );
    expect(renderHtmlMarkdownSyntaxExtensions).toContain(
      multiParHTMLBlockMarkdownSyntaxExtension,
    );
  });

  test('keeps an unclosed html tag in one block across double line breaks', () => {
    const input = `<details>
<summary>Summary</summary>

Body inside details.
</details>
`;
    const tree = markdownParser.parse(input);
    const htmlBlock = tree.topNode.firstChild;

    expect(topLevelBlockNames(tree.topNode)).toEqual(['HTMLBlock']);
    expect(htmlBlock?.from).toBe(0);
    expect(htmlBlock?.to).toBe(input.length - 1);
  });

  test('does not alter html blocks that close before the first blank line', () => {
    const input = `<details>
<summary>Summary</summary>
</details>

Outside paragraph.
`;
    const tree = markdownParser.parse(input);
    const names = topLevelBlockNames(tree.topNode);

    expect(names).toEqual(['HTMLBlock', 'Paragraph']);
  });
});
