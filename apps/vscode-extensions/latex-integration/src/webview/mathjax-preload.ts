/**
 * MathJax reads `window.MathJax` when `tex-svg.js` loads. This module must be
 * imported before `mathjax/tex-svg.js` so startup options are in place first.
 *
 * The combined `tex-svg` component includes a11y/speech and tries to load
 * `sre/speech-worker.js` as a separate web worker at runtime. VS Code webviews
 * only ship `webview.js`, so we disable speech/enrichment for editor preview.
 */
window.MathJax = {
  options: {
    skipStartupTypeset: true,
    enableSpeech: false,
    enableBraille: false,
    enableEnrichment: false,
    menuOptions: {
      settings: {
        enrich: false,
        speech: false,
        braille: false,
      },
    },
  },
};
