# Evolution Lab — high-level design

## Executive intent

Evolution Lab is an experimental, browser-first model for creating plausible planetary life histories without simulating every organism or every generation. It treats life as interacting population networks that transform resources, exploit usable energy gradients, occupy connected habitats and exchange capabilities. Stable networks can become higher-order evolutionary units, allowing complexity to emerge from reusable mechanisms rather than a hard-coded ladder from microbe to intelligence.

The project is developed separately from Star System Explorer (SSE). Its simulation core has no knowledge of Svelte or SSE. Its reusable Svelte components are nevertheless the components intended for eventual use inside SSE, so the laboratory is a genuine development host rather than a disposable prototype.

## Why an experiment rather than a complete design first?

The destination is broad: abiogenesis, alien biochemistry, ecological succession, mass extinctions, major evolutionary transitions, planetary feedback, intelligence and eventually technological legacies. Designing all of that in detail before observing the basic mechanisms would create an elaborate but brittle taxonomy.

Instead, development follows the nature of the subject:

1. Establish a small set of durable primitives and invariants.
2. Combine them into the smallest living resource network.
3. Observe failures and emergent behaviour.
4. Add capabilities, habitats and time resolution only when evidence demands them.
5. Preserve compatibility through explicit contracts and deterministic histories.

The grand plan supplies direction. The running experiments supply the detailed design.

## The central abstraction

A simulated node is normally an aggregate lineage, guild or ecotype. It participates simultaneously in:

- an ancestry network;
- a material and energy exchange network;
- a habitat and dispersal network;
- a capability dependency and transfer network.

A node is therefore not merely “an animal species.” It may represent a microbial metabolism, a symbiotic cell, a multicellular lineage, a colony or—through a later handoff—a machine ecology.

A recurring transformation is:

```text
materials + usable gradient + capabilities + environment
→ maintenance + growth + reproduction + activity
→ offspring + waste + dead matter + heat + environmental change
```

Matter is recycled. Useful energy is degraded. Evolution selects local reproductive success and persistence rather than universal efficiency or progress.

## Emergent complexity

Stable collections of nodes can wrap into a higher-order node. This is intended to cover transitions such as independent replicators becoming cells, cells becoming multicellular organisms, or organisms and symbionts becoming obligate integrated systems.

Wrapping is not an achievement badge. It requires persistent coordination, mutual dependence, aligned inheritance and adequate control of internal conflict. It may fail or reverse. Capabilities may be lost, delegated to symbionts or retained only as vestiges.

## Life begins in environments, not categories

Abiogenesis is eventually treated as a rate or hazard produced by suitable precursors, accessible gradients, concentration mechanisms, catalysis, environmental cycling, compartments, persistence and transport. Liquid media are favourable but not mandatory; droplets, brines, porous rocks, thin films and other concentrating media remain possible.

The first prototype intentionally begins after this uncertain step. It seeds simple replicators into a warm connected film and validates the ecological machinery before adding an upstream origin-of-life provider.

Carbon and familiar solvents will be the best-tested defaults, not universal laws. Alien biochemistry is parameterized by information polymer, structural backbone, solvent, compartments, electron donors/acceptors, catalytic elements and operating conditions rather than by a single “silicon life” switch.

## Planet–life coupling

The planetary model supplies habitats, resources, gradients and disturbances. Life returns quantitative fluxes and physical changes. This allows biology to alter the conditions that subsequently select it.

Examples include oxygen emission, carbon burial, weathering, aerosol production, sediment stabilization, reef construction and changes to albedo or atmospheric chemistry. The same underlying facts can drive climate, rendering, habitability, observability and narrative descriptions.

The design maxim is:

> Model real nouns and quantities; derive adjectives, visual effects and gameplay tags.

An atmospheric aerosol population, for example, can drive haze colour, view distance, climate, photochemistry, cloud habitability, precipitation and remote spectra. A one-purpose `hasHaze` flag cannot.

### Authorable state and epoch markers

No familiar transition receives special engine behaviour. The engine models ordinary resources, gradients, habitats, transformations, capabilities and populations. Rulepacks may then define named predicates over that state and project their transitions onto the timeline.

“Living soil exists” is one possible authored marker over mineral particles, detritus, moisture, nutrient renewal, pore structure, organisms, coverage and persistence. Soil is not an engine type: it is a useful abstraction over a resource/habitat system. A pack can define an equally ordinary marker for an ice–brine network, floating aerosol mat, oxygen-buffered atmosphere, reef structure or persistent external memory.

Markers may be materialised as reusable derived facts so later rules can depend on them, but labels do not create consequences by magic. The underlying state creates additional resources, niches, carrying capacity and selection pressures. That expands evolutionary opportunity and lets more variants coexist; mutation, recombination and horizontal transfer remain the mechanisms that actually produce genetic variation.

A marker can require duration and use hysteresis, then emit entered/left events and epoch vocabulary. Timeline importance is calculated from persistence, reach, feedback strength, carrying-capacity change and downstream dependency count—not from an Earth-specific list of famous milestones.

## Universal signatures and environmental memory

Every process can leave a legacy. Oxygen-producing microbes, burrowing organisms, reefs, impacts, volcanoes, industrial civilisations and abandoned probes all contribute through the same generalized signature system.

The system follows an effect from production through transport, transformation, preservation, destruction, detection and interpretation. It distinguishes what truly occurred from what survives and from what an observer can know.

Most traces are aggregate fields and deposits. Exceptional ruins, probes or fossils may be discrete objects. Natural events can create false positives for biological or technological interpretations.

## Time

The engine is timeline-native. Long stable periods are summarized as epochs with curves and checkpoints; innovations, catastrophes and ecological rebalancing receive finer resolution. The time slider therefore reveals a causal history rather than independent decorative snapshots.

External events include impacts, climate shifts and astronomical disturbances. Internal events can be equally important: a new metabolism, predation, oxygenic activity, symbiosis or ecosystem engineering can transform a world without an external catastrophe.

The complete star, planet and evolutionary history originates from one master seed. Subsystems derive stable named streams rather than sharing one order-dependent random sequence. This keeps the result conceptually “one seed” while ensuring that adding an unrelated random stellar choice does not silently replace a planet’s biosphere. Reproduction also records engine, schema, data-pack and authored-event versions so users can send a compact case that developers can replay exactly.

During early development a scripted planet harness supplies timeline frames. Later, an SSE adapter implements the same contract. A coordinator advances the physical and biological timelines to shared checkpoints so that stellar forcing changes life and biological fluxes can feed back into atmosphere, climate and geology.

The harness should eventually be generated from domain-declared input requirements rather than maintained as a second hand-written API. A pack says which typed, unit-bearing provider fields it needs, their shape, bounds, cadence and validity domain. The Lab can render suitable fixture controls and freeze their output into a hashed dataset; an SSE adapter can satisfy the same declaration from physical history. This keeps interactive testing, imported datasets and coupled production runs on one boundary while allowing different domains to request different physics.

For light-harvesting life, the physical input is ultimately a local spectral irradiance distribution and provider-resolved hazards. Evolved pigments are response curves over that field, not colour names: their absorbed energy, synthesis cost and reflected/transmitted signature create biological consequences and apparent colour. The provider remains authoritative for photon energy, heating, ionisation, pressure and phase. The present scalar light/shadow control is only the first small fixture exercising this direction.


## Shared user interface

The product is designed for learning, exploration and informed challenge. It aims for conceptual and aggregate-mechanism plausibility that a relevant scientist can assess, while making no claim of proof, calibration or exact prediction. Results therefore lead with ordinary questions and declared limitations rather than an unexplained score.

A parallel help system presents one factual result through cumulative Curious, Biology and Engine lenses. Curious assumes no prior biology or computer-science knowledge; the specialist lenses add mechanisms, representation choices and claim boundaries. Diagrams, versioned UI captures and one-slider presentation-only concept demos should replace walls of text when they explain a relationship more clearly. These demos never run or alter the simulation. The complete grammar and ownership boundary are in `docs/EDUCATION_AND_HELP.md`.

The Evolution Lab and SSE will mount the same component library. The central evolutionary visualization appears as one consistent tree whose nodes retain their position and selection while the user changes lenses:

- ancestry;
- resources;
- habitats;
- capabilities;
- later composition and evidence.

Every selection can be read at three levels:

1. **Story:** evocative, plausible language useful to an explorer or role-playing game.
2. **Ecology:** accessible functional explanation.
3. **Chemistry:** source materials, reactions, constraints and fluxes.

The most important interaction is “Why?” Each significant population change or event should identify its causes, limiting resources, enabling capabilities, affected neighbours and environmental consequences.

## Permanent Lab, rules and experiments

The Lab remains useful after SSE integration. Its Rule Workshop is the independent place where users author, validate and inspect declarative life packs; SSE selects and runs those packs but does not absorb the configuration machinery. Search, filtering, paging and dependency inspection are designed for hundreds of rules rather than the handful shown in the first prototype.

Experiments are retained as versioned learning records. Each stores its question, seed, provider and rule versions, controlled inputs, checkpoints, observations and lessons. Users can clone a known experiment, alter one input and compare outcomes. Stable reference experiments also become deterministic regression tests.

The first implemented family asks a broader version of one experiment question: how much darkness can the same microbial community absorb? Nine futures share one saved checkpoint and vary only retained usable light and duration. This exposes a response surface rather than inviting a conclusion from one lucky run. The centre case remains the detailed graph; the other cells are compact, hashed evaluations. It is not yet calibration or a multi-seed statistical study.


Family trees, organism images and 3D forms are separate deterministic artifacts derived from lineage facts and an inherited morphology recipe. The same artifacts can be displayed by the Lab or SSE without making presentation assets part of the biological state. See `docs/RULEPACK_AND_LAB_ARCHITECTURE.md` for the detailed boundary.

## Qualification and practical performance

A plausible result is not useful if the machinery cannot be replayed or scaled. The first promoted experiment therefore carries its exact physical-input fixture, manifest and checkpoints into one executable qualification. That report checks the whole route from authored input through deterministic history, forked comparisons, evaluation coverage and causal explanation. It is a release proof for the framework path, not a claim that the microbial equations are scientifically validated.

Performance has two kinds of evidence because combining them would make results misleading. Deterministic workload counts describe what the engine asked a device to do: retained samples, processed aggregate nodes over time, stored flows/events and history size. Versioned budgets can fail qualification when iterative work grows those quantities unexpectedly. Device timing describes how long the same fixed work took in one browser. It is opt-in, local and excluded from every canonical hash.

The first profiler makes the tiny scale explicit: four authored guilds and 361 daily samples. It can detect regressions and provide a useful local history/response-family timing, but it cannot justify a 500-population ceiling. Population capacity becomes estimable only after a synthetic workload can vary node count, edge density, event density, retained resolution and worker strategy across agreed modern-device tiers. Until then the UI says the estimate is unavailable rather than converting one desktop timing into false precision.

## Browser feasibility

The concept is practical in a browser at aggregate resolution. Cost grows primarily with the number of active populations, habitat patches, sparse edges, candidate innovations and resolved time windows—not with the age of the star system by itself.

The design avoids individual organisms, full genomes, dense all-to-all relationships and generation-by-generation geological time. Ordinary worlds should use tens of habitat patches and hundreds rather than millions of active population nodes. Web Workers and checkpointed epochs will be introduced before SSE integration.

## Biological–technological handoff

Biological evolution remains active when intelligence appears. A second inheritance substrate becomes important when capabilities persist through social learning, external tools, durable memory and intentional design.

A later technosphere engine can model culture, industry, AGI, autonomous machines and self-replicating technology using the same resource, energy, environment, event and signature contracts. Grey goo becomes a physically constrained invasive machine ecology. A technological singularity is treated as a scenario boundary where hand-authored outcomes replace unjustified prediction. Speculative energy lifeforms remain authored content.

## Initial build sequence

1. **Microbial flask:** producers, recyclers and grazers in one habitat.
2. **Changing pond:** cycles, dormancy, plasticity, stress and recovery.
3. **Connected habitats:** dispersal, barriers, refugia and divergence.
4. **Evolutionary exchange:** mutation supply, transfer, viruses, mutualism and trait loss.
5. **Recursive individuality:** cooperation, conflict and higher-order nodes.
6. **Living planet:** versioned environment, history, signature and UI contracts.
7. **Alien chemistry:** data-defined biochemical foundations and biosphere collisions.
8. **Technosphere seam:** cumulative culture, technology and persistent civilisational legacies.

The detailed, agent-oriented contract and current status are maintained in the repository root `ARCHITECTURE.md`.
## Physical input harness

Each mode declares its required provider data as a versioned profile rather than receiving an untyped world object. The reusable Lab harness renders that profile, validates edited or imported values, shows units and provenance, and compiles a content-addressed immutable fixture. Exobiology's first profile includes scalar physical/environmental facts and the pinned SSE spectral curves already in this repository. It describes liquid-medium availability and solvent activity without making water a universal assumption.

Pushing a fixture is explicit. The run manifest records the profile and fixture hash, and only requirements marked as current prototype inputs are mapped into the microbial configuration. Other inputs remain honest recorded facts until a real mechanism consumes them. A future SSE/System Lab adapter is another producer of the same profile, not a second interface or an import of SSE code.
