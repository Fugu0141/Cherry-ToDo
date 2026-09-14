# Cherry V2.0 Known Limitations

Status: **Release-candidate limitations — 2026-09-14**

Cherry V2.0 intentionally keeps several capabilities out of scope rather than hiding them behind incomplete behavior.

- Persistence is local to the current browser/device. V2.0 has no account system, hosted synchronization, real-time collaboration, or cross-device conflict service.
- The model is sync-ready, but tombstone/conflict protocols and a network repository are future work.
- Planning tabs can be created and switched in V2.0; rename, delete, duplicate, and manual tab reordering are not exposed in the standard UI yet.
- Structural Flow forbids cycles and self-links. Cyclic relationships belong to reference edges; self-loop reference edges are also outside the initial V2 scope.
- ICS support intentionally targets a common `VEVENT` subset. Recurrence expansion is bounded or reported/skipped rather than attempting an unlimited calendar implementation.
- CSV is a simple interoperability format, not a full-fidelity backup. `.cherry` remains the native format.
- Legacy browser-storage recovery is best-effort. Supported native V1 `.cherry` files/envelopes are the defined compatibility path.
- The release browser gate currently runs Chromium desktop/mobile profiles. Other modern browsers may work but are not part of the automated V2.0 release matrix yet.
- Performance figures in CI are reference measurements, not device-independent latency guarantees.
- The standard UI is intentionally compact and functional rather than a claim of final visual polish. The formal UI-package boundary is the supported redesign/replacement mechanism.
- Arbitrary plugin execution and a full whiteboard/shape suite are not part of V2.0.
