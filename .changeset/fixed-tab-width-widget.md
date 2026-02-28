---
"@prosemark/core": patch
---

Fix soft-indent jitter described in issue #96 by rendering tab characters with a fixed-width widget (4ch), keeping indent measurements stable.
