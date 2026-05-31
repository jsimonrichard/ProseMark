import { expect, test } from '@playwright/test';

const FIXTURE = `- Top level item with enough text to wrap onto a second line easily here is more filler
  - Nested item with enough text to wrap onto a second line easily here is more filler
    - Deep nested item with enough text to wrap onto a second line easily here is more filler
`;

const setDoc = async (page: import('@playwright/test').Page) => {
  await page.goto('/');
  await page.waitForSelector('.cm-editor');
  await page.evaluate((doc) => {
    const view = window.debugEditor;
    if (!view) throw new Error('debugEditor missing');
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: doc },
      selection: { anchor: doc.length },
    });
  }, FIXTURE);
  await page.waitForSelector('.cm-line.cm-soft-indent-line', {
    timeout: 10_000,
  });
};

/** Left edge of the first body character on each visual row of a line. */
const measureRowsBodyStartLeft = async (
  line: import('@playwright/test').Locator,
) =>
  line.evaluate((el) => {
    const chars: { left: number; top: number; char: string }[] = [];
    const walk = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent ?? '';
        for (let i = 0; i < text.length; i++) {
          const ch = text[i] ?? '';
          if (!ch.trim() || ch === '-' || ch === '•') continue;
          const range = document.createRange();
          range.setStart(node, i);
          range.setEnd(node, i + 1);
          const rect = range.getBoundingClientRect();
          if (rect.width > 0 || rect.height > 0) {
            chars.push({ left: rect.left, top: rect.top, char: ch });
          }
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const childEl = node as Element;
        if (childEl.classList.contains('cm-rendered-list-mark')) return;
        for (const child of childEl.childNodes) walk(child);
      }
    };
    walk(el);

    const rows = new Map<number, number>();
    for (const { left, top } of chars) {
      const roundedTop = Math.round(top);
      if (!rows.has(roundedTop)) rows.set(roundedTop, left);
    }

    return [...rows.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([top, left]) => ({ top, left }));
  });

test.describe('soft indent wrap alignment', () => {
  test('list items align first row with wrapped rows at every depth', async ({
    page,
  }) => {
    await setDoc(page);

    await page.evaluate(() => {
      const panel = document.querySelector('.editor-panel');
      if (panel instanceof HTMLElement) panel.style.width = '180px';
    });
    await page.waitForTimeout(500);

    for (const label of ['Top level', 'Nested item', 'Deep nested']) {
      const line = page
        .locator('.cm-line.cm-soft-indent-line')
        .filter({ hasText: label })
        .first();
      const rows = await measureRowsBodyStartLeft(line);

      expect(rows.length, `${label} should wrap`).toBeGreaterThanOrEqual(2);
      const firstRowLeft = rows[0]?.left;
      const wrappedRowLeft = rows[1]?.left;
      if (firstRowLeft === undefined || wrappedRowLeft === undefined) {
        throw new Error(`expected wrapped rows for ${label}`);
      }
      expect(Math.abs(firstRowLeft - wrappedRowLeft)).toBeLessThan(1);
    }
  });
});
