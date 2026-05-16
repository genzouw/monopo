## 2026-05-12 - Ensure Keyboard Accessibility on Game Board Spaces

**Learning:** Found an accessibility issue where interactable game board spaces (`div` elements acting as buttons) could not be focused via keyboard navigation because they lacked `focus-visible` styles and a focusable `button` element container.

**Action:** Always replace interactive `div` elements with `<button>` tags and ensure appropriate focus management through CSS modules when converting custom clickable elements to accessible actions.

## 2026-05-13 - Ensure Focus Indication on Custom Interactive Elements

**Learning:** Found that several custom interactive elements utilizing native `<button>` tags (such as token selectors, trade chips, quick money buttons, and mute toggles) were missing explicit `:focus-visible` styles. Because custom styles (like `background: none` and `border: none`) often strip default browser focus rings, users navigating via keyboard lacked visual cues.

**Action:** Whenever applying custom styles to native interactive elements (especially buttons lacking default borders), always define explicit `:focus-visible` styles with appropriate `outline` and `outline-offset` to preserve clear keyboard accessibility. Use `outline: none;` on the base class to prevent double outlines in some browsers while ensuring `:focus-visible` handles the accessible ring.

## 2026-05-14 - Add tooltips to interactive elements missing visual cues

**Learning:** Found that some interactive elements (like player chips and toggleable property chips) had descriptive `aria-label`s for screen readers but lacked visual tooltips (`title` attributes) for sighted users, making their interactivity or function less obvious.

**Action:** When adding or reviewing interactive elements, ensure they provide visual feedback (like `title` tooltips) in addition to screen-reader accessibility (`aria-label`) to clarify their purpose to all users.

## 2026-05-16 - Add tooltip to disabled start button

**Learning:** Found that the "Game Start!" button was disabled without explaining why when a player's name was missing, leaving users without clear direction on how to proceed.

**Action:** Whenever a button is disabled, ensure there is a clear visual cue (like a `title` tooltip) explaining why it's disabled and what the user needs to do to enable it.
