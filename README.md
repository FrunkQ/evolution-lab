# Evolution Lab

An experimental, browser-first engine and reusable Svelte interface for emergent evolutionary histories.

This first vertical slice is deliberately a **microbial flask**, not an abiogenesis simulator. It demonstrates a deterministic resource network in which primitive lineages discover light harvesting, detritus recycling and direct grazing; the environment is disturbed; and biological activity leaves persistent oxygenation, mineral and sediment signatures.

The app now has three permanent work areas:

- **Live experiment** — explore the current seeded microbial history.
- **Rule Workshop** — author and validate scalable declarative packs independently of the runtime and SSE.
- **Experiment Library** — retain reproducible questions, checkpoints and lessons instead of discarding prototypes.

## Start

```sh
npm install
npm run dev
```

Quality checks:

```sh
npm test
npm run check
npm run build
```

## Repository map

- `ARCHITECTURE.md` — canonical architecture and coding-agent reference.
- `AGENTS.md` — short retrieval and change protocol for future agents.
- `docs/HIGH_LEVEL_DESIGN.md` — human-readable rationale and scope.
- `docs/REFERENCES.md` — scientific and conceptual source trail.
- `docs/SSE_TIMELINE_REQUIREMENTS.md` — deterministic star/planet/evolution coupling contract.
- `docs/RULEPACK_AND_LAB_ARCHITECTURE.md` — rulepack, modpack, experiment, artifact and authored-marker design.
- `src/lib/core` — deterministic framework-neutral simulation code.
- `src/lib/rules` — declarative rule types, validation and deterministic compilation/indexing.
- `src/lib/experiments` — versioned experiments and accumulated learning.
- `src/lib/components` — reusable Svelte components intended for both the Lab and SSE.
- `src/App.svelte` — standalone experimental host.

The project is separate from Star System Explorer. No SSE code or stores are imported.

## Prototype limitations

Rates and quantities currently use bounded experimental units and are not scientifically calibrated. The lineage definitions are predefined; the engine demonstrates activation under ecological conditions rather than open-ended mutation. The architecture explicitly marks these areas as prototypes.

The package is private and no public licence has yet been selected.
