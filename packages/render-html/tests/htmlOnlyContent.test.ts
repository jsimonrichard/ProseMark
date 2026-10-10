/// <reference types="bun" />
import { describe, expect, test } from 'bun:test';
import { GFM, parser } from '@lezer/markdown';
import type { SyntaxNode } from '@lezer/common';
import { prosemarkMarkdownSyntaxExtensions } from '@prosemark/core';
import { findHtmlTagEnd, isHtmlOnlyContent } from '../lib/htmlOnlyContent.ts';
import { renderHtmlMarkdownSyntaxExtensions } from '../lib/markdown.ts';

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

describe('findHtmlTagEnd', () => {
  test('ignores greater-than inside quoted attributes', () => {
    const tag = '<img src="a>b.png" />';
    expect(findHtmlTagEnd(tag, 0)).toBe(tag.length - 1);
    expect(findHtmlTagEnd('<span title="a>b">', 0)).toBe(17);
    expect(findHtmlTagEnd("<span title='a>b'>", 0)).toBe(17);
  });
});

describe('isHtmlOnlyContent', () => {
  test('accepts standalone inline elements', () => {
    expect(isHtmlOnlyContent('<span>hello</span>')).toBe(true);
    expect(isHtmlOnlyContent('<a href="https://example.com">link</a>')).toBe(
      true,
    );
    expect(isHtmlOnlyContent('<button>Click</button>')).toBe(true);
    expect(isHtmlOnlyContent('<img src="x.png" alt="y" />')).toBe(true);
  });

  test('accepts tags with quoted greater-than in attributes', () => {
    expect(isHtmlOnlyContent('<img src="a>b.png" alt="y" />')).toBe(true);
    expect(isHtmlOnlyContent('<span title="a>b">hello</span>')).toBe(true);
  });

  test('rejects mixed prose and tags', () => {
    expect(isHtmlOnlyContent('Text <span>x</span>')).toBe(false);
    expect(isHtmlOnlyContent('<span>x</span> trailing')).toBe(false);
  });

  test('rejects markdown autolinks', () => {
    expect(isHtmlOnlyContent('<https://example.com>')).toBe(false);
    expect(isHtmlOnlyContent('<foo@bar.com>')).toBe(false);
  });
});

describe('HTML-only paragraphs become HTMLBlock', () => {
  test('promotes a lone span paragraph', () => {
    const input = `<span>hello</span>\n`;
    const tree = markdownParser.parse(input);
    expect(topLevelBlockNames(tree.topNode)).toEqual(['HTMLBlock']);
    expect(tree.topNode.firstChild?.from).toBe(0);
    expect(tree.topNode.firstChild?.to).toBe(input.length - 1);
  });

  test('promotes a lone anchor paragraph', () => {
    const input = `<a href="https://example.com">link</a>\n`;
    const tree = markdownParser.parse(input);
    expect(topLevelBlockNames(tree.topNode)).toEqual(['HTMLBlock']);
  });

  test('does not promote mixed prose', () => {
    const input = `Text <span>x</span>\n`;
    const tree = markdownParser.parse(input);
    expect(topLevelBlockNames(tree.topNode)).toEqual(['Paragraph']);
  });

  test('leaves following paragraphs alone', () => {
    const input = `<span>hello</span>\n\nNext paragraph.\n`;
    const tree = markdownParser.parse(input);
    expect(topLevelBlockNames(tree.topNode)).toEqual([
      'HTMLBlock',
      'Paragraph',
    ]);
  });

  test('does not steal autolinks', () => {
    const input = `<https://example.com>\n`;
    const tree = markdownParser.parse(input);
    expect(topLevelBlockNames(tree.topNode)).toEqual(['Paragraph']);
    expect(tree.topNode.firstChild?.firstChild?.name).toBe('Autolink');
  });
});
