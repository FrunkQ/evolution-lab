# Evolution Lab

A browser-first laboratory for deterministic, explainable histories of evolving systems.

> Evolution Lab is a browser-first, population-aggregate simulation framework whose state is a scale-recursive spatiotemporal multigraph; whose histories are deterministically replayable, event-sourced, checkpointed, and branchable; whose resolution adapts by coarse-graining stable intervals and deterministically refining interesting ones; whose epochs are named retrospectively from recorded causal facts; and whose content is instantiated just-in-time from keyed seeded distributions, authored as declarative configuration with AI assistance.

That is the target architecture. The current `v0.6` public prototype is much smaller: one fixed-step deterministic exobiology experiment with daily snapshots, compact events, content-hashed exact checkpoints, a control/shadow fork and a nine-case response family around one scripted light change. It does **not** yet implement a generic multigraph engine, a durable event-sourced store, adaptive resolution, retrospective epoch naming, just-in-time content generation or AI-assisted authoring. Causal provenance remains a defining invariant; AI assistance may eventually help author declarative candidates, never act as runtime authority.

The Lab is for learning, exploration and challenge. Its aim is to be plausibly close to the relevant scientific thinking at the level it actually models, while exposing assumptions and omissions clearly enough to invite useful criticism. It is not evidence, prediction, calibration or scientific proof.

## Installed modes

The root route `/` is a recently-updated catalogue. It and direct route loads resolve the same version-controlled mode metadata:

- `/exobiology` — the live microbial prototype, including a hashed reference experiment and checkpointed control/shadow analysis.
- `/firstlife` — an honest experiment scaffold; no origin-of-life simulation is installed.
- `/galaxy` — an honest domain-neutrality scaffold; no galaxy simulation is installed.

There is one application and one deployment. Modes are paths, not subdomains or code forks. Each catalogue card shows its own content version, intentional last-edit date and lifecycle separately from the global Lab/Engine/Schema/Provider release strip.

The Exobiology workspace has three permanent areas:

- **Live experiment** — explore the current seeded microbial history.
- **Rule Workshop** — author and validate scalable declarative packs independently of the runtime and SSE.
- **Experiment Library** — retain reproducible questions, checkpoints and lessons instead of discarding prototypes.

Its reusable **Levels Through Time** renderer now has four locally selected views over stored daily facts: living mass, positive production of new living mass, biomass-weighted community strain and resource levels. Control and long-shadow futures resume from one verified checkpoint immediately before the light change. Recorded events and the fork are markers; the chart cursor shares the selected timeline day. Observed/shadow and control runs have reserved white and blue identities that lineage colours cannot borrow, with dash and symbol cues retained. View selection, visibility, hover and valid relative scaling are presentation-only and cannot alter either future.

The feedback view asks five deliberately ordinary-language questions: did the community survive, did it recover, how much was lost, how unstable was it and what represented functions still worked? A new response map runs three retained-light levels across three shadow durations from the same saved day. Each square reports minimum living mass, minimum positive new-mass production, recovery time, retained represented functions and end difference; the existing 30%-light, 37-day graph is visibly marked as the centre reference case. A generated cause-and-effect trail links the checkpoint fork, first stored resource and population responses, bottleneck and outcome back to the shared timeline. Beside it, a cumulative help panel explains the same result through Curious, Biology and Engine lenses. The lenses share one factual source; the later lenses add mechanism and implementation detail rather than changing the story. A one-slider concept demo explains a relationship without running or modifying the real experiment. See [Education and help](docs/EDUCATION_AND_HELP.md).

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
- `docs/EDUCATION_AND_HELP.md` — help-lens, diagram and presentation-only concept-demo grammar.
- `docs/REFERENCES.md` — scientific and conceptual source trail.
- `docs/SSE_TIMELINE_REQUIREMENTS.md` — deterministic star/planet/evolution coupling contract.
- `docs/RULEPACK_AND_LAB_ARCHITECTURE.md` — rulepack, modpack, experiment, artifact and authored-marker design.
- `src/lib/contracts` — versioned external compatibility contracts and pinned generated fixtures.
- `src/lib/core` — deterministic framework-neutral simulation code.
- `src/lib/evaluation` — domain-neutral evaluation-profile compilation, thresholds, gate execution and family contracts.
- `src/lib/analysis` — microbial observations, paired metrics/causal steps and the severity-by-duration response-family adapter.
- `src/lib/help` — framework-neutral cumulative help content and isolated concept-demo projections.
- `src/lib/modes` — single typed authority for route, lifecycle and per-mode release metadata.
- `src/lib/projections` — framework-neutral temporal view contracts and history projections.
- `src/lib/rules` — declarative rule types, validation and deterministic compilation/indexing.
- `src/lib/experiments` — versioned experiments and accumulated learning.
- `src/lib/components` — reusable Svelte components intended for both the Lab and SSE.
- `src/App.svelte` — standalone experimental host.

The project is separate from Star System Explorer. No SSE code or stores are imported. The current reference fixture is generated numerical spectral output from a pinned SSE beta revision, with its seed, source provenance and payload hash recorded; no SSE implementation or rulepack data is copied.

## Prototype limitations

Rates and quantities currently use bounded experimental units and are not scientifically calibrated. The live microbial simulation still consumes scalar scripted light; its validated retained-light fraction is only a small precursor to a schema-driven physical-input harness. The SSE spectral fixture validates the future data seam but is not yet runtime wiring. Lineage colours remain authored prototype presentation data, not spectral adaptations; future pigment traits must consume unit-aware provider spectra rather than colour names. The lineage definitions are predefined; the engine demonstrates activation under ecological conditions rather than open-ended mutation.

The current comparison and every response-map case are real branches from one content-hashed checkpoint; the centre case verifies exact resume against the uninterrupted run. A versioned evaluation profile now owns the thresholds and gate declarations, while the microbial adapter supplies observations. Hard gates check checkpoint/prefix/branch integrity, finite and non-negative stored state, repeatability and one unsupported-growth pattern. Complete unit-aware matter/energy conservation and accounting for material introduced by prototype floors and caps are still unavailable, so the UI names those missing gates beside the result. “Recovered” remains a declared aggregate-biomass threshold, not proof that the pre-shadow ecological state or every lineage relationship was restored.

## Licence

Evolution Lab is licensed under the [Apache License 2.0](LICENSE). The package remains marked as private to prevent accidental publication to npm.
