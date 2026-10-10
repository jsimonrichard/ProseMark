/// <reference types="bun" />
import { describe, expect, test } from 'bun:test';
import { DocumentChangeEchoGate } from './documentChangeEchoGate.ts';

/** Run scheduled macrotasks in FIFO order (stand-in for `setTimeout(0)`). */
const createScheduler = () => {
  const queue: (() => void)[] = [];
  return {
    schedule: (fn: () => void) => {
      queue.push(fn);
    },
    flushOne: () => {
      const fn = queue.shift();
      if (!fn) {
        throw new Error('No scheduled task to flush');
      }
      fn();
    },
    flushAll: () => {
      while (queue.length > 0) {
        queue.shift()?.();
      }
    },
    get pending() {
      return queue.length;
    },
  };
};

describe('DocumentChangeEchoGate', () => {
  test('drops document changes while an apply is in flight', () => {
    const gate = new DocumentChangeEchoGate();
    gate.beginApply();
    expect(gate.shouldForward(5, 1)).toBe(false);
  });

  test('drops a late echo for the version we just applied', () => {
    const gate = new DocumentChangeEchoGate();
    const scheduler = createScheduler();

    gate.beginApply();
    // Sync echo during applyEdit — suppressed by depth.
    expect(gate.shouldForward(5, 1)).toBe(false);

    gate.endApply(5, scheduler.schedule);
    // applyEdit resolved; suppress still held until the first scheduled tick.
    expect(gate.shouldForward(5, 1)).toBe(false);

    scheduler.flushOne();
    // Suppress cleared, but version 5 is still marked as our apply.
    expect(gate.shouldForward(5, 1)).toBe(false);

    scheduler.flushAll();
  });

  test('reproduces the first-undo flash race and keeps the echo dropped', () => {
    const gate = new DocumentChangeEchoGate();
    const scheduler = createScheduler();

    // User typed; host applied insert → document version 5.
    gate.beginApply();
    gate.endApply(5, scheduler.schedule);
    scheduler.flushOne(); // suppress cleared; version 5 still remembered

    // User undoes in CodeMirror (local). Before the undo's applyEdit runs,
    // a late onDidChangeTextDocument for the insert arrives at version 5.
    expect(gate.shouldForward(5, 1)).toBe(false);

    // Undo's applyEdit runs → version 6.
    gate.beginApply();
    gate.endApply(6, scheduler.schedule);
    scheduler.flushAll();

    // A later external (or genuine host) edit at version 7 is forwarded.
    expect(gate.shouldForward(7, 1)).toBe(true);
  });

  test('forwards changes from a new document version', () => {
    const gate = new DocumentChangeEchoGate();
    const scheduler = createScheduler();

    gate.beginApply();
    gate.endApply(5, scheduler.schedule);
    scheduler.flushAll();

    expect(gate.shouldForward(6, 1)).toBe(true);
  });

  test('releases suppress after a failed apply without poisoning versions', () => {
    const gate = new DocumentChangeEchoGate();
    const scheduler = createScheduler();

    gate.beginApply();
    gate.endApplyFailed(scheduler.schedule);
    expect(gate.shouldForward(5, 1)).toBe(false);
    scheduler.flushOne();
    expect(gate.shouldForward(5, 1)).toBe(true);
  });
});
