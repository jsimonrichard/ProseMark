import { ChangeSet, EditorSelection } from '@codemirror/state';

export type DocumentReplacePlan =
  | { kind: 'unchanged' }
  | {
      kind: 'replace';
      changes: { from: number; to: number; insert: string };
      selection: EditorSelection;
    };

/**
 * Plan a full-document sync as the single contiguous edit between `before`
 * and `after`, and map `selection` through that edit.
 *
 * A raw replace of the whole document maps every in-range cursor to offset 0.
 * The contiguous edit keeps a cursor in the shared prefix or suffix, and
 * places a cursor inside the edited span on that span.
 */
export const planDocumentReplace = (
  before: string,
  selection: EditorSelection,
  after: string,
): DocumentReplacePlan => {
  if (before === after) {
    return { kind: 'unchanged' };
  }

  const change = contiguousDocumentChange(before, after);
  const changeSet = ChangeSet.of([change], before.length);
  const mapped = selection.map(changeSet);
  for (const range of mapped.ranges) {
    if (
      range.from < 0 ||
      range.to < 0 ||
      range.from > after.length ||
      range.to > after.length
    ) {
      throw new Error(
        'Mapped selection falls outside the document after replace',
      );
    }
  }

  return { kind: 'replace', changes: change, selection: mapped };
};

const contiguousDocumentChange = (
  before: string,
  after: string,
): { from: number; to: number; insert: string } => {
  let prefix = 0;
  const shared = Math.min(before.length, after.length);
  while (
    prefix < shared &&
    before.charCodeAt(prefix) === after.charCodeAt(prefix)
  ) {
    prefix += 1;
  }

  let suffix = 0;
  const suffixLimit = shared - prefix;
  while (
    suffix < suffixLimit &&
    before.charCodeAt(before.length - 1 - suffix) ===
      after.charCodeAt(after.length - 1 - suffix)
  ) {
    suffix += 1;
  }

  const change = {
    from: prefix,
    to: before.length - suffix,
    insert: after.slice(prefix, after.length - suffix),
  };
  const nextLength =
    before.length - (change.to - change.from) + change.insert.length;
  if (nextLength !== after.length) {
    throw new Error(
      'Document replace diff does not produce the replacement text',
    );
  }
  return change;
};
