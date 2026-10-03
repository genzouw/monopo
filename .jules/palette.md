## 2024-10-03 - Added aria-hidden to decorative game emojis
**Learning:** Emojis representing dynamic game state (like houses and tokens) on the game board spaces can be read out literally by screen readers, causing clunky repetition, especially when the parent element (like the space `<button>`) already provides a comprehensive, dynamic `aria-label` that announces the same information clearly.
**Action:** Always wrap state-representing emojis in `<span aria-hidden="true">` when the parent interactive element provides a full, accessible text alternative via `aria-label`.
