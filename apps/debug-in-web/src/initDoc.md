# debug-in-web

Use the sidebar to load tab fixtures and move the caret. This editor includes **`drawSelection()`** so overlay caret behavior matches many real setups.

## Manual tab repro

1. Click **Load `a\tb`**
2. Click **Caret before tab** — selection should sit between `a` and the tab
3. Click **Caret after tab** — selection should sit after the tab
4. Use **Log coords + overlay caret** to print `coordsAtPos` and the `.cm-cursor-primary` bounding box

Indented line with tabs (for soft indent + tab width together):

	one	two	three
