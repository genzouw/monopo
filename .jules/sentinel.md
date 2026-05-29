## 2025-05-18 - [Insecure Local Storage Parsing]

**Vulnerability:** GameState was parsed from local storage and immediately trusted without thorough structural validation. Specifically, it checked `.length` on `state.players`, which could be circumvented with an object crafted to bypass it (e.g. `{"length": 1}`), potentially causing runtime crashes or insecure behavior when the app assumed it was an array.
**Learning:** Even seemingly internal data stores like `localStorage` must be treated as untrusted user input since they can be freely modified by clients.
**Prevention:** Always deeply validate the structure (e.g., checking `Array.isArray()`) of parsed JSON payloads from local storage before applying them to application state.
