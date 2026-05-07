## 2024-03-24 - Symbol-only Buttons & Implicit Inputs

**Learning:** Symbol-only buttons (like `＋` and `−`) and inputs lacking visible labels but having placeholders are entirely inaccessible to screen readers without explicit ARIA attributes. Furthermore, when dynamic content like player count updates without a page load, screen readers will remain silent unless instructed to announce the change.
**Action:** When creating setup forms or any interactive components, ensure every interactive element has a discernible name (via text content, `aria-label`, or `<label>`). For dynamic text that updates based on user action without changing focus, employ `aria-live="polite"` so screen readers proactively announce the new state.

## 2024-05-17 - Accessible Interactive Elements Without Native Buttons

**Learning:** In React components where `div` elements act as interactive lists or cards (like player status chips), merely adding `onClick` creates significant accessibility barriers. These elements cannot be focused by keyboard and offer no context to screen readers, making it difficult for visually impaired or keyboard-only users to navigate active/current player context.
**Action:** Always add `role="button"` (or relevant role), `tabIndex={0}`, and `onKeyDown` handlers (for `Enter` and `Space` keys) to `div`s with `onClick` handlers. Use `aria-current="true"` or `aria-selected="true"` to denote the active item in a list context, instead of solely relying on visual CSS classes like `playerChipActive`. Additionally, ensure a `:focus-visible` CSS rule is added to indicate keyboard focus clearly.
