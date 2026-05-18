## 2026-05-12 - Ensure Keyboard Accessibility on Game Board Spaces

**Learning:** Found an accessibility issue where interactable game board spaces (`div` elements acting as buttons) could not be focused via keyboard navigation because they lacked `focus-visible` styles and a focusable `button` element container.

**Action:** Always replace interactive `div` elements with `<button>` tags and ensure appropriate focus management through CSS modules when converting custom clickable elements to accessible actions.

## 2026-05-13 - Ensure Focus Indication on Custom Interactive Elements

**Learning:** Found that several custom interactive elements utilizing native `<button>` tags (such as token selectors, trade chips, quick money buttons, and mute toggles) were missing explicit `:focus-visible` styles. Because custom styles (like `background: none` and `border: none`) often strip default browser focus rings, users navigating via keyboard lacked visual cues.

**Action:** Whenever applying custom styles to native interactive elements (especially buttons lacking default borders), always define explicit `:focus-visible` styles with appropriate `outline` and `outline-offset` to preserve clear keyboard accessibility. Use `outline: none;` on the base class to prevent double outlines in some browsers while ensuring `:focus-visible` handles the accessible ring.

## 2026-05-14 - Add tooltips to interactive elements missing visual cues

**Learning:** Found that some interactive elements (like player chips and toggleable property chips) had descriptive `aria-label`s for screen readers but lacked visual tooltips (`title` attributes) for sighted users, making their interactivity or function less obvious.

**Action:** When adding or reviewing interactive elements, ensure they provide visual feedback (like `title` tooltips) in addition to screen-reader accessibility (`aria-label`) to clarify their purpose to all users.

## 2026-05-16 - Make the reason a disabled button is disabled accessible to everyone

**Learning:** Found that the "Game Start!" button was disabled without explaining why when a player's name was missing, leaving users without clear direction on how to proceed. A `title` tooltip alone does not solve this: most browsers suppress hover events on `disabled` buttons, screen-reader handling of `title` is inconsistent, and touch users have no way to see it.

**Action:** Whenever a button is disabled, render the reason as a visible helper text near the button and reference it from the button via `aria-describedby`. `title` may be added as a supplementary hint, but never as the sole channel. Also reinforce the disabled state visually (e.g. lower `opacity` and `cursor: not-allowed`).

## 2026-05-17 - Ensure disabled reasons are accessible to everyone, not just mouse users

**Learning:** Found that the Auction Dialog bid buttons were disabled when a player had insufficient funds, but there was no immediate feedback explaining *why* they couldn't click the button. Sighted users might be confused about game rules or UI state. Previously, I incorrectly thought adding a `title` tooltip would fix this, but that violates our standards (since most browsers suppress hover events on disabled buttons, and screen reader/touch behavior is inconsistent).
**Action:** When a button is conditionally disabled due to a specific rule or state (like insufficient funds), render the reason as visible helper text nearby and link it via `aria-describedby` so all users—whether visual, touch, or screen-reader reliant—can understand the UI state.

## 2026-05-18 - Add empty states to dynamic lists and disable empty submissions
**Learning:** Found that the TradeDialog could be submitted without any items selected, and that empty property lists rendered as confusing blank spaces. Users might think the UI is broken or accidentally submit useless empty trades.
**Action:** Always provide explicit, friendly empty states for dynamic lists (e.g., "わたせる土地がないよ") to reassure users. Additionally, disable submission buttons when the action is a no-op (like an empty trade) and use `aria-describedby` with visible helper text to explain why the button is disabled.
