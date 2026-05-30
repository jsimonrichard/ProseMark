import { describe, expect, test } from 'bun:test';
import { GFM, parser } from '@lezer/markdown';
import type { SyntaxNode } from '@lezer/common';
import { prosemarkMarkdownSyntaxExtensions } from '../lib/main.ts';

const markdownParser = parser.configure([
  GFM,
  prosemarkMarkdownSyntaxExtensions,
]);

const topLevelBlockNames = (node: SyntaxNode): string[] => {
  const names: string[] = [];
  for (let child = node.firstChild; child; child = child.nextSibling) {
    names.push(child.name);
  }
  return names;
};

const firstMathNode = (node: SyntaxNode): SyntaxNode | null => {
  if (node.name === 'Math') return node;
  for (let child = node.firstChild; child; child = child.nextSibling) {
    const found = firstMathNode(child);
    if (found) return found;
  }
  return null;
};

describe('Multi-line display math across blank lines', () => {
  test('keeps $$...$$ in one Math block across a blank line', () => {
    const input = `$$
a = 1

b = 2
$$
`;
    const tree = markdownParser.parse(input);
    const math = tree.topNode.firstChild;

    expect(topLevelBlockNames(tree.topNode)).toEqual(['Math']);
    expect(math?.name).toBe('Math');
    expect(math?.from).toBe(0);
    expect(math?.to).toBe(input.length - 1);
  });

  test('does not alter display math that closes before the first blank line', () => {
    const input = `$$
a = 1
$$

Outside paragraph.
`;
    const tree = markdownParser.parse(input);
    const names = topLevelBlockNames(tree.topNode);

    expect(names).toEqual(['Paragraph', 'Paragraph']);
    const math = firstMathNode(tree.topNode);
    expect(math).not.toBeNull();
    expect(math?.parent?.name).toBe('Paragraph');
  });

  test('still parses inline $...$ inside paragraphs', () => {
    const input = 'Some text $x$ more';
    const tree = markdownParser.parse(input);
    const math = firstMathNode(tree.topNode);

    expect(math?.from).toBe(10);
    expect(math?.to).toBe(13);
    expect(math?.parent?.name).toBe('Paragraph');
  });
});
