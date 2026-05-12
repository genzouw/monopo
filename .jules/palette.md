## 2024-05-12 - Ensure Keyboard Accessibility on Game Board Spaces
**Learning:** Found an accessibility issue where interactable game board spaces (`div` elements acting as buttons) could not be focused via keyboard navigation because they lacked `focus-visible` styles and a focusable `button` element container.
**Action:** Always replace interactive `div` elements with `<button>` tags and ensure appropriate focus management through CSS modules when converting custom clickable elements to accessible actions.
