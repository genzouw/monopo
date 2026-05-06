## 2024-03-24 - Symbol-only Buttons & Implicit Inputs

**Learning:** Symbol-only buttons (like `＋` and `−`) and inputs lacking visible labels but having placeholders are entirely inaccessible to screen readers without explicit ARIA attributes. Furthermore, when dynamic content like player count updates without a page load, screen readers will remain silent unless instructed to announce the change.
**Action:** When creating setup forms or any interactive components, ensure every interactive element has a discernible name (via text content, `aria-label`, or `<label>`). For dynamic text that updates based on user action without changing focus, employ `aria-live="polite"` so screen readers proactively announce the new state.
