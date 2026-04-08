---
"@prosemark/core": patch
---

Add Markdown formatting shortcuts to `prosemarkBasicSetup`: Mod-b (bold), Mod-i (italic with `_` delimiters), Mod-backtick (inline code), Mod-k (wrap selection as link label in `[text]()` with the cursor in the URL), and Mod-Shift-x (strikethrough when GFM is enabled). Export `prosemarkMarkdownFormattingKeymap` and `prosemarkMarkdownFormattingKeymapExtension` for custom setups.
