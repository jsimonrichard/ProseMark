import { describe, expect, test } from 'bun:test';
import { runDocumentHistoryCommand } from './documentHistoryCommand';

describe('runDocumentHistoryCommand', () => {
  test('drains pending edits before checking activity and executing', async () => {
    const order: string[] = [];
    let resolveDrain!: () => void;
    const drain = new Promise<void>((resolve) => {
      resolveDrain = resolve;
    });
    let active = false;

    const run = runDocumentHistoryCommand({
      drain,
      isPanelActive: () => {
        order.push('check-active');
        return active;
      },
      command: 'undo',
      execute: (command) => {
        order.push(command);
        return Promise.resolve();
      },
    });

    order.push('before-drain');
    active = true;
    resolveDrain();
    expect(await run).toBe('ran');
    expect(order).toEqual(['before-drain', 'check-active', 'undo']);
  });

  test('skips execution when the panel is inactive after drain', async () => {
    let executed = false;
    const result = await runDocumentHistoryCommand({
      drain: Promise.resolve(),
      isPanelActive: () => false,
      command: 'redo',
      execute: () => {
        executed = true;
        return Promise.resolve();
      },
    });
    expect(result).toBe('skipped-inactive');
    expect(executed).toBe(false);
  });
});
