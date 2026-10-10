/// <reference types="bun" />
import { describe, expect, test } from 'bun:test';
import { EditorState } from '@codemirror/state';
import { markdown } from '@codemirror/lang-markdown';
import { GFM, parser } from '@lezer/markdown';
import type { SyntaxNode } from '@lezer/common';
import { syntaxTree } from '@codemirror/language';
import { prosemarkMarkdownSyntaxExtensions } from '@prosemark/core';
import { isHtmlOnlyParagraph } from '../lib/htmlOnlyContent.ts';
import { renderHtmlMarkdownSyntaxExtensions } from '../lib/markdown.ts';

const markdownExtensions = [
  GFM,
  prosemarkMarkdownSyntaxExtensions,
  renderHtmlMarkdownSyntaxExtensions,
];

const markdownParser = parser.configure(markdownExtensions);

const topLevelBlockNames = (node: SyntaxNode): string[] => {
  const names: string[] = [];
  for (let child = node.firstChild; child; child = child.nextSibling) {
    names.push(child.name);
  }
  return names;
};

const stateWithDoc = (doc: string): EditorState =>
  EditorState.create({
    doc,
    extensions: [
      markdown({
        extensions: markdownExtensions,
      }),
    ],
  });

const firstParagraph = (state: EditorState): SyntaxNode => {
  const top = syntaxTree(state).topNode.firstChild;
  if (top?.name !== 'Paragraph') {
    throw new Error(`expected Paragraph, got ${top?.name ?? 'null'}`);
  }
  return top;
};

describe('isHtmlOnlyParagraph', () => {
  test('accepts standalone inline elements', () => {
    for (const doc of [
      '<span>hello</span>',
      '<a href="https://example.com">link</a>',
      '<button>Click</button>',
      '<img src="x.png" alt="y" />',
    ]) {
      const state = stateWithDoc(doc);
      expect(isHtmlOnlyParagraph(state, firstParagraph(state))).toBe(true);
    }
  });

  test('accepts tags with quoted greater-than in attributes', () => {
    for (const doc of [
      '<img src="a>b.png" alt="y" />',
      '<span title="a>b">hello</span>',
    ]) {
      const state = stateWithDoc(doc);
      expect(isHtmlOnlyParagraph(state, firstParagraph(state))).toBe(true);
    }
  });

  test('rejects mixed prose and tags', () => {
    for (const doc of ['Text <span>x</span>', '<span>x</span> trailing']) {
      const state = stateWithDoc(doc);
      expect(isHtmlOnlyParagraph(state, firstParagraph(state))).toBe(false);
    }
  });

  test('rejects markdown autolinks', () => {
    const state = stateWithDoc('<https://example.com>');
    expect(isHtmlOnlyParagraph(state, firstParagraph(state))).toBe(false);
  });

  test('does not rewrite the parse tree to HTMLBlock', () => {
    const tree = markdownParser.parse('<span>hello</span>\n');
    expect(topLevelBlockNames(tree.topNode)).toEqual(['Paragraph']);
  });
});
