/**
 * MathJax reads `window.MathJax` when `tex-svg.js` loads. This module must be
 * imported before `mathjax/tex-svg.js` so startup options are in place first.
 */
window.MathJax = {
  options: {
    skipStartupTypeset: true,
  },
};
