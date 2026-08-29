# Evolution Lab

A browser-first laboratory for deterministic, explainable histories of evolving systems.

> Evolution Lab is a browser-first, population-aggregate simulation framework whose state is a scale-recursive spatiotemporal multigraph; whose histories are deterministically replayable, event-sourced, checkpointed, and branchable; whose resolution adapts by coarse-graining stable intervals and deterministically refining interesting ones; whose epochs are named retrospectively from recorded causal facts; and whose content is instantiated just-in-time from keyed seeded distributions, authored as declarative configuration with AI assistance.

That is the target architecture. The current `v0.11.0` public prototype is much smaller: a promoted microbial reference and a draft Alien Lake integration experiment, both fixed-step and deterministic. The lake adds a generic connected-habitat graph, unit-aware numeric-field response functions, named counter-addressed variation, closed material accounting and an exact retained-state wrapper. It does **not** yet implement a generic evolving multigraph runtime, a durable event-sourced store, compute-saving adaptive resolution, retrospective epoch naming, just-in-time content generation or general AI-assisted pack authoring. Causal provenance remains a defining invariant; the implemented AI seam may propose strictly validated candidates within a small review loop, never act as runtime or promotion authority.

The Lab is for learning, exploration and challenge. Its aim is to be plausibly close to the relevant scientific thinking at the level it actually models, while exposing assumptions and omissions clearly enough to invite useful criticism. It is not evidence, prediction, calibration or scientific proof.

## Installed modes

The root route `/` is a recently-updated catalogue. It and direct route loads resolve the same version-controlled mode metadata:

- `/exobiology` — the live Exobiology workspace, with the hashed microbial reference and the draft Alien Lake spectral/scale-recursion experiment.
- `/firstlife` — an honest experiment scaffold; no origin-of-life simulation is installed.
- `/galaxy` — an honest domain-neutrality scaffold; no galaxy simulation is installed.

There is one application and one deployment. Modes are paths, not subdomains or code forks. Each catalogue card shows its own content version, intentional last-edit date and lifecycle separately from the global Lab/Engine/Schema/Provider release strip.

The Exobiology workspace has five permanent areas:

- **Live experiment** — switch between the microbial reference and Alien Lake without creating a second app or route.
- **Physical Inputs** — create, validate, import/export and inject a content-hashed provider dataset from a reusable typed profile.
- **Rule Workshop** — author and validate scalable declarative packs independently of the runtime and SSE.
- **Tuning Harness** — propose one bounded mechanism change, validate it, run hard gates and compare its multi-objective behaviour on working and held-out seeds.
- **Experiment Library** — retain reproducible questions, pinned inputs, checkpoint hashes, qualification evidence and lessons instead of discarding prototypes.

The Physical Inputs harness is generated from the Exobiology provider-requirement profile rather than a hand-built form. It accepts scalar and spectral-curve data with units, bounds and provenance; can load or download JSON fixtures; and pins an injected fixture hash into the run manifest. Only controls explicitly labelled **Drives this experiment** affect the current aggregate equations. Temperature, pressure, gravity, radiation, chemical energy, liquid-medium availability, solvent activity and other recorded facts remain visible but do not falsely claim live mechanisms. The same harness can render another mode's profile, while a future SSE/System Lab adapter must satisfy this contract before it can stream or resolve richer data.

The promoted microbial reference now starts from the exact default Physical Inputs fixture rather than hidden fallback values. A content-hashed qualification report checks the input identity, exact replay, four checkpoint hashes, paired-future integrity, all ten declared hard gates, all nine response cases, a deliberately changed input, five named seeds, structural workload and causal-history coverage. The Experiment Library shows its pinned 10/10 summary. This proves that the prototype framework is wired reproducibly; it does not prove that its biology is calibrated.

Alien Lake is the next deliberately small integration proof. A pinned surface spectral fixture is filtered into three connected liquid habitats. Fictional response functions integrate capture over that field, separate incident, absorbed, accessible and returned power, and pay explicit construction, maintenance and repair costs. A seeded daughter shifts one response band by ±30 nm without changing unrelated random addresses. Growth, turnover, recycling and inter-habitat transport all pass through the generic material ledger. From day 120 the sediment refuge is exposed as one higher-order boundary with exact member state retained; a turbidity event re-expands it at day 168 and produces the same final hash as an always-detailed control. This proves reversible identity, not compute-saving coarse-graining. The experiment remains `draft`: its response functions and lake units are fictional and uncalibrated, and its checkpoints are not yet promoted reference hashes.

The tuning slice exposes three existing light-weaver constants—growth, maintenance and light response—as typed bounded candidate values while keeping provider mean light frozen. `TuningSpec`, candidate, evaluation and model-attempt evidence are content-addressed. Every candidate passes all hard validity checks before its Fitness Vector is interpreted; calibration and held-out seeds are distinct, and Pareto comparison preserves trade-offs rather than hiding them in one reward. The browser offers a human control surface, while `npm run tune --` emits and accepts JSON for numerical tools or an optional OpenAI-compatible LM Studio/OpenRouter connector. A model run is capped at one to six attempts, records a hash-linked trail, can fall back between declared response formats, and receives only calibration-seed feedback. Held-out results are withheld until review. Model output is untrusted until compiled, and neither the CLI nor UI promotes canonical content.

Performance is split honestly. Release qualification records deterministic structural work—361 snapshots, four peak processed populations, 1,444 population-days, 1,960 accounting transactions and about 1.59M serialized characters—against seven authored browser limits. **Measure this device** optionally times the reference history and nine-case map locally, recording the benchmark version, exact workload and browser context only in the page. Those milliseconds never enter seeded results or hashes and are not sent or persisted. The app does not yet estimate a maximum population count because the present engine processes four authored guilds; a defensible ceiling needs a variable-node benchmark across declared device tiers.

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
npm run qualify
npm run check
npm run build
```

Machine-readable tuning examples:

```sh
npm run tune -- template
npm run tune -- baseline calibration
npm run tune -- evaluate candidate.json release
EVOLUTION_TUNER_BASE_URL=http://localhost:1234/v1 EVOLUTION_TUNER_MODEL=google/gemma-4-31b npm run tune -- model 3
```

For OpenRouter, set the same base URL/model variables, `EVOLUTION_TUNER_ENDPOINT_KIND=remote` and `EVOLUTION_TUNER_API_KEY`. `EVOLUTION_TUNER_OUTPUT_MODES` can declare a comma-separated order such as `json-schema,json-object,text`; LM Studio defaults to the modes it currently accepts. The key is read from the process environment and is never printed or stored by the harness.

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
- `src/lib/core` — deterministic framework-neutral simulation code, including transactional accounting, generic habitat graphs and exact retained-state wrappers.
- `src/lib/mechanisms` — generic unit-aware response-function compilation and evaluation over numeric fields.
- `src/lib/evaluation` — domain-neutral evaluation-profile compilation, thresholds, gate execution and family contracts.
- `src/lib/calibration` — immutable tuning specs/candidates/evaluations, Pareto comparison, attempt evidence and the bounded OpenAI-compatible revision boundary.
- `src/lib/analysis` — microbial evaluation adapters plus the Alien Lake domain integration over generic mechanisms.
- `src/lib/help` — framework-neutral cumulative help content and isolated concept-demo projections.
- `src/lib/modes` — single typed authority for route, lifecycle and per-mode release metadata.
- `src/lib/projections` — framework-neutral temporal view contracts and history projections.
- `src/lib/rules` — declarative rule types, validation and deterministic compilation/indexing.
- `src/lib/experiments` — versioned experiments, qualification reports, workload budgets and accumulated learning.
- `src/lib/components` — reusable Svelte components intended for both the Lab and SSE.
- `src/App.svelte` — standalone experimental host.
- `scripts/tune.ts` — machine-readable candidate template, baseline, evaluation and optional model-attempt CLI.

The project is separate from Star System Explorer. No SSE code or stores are imported. The current reference fixture is generated numerical spectral output from a pinned SSE beta revision, with its seed, source provenance and payload hash recorded; no SSE implementation or rulepack data is copied.

## Prototype limitations

Rates and quantities currently use bounded experimental units and are not scientifically calibrated. The microbial reference still consumes scalar scripted light. Alien Lake consumes the pinned SSE spectral fixture, but its depth filtering, response bands and power-to-growth mapping are authored Lab mechanisms rather than provider-resolved lake physics or predicted alien pigments. Apparent presentation colour is still derived for explanation only; the engine reasons over numeric wavelength and power fields. The response families are predefined and one daughter receives a bounded seeded shift, so this is not yet open-ended mutation or molecular pigment evolution.

The current comparison and every response-map case are real branches from one content-hashed checkpoint; the centre case verifies exact resume against the uninterrupted run. A versioned evaluation profile owns the thresholds and ten gate declarations, while the microbial adapter supplies observations. Every material change is now an ordered transaction: the evaluator independently recomputes postings, provider imports/exports, interval continuity and hidden adjustment debt. All ten gates run and pass for the promoted flask. This proves exact closure only in the declared `0.01 model-mass` unit; it is not calibrated SI chemistry, a complete useful-energy ledger or proof of provider-side physical conservation. “Recovered” remains a declared aggregate-biomass threshold, not proof that the pre-shadow ecological state or every lineage relationship was restored.


The current workload budget is an early-warning guardrail, not a device-capacity certification. Local benchmark labels apply only to the browser that ran them. Population limits remain unknown until the engine can exercise a variable number of aggregate nodes under repeatable synthetic loads.

The tuning harness measures consistency against authored engineering objectives; it is not Bayesian inference, biological parameter estimation or scientific validation. Its five named seeds are deliberately small fixtures. In the first local trial, a 31B model produced valid improving candidates while a 26B model failed to stay inside the JSON contract at the same budget; this is one connector observation, not a universal model ranking. More importantly, the successful model repeatedly lowered the cost-free light-response constant and thereby exposed a missing construction/maintenance trade-off in the flask objective. No candidate was promoted. Rejected proposals and model-attempt evidence can be retained by callers, but governed candidate archives and promotion workflows remain future work.

## Licence

Evolution Lab is licensed under the [Apache License 2.0](LICENSE). The package remains marked as private to prevent accidental publication to npm.
