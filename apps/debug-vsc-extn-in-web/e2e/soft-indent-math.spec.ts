import { expect, test } from '@playwright/test';

const FIXTURE = `# Soft indent + math

Plain paragraph with $x^2$ inline.

- List with $y^2$ after words
- Plain list item
  - Nested $a$ child
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
  await page.waitForSelector('.cm-line.cm-soft-indent-line', {
    timeout: 10_000,
  });
};

const lineByText = (page: import('@playwright/test').Page, text: string) =>
  page.locator('.cm-line').filter({ hasText: text }).first();

const lineLayout = async (line: import('@playwright/test').Locator) =>
  line.evaluate((el) => {
    const style = getComputedStyle(el);
    const bullet = el.querySelector('.cm-rendered-list-mark');
    const bulletRect = bullet?.getBoundingClientRect();
    return {
      paddingInlineStart: Number.parseFloat(style.paddingInlineStart),
      textIndent: Number.parseFloat(style.textIndent),
      bulletLeft: bulletRect?.left ?? null,
    };
  });

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

  test('list lines with and without math share the same soft-indent CSS', async ({
    page,
  }) => {
    await page.goto('/');
    await setDoc(page);

    const withMath = lineByText(page, 'List with');
    const withoutMath = lineByText(page, 'Plain list item');

    await expect(withMath).toHaveClass(/cm-soft-indent-line/);
    await expect(withoutMath).toHaveClass(/cm-soft-indent-line/);

    const mathLayout = await lineLayout(withMath);
    const plainLayout = await lineLayout(withoutMath);

    expect(mathLayout.paddingInlineStart).toBeCloseTo(
      plainLayout.paddingInlineStart,
      0,
    );
    expect(mathLayout.textIndent).toBeCloseTo(plainLayout.textIndent, 0);
    expect(mathLayout.textIndent).toBeLessThan(0);

    if (mathLayout.bulletLeft === null || plainLayout.bulletLeft === null) {
      throw new Error('expected list bullets to render');
    }
    expect(mathLayout.bulletLeft).toBeCloseTo(plainLayout.bulletLeft, 0);
  });

  test('padding does not grow when clicking or editing a list line with math', async ({
    page,
  }) => {
    await page.goto('/');
    await setDoc(page);

    const listLine = lineByText(page, 'List with');
    const initial = await lineLayout(listLine);

    const editor = page.locator('.cm-editor');
    for (let i = 0; i < 6; i++) {
      await editor.click();
      await page.waitForTimeout(80);
    }

    const afterClicks = await lineLayout(listLine);
    expect(afterClicks.paddingInlineStart).toBeCloseTo(
      initial.paddingInlineStart,
      0,
    );
    expect(afterClicks.textIndent).toBeCloseTo(initial.textIndent, 0);

    await editor.click();
    await page.keyboard.type('!');
    await page.waitForTimeout(200);

    const afterEdit = await lineLayout(listLine);
    expect(afterEdit.paddingInlineStart).toBeCloseTo(
      initial.paddingInlineStart,
      0,
    );
  });
});
