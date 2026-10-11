/// <reference types="bun" />
import { describe, expect, test } from 'bun:test';
import { markdown } from '@codemirror/lang-markdown';
import { ensureSyntaxTree, syntaxTree } from '@codemirror/language';
import { EditorState } from '@codemirror/state';
import { GFM } from '@lezer/markdown';
import { mathMarkdownSyntaxExtension } from '@prosemark/core';
import {
  latexLanguageDescription,
  latexMathNestedHighlightExtension,
} from '../lib/nestedHighlight.ts';

describe('latexMathNestedHighlightExtension', () => {
  test('overlays stexMath inside MathFormula', () => {
    const doc = '$\\alpha+1$';
    const state = EditorState.create({
      doc,
      extensions: [
        markdown({
          extensions: [
            GFM,
            mathMarkdownSyntaxExtension,
            latexMathNestedHighlightExtension,
          ],
        }),
      ],
    });

    const tree = ensureSyntaxTree(state, doc.length, 5000);
    if (!tree) {
      throw new Error('expected syntax tree');
    }

    const commandPos = doc.indexOf('alpha');
    if (commandPos < 0) {
      throw new Error('expected \\alpha in doc');
    }

    const inner = tree.resolveInner(commandPos, 1);
    expect(inner.name).not.toBe('MathFormula');
    expect(inner.name).not.toBe('Math');
    expect(inner.name).not.toBe('MathMark');
  });

  test('still exposes MathFormula without the nested wrap', () => {
    const doc = '$\\alpha+1$';
    const state = EditorState.create({
      doc,
      extensions: [
        markdown({
          extensions: [GFM, mathMarkdownSyntaxExtension],
        }),
      ],
    });

    const tree = ensureSyntaxTree(state, doc.length, 5000);
    if (!tree) {
      throw new Error('expected syntax tree');
    }

    const commandPos = doc.indexOf('alpha');
    expect(syntaxTree(state).resolveInner(commandPos, 1).name).toBe(
      'MathFormula',
    );
  });

  test('tokenizes identifiers in multi-line $$ blocks', () => {
    const doc = '$$\n\\int e^{-x^2}\\,dx\n$$';
    const state = EditorState.create({
      doc,
      extensions: [
        markdown({
          extensions: [
            GFM,
            mathMarkdownSyntaxExtension,
            latexMathNestedHighlightExtension,
          ],
        }),
      ],
    });

    const tree = ensureSyntaxTree(state, doc.length, 5000);
    if (!tree) {
      throw new Error('expected syntax tree');
    }

    const ePos = doc.indexOf('e');
    if (ePos < 0) {
      throw new Error('expected e in doc');
    }
    expect(tree.resolveInner(ePos, 1).name).toBe('variableName.special');
  });
});

describe('latexLanguageDescription', () => {
  test('matches latex/tex/stex info strings', () => {
    expect(
      latexLanguageDescription.name.toLowerCase() === 'latex' ||
        latexLanguageDescription.alias.includes('latex'),
    ).toBe(true);
    for (const name of ['latex', 'tex', 'stex'] as const) {
      expect(
        latexLanguageDescription.alias.includes(name) ||
          latexLanguageDescription.name.toLowerCase() === name,
      ).toBe(true);
    }
  });
});
