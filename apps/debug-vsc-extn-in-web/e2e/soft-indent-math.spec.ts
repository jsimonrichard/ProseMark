import { expect, test } from '@playwright/test';

const FIXTURE = `# Soft indent + math

Plain paragraph with $x^2$ inline.

- List item with $y^2$ after text
- $z^2$ right after marker
  - Nested $a$ item
`;

const setDoc = async (page: import('@playwright/test').Page) => {
  await page.waitForSelector('.cm-editor');
  await page.evaluate((doc) => {
    const view = window.debugEditor;
    if (!view) throw new Error('debugEditor missing');
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: doc },
    });
  }, FIXTURE);
  // Let soft-indent requestMeasure + refresh settle
  await page.waitForSelector('.cm-line.cm-soft-indent-line', {
    timeout: 10_000,
  });
};

const lineByText = (page: import('@playwright/test').Page, text: string) =>
  page.locator('.cm-line').filter({ hasText: text }).first();

const paddingInlineStartPx = async (
  line: import('@playwright/test').Locator,
) => {
  const value = await line.evaluate((el) =>
    Number.parseFloat(getComputedStyle(el).paddingInlineStart),
  );
  return Number.isFinite(value) ? value : 0;
};

test.describe('soft indent with inline math', () => {
  test('does not soft-indent plain paragraphs that contain math', async ({
    page,
  }) => {
    await page.goto('/');
    await setDoc(page);

    const plain = lineByText(page, 'Plain paragraph');
    await expect(plain).toBeVisible();
    await expect(plain).not.toHaveClass(/cm-soft-indent-line/);
  });

  test('soft-indents list lines that contain math', async ({ page }) => {
    await page.goto('/');
    await setDoc(page);

    const plain = lineByText(page, 'Plain paragraph');
    const listLine = lineByText(page, 'List item with');

    await expect(listLine).toHaveClass(/cm-soft-indent-line/, {
      timeout: 10_000,
    });
    await expect(listLine).toHaveClass(/cm-soft-indent-line--inline-math/);

    const plainPad = await paddingInlineStartPx(plain);
    const listPad = await paddingInlineStartPx(listLine);
    expect(listPad).toBeGreaterThan(plainPad + 4);
  });

  test('padding does not grow when clicking or editing', async ({ page }) => {
    await page.goto('/');
    await setDoc(page);

    const plain = lineByText(page, 'Plain paragraph');
    const listLine = lineByText(page, 'List item with');
    await expect(listLine).toHaveClass(/cm-soft-indent-line/);

    const initial = await paddingInlineStartPx(listLine);
    const plainPad = await paddingInlineStartPx(plain);
    expect(initial).toBeGreaterThan(plainPad + 4);

    const editor = page.locator('.cm-editor');
    for (let i = 0; i < 6; i++) {
      await editor.click();
      await page.waitForTimeout(80);
    }

    await listLine.evaluate((el) => el.textContent);
    const afterClicks = await paddingInlineStartPx(listLine);
    expect(afterClicks).toBeCloseTo(initial, 0);

    // Typing in the list line should not inflate padding either
    await editor.click();
    await page.keyboard.type('!');
    await page.waitForTimeout(200);

    const afterEdit = await paddingInlineStartPx(listLine);
    expect(afterEdit).toBeCloseTo(initial, 0);
  });
});
