/// <reference types="bun" />
import { describe, expect, test } from 'bun:test';
import { htmlWidgetLinkHref } from '../lib/htmlWidgetLink.ts';

const targetWith = (
  anchor: { getAttribute(name: string): string | null } | null,
) => ({
  closest: (selector: string) => (selector === 'a[href]' ? anchor : null),
});

describe('htmlWidgetLinkHref', () => {
  test('returns https href from an anchor target', () => {
    expect(
      htmlWidgetLinkHref(
        targetWith({
          getAttribute: (name) =>
            name === 'href' ? 'https://example.com' : null,
        }),
      ),
    ).toBe('https://example.com');
  });

  test('returns relative href for host linkClick', () => {
    expect(
      htmlWidgetLinkHref(
        targetWith({
          getAttribute: (name) => (name === 'href' ? './notes.md' : null),
        }),
      ),
    ).toBe('./notes.md');
  });

  test('returns null when the click is not on a link', () => {
    expect(htmlWidgetLinkHref(targetWith(null))).toBeNull();
    expect(htmlWidgetLinkHref(null)).toBeNull();
  });

  test('returns null for empty href', () => {
    expect(
      htmlWidgetLinkHref(
        targetWith({
          getAttribute: (name) => (name === 'href' ? '' : null),
        }),
      ),
    ).toBeNull();
  });
});
