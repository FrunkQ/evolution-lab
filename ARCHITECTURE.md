# Evolution Lab — canonical architecture reference

> **Audience:** coding agents and maintainers.  
> **Authority:** this file is the project’s canonical architectural context.  
> **Status vocabulary:** `planned`, `prototype`, `implemented`, `deferred`, `authored-only`.  
> **Last structural revision:** 2026-08-25.

## 0. Agent retrieval map

Use stable IDs to retrieve only the context relevant to a task.

| Task | Read first | Then inspect |
|---|---|---|
| Change simulation behaviour | `INV-*`, `LOOP-*`, `MOD-CORE`, `CTR-ENV`, `CTR-HISTORY` | `src/lib/core/` and its tests |
| Add a domain primitive | `PRIM-*`, `INV-*`, `EXT-*` | `src/lib/core/types.ts` |
| Add or change UI | `MOD-UI`, `CTR-VIEW`, `UI-*` | `src/lib/components/`, then `src/App.svelte` |
| Add or change run evaluation | `INV-LEGIBILITY`, `CTR-CHECKPOINT`, `CTR-EVALUATION-PROFILE`, `CTR-EVALUATION-FAMILY`, `CTR-EVALUATION-VIEW`, `DEC-026`, `DEC-028` | `src/lib/evaluation/` first, then the domain adapter in `src/lib/analysis/`, projection tests and renderer |
| Add or change educational help | `INV-LEGIBILITY`, `CTR-HELP-VIEW`, `DEC-022` | `docs/EDUCATION_AND_HELP.md`, `src/lib/help/`, its tests, then `HelpPanel.svelte` |
| Add or change a product mode/route | `INV-PRESENTATION`, `CTR-MODE`, `DEC-018`, `DEC-020` | `src/lib/modes/catalog.ts`, its tests, then the app shell |
| Add or change a temporal chart | `CTR-TEMPORAL-VIEW`, `DEC-019` | `src/lib/projections/temporal.ts`, its tests, then `LevelsThroughTime.svelte` |
| Add or change a rule | `INV-RULEDATA`, `CTR-RULEPACK`, `EXT-*` | `src/lib/rules/`, then its tests and workshop components |
| Add or promote an experiment | `INV-EXPERIMENT`, `CTR-EXPERIMENT` | `src/lib/experiments/`; reference status requires checkpoint hashes |
| Add qualification or performance checks | `INV-DET`, `INV-EXPERIMENT`, `INV-PERFORMANCE`, `CTR-QUALIFICATION`, `CTR-PERFORMANCE`, `DEC-032`, `DEC-033` | `src/lib/experiments/` contracts first, then the domain adapter in `src/lib/analysis/`; elapsed timing remains non-canonical |
| Add a derived state/epoch marker | `PRIM-MARKER`, `CTR-MARKER`, `TIME-*` | authored predicate, ordinary facts, history projection, then vocabulary |
| Add a lineage image/model | `INV-ARTIFACT`, `CTR-ARTIFACT` | future artifact package; never place renderers in the core |
| Validate or evolve provider inputs/SSE datasets | `CTR-ENV`, `CTR-PROVIDER-REQUIREMENT`, `CTR-RUN`, `DEC-016`, `DEC-030` | `docs/ENGINE_MAP.md`, `src/lib/contracts/` and fixture tests |
| Integrate with SSE | `BOUND-SSE`, `CTR-ENV`, `CTR-VIEW`, `CTR-SIGNATURE` | compatibility contracts first; adapter package when it exists; SSE remains read-only here |
| Add alien chemistry | `BOUND-CHEM`, `PRIM-CAP`, `CTR-ENV`, `EXT-CHEM` | chemistry data packs when they exist |
| Add civilisation/technology | `BOUND-TECH`, `CTR-HANDOFF`, `CTR-SIGNATURE` | future technosphere package |
| Change time stepping | `INV-DET`, `INV-TIME`, `LOOP-*` | `src/lib/core/simulate.ts` |
| Add scientific references | `REF-*` | `docs/REFERENCES.md` |
| Plan next work | `MILESTONE-*`, `OPEN-*` | `docs/ENGINE_MAP.md` for ownership, then `docs/HIGH_LEVEL_DESIGN.md` for rationale |

## 1. Objective and boundary

`OBJ-001` Evolution Lab is a browser-first experimental engine and reusable UI for generating deterministic, explainable histories of aggregate life from resource, energy, habitat, inheritance and capability networks.

`OBJ-002` The engine models lineage/guild/ecotype populations, not individual organisms and not complete genomes.

`OBJ-003` Complexity emerges by composing a small set of primitives. Stable networks may wrap into higher-order nodes instead of climbing a hard-coded ladder.

`OBJ-004` The long-term engine is domain-neutral. Biology and first-life are the first rulepack/testbed concerns; a galactic mode must use generic typed state rather than renamed biological fields.

`OBJ-005` The product is a plausibility, challenge and learning tool for interested non-specialists. Its mechanisms should be conceptually defensible at their declared aggregate resolution, but prototype agreement is never presented as scientific proof, calibrated prediction or certification.


`BOUND-SSE` This is a separate project. Star System Explorer (SSE) will eventually provide planetary environments and consume events, fluxes, signatures, tags and view models through adapters. Evolution Lab must not import SSE stores, routes, types or browser state.

`BOUND-CHEM` Origin-of-life chemistry and detailed reaction-network solvers are not part of milestone 1. An abiogenesis provider may later seed compatible initial lineage nodes.

`BOUND-TECH` Cumulative culture and technology are a later, parallel technosphere simulator. The biological engine hands off when information and capabilities persist through external memory and intentional design. Highly speculative entities such as “energy beings” are `authored-only` scenario content.

`BOUND-SCALE` Continuous individual-based evolution, base-pair genomes, global fluid dynamics and continuous billion-year N-body integration are outside the intended browser scope.

## 2. Canonical formulation

`FORM-001`

> The evolutionary model is not one tree. It is a recursive population of lineage-nodes simultaneously participating in ancestry, resource, habitat and capability networks. Stable networks can wrap themselves into higher-order nodes, which is how complexity emerges without requiring a hard-coded ladder.

`FORM-002`

```text
material inputs
+ accessible free-energy gradient
+ capabilities/catalysts
+ suitable environment
→ maintenance + biomass + reproduction + activity
→ offspring + waste + remains + heat + environmental change
```

Energy establishes physical opportunity. Fitness is persistence and reproductive success, not global energy efficiency. Drift, costly display, parasitism, speed/yield trade-offs and historical contingency must remain possible.

## 3. Invariants

These constraints are more stable than any implementation.

| ID | Invariant |
|---|---|
| `INV-MATTER` | Matter changes reservoirs through recorded transformations. A missing source or sink is an error or an explicitly declared open boundary. |
| `INV-ENERGY` | Useful free energy is consumed and ultimately dissipated; it is not indefinitely recycled as matter is. |
| `INV-FITNESS` | Selection acts on persistence and reproduction under local conditions, not on a universal progress or efficiency score. |
| `INV-TRADEOFF` | Capabilities have prerequisites, costs, constraints or contextual disadvantages. Trait loss is valid. |
| `INV-AGGREGATE` | Default simulation units are aggregate populations/lineages/guilds, not individuals. |
| `INV-SPACE` | Habitat is a graph of patches and transport links, not a single global percentage. |
| `INV-DET` | Same engine version + configuration + seed + authored inputs must produce the same history. |
| `INV-SEED` | One master system seed is the root of all randomness. Modules use stable named derived streams, never an order-dependent shared random sequence. |
| `INV-TIME` | Stable intervals may be compressed; interesting transitions may be resolved in detail without changing declared significant outcomes. |
| `INV-CAUSE` | Material population changes, innovations and extinctions retain inspectable causal provenance. |
| `INV-REAL-DATA` | Store reusable physical, chemical or ecological facts. Derive visual adjectives, tags and prose from them. |
| `INV-LAYERS` | Chemistry is source truth; ecology is functional interpretation; story is a presentation projection. |
| `INV-SIGNATURE` | Any process may alter the present and contribute to future evidence through the generalized signature system. |
| `INV-UI` | Evolution Lab and SSE use the same reusable evolutionary UI components. The lab is a host, not a throwaway mock-up. |
| `INV-CORE` | The simulation core is framework-neutral and has no Svelte, DOM, route, SSE or persistence dependency. |
| `INV-VERSION` | Persisted runs and cross-project contracts carry schema and engine versions before public integration. |
| `INV-RULEDATA` | Shareable rulepacks are declarative data. Runtime code never imports the authoring UI, and packs do not execute arbitrary JavaScript. |
| `INV-EXPERIMENT` | Experiments are versioned project memory. Reference experiments include sufficient inputs and hashes to reproduce and diagnose their histories. |
| `INV-ARTIFACT` | Visual and structural artifacts are deterministic derived products with source provenance; they are not canonical biological state. |
| `INV-PRESENTATION` | Routes, chart visibility, hover/focus, viewport and presentation vocabulary cannot alter simulation state, event order or random draws. |
| `INV-LEGIBILITY` | User-facing evaluation begins with ordinary questions and inspectable reasons. Curious, Biology and Engine help lenses share the same facts and limitations, state their claim level, and never promote prototype agreement into scientific proof or exact prediction. |
| `INV-PERFORMANCE` | Canonical outcomes and qualification hashes may depend on deterministic workload counts and authored budgets, never elapsed time, worker scheduling, UI inspection or device identity. Device timings are local observations with explicit scope. |
| `INV-MARKER` | Named milestones are authorable predicates over ordinary state. A marker observes/materialises state; it never creates special-case physics or biology merely because it has a famous label. |

## 4. Domain primitives

| ID | Primitive | Meaning | Current status |
|---|---|---|---|
| `PRIM-RESOURCE` | Resource/reservoir | Material or usable environmental quantity with units and location | simplified prototype |
| `PRIM-GRADIENT` | Energy gradient | Accessible disequilibrium that a capability can exploit | scalar runtime prototype; seeded SSE spectral compatibility fixture implemented |
| `PRIM-HABITAT` | Habitat patch | Conditions, medium, persistence, volume/area and connectivity | named habitat only; graph planned |
| `PRIM-LINEAGE` | Lineage node | Aggregate ancestry-bearing population or ecological guild | implemented prototype |
| `PRIM-POP` | Population state | Biomass, productivity, stress, activity and later diversity/abundance | implemented prototype |
| `PRIM-CAP` | Capability | Heritable or transferable transformation/interaction ability with costs | descriptive prototype |
| `PRIM-TRANSFORM` | Transformation | Typed inputs + gradient + capability → outputs + heat + effects | procedural prototype; data form planned |
| `PRIM-EDGE` | Typed relationship | Ancestry, resource, habitat, dependency, transfer or composition relation | ancestry/resource implemented in view |
| `PRIM-EVENT` | Event | Dated causal transition or disturbance | implemented prototype |
| `PRIM-EPOCH` | Epoch | Stable regime bounded by significant transitions | planned |
| `PRIM-MARKER` | Derived state marker | Authorable named predicate over ordinary facts, optionally persistent and projected as an event/epoch | contract defined; evaluator planned |
| `PRIM-SIGNATURE` | Signature contribution | Active effect or preserved environmental memory produced by any source | three-field prototype |
| `PRIM-WRAPPER` | Higher-order node | Stable lower-node network treated as a new evolutionary individual | planned |
| `PRIM-EVIDENCE` | Observation | Detectable subset and interpretation of surviving signatures | planned |
| `PRIM-RULEPACK` | Rulepack | Declarative, versioned possibility definitions compiled into immutable runtime indexes | compiler implemented; runtime wiring planned |
| `PRIM-EXPERIMENT` | Experiment | Reproducible question, inputs, checkpoints, observations and lessons | catalog/UI prototype |
| `PRIM-ARTIFACT` | Artifact recipe | Deterministic derived morphology/tree/media request with provenance and content hash | planned |

## 5. Four simultaneous networks

The UI may present a “tree”, but the stored model is a graph with typed lenses.

| Network | Primary question | Typical edges |
|---|---|---|
| Ancestry | What descended from what? | descent, split, hybridisation, designed successor |
| Resource | Who transforms or exchanges what? | consume, emit, prey, recycle, mutual exchange |
| Habitat | Where can it persist and move? | occupies, disperses, blocked by, engineers |
| Capability | Where did an ability arise and travel? | mutation, convergence, horizontal transfer, viral shuttle, symbiosis |

Composition is an additional relation used when a stable network wraps into a cell, organism, colony, society or machine ecology.

## 6. Module map

| ID | Module | Responsibility | Dependency rule | Status |
|---|---|---|---|---|
| `MOD-CORE` | `src/lib/core` | Pure deterministic types, seeded simulation, environment-provider harness, history and description inputs | may depend only on plain TypeScript/data | prototype |
| `MOD-CHEM` | future `src/lib/chemistry` | solvents, stoichiometry, accessible gradients and compatibility | core contracts only | planned |
| `MOD-ECOLOGY` | future core subdivision | populations, sparse resource network, habitats and disturbances | core + chemistry contracts | prototype embedded in `simulate.ts` |
| `MOD-LINEAGE` | future core subdivision | variation, inheritance, split/merge/transfer and major transitions | core contracts | planned |
| `MOD-HISTORY` | `src/lib/core/simulate.ts` plus future core subdivision | snapshots, events, content-hashed checkpoints, exact resume/fork, later epochs and causal graph | core contracts | checkpoint/fork prototype; event sourcing planned |
| `MOD-SIGNATURE` | future core subdivision | active effects, transport, preservation, detection and interpretation | environment + history contracts | minimal prototype |
| `MOD-DESC` | `src/lib/core/describe.ts` | derive chemistry/ecology/story wording from facts | read-only core models | prototype |
| `MOD-RULES` | `src/lib/rules` | rulepack types, validation, canonical checksum, compilation and indexes | plain TypeScript/data; no Svelte or SSE | implemented authoring boundary |
| `MOD-MODES` | `src/lib/modes` | installed route catalogue and deterministic per-mode release metadata | plain TypeScript; may identify core scenarios but never create engine behaviour | implemented route slice |
| `MOD-PROJECTION` | `src/lib/projections` | framework-neutral temporal/scene view types; biomass, positive-productivity, weighted-stress and resource histories; checkpoint-control overlays; reserved run palette; visibility/relative transforms and deterministic downsampling | read-only over `CTR-HISTORY`; no Svelte/browser state | implemented checkpoint-feedback slice |
| `MOD-EVALUATION` | `src/lib/evaluation` | domain-neutral typed evaluation profiles, threshold validation, universal/profile gate execution and evaluation-family contracts | plain TypeScript/data; no Svelte, browser or domain imports | implemented first generic slice |
| `MOD-ANALYSIS` | `src/lib/analysis` | microbial observations, paired metrics/causal steps, severity-by-duration family, reference qualification assembly and workload/benchmark adapters | read-only over `SimulationRun` values; consumes evaluation/experiment contracts; no Svelte state and no timing in run identity | implemented qualification slice |
| `MOD-HELP` | `src/lib/help` | cumulative Curious/Biology/Engine teaching content and isolated concept-demo data | consumes analysis facts; cannot import or mutate app/runtime state | implemented first teaching slice |
| `MOD-EXPERIMENTS` | `src/lib/experiments` | versioned experiment catalog, manifest/checkpoint hashes, domain-neutral qualification reports, workload budgets and device-timing summaries | depends on contracts, not app state; device timing is never canonical | pinned-input microbial qualification implemented |
| `MOD-UI` | `src/lib/components` | reusable Svelte components with prop/callback contracts | view contract only; no app stores | prototype |
| `MOD-RULE-UI` | `RuleWorkshop.svelte`, `RuleEditor.svelte` | scalable rulepack authoring and validation surface | consumes rule contracts by props/callbacks | prototype |
| `MOD-LAB` | `src/App.svelte` | experimental host, controls and composition | may use core and reusable UI | prototype |
| `MOD-CONTRACTS` | `src/lib/contracts` | versioned external compatibility schemas, validation and generated numerical fixtures | plain TypeScript/data; no SSE runtime imports | SSE spectral v1 harness implemented |
| `MOD-ARTIFACT` | future separate package | family-tree, morphology, 2D/3D and media recipes/renderers | consumes immutable run facts; never imported by core | planned |
| `MOD-SSE-ADAPTER` | future separate adapter | maps SSE environment/history contracts without polluting either core | explicit versioned contracts | planned |
| `MOD-TECH` | future separate project/package | culture, civilisation and technological inheritance | handoff + environment + signature contracts | deferred |

Target dependency direction:

```text
planet/environment provider ──CTR-ENV──▶ evolution core
planet/environment provider ◀─fluxes─── evolution core
                                          │
                                          ├─CTR-HISTORY──▶ timeline consumers
                                          ├─CTR-SIGNATURE▶ evidence/observer systems
                                          └─CTR-VIEW─────▶ shared Svelte UI

Evolution Lab shell ─┐
                     ├── mounts the same shared UI components
SSE adapter/shell ───┘
```

## 7. Contracts

### `CTR-ENV` Environment provider

Required long-term habitat facts:

- stable `bodyId`, `regionId`, `habitatId`;
- medium and phase;
- temperature/pressure ranges and variability;
- volume, surface area, persistence and connectivity;
- mixing, concentration and transport rates;
- periodic cycles: day/night, wet/dry, freeze/thaw, tides, seasons;
- catalytic/mineral surfaces;
- resource reservoirs and accessible energy gradients;
- radiation and shielding;
- aerosol populations where relevant: composition, phase, particle-size distribution, concentration, altitude, optical behaviour, production and settling.

Compatibility datasets cross this boundary before a runtime adapter exists. A dataset records a schema, pinned provider revision and version, stable system/body/region IDs, master seed and named seed path, physical inputs, numerical provider output and payload hash. The implemented v1 reference fixture carries SSE surface spectral irradiance; it validates the seam but does not replace the live prototype's scalar light input.

The engine returns quantitative transformation fluxes, deposits and physical changes. Tags such as `hazy`, `oxygenated` or `reef-world` are derived outputs, never the only outputs.

### `CTR-PROVIDER-REQUIREMENT` Domain-declared physical inputs and fixture harness

A domain pack declares the provider inputs it requires as stable typed IDs with units, value shape, bounds, authority, current-use status and provenance requirements. The implemented v0.1 profile/fixture compiler supports scalars and curves; distributions and event series remain planned extensions. The same declaration drives the reusable Lab editor, validates imported fixture data and describes the capability an SSE/System Lab adapter must advertise. UI controls are authoring conveniences only: injection compiles an immutable, versioned, content-hashed provider dataset and pins its profile identity and hash into the run manifest. A provider may reject impossible combinations; it must not silently repair authoritative inputs.

Physical backstops remain provider-owned. For exobiology, the long-term electromagnetic input is a unit-aware spectral irradiance distribution plus provider-resolved effects, not a biological colour label. Named non-ionising, ionising or heating-relevant bands are typed projections over that field; hazard depends on energy, intensity, exposure and coupling. Evolution-owned capabilities may later carry absorption/response curves and costs, derive accessible biological energy from the local field, and return absorption/reflection/transmission/emission contributions. They cannot override photon energy, pressure, density, phase or provider conservation constraints. Apparent colour is a presentation/observer projection of the returned spectrum under declared illumination.

The implemented Exobiology profile combines pinned SSE spectral curves with authored Lab scalars for radiation, energy gradients, habitat state, liquid-medium availability, solvent activity, transport and the current scripted adapter. It does not assume water: a scenario declares its solvent/medium identity and any solvent-specific acidity scale. Only requirements marked `drives-prototype` are mapped into today's microbial equations; recorded-only values remain hashed facts and explicit non-capabilities. JSON import/export uses the same fixture schema, and re-import reproduces the hash. Other domains may declare entirely different inputs through the same contract, such as mass distributions and angular momentum for galactic formation. Evolution Lab does not import physical solvers; System Lab/SSE adapters satisfy the declared profile.


### `CTR-HISTORY` History output

Every significant event has:

- stable ID and timestamp/interval;
- event kind;
- affected entity IDs;
- causes and prerequisites;
- quantitative deltas or references to snapshot deltas;
- confidence/provenance (`simulated`, `authored`, later `inferred`);
- optional links to the signature contributions it created.

Long quiet spans become epochs with summary curves and checkpoints. Event windows retain denser resolution.


### `CTR-CHECKPOINT` Content-hashed exact resume and fork

An implemented `SimulationCheckpoint` captures one stored daily boundary: master seed, run manifest and full configuration, authored lineage definitions, the snapshot/event prefix, and the exact rounded runtime state needed to continue. Its canonical content hash excludes no causal input. Validation occurs before resume. Resume rejects a different provider identity and must reproduce the snapshots and events of an uninterrupted run exactly.

A fork manifest records parent checkpoint hash, role, perturbation identity/version/hash, activation day and description. Control and shadow futures share an identical prefix through the checkpoint and activate on the following stored day. Only declared configuration fields may differ. This is a domain-level deterministic fork over the current fixed-step prototype, not yet an event-sourced store, counter-based random-addressing system or browser persistence format.
### `CTR-SIGNATURE` Generalized environmental memory

Any lineage, geological process, astronomical event or technology may emit a signature contribution:

```text
source activity
→ active environmental effect
→ transport / reaction / mixing
→ residue or structural change
→ preservation / destruction
→ observable evidence
→ interpretation
```

Planned channels include chemical, isotopic, mineralogical, biological, structural, spectral, orbital, electromagnetic and informational. Most evidence is stored as regional fields/deposits; exceptional artifacts may be discrete objects.

The system must distinguish:

1. true history;
2. surviving evidence at a date;
3. what a given observer can detect;
4. plausible interpretations and natural false positives.

### `CTR-VIEW` Reusable view model

UI components receive plain serializable values and callback props. They do not import Lab or SSE stores. Minimum view data:

- selected time and available time range;
- active/inactive lineage nodes;
- typed edges for the selected lens;
- population measures;
- events and causal explanations;
- environment/resource ledger;
- signatures;
- vocabulary layer.

Components use CSS variables compatible with SSE’s design tokens and remain themeable by a host.


### `CTR-TEMPORAL-VIEW` Framework-neutral temporal projection

A temporal chart receives explicit `TemporalProjection` data containing typed series, samples, units and markers. The implemented exobiology adapters project four selectable views from stored facts: aggregate/lineage biomass, summed positive population productivity, biomass-weighted stress, and resource levels. Paired quantities compare control and long-shadow futures resumed from the same verified checkpoint. Markers are recorded run events plus the recorded fork; projections never fabricate a scientific event.

Absolute series shown together use the declared unit for that view. Relative mode is available only when dimensionally honest and scales each series against its own stored-history maximum; it compares curve shape, not magnitude. The stress view intentionally has no relative mode. The resource view states that its shared experimental ledger scale does not make light and material stocks physically interchangeable.

Presentation styles are separate data; the renderer does not read engine state. Whole-run observed/shadow and control series use two reserved colours that lineage styles may not borrow. Dash patterns, symbols and text labels remain required non-colour cues. Deterministic downsampling preserves boundaries, recorded marker ticks and the inspected tick. Switching views, toggling, hover/focus and keyboard inspection may change the shared UI cursor but cannot rerun or mutate the simulation.
### `CTR-EVALUATION-VIEW` Plain-language checkpoint control/shadow evaluation

The implemented microbial evaluator resumes control and long-shadow futures from the same verified checkpoint immediately before the light change. It compares same-time snapshots and reports five ordinary questions: survival, recovery, accumulated loss, instability/stress and retained represented functions. Supporting metrics include minimum biomass retention, recovery time, integrated biomass loss, end difference, post-return volatility, peak biomass-weighted stress, minimum positive-productivity retention and retained authored capabilities. A generated causal trail links the fork, first stored resource difference, first population-productivity response, deepest bottleneck and outcome back to timeline days.

Recovery currently means at least 90% of same-time control biomass for 14 consecutive stored days. Hard gates currently verify checkpoint integrity, shared-prefix identity, declared branch isolation, resume equivalence, finite values, non-negative stored stocks, exact fork repeatability and absence of one declared unsupported-runaway pattern. Any failed implemented gate makes the result invalid and prominent. Complete unit-aware conservation and accounting for material introduced by prototype floors/caps remain unavailable gates displayed beside the result; scientific calibration is not claimed.

### `CTR-EVALUATION-PROFILE` Versioned evaluation knowledge

A compiled evaluation profile is domain-neutral typed configuration with stable identity/version/hash. It declares threshold IDs with units and explanations, metric/question/limitation IDs, and ordered gate definitions. Gates distinguish universal integrity requirements from profile-specific scientific or mechanical requirements. Runtime/domain adapters emit observations against declared gate IDs; an undeclared observation is rejected and a missing observation for an implemented gate fails the result. A deliberately unavailable gate remains visible as `not-checked` and does not silently become a pass.

The implemented microbial profile owns the current survival, recovery, stored-difference and unsupported-growth thresholds. `src/lib/evaluation` owns compilation and gate execution; `src/lib/analysis` owns only microbial observations and metric interpretation.

### `CTR-EVALUATION-FAMILY` Checkpoint-paired response family

An evaluation family records stable identity/version/hash, a pinned compiled profile, typed parameter axes and content-hashed cases. Cases in the implemented microbial family fork from one parent checkpoint and vary only retained usable-light fraction and shadow duration. The family contains three retained-light levels (50%, 30%, 10%) by three durations (14, 37, 90 days); the existing 30% for 37 days remains the centre reference case.

Each case reports validity and the currently real resilience measures. The framework-neutral response-map projection translates those records into ordinary language; its Svelte renderer cannot run, tune or mutate the experiment. This is a deterministic boundary probe, not calibration, optimisation, a statistical ensemble or proof of ecological realism.

### `CTR-HELP-VIEW` Cumulative educational explanation

One help topic has stable identity/version and three cumulative lenses over the same fact and limitation IDs:

- Curious assumes interest but no biology or computer-science knowledge;
- Biology adds aggregate ecological mechanisms, assumptions and missing fidelity;
- Engine adds determinism, projection, threshold and implementation terminology such as Fitness Vector.

Biology and Engine begin with the claim level: plausibly close, conceptually defensible mechanisms at aggregate resolution, not calibrated reconstruction. Help may include accessible diagrams, versioned UI captures and small concept demos. A concept demo is an explicitly illustrative, commonly one-slider model that does not consume or alter a `SimulationRun`, seed, provider, checkpoint or experiment result.

### `CTR-MODE` Installed mode and route catalogue

One application and deployment expose:

- `/` as the installed-mode catalogue;
- `/exobiology` as the working microbial prototype;
- `/firstlife` as an experiment scaffold until a real scenario/provider exists;
- `/galaxy` as a domain-neutrality scaffold until a real scenario/provider exists.

No `/social` route or per-mode subdomain is part of this slice. Catalogue selection and direct route loading resolve the same typed descriptor. A live descriptor identifies its scenario; a scaffold explicitly has no installed scenario/provider/domain content and cannot render fabricated results.

Mode release metadata has one authority in `src/lib/modes/catalog.ts`: content version, ISO `lastUpdated`, lifecycle/status, current focus, route and scenario identity. `lastUpdated` is the last intentional user-visible mode/content edit, never wall-clock, filesystem or deployment time. Default catalogue order is descending date with stable mode-ID tie-breaking. Global Lab/Engine/Schema/Provider versions remain separate.

### `CTR-HANDOFF` Biological-to-technosphere seam

Candidate trigger capabilities:

- persistent learning;
- social transmission;
- cumulative culture;
- external tools;
- durable external memory;
- intentional design and autonomous manufacture.

The technosphere adds cultural, designed and software inheritance while continuing to use resource, energy, environment, history and signature contracts. A singularity is a scenario boundary, not a claim that long-term outcomes can be predicted mechanistically.

### `CTR-RUN` Deterministic reproduction manifest

A shareable history is identified by more than its visible seed. Export:

- master system seed;
- named seed derivation paths and seed-derivation algorithm version;
- engine and schema versions;
- scenario and scientific data-pack versions;
- external provider dataset ID, source revision and payload hash when one is used;
- full configuration and authored override/event IDs;
- stable system/body/region identifiers;
- deterministic ordering/quantisation version;
- optional checkpoint hashes for divergence diagnosis.

Named streams are derived as `master seed + stable path`, for example `planet/body-7/evolution/innovation-v1`. No subsystem consumes a mutable global RNG shared with another subsystem. Adding a new stellar decoration must not reshuffle a planet’s biosphere.

### `CTR-RULEPACK` Declarative rulepack

A rulepack carries a namespaced ID, semantic/schema/engine versions, dependency list, seed namespace and declarative rule entries. Validation rejects duplicate or malformed IDs and unresolved prerequisites. Compilation uses stable priority/ID ordering, constructs indexes by kind/dependency/observed fact and calculates a canonical checksum independent of input order.

The runtime receives only a validated immutable compiled pack. Draft state, selection, search and validation UI remain in the Rule Workshop. Shareable packs do not contain executable JavaScript. Future extension/replacement semantics and archive layout are specified before third-party packs are accepted. See `docs/RULEPACK_AND_LAB_ARCHITECTURE.md`.

### `CTR-EXPERIMENT` Reproducible experiment

An experiment records stable identity/version/status, questions, master seed, provider and pack versions, the exact provider-fixture identity, environment/scenario inputs, authored overlays, checkpoint ticks, observations and lessons. Drafts may be incomplete. `reference` status requires a pinned provider input, a canonical manifest hash and an expected content hash for every declared checkpoint, promoting the experiment to a regression fixture. Silent content changes invalidate the manifest hash. Retired experiments remain readable.

### `CTR-QUALIFICATION` End-to-end reference qualification

A qualification report is immutable, deterministic project evidence binding one reference experiment to its manifest, named seeds, content-hashed artifacts and explicit pass/fail checks. The implemented microbial report verifies the exact provider fixture, complete replay, promoted checkpoints, checkpoint-paired futures, all available hard gates, the nine-case response family, a declared-input response, a five-seed replay suite, the structural browser budget and causal-history coverage. Any failed check fails the report; evidence remains visible.

The report qualifies framework plumbing and declared prototype behaviour, not scientific calibration. Unavailable matter/energy and bound-adjustment gates stay listed as model limitations rather than being converted into passes. `npm run qualify` is the focused release command. The Experiment Library consumes only a pinned lightweight summary whose hash and counts are checked against the executable report.

### `CTR-PERFORMANCE` Deterministic workload and local device timing

Performance feedback has two separate records:

1. A deterministic `WorkloadProfile` counts stored snapshots, processed/active node-ticks, peak nodes, flow/event records and serialized-history characters. A versioned `WorkloadBudget` sets authored release limits. These counts and the budget hash may enter qualification.
2. An opt-in `DevicePerformanceObservation` measures median elapsed time for the reference history and nine-case response family on the current browser. Timing never enters a run, checkpoint, qualification hash or seeded result. It carries the versioned benchmark-policy hash, engine version, exact workload/budget, warm-up/sample policy, timing source and local runtime label so observations remain interpretable; the UI neither transmits nor persists it.

The first browser budget is a guardrail, not proof that 500 populations run acceptably. It uses the declared ordinary-world ceiling and storage/work limits to catch uncontrolled growth. The current engine has four authored guilds, so it explicitly withholds a maximum-population estimate: a defensible ceiling requires a variable-node synthetic workload and observations across declared modern-device tiers. A slow local result should cause later iterations to reduce resolved nodes/time, retain less detail or move work off the interaction path; it must not change canonical history.
### `CTR-MARKER` Authorable derived state and epoch marker

A marker definition is a generic rulepack component. It names a predicate over calculated facts, optional minimum duration, retention thresholds/loss duration, significance scoring, emitted derived facts and three-layer vocabulary. Its history projection may emit approaching/entered/leaving/left transitions with causal evidence. Optional hysteresis prevents threshold noise from flickering state.

Markers do not implement the systems they describe. Ordinary resource, habitat, transformation and capability rules create consequences. Downstream rules may depend on a materialised marker fact as a convenient abstraction, but the same state must remain explainable through its source facts. A pack could author `surface/substrate-detrital-established`, `atmosphere/oxygen-buffered` or `culture/external-memory-persistent` without the engine knowing what soil, oxygenation or civilisation is.

These states can expand available resources, gradients, niches, population sizes and lineage coexistence, thereby increasing evolutionary opportunity. Production of genetic variation—mutation, recombination, transfer and other mechanisms—remains a separate process rather than an effect of the label itself.

### `CTR-ARTIFACT` Derived artifact

An artifact request identifies the run manifest, lineage/entity ID, time, artifact kind, renderer/data versions and named artifact seed path. Results carry source provenance and a content hash. Morphology is inherited as a recipe plus explicit deltas, allowing family resemblance across 2D and 3D renderers. External generated imagery is presentation data unless its exact bytes/hash are attached.

## 8. Engine loop

`LOOP-001` Conceptual step:

1. Read environment and open-boundary inputs.
2. Calculate accessible gradients and limiting resources.
3. Apply maintenance, transformation, growth, death and dispersal.
4. Route waste and remains into reservoirs.
5. Apply ecological interactions over sparse edges.
6. Apply variation, transfer, selection, drift and lineage changes when enabled.
7. Update environment-facing fluxes and signatures.
8. Detect significant transitions and record causal events.
9. Decide whether the next interval can be compressed or requires detail.
10. Emit snapshot/checkpoint/view data.

`LOOP-002` Current prototype simplification: one habitat, daily fixed steps, four predefined lineage definitions, procedural transformations and three accumulated signature quantities. Physical forcing already arrives through a swappable deterministic `EnvironmentProvider`; its current implementation is a scripted harness. This is evidence for the contracts, not the final solver architecture.

## 9. Temporal and spatial strategy

`TIME-001` A simulation alternates between slow drift/equilibrium and detailed transition windows. External shocks and internal innovations can both open a detailed window.

`TIME-002` Evolutionary opportunity depends on turnover/generation time, population size/diversity, accessible variation and duration—not elapsed years alone.

`TIME-003` Coupled histories use a shared simulation clock and committed checkpoints. The star/planet provider owns physical environmental truth; Evolution Lab owns living state and biological fluxes; a coordinator selects the next common boundary and commits both outputs. See `docs/SSE_TIMELINE_REQUIREMENTS.md`.

`TIME-004` Timeline prominence is calculated from persistence, reach, downstream dependency count, carrying-capacity change, feedback strength and reversibility. Pack vocabulary names the result; Earth-specific famous-epoch lists do not control it.

`SPACE-001` Planned habitats form a sparse dynamic graph. Edges have transport rates, selectivity and time-dependent barriers. This supports refugia, founder effects, recolonisation, surface/subsurface separation and independent origins meeting.

## 10. Major transitions and recursive nodes

`WRAP-001` A network may be represented as a higher-order lineage only when the model records sufficient persistence, coordinated reproduction/inheritance, mutual dependence and suppression/management of internal conflict.

`WRAP-002` Wrapping is reversible in principle. A coalition can fail, a mutualist can become parasitic, and a complex lineage can lose delegated capabilities.

`WRAP-003` Life stages remain subprofiles of a lineage unless they carry independent ancestry. Different stages may occupy different habitats and resource networks.

## 11. Vocabulary and presentation

`VOCAB-001` One underlying fact set produces three layers:

- **Chemistry:** exact materials, gradients, reactions, tolerances and fluxes.
- **Ecology:** producer, grazer, aerial habitat, detritivore, mutualist, stress.
- **Story:** plausible, evocative language suitable for exploration and role-playing.

`VOCAB-002` Story text may use an explicit analogy (“roughly analogous to”) but must not overwrite alien chemistry with Earth taxonomy.

`UI-001` The interactive tree retains time, selection and node position while switching ancestry/resource/capability/habitat lenses.

`UI-002` The critical inspection action is “Why?”: cause, constraint, enabling capability, competitors, effects and subsequent planetary changes.

`UI-003` The Rule Workshop and Experiment Library are permanent reusable product surfaces. They must remain navigable with hundreds of rules/experiments through search, filters, paging/virtualisation and dependency views. A reference card shows its pinned input and qualification summary; device timing is an explicit local action and cannot mutate the active run.

`UI-004` Levels Through Time is a reusable native-SVG component over `CTR-TEMPORAL-VIEW`. A local History Explorer selects one compatible projection above it. The renderer supports labelled visibility controls, reserved run colours plus non-colour line/symbol distinctions, pointer and keyboard time inspection, real event/fork markers and an explicit explanation of present non-claims.

`UI-005` Experiment Feedback answers survival/recovery/loss/instability/retained-function questions, exposes a timeline-linked causal trail, and makes failed or unavailable hard gates visible before detailed thresholds and limitations. It consumes only `CTR-EVALUATION-VIEW`.

`UI-005A` Evaluation Response Map consumes a framework-neutral projection of `CTR-EVALUATION-FAMILY`. It labels both axes and every outcome in text, marks the centre reference case, exposes the pinned profile/checkpoint identity, and never changes a run or random draw.

`UI-006` Help Panel mirrors the established three-lens interaction with cumulative Curious/Biology/Engine explanations, a schematic comparison diagram and an isolated light concept slider. The Story/Ecology/Chemistry vocabulary selector remains local to the lineage description it changes.

`UI-007` Material & Energy and Causal History are time-local inspection surfaces. They remain directly beneath the shared timeline so moving the time cursor immediately updates the nearby physical state and recorded causes before the user reaches longer-range charts and interpretation.

`UI-008` Physical Inputs is a reusable profile-driven data injector. It renders scalar and curve controls, their units/use/provenance, pinned spectral previews, validation issues, JSON load/download and an explicit push action. It consumes `CTR-PROVIDER-REQUIREMENT`; its future live-provider selector is an adapter seam, not an SSE dependency or a simulated connection.

## 12. Milestones

### `MILESTONE-0` Skeleton — current

Goal: repository shape, canonical documentation, deterministic framework-neutral core, reusable component boundary, tests and build.

Exit criteria:

- `AGENTS.md` and this architecture reference exist;
- same seed yields identical run;
- no negative prototype ledgers;
- UI components import no app stores/SSE code;
- declarative rulepacks validate and compile deterministically at 500-entry test scale;
- experiments remain versioned catalog content rather than being deleted after use;
- the pinned, seeded SSE spectral reference dataset validates with its expected payload hash;
- production build and tests pass.
- `/`, `/exobiology`, `/firstlife` and `/galaxy` resolve in one build without code forks;
- the live microbial run exposes its stored aggregate biomass history through a framework-neutral projection and reusable accessible component;
- scaffold modes visibly distinguish intended contracts from implemented simulation.
- the promoted microbial experiment starts from its content-hashed provider fixture and passes `npm run qualify`;
- deterministic workload counts stay within an authored browser budget while device timing remains optional and non-canonical.

### `MILESTONE-1` Microbial flask — current prototype target

Goal: prove a minimal closed ecological loop with an externally supplied light boundary.

Mechanisms:

- basal chemical replicator;
- light-harvesting producer innovation;
- detritus recycler;
- direct grazer;
- resource limitation, maintenance, growth, death and waste;
- nutrient pulse and sustained shadow;
- oxygen/mineral/sediment environmental memory;
- causal event history and vocabulary layers.

Explicit non-claims: scientifically calibrated rates, abiogenesis, species-level population genetics, conservation-grade mass units.

### `MILESTONE-2` Changing pond

Add periodic environment cycles, dormancy, plastic response, evolutionary response and extinction/recovery. Replace procedural metabolism constants with declared transformations and unit-aware ledgers.

### `MILESTONE-3` Connected habitats

Add patch graph, dispersal, barriers, refugia, founder effects and lineage splitting. Introduce sparse network performance budgets and Web Worker execution.

### `MILESTONE-4` Evolutionary exchange

Add capability prerequisites/costs, mutation supply, trait loss, horizontal transfer, virus-like obligate replicators, parasitism, mutualism, convergence and exaptation.

### `MILESTONE-5` Recursive individuality

Add composition networks, cooperation/conflict accounting, stable wrapper nodes and failed/reversible transitions.

### `MILESTONE-6` Living planet adapter

Version `CTR-ENV`, `CTR-HISTORY`, `CTR-SIGNATURE` and `CTR-VIEW`; connect to a scripted planet provider before connecting to SSE.

### `MILESTONE-7` Alien chemistry packs

Parameterize information polymer, structural backbone, solvent, compartments, electron donors/acceptors, catalytic elements and temperature/pressure regimes. Support compatibility/collision outcomes between independent biospheres.

## 13. Performance envelope

`PERF-001` Browser feasibility depends chiefly on resolution: active nodes, habitats, sparse edges, candidate innovations and temporal checkpoints—not nominal floating-point precision.

The implemented reference profiler separates deterministic structural cost from device speed. Release qualification currently records 361 snapshots, four peak processed populations, 1,444 processed population-days, 2,792 stored flows, seven events and 519,076 serialized JSON characters; all six v0.1 structural limits pass. These values are regression evidence for this experiment, not a universal device-capacity claim.

An opt-in browser benchmark measures the reference history and nine-case response family with three median samples. Its quick/comfortable/slow labels describe only the measuring device. Population ceilings remain withheld until a variable-node workload makes scaling measurable rather than extrapolated from four hard-coded guilds.
Initial design target per world:

- tens of habitat patches;
- roughly 50–500 active aggregate nodes in ordinary runs;
- thousands only in deliberately detailed laboratory scenarios;
- sparse relationship graphs;
- event/epoch stepping rather than generation-by-generation geological time;
- deterministic Web Worker execution before SSE integration.

## 14. Extension rules

| ID | Rule |
|---|---|
| `EXT-001` | Prefer a new data-defined capability/transformation over a new lineage-specific branch in the engine. |
| `EXT-002` | Before adding a calculated field, identify its physical meaning, units, producer and potential consumers. |
| `EXT-003` | Before adding a tag, identify the quantitative facts from which it is derived. |
| `EXT-004` | New event types must state causes, affected entities and signature consequences. |
| `EXT-005` | New UI panels must consume `CTR-VIEW` data and remain host-independent. |
| `EXT-CHEM` | Alternative chemistry is expressed through axes and data packs, not `if siliconLife` special cases. |
| `EXT-AUTHORED` | Content beyond model comprehension is a named authored scenario with explicit assumptions. |

## 15. Decisions

| ID | Decision | State |
|---|---|---|
| `DEC-001` | Build Evolution Lab separately from SSE and integrate by adapter/contracts. | accepted |
| `DEC-002` | Use Svelte 5 + TypeScript + Vite for UI compatibility; keep core plain TypeScript. | accepted |
| `DEC-003` | Build the production-intended shared components in the lab; no throwaway visualizer. | accepted |
| `DEC-004` | Begin with existing simple replicators, then add abiogenesis upstream. | accepted |
| `DEC-005` | Treat signatures/environmental memory as a universal process, not a civilisation feature. | accepted |
| `DEC-006` | Use three vocabulary layers derived from common facts. | accepted |
| `DEC-007` | Treat technology as a new inheritance substrate and separate simulator seam. | accepted |
| `DEC-008` | Keep “energy beings” and comparably unconstrained concepts authored-only. | accepted |
| `DEC-009` | Drive the whole generated history from one master seed using stable named derived streams. | accepted |
| `DEC-010` | Couple physics and evolution through a coordinator and versioned timeline frames, beginning with a scripted provider. | accepted |
| `DEC-011` | Keep the Rule Workshop and Experiment Library as permanent reusable Lab surfaces; SSE mounts them but does not own authoring. | accepted |
| `DEC-012` | Distribute initial modpacks as declarative, namespaced data without arbitrary JavaScript. | accepted |
| `DEC-013` | Preserve experiments as versioned learning and regression content. | accepted |
| `DEC-014` | Use one authorable derived-marker mechanism for any named state or epoch; soil and other familiar milestones have no engine-level special case. | accepted |
| `DEC-015` | Publish the project as Evolution Lab under the Apache License 2.0. | accepted |
| `DEC-016` | Use versioned, seeded numerical datasets generated from pinned SSE revisions as compatibility fixtures; do not duplicate SSE stellar, atmosphere or other authoritative physical solvers in Evolution Lab. | accepted; biological response ownership clarified by `DEC-030` |
| `DEC-017` | Expose Lab, engine, run-schema and active environment-provider versions on initial load from their authoritative sources. | accepted |
| `DEC-018` | Use one route catalogue and deployment: `/`, `/exobiology`, `/firstlife`, `/galaxy`; scaffold routes show no fabricated simulation and no mode uses a subdomain or code fork. | accepted; route renamed by `DEC-024` before external adoption |
| `DEC-019` | Project stored history into a framework-neutral temporal-series contract; render it through a presentation-only native-SVG component connected to the existing inspection cursor. | accepted |
| `DEC-020` | Keep deterministic per-mode content version, intentional ISO last-edit date, lifecycle, focus, route and scenario identity in one typed catalogue, ordered recent-first with a stable ID tie-break. | accepted |

| `DEC-021` | Until checkpoint branching exists, evaluate the long shadow through aligned full deterministic reruns with one declared input difference and same-time comparison; label the limitation explicitly. | superseded by `DEC-026` |
| `DEC-022` | Teach one result through cumulative Curious, Biology and Engine lenses sharing facts/limits, diagrams and isolated one-slider concept demos. | accepted |
| `DEC-023` | Keep explanatory controls local to their effect: Story/Ecology/Chemistry belongs inside the lineage description, separate from analysis-help lenses. | accepted |
| `DEC-024` | Rename the public biological mode and route to Exobiology at `/exobiology` before external use, with no superseded route alias. | accepted |
| `DEC-025` | Target plausibly close, conceptually defensible aggregate mechanisms and challengeable learning, not scientific proof or calibrated prediction. | accepted |
| `DEC-026` | At a rounded stored-day boundary, capture a content-hashed exact checkpoint; validate it before resume; and evaluate declared control/shadow futures whose identical prefix and uninterrupted-run equivalence are tested. | accepted |
| `DEC-027` | Reserve distinct presentation colours for whole-run observed/shadow and control series; lineage series cannot reuse them and every line retains a non-colour cue. | accepted |
| `DEC-028` | Compile versioned, domain-neutral evaluation profiles that declare thresholds, metrics, questions, limitations and universal/profile gates; domain adapters emit observations and missing implemented observations invalidate a result. | accepted |
| `DEC-029` | Treat severity-by-duration futures from one parent checkpoint as an evaluation family of hashed cases; the 30%-light, 37-day case remains the reference graph and the map is a read-only projection. | accepted |
| `DEC-030` | Let domain packs declare typed, unit-aware provider inputs from which the Lab can generate validated hashed fixtures and SSE can implement an adapter. Providers own physical backstops; Evolution-owned capabilities consume those fields and return flux/signature responses. | accepted; first scalar/curve profile and fixture compiler implemented |
| `DEC-031` | Generate one reusable Physical Inputs UI from the provider profile; load/download JSON fixtures and inject only explicitly mapped values while pinning the immutable fixture hash into the run. Solvent/medium identity is declared rather than assuming water. | accepted; Exobiology slice implemented |
| `DEC-032` | Promote a reference experiment only when its exact provider fixture is pinned, then compile one deterministic qualification report across replay, checkpoints, forks, gates, response coverage, named seeds, workload and causal evidence. | accepted; microbial report implemented |
| `DEC-033` | Separate deterministic workload budgets from opt-in device elapsed-time observations. Timing cannot alter or qualify seeded outcomes, and maximum-population estimates remain unavailable until measured against a variable-node workload on declared device tiers. | accepted; first profiler and benchmark seam implemented |

## 16. Open questions

| ID | Question | Earliest decision point |
|---|---|---|
| `OPEN-001` | Exact unit system and acceptable conservation error for open planetary boundaries? | milestone 2 |
| `OPEN-002` | Epoch integrator: adaptive numerical stepping, equilibrium solver or hybrid event scheduler? | milestone 2 |
| `OPEN-003` | Minimum aggregate population genetics needed for drift/speciation without genomes? | milestone 3/4 |
| `OPEN-004` | How should a habitat graph represent overlapping media and vertical layers? | milestone 3 |
| `OPEN-005` | Formal conflict/cooperation metrics for node wrapping? | milestone 5 |
| `OPEN-006` | Persisted run format and schema migration policy? | before milestone 6 |
| `OPEN-007` | Package distribution strategy for SSE: workspace package, source import or published package? | milestone 6 |
| `OPEN-008` | Exact provider-input schema composition, capability negotiation and spectral sampling/return-flux contract? | before live System Lab/SSE adapter |
| `OPEN-009` | Cross-browser determinism level: quantised floating point or fixed-point for conservation-critical ledgers? | milestone 2 |
| `OPEN-010` | Exact rulepack extension, replacement and conflict semantics? | before third-party modpacks |
| `OPEN-011` | Signing, trust, licensing and asset limits for shared modpacks? | before public sharing |
| `OPEN-012` | Minimal universal predicate, persistence and significance schema for authored state/epoch markers? | first planet harness |
| `OPEN-013` | Structured records, Markdown notebooks or both for experiment observations? | experiment comparison UI |
| `OPEN-014` | Which modern-device tiers, repeatable benchmark corpus and variable-node synthetic workloads support defensible population-capacity ceilings? | before milestone 3/Web Workers |

## 17. Change protocol

When a change modifies architecture:

1. Update the relevant stable-ID section.
2. Change status labels accurately; prototype code is not automatically `implemented` architecture.
3. Add a `DEC-*` record if the change resolves an open choice.
4. Add an `OPEN-*` record if it creates a consequential unresolved choice.
5. Update tests for affected invariants.
6. Keep human rationale in `docs/HIGH_LEVEL_DESIGN.md`; keep operational truth here.

References are routed through `docs/REFERENCES.md` using `REF-*` IDs.
