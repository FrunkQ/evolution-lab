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
| Simulation loop and run manifest | `src/lib/core/simulate.ts` | Scenario and environment inputs | `src/lib/core/simulate.spec.ts` |
| Seed derivation and random streams | `src/lib/core/rng.ts` | Run master seed and named paths | Core simulation tests |
| Scripted external forcing | `src/lib/core/environment.ts` | Environment provider | Core simulation tests; no UI-owned forcing |
| SSE compatibility dataset schema | `src/lib/contracts/ssePlanetDataset.ts` | `src/lib/contracts/fixtures/sse-beta-spectral-v1.json` | `src/lib/contracts/ssePlanetDataset.spec.ts` |
| SSE stellar, atmosphere and spectrum physics | Star System Explorer `beta` `/physics` implementation | A pinned SSE revision and rulepack | Evolution Lab consumes generated numerical datasets only; it does not duplicate or import SSE source |
| Lineage vocabulary and authored prototype colour | `src/lib/core/scenario.ts` | Scenario declaration | Core simulation tests; authored colour is not a physical spectral result |
| Derived narrative descriptions | `src/lib/core/describe.ts` | Checkpoint and lineage state | Description tests; prose must follow state, never create it |
| Rulepacks | `src/lib/rules` | Declarative namespaced rulepack data | `src/lib/rules/rules.spec.ts` and `CTR-RULEPACK` |
| Experiments and expected checkpoints | `src/lib/experiments` | Versioned experiment records | Experiment validation and checkpoint hashes |
| Reusable UI | `src/lib/components` | Props/events from the app shell | Component tests when added |
| Installed mode routes and per-mode release metadata | `src/lib/modes/catalog.ts` | Version-controlled descriptor values only; `lastUpdated` is an intentional ISO content-edit date | `src/lib/modes/catalog.spec.ts`; catalogue/direct route identity and recent-first ordering |
| Temporal projection contract and microbial biomass adapter | `src/lib/projections/temporal.ts` | Read-only `SimulationRun.snapshots`, existing `SimulationRun.events` and optional aligned no-shadow comparison | `src/lib/projections/temporal.spec.ts`; projection, paired-series honesty, normalisation, visibility and downsampling determinism |
| Paired microbial feedback evaluation | `src/lib/analysis/pairedBiomass.ts` | Ordinary, no-shadow comparison and immediate repeat runs from the same seed | `src/lib/analysis/pairedBiomass.spec.ts`; same-time alignment, deterministic repeat, validity gates and unavailable-check disclosure |
| Cumulative audience help | `src/lib/help/longShadow.ts`, types in `src/lib/help/types.ts` | Read-only evaluation fact/limitation IDs plus schematic concept-demo data | `src/lib/help/longShadow.spec.ts`; lens fact identity, claim scope and isolation from simulation inputs |
| Experiment scene view | `src/lib/projections/scene.ts` | Versioned presentation facts for the microbial scenario | `ExperimentScene.svelte`; no core prose or run mutation |
| Levels Through Time renderer | `src/lib/components/LevelsThroughTime.svelte` | `TemporalProjection` props plus presentation styles | Svelte check and browser keyboard/pointer/viewport verification |
| Plain-language feedback renderer | `src/lib/components/ExperimentFeedback.svelte` | `PairedBiomassEvaluation` prop only | Svelte check; ordinary-question, checks/limits and narrow-viewport verification |
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
- Promote `draft` to `reference` only after the input and expected hash reproduce.
- Keep only generated numerical output in this Apache-licensed repository until a deliberately shared package and licensing boundary exists.
- Do not import SSE stores, UI types or authoring state. Do not reimplement Planck spectra, atmosphere filtering or pigment response here.
- Runtime wiring waits for an explicit adapter decision. The v1 fixture proves the data seam and tests its shape; it is not a placeholder physics engine.

## Quality commands

Run `npm test`, `npm run check` and `npm run build`. For changes to initial rendering, also inspect the running app in a browser.
