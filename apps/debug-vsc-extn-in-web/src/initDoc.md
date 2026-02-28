# ProseMark VS Code Parity Debugger

This app is for reproducing editor-state and decoration bugs outside VS Code.

## Suggested manual repro flow

1. Click **Load Code Fence Fixture**
2. Click near the opening fence marker line
3. Drag-select across lines inside the fenced code body
4. Watch the event log for errors

## Misspelled words for spellcheck

- teh
- recieve
- accomodate

## Sample fenced code

```ts
const tehValue = 1;
function recieveMessage() {
  return 'accomodate';
}
```
