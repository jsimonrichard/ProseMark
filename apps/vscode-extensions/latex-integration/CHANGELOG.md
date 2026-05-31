# vscode-prosemark-latex-integration

## 0.0.2

### Patch Changes

- 99b5cfc: Bundle MathJax `tex-svg.js` into the webview with Vite and use `@prosemark/latex` `mathJaxLoadMode: 'static-import'` instead of copying the package and passing a webview URL.
- Updated dependencies [99b5cfc]
- Updated dependencies [9966e30]
- Updated dependencies [99b5cfc]
- Updated dependencies [99b5cfc]
- Updated dependencies [c4e4a13]
  - @prosemark/latex@0.0.2
  - @prosemark/vscode-extension-integrator@0.0.3

## 0.0.1

### Patch Changes

- 6600ba2: Added **ProseMark LaTeX integration**: a companion extension that turns on math preview in the editor for `$...$` and `$$...$$` using MathJax.

  The main **ProseMark** extension now recommends this companion by default so a typical install still gets math rendering out of the box.

- 2f5166d: LaTeX/math integration now layers on top of other editor add-ons instead of replacing them, so math rendering works together with spell check and other integrations.
- Updated dependencies [182818f]
- Updated dependencies [6600ba2]
- Updated dependencies [6600ba2]
  - @prosemark/latex@0.0.1
  - @prosemark/vscode-extension-integrator@0.0.2
