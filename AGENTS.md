# Evolution Lab agent entry point

Read `ARCHITECTURE.md` before changing code. It is the canonical, agent-oriented map of the project.

Then read only the material routed by its **Agent retrieval map**. Do not infer a design rule from the prototype UI or a test fixture when the architecture document defines it explicitly.

Use `docs/ENGINE_MAP.md` to locate the single code, data and test authority for the concern before editing. Update that map when ownership or routing changes; never create a second implementation because the first one was not found.

Required change discipline:

1. Preserve the invariants identified as `INV-*`.
2. Keep `src/lib/core` free of Svelte, browser globals and SSE imports.
3. Keep reusable components in `src/lib/components`; the app shell may compose them but may not become their data source.
4. Add or update tests for deterministic engine behaviour.
5. Update the affected `ARCHITECTURE.md` status, contract or decision entry in the same change.
6. Record a new `DEC-*` entry when a change closes an open architectural choice.
7. Never modify the sibling Star System Explorer repository from this project.

Rulepack work must preserve `CTR-RULEPACK`: declarative data only, stable namespaced IDs, deterministic compilation and no authoring-state dependency in the runtime. A new experiment starts as `draft`; promotion to `reference` requires reproducible inputs and expected checkpoint hashes. Named states and epochs use the generic `CTR-MARKER` contract; never add soil, oxygenation, civilisation or another familiar milestone as engine-level special behaviour. Rendered lineage art and models follow `CTR-ARTIFACT` and remain outside the core.

If code and documentation disagree, stop and resolve the disagreement rather than silently choosing one.
