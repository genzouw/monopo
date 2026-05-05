## 2025-05-05 - Inadequate Trade Offer Input Validation
**Vulnerability:** A player could potentially enter a negative number for `offerMoney` or `requestMoney` in `TradeDialog.tsx`, or values exceeding their actual balance. This is because HTML `min`/`max` attributes only constrain browser UI up/down arrows, not keyboard input or script-level changes.
**Learning:** React state updates on `<input type="number">` bypass HTML min/max constraints.
**Prevention:** Always enforce logical constraints in the `onChange` handler or just before saving the state, bounding values to valid ranges.
