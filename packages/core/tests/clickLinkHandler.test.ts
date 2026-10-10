/// <reference types="bun" />
import { describe, expect, test } from 'bun:test';
import { EditorState } from '@codemirror/state';
import { clickLinkHandler, defaultClickLinkHandler } from '../lib/clickLink.ts';

describe('clickLinkHandler facet', () => {
  test('host handler overrides defaultClickLinkHandler', () => {
    const opened: string[] = [];
    const state = EditorState.create({
      extensions: [
        defaultClickLinkHandler,
        clickLinkHandler.of((url) => {
          opened.push(url);
        }),
      ],
    });

    state.facet(clickLinkHandler)('https://example.com');
    expect(opened).toEqual(['https://example.com']);
  });

  test('throws when no handler is registered', () => {
    const state = EditorState.create({ extensions: [] });
    expect(() => {
      state.facet(clickLinkHandler)('https://example.com');
    }).toThrow(/No clickLinkHandler registered/);
  });
});
