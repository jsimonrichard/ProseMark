---
'@prosemark/latex': patch
---

Show LaTeX render errors inline in the editor with configurable `--pm-latex-math-error-color` and `--pm-latex-math-error-background-color` CSS variables. Defaults use red text on a semi-transparent gray pill styled like inline code. TeX parse errors from MathJax are detected and routed through the same UI instead of MathJax's built-in yellow error styling.
