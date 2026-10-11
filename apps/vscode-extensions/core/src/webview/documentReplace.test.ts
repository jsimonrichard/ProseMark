/// <reference types="bun" />
import { describe, expect, test } from 'bun:test';
import { EditorSelection, EditorState, Transaction } from '@codemirror/state';
import { history, redo, undo } from '@codemirror/commands';
import { planDocumentReplace } from './documentReplace.ts';

const applyReplace = (state: EditorState, after: string): EditorState => {
  const plan = planDocumentReplace(
    state.doc.toString(),
    state.selection,
    after,
  );
  if (plan.kind === 'unchanged') {
    return state;
  }

  let next = state;
  if (next.selection.main.anchor !== 0 || next.selection.main.head !== 0) {
    next = next.update({
      selection: { anchor: 0 },
      annotations: Transaction.addToHistory.of(false),
    }).state;
  }
  return next.update({
    changes: plan.changes,
    selection: plan.selection,
    annotations: Transaction.addToHistory.of(false),
  }).state;
};

describe('planDocumentReplace', () => {
  test('leaves the selection alone when the text is unchanged', () => {
    const selection = EditorSelection.single(12);
    const plan = planDocumentReplace('hello world', selection, 'hello world');
    expect(plan.kind).toBe('unchanged');
  });

  test('maps a cursor through an edit that is not at the start', () => {
    const before = 'alpha beta gamma';
    const after = 'alpha gamma';
    const plan = planDocumentReplace(
      before,
      EditorSelection.single(before.indexOf('gamma')),
      after,
    );
    if (plan.kind !== 'replace') {
      throw new Error('expected a replace');
    }
    expect(plan.changes).toEqual({ from: 6, to: 11, insert: '' });
    expect(plan.selection.main.head).toBe(after.indexOf('gamma'));
  });

  test('keeps a cursor in the unchanged prefix', () => {
    const plan = planDocumentReplace(
      'alpha beta gamma',
      EditorSelection.single(2),
      'alpha gamma',
    );
    if (plan.kind !== 'replace') {
      throw new Error('expected a replace');
    }
    expect(plan.selection.main.head).toBe(2);
  });

  test('shifts a cursor in the unchanged suffix', () => {
    const before = 'alpha beta gamma';
    const after = 'alpha gamma';
    const plan = planDocumentReplace(
      before,
      EditorSelection.single(before.length),
      after,
    );
    if (plan.kind !== 'replace') {
      throw new Error('expected a replace');
    }
    expect(plan.selection.main.head).toBe(after.length);
  });

  test('does not send a still-valid cursor to offset 0', () => {
    const before = 'paragraph one\n\nparagraph two stays here';
    const after = 'paragraph one\n\nparagraph two stays';
    const cursor = before.indexOf('stays');
    const plan = planDocumentReplace(
      before,
      EditorSelection.single(cursor),
      after,
    );
    if (plan.kind !== 'replace') {
      throw new Error('expected a replace');
    }
    expect(plan.selection.main.head).toBe(after.indexOf('stays'));
    expect(plan.selection.main.head).not.toBe(0);
  });

  test('places the caret at the end of a restored insertion', () => {
    const before = 'alpha gamma';
    const after = 'alpha beta gamma';
    const plan = planDocumentReplace(
      before,
      EditorSelection.single(before.indexOf('gamma')),
      after,
    );
    if (plan.kind !== 'replace') {
      throw new Error('expected a replace');
    }
    // Restored "beta " — caret at end of that span (start of gamma), not before it.
    expect(plan.selection.main.head).toBe(after.indexOf('gamma'));
    expect(plan.selection.main.empty).toBe(true);
  });
});

describe('document replace and history', () => {
  test('undo and redo keep the cursor on an edit below the top of the document', () => {
    let state = EditorState.create({
      doc: 'paragraph one\n\nparagraph two stays here\n',
      extensions: [history()],
    });
    const at = state.doc.line(3).from + 10;
    state = state.update({ selection: { anchor: at } }).state;
    state = state.update({
      changes: { from: at, insert: 'UNDOWORD' },
      selection: { anchor: at + 'UNDOWORD'.length },
    }).state;

    state = applyReplace(state, state.doc.toString());
    let undone = false;
    undo({
      state,
      dispatch: (transaction: Transaction) => {
        state = transaction.state;
        undone = true;
      },
    });
    expect(undone).toBe(true);
    expect(state.doc.toString().includes('UNDOWORD')).toBe(false);
    expect(state.selection.main.head).toBe(at);

    let redone = false;
    redo({
      state,
      dispatch: (transaction: Transaction) => {
        state = transaction.state;
        redone = true;
      },
    });
    expect(redone).toBe(true);
    expect(state.doc.toString().includes('UNDOWORD')).toBe(true);
    expect(state.selection.main.head).toBe(at + 'UNDOWORD'.length);
  });

  test('a resync to the undone text keeps the cursor on that edit', () => {
    let state = EditorState.create({
      doc: 'paragraph one\n\nparagraph two stays here\n',
      extensions: [history()],
    });
    const at = state.doc.line(3).from + 10;
    const beforeEdit = state.doc.toString();
    state = state.update({ selection: { anchor: at } }).state;
    state = state.update({
      changes: { from: at, insert: 'UNDOWORD' },
      selection: { anchor: at + 'UNDOWORD'.length },
    }).state;

    state = applyReplace(state, beforeEdit);
    expect(state.doc.toString()).toBe(beforeEdit);
    expect(state.selection.main.head).toBe(at);
  });
});
