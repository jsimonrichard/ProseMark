/**
 * Run a TextDocument undo/redo after draining in-flight webview→document
 * applies. Skip when the custom editor panel is not active so the chord cannot
 * land on a different document (same pattern as VS Code's markdown editor).
 */
export async function runDocumentHistoryCommand(options: {
  drain: Promise<void>;
  isPanelActive: () => boolean;
  command: 'undo' | 'redo';
  execute: (command: 'undo' | 'redo') => Promise<unknown>;
}): Promise<'ran' | 'skipped-inactive'> {
  await options.drain;
  if (!options.isPanelActive()) {
    return 'skipped-inactive';
  }
  await options.execute(options.command);
  return 'ran';
}
