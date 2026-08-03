## 2024-08-03 - Missing Tooltips on aria-disabled Elements
**Learning:** When using custom components with `aria-disabled` (instead of native `disabled` attributes), visual users lose the native tooltip feedback explaining why a button is unclickable.
**Action:** To preserve UX alongside accessibility, always add dynamic `title` attributes that explain the disabled state (e.g., 'おかねがたりないよ') to `aria-disabled` elements.
