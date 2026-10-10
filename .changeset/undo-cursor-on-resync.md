---
'vscode-prosemark': patch
---

Keep undo/redo cursor position when resyncing the document, and drop delayed document-change echoes (including after the first macrotask) so the first undo is not overwritten by the edit being undone.
