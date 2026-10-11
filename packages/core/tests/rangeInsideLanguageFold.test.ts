/// <reference types="bun" />
import { describe, expect, test } from 'bun:test';
import { EditorSelection, EditorState } from '@codemirror/state';
import { markdown } from '@codemirror/lang-markdown';
import { GFM } from '@lezer/markdown';
import {
  codeFolding,
  foldEffect,
  foldedRanges,
  unfoldEffect,
} from '@codemirror/language';
import {
  defaultFoldableSyntaxExtensions,
  foldExtension,
  prosemarkMarkdownSyntaxExtensions,
  rangeInsideLanguageFold,
} from '../lib/main.ts';

const doc = `# Title

![alt](https://example.com/x.png)

After
`;

const imageFrom = doc.indexOf('![');
const imageTo = doc.indexOf(')') + 1;

const createState = (selection = EditorSelection.single(0)) =>
  EditorState.create({
    doc,
    selection,
    extensions: [
      markdown({
        extensions: [GFM, prosemarkMarkdownSyntaxExtensions],
      }),
      codeFolding(),
      defaultFoldableSyntaxExtensions,
    ],
  });

const foldImage = (state: EditorState) =>
  state.update({
    effects: foldEffect.of({ from: imageFrom, to: imageTo }),
  }).state;

const hasImageDecoration = (state: EditorState) => {
  let found = false;
  state.field(foldExtension).between(imageFrom, imageTo, () => {
    found = true;
    return false;
  });
  return found;
};

const foldCount = (state: EditorState) => {
  let count = 0;
  foldedRanges(state).between(0, state.doc.length, () => {
    count++;
  });
  return count;
};

describe('rangeInsideLanguageFold / decorations under language folds', () => {
  test('reports when a range is covered by a language fold', () => {
    const folded = foldImage(createState());

    expect(rangeInsideLanguageFold(folded, imageFrom, imageTo)).toBe(true);
    expect(rangeInsideLanguageFold(folded, 0, 1)).toBe(false);
  });

  test('skips ProseMark fold decorations inside a language fold even when selected', () => {
    const open = createState();
    expect(hasImageDecoration(open)).toBe(true);

    const folded = foldImage(open);
    expect(foldCount(folded)).toBe(1);
    expect(hasImageDecoration(folded)).toBe(false);

    const selected = folded.update({
      selection: EditorSelection.range(0, doc.length),
    }).state;

    expect(foldCount(selected)).toBe(1);
    expect(hasImageDecoration(selected)).toBe(false);
  });

  test('restores image decorations after the language fold unfolds', () => {
    const folded = foldImage(createState());
    expect(hasImageDecoration(folded)).toBe(false);

    const unfolded = folded.update({
      effects: unfoldEffect.of({ from: imageFrom, to: imageTo }),
    }).state;
    expect(foldCount(unfolded)).toBe(0);
    expect(hasImageDecoration(unfolded)).toBe(true);
  });
});
