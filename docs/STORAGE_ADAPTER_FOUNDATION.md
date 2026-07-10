# Storage adapter foundation

`storage-adapter.js` introduces safe local and in-memory key/value adapters.

This PR intentionally does not change Cherry's current persistence behavior. A follow-up PR will connect `state-storage.js` after browser regression checks.

Manual checks:

- `local.get`, `local.set`, and `local.remove` must not throw when browser storage is blocked.
- `memory` must round-trip string values and remove them.
- Existing task keys and `.cherry` files remain unchanged.
