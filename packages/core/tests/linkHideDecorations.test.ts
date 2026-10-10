/// <reference types="bun" />
import { describe, expect, test } from 'bun:test';
import { EditorState } from '@codemirror/state';
import { markdown } from '@codemirror/lang-markdown';
import { GFM } from '@lezer/markdown';
import { syntaxTree } from '@codemirror/language';
import { printTree } from '@lezer-unofficial/printer';
import { prosemarkMarkdownSyntaxExtensions } from '../lib/markdown/index.ts';
import { defaultHideExtensions } from '../lib/hide/index.ts';
import { hideExtension } from '../lib/hide/core.ts';

const extensions = [
  markdown({ extensions: [GFM, prosemarkMarkdownSyntaxExtensions] }),
  defaultHideExtensions,
];

const stateWithLink = (doc: string) =>
  EditorState.create({
    doc: `${doc}\n\nother`,
    selection: { anchor: doc.length + 3 },
    extensions,
  });

const hiddenRanges = (doc: string) => {
  const state = stateWithLink(doc);
  const decos = state.field(hideExtension);
  const hidden: { from: number; to: number; text: string }[] = [];
  decos.between(0, doc.length, (from, to, value) => {
    if (value.spec.class === 'cm-hidden-token') {
      hidden.push({ from, to, text: doc.slice(from, to) });
    }
  });
  return { state, hidden };
};

const visibleText = (doc: string, hidden: { from: number; to: number }[]) => {
  let out = '';
  let i = 0;
  for (const h of [...hidden].sort((a, b) => a.from - b.from)) {
    if (i < h.from) out += doc.slice(i, h.from);
    i = Math.max(i, h.to);
  }
  if (i < doc.length) out += doc.slice(i);
  return out;
};

// Click/caret mapping over font-size-0 tokens is covered by
// `visiblePosAtCoords` in hide/core.ts; verify in the demo on initDoc L3
// (or personal-repo demo.md L1): click mid-label on the CodeMirror link.

describe('Link hide decorations', () => {
  const cases = [
    { doc: '[asdf](1234)', label: 'asdf' },
    { doc: '[asdf](asdf)', label: 'asdf' },
    { doc: '[title](https://example.com)', label: 'title' },
    {
      doc: '[http://arxiv.org/abs/2609.21190v2](http://arxiv.org/abs/2609.21190v2)',
      label: 'http://arxiv.org/abs/2609.21190v2',
    },
    {
      doc: '[https://openreview.net/forum?id=Sp8Ah1I8Ui](https://openreview.net/forum?id=Sp8Ah1I8Ui)',
      label: 'https://openreview.net/forum?id=Sp8Ah1I8Ui',
    },
  ] as const;

  for (const { doc, label } of cases) {
    test(`${doc} parses Link / LinkMark / URL`, () => {
      const state = stateWithLink(doc);
      const tree = syntaxTree(state);
      const names: string[] = [];
      tree.iterate({
        enter(node) {
          if (
            node.name === 'Link' ||
            node.name === 'LinkMark' ||
            node.name === 'URL'
          ) {
            names.push(
              `${node.name}:${JSON.stringify(doc.slice(node.from, node.to))}`,
            );
          }
        },
      });

      expect(names[0]?.startsWith('Link:')).toBe(true);
      expect(names).toContain('LinkMark:"["');
      expect(names).toContain('LinkMark:"]"');
      expect(names).toContain('LinkMark:"("');
      expect(names).toContain('LinkMark:")"');
      expect(names.some((n) => n.startsWith('URL:'))).toBe(true);
      // Keep the printed tree in the assertion message on failure.
      expect(printTree(tree, `${doc}\n\nother`)).toContain('Link');
    });

    test(`${doc} hides marks and destination, keeps label`, () => {
      const { state, hidden } = hiddenRanges(doc);
      const rendered = state.field(hideExtension);
      let hasRenderedLink = false;
      rendered.between(0, doc.length, (_from, _to, value) => {
        if (value.spec.class === 'cm-rendered-link') hasRenderedLink = true;
      });

      expect(hasRenderedLink).toBe(true);
      const destination = doc.slice(doc.indexOf('(') + 1, doc.lastIndexOf(')'));
      const hiddenText = hidden.map((h) => h.text);
      expect(hiddenText).toContain('[');
      expect(hiddenText).toContain(']');
      expect(hiddenText).toContain('(');
      expect(hiddenText).toContain(')');
      expect(hiddenText).toContain(destination);
      expect(visibleText(doc, hidden)).toBe(label);
    });
  }

  test('URL-as-label keeps a visible URL child before ](', () => {
    const doc = '[http://example.com/a](http://example.com/a)';
    const state = stateWithLink(doc);
    const urls: string[] = [];
    syntaxTree(state).iterate({
      enter(node) {
        if (node.name === 'URL') urls.push(doc.slice(node.from, node.to));
      },
    });
    expect(urls).toEqual(['http://example.com/a', 'http://example.com/a']);
    const { hidden } = hiddenRanges(doc);
    expect(hidden.filter((h) => h.text.startsWith('http')).length).toBe(1);
    expect(visibleText(doc, hidden)).toBe('http://example.com/a');
  });
});
