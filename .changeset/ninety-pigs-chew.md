---
'@prosemark/core': patch
'@prosemark/render-html': patch
---

Add `eq()` methods to widget classes so unchanged widgets can reuse existing DOM nodes instead of re-rendering on unrelated editor updates. This reduces unnecessary widget churn and avoids repeated failed-image reload attempts when cursor movement does not change widget content.
