# Evolution Lab engine map

This is a sparse routing index for agents. It points to the one authoritative code, data and test location for each concern; it does not restate formulas or contracts. If this map and an authority disagree, fix this map in the same change.

## Before editing

1. Read `ARCHITECTURE.md` and preserve every affected `INV-*` and `CTR-*` contract.
2. Find the concern below and edit its named authority rather than creating a parallel implementation.
3. Run the routed test. Deterministic engine changes require a reproducible seed and expected outputs.
4. Update the affected architecture status, contract or `DEC-*` entry in the same change.

## Authority and test routing

| Concern | Single authority | Data authority | Verification / consumer boundary |
|---|---|---|---|
| Architecture, invariants and contracts | `ARCHITECTURE.md` | `ARCHITECTURE.md` | All modules |
| Simulation loop, run manifest, checkpoint, resume and fork | `src/lib/core/simulate.ts` | Scenario/environment inputs plus `SimulationCheckpoint` and `SimulationForkManifest` | `src/lib/core/simulate.spec.ts`; uninterrupted/resume equivalence, content validation, prefix identity and divergent futures |
| Canonical runtime content hashing | `src/lib/core/canonical.ts` | Canonically ordered serializable content plus a versioned namespace | Core checkpoint and experiment tests; rulepack authority re-exports this implementation |
| Seed derivation and random streams | `src/lib/core/rng.ts` | Run master seed and named paths | Core simulation tests |
| Scripted external forcing | `src/lib/core/environment.ts` | Validated `SimulationConfig` in `src/lib/core/types.ts`; injected profile values reach it only through `exobiologyFixtureToSimulationConfig` | Core simulation tests; manifest pins the compiled input identity; no UI-owned forcing |
| Provider input run identity | `src/lib/core/types.ts` `ProviderInputReference` | Profile identity plus fixture hash shared by simulation config, run manifest and experiment extension | Core simulation and experiment-catalog tests; do not redeclare the common fields |
| Generic provider requirement and fixture compiler | `src/lib/contracts/providerRequirements.ts` | Stable profile/fixture schemas, scalar/curve values, units, bounds, authority/use/provenance and content hash | `src/lib/contracts/providerRequirements.spec.ts`; import/export round-trip hash, immutability and invalid input rejection |
| Exobiology physical-input profile and prototype adapter | `src/lib/contracts/exobiologyInputs.ts` | Profile-authored physical/scenario requirements plus pinned SSE spectral presets | Same contract test; only `drives-prototype` requirements map into `SimulationConfig`; no water or other solvent engine assumption |
| SSE compatibility dataset schema | `src/lib/contracts/ssePlanetDataset.ts` | `src/lib/contracts/fixtures/sse-beta-spectral-v1.json` | `src/lib/contracts/ssePlanetDataset.spec.ts` |
| SSE stellar, atmosphere and spectrum physics | Star System Explorer `beta` `/physics` implementation | A pinned SSE revision and rulepack | Evolution Lab consumes generated numerical datasets only; it does not duplicate or import SSE source |
| Lineage vocabulary and authored prototype colour | `src/lib/core/scenario.ts` | Scenario declaration | Core simulation tests; authored colour is not a physical spectral result |
| Derived narrative descriptions | `src/lib/core/describe.ts` | Checkpoint and lineage state | Description tests; prose must follow state, never create it |
| Rulepacks | `src/lib/rules` | Declarative namespaced rulepack data | `src/lib/rules/rules.spec.ts` and `CTR-RULEPACK` |
| Reference experiments and expected checkpoints | `src/lib/experiments/catalog.ts`; validation/hash authority in `src/lib/experiments/validate.ts` | Versioned experiment record, pinned provider input, immutable manifest hash and expected checkpoint hashes | `src/lib/experiments/catalog.spec.ts`; exact input/checkpoint reproduction and silent-content-change rejection |
| End-to-end experiment qualification contract | `src/lib/experiments/qualification.ts` | Immutable experiment/artifact/seed identities, explicit check evidence and deterministic report hash | `src/lib/experiments/qualification.spec.ts`; failed checks remain visible and fail the report |
| Microbial reference qualification adapter | `src/lib/analysis/microbialQualification.ts` | Existing provider, reference, checkpoint, evaluation-family, workload and causal authorities only | `src/lib/analysis/microbialQualification.spec.ts` and `npm run qualify`; pinned lightweight UI summary must equal the executable report |
| Workload budgets and device timing summaries | `src/lib/experiments/performance.ts` | Deterministic `WorkloadProfile`/`WorkloadBudget`; versioned benchmark policy plus non-canonical contextual `DevicePerformanceObservation` | `src/lib/experiments/performance.spec.ts`; policy/context validation, elapsed timing never enters hashes and population ceilings may be unavailable |
| Microbial workload and benchmark adapter | `src/lib/analysis/microbialPerformance.ts` | Read-only `SimulationRun` counts plus opt-in fixed-seed timing callback | `src/lib/analysis/microbialPerformance.spec.ts`; six structural limits, bounded samples and no invented population estimate |
| Reusable UI | `src/lib/components` | Props/events from the app shell | Component tests when added |
| Installed mode routes and per-mode release metadata | `src/lib/modes/catalog.ts` | Version-controlled descriptor values only; `lastUpdated` is an intentional ISO content-edit date | `src/lib/modes/catalog.spec.ts`; catalogue/direct route identity and recent-first ordering |
| Temporal projection contract, biomass adapter and shared transforms | `src/lib/projections/temporal.ts` | Read-only snapshots, events, fork manifest and optional aligned control | `src/lib/projections/temporal.spec.ts`; facts, fork marker, normalisation, visibility and downsampling determinism |
| Microbial history projection family | `src/lib/projections/microbialHistories.ts` | Stored biomass productivity, stress and resource values from aligned checkpoint futures | `src/lib/projections/microbialHistories.spec.ts`; units, real fields, deterministic output and relative-view eligibility |
| Temporal presentation palette | `src/lib/projections/presentation.ts` | Reserved observed/shadow and control colours; component styles remain outside core | `src/lib/projections/presentation.spec.ts`; lineage colours cannot borrow reserved run colours |
| Generic evaluation profile and gate runner | `src/lib/evaluation` | Versioned profile IDs/hashes, unit-labelled thresholds, universal/profile gate definitions and typed family records | `src/lib/evaluation/runner.spec.ts`; deterministic compilation, duplicate/undeclared rejection and missing-observation invalidity |
| Microbial evaluation profile and checkpoint adapter | `src/lib/analysis/microbialProfile.ts`, `src/lib/analysis/pairedBiomass.ts` | Profile owns thresholds/gate declarations; adapter owns one verified checkpoint, aligned futures, observations, metrics and causal steps | `src/lib/analysis/pairedBiomass.spec.ts`; no duplicated threshold constants in UI |
| Microbial shadow response family | `src/lib/analysis/microbialSweep.ts` | Three retained-light strengths by three durations from one parent checkpoint; centre case is the current graph | `src/lib/analysis/microbialSweep.spec.ts`; deterministic hashes, unique cases, shared parent and response ordering |
| Evaluation response-map projection | `src/lib/projections/evaluationResponse.ts` | Read-only plain-language cells over a typed evaluation family | `src/lib/projections/evaluationResponse.spec.ts`; renderer never imports analysis/core |
| Cumulative audience help | `src/lib/help/longShadow.ts`, types in `src/lib/help/types.ts` | Read-only evaluation fact/limitation IDs plus schematic concept-demo data | `src/lib/help/longShadow.spec.ts`; lens fact identity, claim scope and isolation from simulation inputs |
| Experiment scene view | `src/lib/projections/scene.ts` | Versioned presentation facts for the microbial scenario | `ExperimentScene.svelte`; no core prose or run mutation |
| Levels Through Time renderer | `src/lib/components/LevelsThroughTime.svelte` | One `TemporalProjection` plus presentation styles | Svelte check and browser keyboard/pointer/viewport verification |
| History quantity selector | `src/lib/components/HistoryExplorer.svelte` | Read-only list of compatible `TemporalProjection` values | Svelte check and browser tab/viewport verification; selecting a view never changes run state |
| Plain-language feedback renderer | `src/lib/components/ExperimentFeedback.svelte` | `PairedBiomassEvaluation` plus timeline-selection callback | Svelte check; five ordinary questions, linked causal steps, hard-gate prominence and narrow-viewport verification |
| Evaluation response-map renderer | `src/lib/components/EvaluationResponseMap.svelte` | `EvaluationResponseMapView` only | Svelte check and browser viewport verification; status has text/symbol cues and the centre reference is labelled |
| Physical input harness renderer | `src/lib/components/ProviderInputHarness.svelte` | One `ProviderRequirementProfile`, editable `ProviderFixtureDraft`, validation/compiled hash and callbacks | Svelte check and browser verification; JSON file tools and push are generic; SSE connection remains an unimplemented adapter seam |
| Experiment Library renderer | `src/lib/components/ExperimentLibrary.svelte` | Experiment records, pinned qualification summaries and an optional host benchmark callback | Svelte check/browser verification; timing is opt-in local state and cannot alter the active run |
| Educational help renderer and concept demo | `src/lib/components/HelpPanel.svelte` | `HelpTopic` prop and local audience/slider presentation state | Svelte check; tab/slider keyboard use, shared-fact wording and no simulation changes |
| Local lineage vocabulary | `src/lib/components/LineageInspector.svelte` | Local Story/Ecology/Chemistry presentation state over one selected lineage | Svelte check; control remains inside the description panel |
| Static direct-route rewrites | `vercel.json` | The three installed non-root paths only | Direct load/refresh of `/exobiology`, `/firstlife` and `/galaxy`; no `/biology` alias |
| App composition | `src/App.svelte` | Core result plus selected provider | Svelte check and rendered browser verification |
| Release identity | `package.json`, exposed by `src/lib/version.ts` | Engine and schema constants in `src/lib/version.ts`; active provider in the run manifest | Initial-load version strip in `src/App.svelte` |
| Mode identity display | `src/lib/modes/catalog.ts`, consumed by `ReleaseIdentity.svelte` | Per-mode content identity remains distinct from global Lab/Engine/Schema/Provider identity | Initial render on catalogue, live and scaffold routes |
| Rendered lineage art/models | Artifact adapters outside `src/lib/core` | `CTR-ARTIFACT` records | Artifact contract tests |

## SSE compatibility dataset evolution

These versions describe the external input seam, not engine milestones. Add a new schema and fixture; never silently widen an existing one.

| Dataset version | Contents | Status |
|---|---|---|
| v1 spectral frame | Stable system/body/region IDs, master seed and named seed path, pinned SSE revision/version/rulepack, wavelength grid, stellar/atmosphere inputs, surface spectral irradiance and payload hash | Implemented compatibility fixture; not yet wired into the live scalar-light simulation |
| v2 temporal forcing | v1 plus interval/clock metadata, typed physical events, resource reservoirs with units and source provenance | Proposed when SSE exposes the corresponding reproducible output |
| v3 spatial regions | v2 plus region geometry/references, connectivity/transport and surface/subsurface levels | Proposed after SSE region contracts land |
| v4 coupled exchange | v3 plus biological return fluxes, checkpoint hashes and refinement requests | Proposed after the ownership of the bidirectional adapter is decided |

## Fixture rules

- A reference fixture is immutable. Generate a new file and schema/version for a changed shape or meaning.
- Generate from a pinned SSE commit and record its application version, rulepack ID, master seed, named seed path and payload hash.
- Promote `draft` to `reference` only after reproducible inputs, the canonical manifest hash and every expected checkpoint hash reproduce.
- Keep only generated numerical output in this Apache-licensed repository until a deliberately shared package and licensing boundary exists.
- Do not import SSE stores, UI types or authoring state. Do not reimplement Planck spectra or atmosphere filtering here. Future Evolution-owned pigment traits consume provider spectra and return response/signature data through `CTR-PROVIDER-REQUIREMENT`; they do not replace provider physics.
- The local JSON/profile harness is implemented. A live SSE/System Lab adapter still waits for capability negotiation, clock/cadence and failure-policy decisions; the v1 spectral fixture proves numerical compatibility without becoming a placeholder physics engine.

## Quality commands

Run `npm test`, `npm run qualify`, `npm run check` and `npm run build`. For changes to initial rendering, also inspect the running app in a browser.
