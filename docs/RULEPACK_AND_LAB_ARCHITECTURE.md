# Rulepacks, experiments and the permanent Evolution Lab

## Purpose

Evolution Lab is a permanent authoring, testing and learning product. It is developed independently of Star System Explorer (SSE), but its surfaced components are designed to mount inside SSE later. SSE coordinates a run; it does not become the owner of life-rule authoring.

The separation is deliberate:

```text
Rule Workshop ──validates/compiles──▶ immutable rulepack
                                            │
Planet harness or SSE ──environment frames──┼──▶ evolution runtime
                                            │
Experiment Library ◀──run manifest/history─┘
                                            │
Artifact emitters ◀──facts + lineage history┘
```

## Product surfaces

### Evolution runtime

The runtime is framework-neutral. It accepts validated, compiled data and deterministic environment frames. It does not know that a rule editor, Svelte component, route or SSE exists.

### Rule Workshop

The workshop owns drafts, validation feedback, dependency inspection, search, filtering, pagination and export. Its components receive data and callbacks, so the same workshop can run in the standalone Lab or an SSE setup area.

The interface must remain understandable at 500 or more entries. It therefore uses a library/editor layout rather than rendering one giant form. Later iterations add virtualisation, dependency-impact views, bulk operations and schema-specific editors without changing the pack contract.

### Experiment Library

Experiments are project memory, not temporary demos. An experiment records:

- stable ID, version and lifecycle state;
- question and expected learning value;
- master seed and named seed paths;
- engine, schema, provider and rulepack versions;
- planet-harness inputs or SSE body/frame references;
- authored disturbances and overlays;
- checkpoints and expected hashes;
- observations, conclusions, limitations and follow-up ideas.

Users can clone an experiment, change one controlled input, compare outcomes and export the result. Draft experiments may be incomplete. A `reference` experiment requires checkpoint hashes and becomes a regression fixture. Retired experiments remain readable so old design decisions do not lose their evidence.

### Artifact emitters

Family trees, morphology recipes, illustrations and 3D assets are derived products. They are not embedded in the evolution runtime.

A deterministic artifact request includes the run manifest, lineage ID, time, artifact kind, renderer/data versions and a named artifact seed path. Its result carries a content hash and provenance. Family resemblance comes from inherited morphology parameters plus explicit evolutionary deltas. A 2D or 3D renderer can consume the same recipe. Optional generated artwork is a cached presentation asset, not canonical simulation truth unless its exact hash is attached to the run.

## Rulepack contract

A pack is declarative, namespaced, versioned and deterministic. The initial JSON shape contains:

- a manifest with ID, semantic version, schema version, compatible engine range, authors, dependencies and seed namespace;
- rules with stable namespaced IDs, kind, version, priority, prerequisites, conditions, effects, vocabulary and tags;
- later, optional data tables, visual grammars, experiment fixtures and licensed assets.

Initial rule kinds cover resources, gradients, capabilities, transformations, innovations, signatures and visuals. A generic authored-marker component will be added after its predicate and persistence schema is exercised in the planet harness.

Arbitrary JavaScript is excluded from shareable packs. Packs describe possibilities; trusted engine code implements the small vocabulary of condition operators and effects. This makes packs inspectable, portable, sandboxable and reproducible.

Compilation performs the expensive structural work once:

1. validate schema, IDs, values and dependency references;
2. resolve the pack dependency graph in a stable order;
3. apply explicit extension or replacement semantics;
4. sort rules deterministically by priority and stable ID;
5. index candidates by kind, prerequisite and observed fact;
6. calculate a checksum over canonical content;
7. freeze the compiled result for a run.

At runtime, a changed fact wakes only indexed candidate rules. The engine does not scan hundreds of unrelated entries every simulation step.

An eventual `.evolpack` archive should contain a manifest, rules/data, assets, migrations, tests and reference experiments. Merge/override semantics, signing, licensing and asset limits remain open design decisions.

## Authorable derived state and epoch markers

The engine does not contain a `soil`, `reef`, `oxygen revolution` or `civilisation` switch. It models ordinary facts and networks. A rulepack can author a named predicate over those facts when a reusable abstraction or timeline label is valuable.

For example, `surface/substrate-detrital-established` might depend on mineral particle distribution, detritus, solvent retention, nutrient renewal, pore structure, living transformers, spatial coverage and persistence. The story vocabulary may call one parameterisation “living soil”. Nothing in the evaluator knows what soil is, and an alien pack does not need to define an Earth analogue.

A generic marker definition will contain:

- stable namespaced ID and chemistry/ecology/story vocabulary;
- predicates over calculated facts or other derived facts;
- optional minimum duration and lower retention thresholds/loss duration;
- derived facts exposed to dependent rules;
- significance inputs for history and timeline presentation;
- causal source references and signature links.

Markers observe and compress state; they do not cause special physics or biology. Downstream rules may depend on a materialised marker fact for efficiency and authorability, while explanations retain its underlying facts. If detrital substrate permits new consumers, the additional niches, resources and carrying capacity come from the resource/habitat network. The marker merely provides a stable name for that opportunity. Genetic variation is still supplied by mutation, recombination, transfer and similar mechanisms.

The same mechanism can describe a self-renewing detrital cycle, stable aerosol colony, persistent redox buffer, bioturbated sediment, global decomposer network or durable external memory. None is privileged. The history projection may record approaching/entered/leaving/left transitions, and timeline significance is derived from persistence, spatial reach, downstream dependency count, carrying-capacity change, feedback strength and difficulty of reversal.

## Determinism and trust

- All stochastic choices derive from the visible master seed and stable named paths.
- Rule ordering, pack dependency order and conflict resolution are explicit and stable.
- A run records engine, schema, packs, provider, configuration and authored-overlay versions.
- Canonical values use declared units and deterministic ordering; conservation-critical values may later be quantised.
- Imported packs are data, not executable code.
- Resource and asset limits are checked before a pack is accepted.
- Reference experiment hashes expose divergence instead of hiding it.

## SSE boundary

SSE will eventually:

- select installed packs and an experiment/scenario;
- provide versioned star, planet, habitat and disturbance frames;
- coordinate shared physical/evolution checkpoints;
- retain returned biological fluxes, events, signatures and tags;
- mount the shared tree, timeline, inspector, workshop and experiment components where useful.

Evolution Lab owns authoring workflows, rule validation, pack inspection and experiment learning. The runtime owns biological state. SSE owns physical planetary truth. The coordinator owns neither model; it advances them across an explicit contract.

## Near-term build order

1. Keep the microbial flask as the first reproducible experiment.
2. Finish the declarative rule schema, validator, compiler and scalable workshop shell.
3. Promote experiments to reference status only after checkpoint hashes are captured.
4. Add a planet harness with regolith, water, mineral, detritus and erosion stocks.
5. Exercise one generic authored marker over a detrital substrate experiment before stabilising the marker schema.
6. Wire the compiled pack into the runtime and add controlled comparison views.
7. Define deterministic morphology recipes and one simple renderer.
8. Replace the scripted environment with the SSE adapter only after both sides pass the same contract tests.

## Open design choices

- Exact pack extension, conflict and removal semantics.
- Schema migration lifetime and tooling.
- Trust/signing model for shared packs and assets.
- Unit registry and precision policy.
- Minimal universal predicate, persistence, hysteresis and significance fields for authored markers.
- Whether experiment observations are structured records, Markdown notebooks or both.
- Asset size, licence and generated-media provenance rules.
