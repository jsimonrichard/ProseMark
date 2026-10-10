/**
 * Decides whether a VS Code `onDidChangeTextDocument` event should be
 * forwarded into the ProseMark webview.
 *
 * Webview→document `applyEdit` calls produce document-change events that must
 * not be echoed back. Those events can arrive while `applyEdit` is still
 * awaiting, or one or more macrotasks later — after a local CodeMirror undo
 * has already reverted the edit. A late echo of the original insert is what
 * makes the first undo "flash" and then snap back to the latest text.
 */
export class DocumentChangeEchoGate {
  #suppressDepth = 0;
  #appliedVersions = new Set<number>();

  beginApply(): void {
    this.#suppressDepth += 1;
  }

  /**
   * Record that we successfully applied an edit that left the document at
   * `documentVersion`, then release the in-apply suppress on the next
   * macrotask (covers events still queued behind `applyEdit`'s resolution).
   */
  endApply(documentVersion: number, schedule: (fn: () => void) => void): void {
    this.#appliedVersions.add(documentVersion);
    schedule(() => {
      this.#suppressDepth -= 1;
      // Drop the version marker after another macrotask so a late echo that
      // arrives after suppress clears is still recognized as ours.
      schedule(() => {
        this.#appliedVersions.delete(documentVersion);
      });
    });
  }

  /** Release suppress without recording a version (failed / rejected apply). */
  endApplyFailed(schedule: (fn: () => void) => void): void {
    schedule(() => {
      this.#suppressDepth -= 1;
    });
  }

  shouldForward(documentVersion: number, changeCount: number): boolean {
    if (changeCount === 0) {
      return false;
    }
    if (this.#suppressDepth > 0) {
      return false;
    }
    if (this.#appliedVersions.has(documentVersion)) {
      this.#appliedVersions.delete(documentVersion);
      return false;
    }
    return true;
  }
}
