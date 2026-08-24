# Evolution Lab

A browser-first laboratory for deterministic, explainable histories of evolving systems.

> Evolution Lab is a browser-first, population-aggregate simulation framework whose state is a scale-recursive spatiotemporal multigraph; whose histories are deterministically replayable, event-sourced, checkpointed, and branchable; whose resolution adapts by coarse-graining stable intervals and deterministically refining interesting ones; whose epochs are named retrospectively from recorded causal facts; and whose content is instantiated just-in-time from keyed seeded distributions, authored as declarative configuration with AI assistance.

That is the target architecture. The current `v0.3` public prototype is much smaller: one fixed-step, deterministic microbial experiment with daily snapshots and a compact event list. It does **not** yet implement a generic multigraph engine, event-sourced replay, branching/checkpoints, adaptive resolution, retrospective epoch naming, just-in-time content generation or AI-assisted authoring. Causal provenance remains a defining invariant; AI assistance may eventually help author declarative candidates, never act as runtime authority.

## Installed modes

The root route `/` is a recently-updated catalogue. It and direct route loads resolve the same version-controlled mode metadata:

- `/biology` — the live microbial prototype, including its real aggregate-biomass history.
- `/firstlife` — an honest experiment scaffold; no origin-of-life simulation is installed.
- `/galaxy` — an honest domain-neutrality scaffold; no galaxy simulation is installed.

There is one application and one deployment. Modes are paths, not subdomains or code forks. Each catalogue card shows its own content version, intentional last-edit date and lifecycle separately from the global Lab/Engine/Schema/Provider release strip.

The biology workspace has three permanent areas:

- **Live experiment** — explore the current seeded microbial history.
- **Rule Workshop** — author and validate scalable declarative packs independently of the runtime and SSE.
- **Experiment Library** — retain reproducible questions, checkpoints and lessons instead of discarding prototypes.

Its reusable **Levels Through Time** view projects stored daily aggregate biomass for total active biomass and the four authored lineages. Recorded run events are markers; the chart cursor shares the timeline’s selected day. Visibility, hover and relative scaling are presentation-only and cannot alter the run.

## Start

```sh
npm ci
npm run dev
```

The initial screen displays Lab, engine, run-schema, provider, selected mode and scenario identities so a deployed test instance can be identified without opening developer tools.

Quality checks:

```sh
npm test
npm run check
npm run build
```

## Repository map

- `ARCHITECTURE.md` — canonical architecture and coding-agent reference.
- `AGENTS.md` — short retrieval and change protocol for future agents.
- `docs/ENGINE_MAP.md` — sparse AI routing map for the single code, data and test authority behind each concern.
- `docs/HIGH_LEVEL_DESIGN.md` — human-readable rationale and scope.
- `docs/REFERENCES.md` — scientific and conceptual source trail.
- `docs/SSE_TIMELINE_REQUIREMENTS.md` — deterministic star/planet/evolution coupling contract.
- `docs/RULEPACK_AND_LAB_ARCHITECTURE.md` — rulepack, modpack, experiment, artifact and authored-marker design.
- `src/lib/contracts` — versioned external compatibility contracts and pinned generated fixtures.
- `src/lib/core` — deterministic framework-neutral simulation code.
- `src/lib/modes` — single typed authority for route, lifecycle and per-mode release metadata.
- `src/lib/projections` — framework-neutral temporal view contracts and history projections.
- `src/lib/rules` — declarative rule types, validation and deterministic compilation/indexing.
- `src/lib/experiments` — versioned experiments and accumulated learning.
- `src/lib/components` — reusable Svelte components intended for both the Lab and SSE.
- `src/App.svelte` — standalone experimental host.

The project is separate from Star System Explorer. No SSE code or stores are imported. The current reference fixture is generated numerical spectral output from a pinned SSE beta revision, with its seed, source provenance and payload hash recorded; no SSE implementation or rulepack data is copied.

## Prototype limitations

Rates and quantities currently use bounded experimental units and are not scientifically calibrated. The live microbial simulation still consumes scalar scripted light; the SSE spectral fixture validates the future physical-data seam but is not yet runtime wiring. Lineage colours remain authored prototype presentation data, not spectral adaptations. The lineage definitions are predefined; the engine demonstrates activation under ecological conditions rather than open-ended mutation. The architecture explicitly marks these areas as prototypes.

## Licence

Evolution Lab is licensed under the [Apache License 2.0](LICENSE). The package remains marked as private to prevent accidental publication to npm.
