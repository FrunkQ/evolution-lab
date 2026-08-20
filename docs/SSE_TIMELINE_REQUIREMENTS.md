# SSE star/planet timeline requirements for coupled evolution

Status: initial integration contract; no SSE code is modified by this document.

## 1. Goal

Replace Evolution Lab’s scripted planet harness with SSE’s star/planet history without changing the evolutionary engine or reusable UI components. Both histories must share one clock, one master seed hierarchy and causal checkpoints. They must influence each other rather than merely play two independent animations side by side.

## 2. Ownership

- **SSE physical timeline:** stellar state, orbit/rotation, radiation, impacts, atmosphere, hydrosphere, geology and baseline planetary regions.
- **Evolution engine:** populations, capabilities, ecological networks, biological transformations and living-state history.
- **Coupling coordinator:** chooses common time boundaries, requests frames, exchanges fluxes, resolves requested detail and commits checkpoints.
- **Shared signature system:** accumulates evidence from biological, geological, astronomical and later technological sources.

Neither engine owns the other engine’s state or imports its UI stores.

## 3. Determinism contract

One user-visible `masterSeed` drives the system. Every stochastic subsystem derives a stable named stream:

```text
masterSeed
├─ star/system-primary/evolution-v1
├─ planet/body-7/climate-v1
├─ planet/body-7/impacts-v1
├─ planet/body-7/evolution/innovation-v1
└─ planet/body-7/evolution/disturbance-v1
```

Rules:

1. Never share one mutable RNG sequence between modules.
2. Derive streams from stable IDs and versioned names.
3. Canonically sort entities and simultaneous events before processing.
4. Never use wall-clock time, locale, object iteration accident or unseeded `Math.random()`.
5. Quantise state at committed checkpoints; move conservation-critical ledgers to fixed-point integers if cross-browser tests show drift.
6. Persist the complete run manifest: seed, engine/schema/data versions, configuration and authored overrides.
7. Produce optional checkpoint hashes so a submitted user history can identify the first divergent subsystem and date.

## 4. Required physical timeline frame

The eventual versioned `PlanetTimelineFrame` needs the following groups. Values may be instantaneous, interval means/ranges or references to interpolatable curves.

### Identity and clock

- system, star, body and region IDs;
- master seed and timeline/schema versions;
- absolute system age and interval start/end;
- checkpoint/event IDs and causal provenance.

### Stellar forcing

- bolometric luminosity and distance-adjusted irradiance;
- non-ionising spectral distribution including visible light;
- ionising/UV and high-energy/X-ray curves;
- flare, particle and cosmic-ray environment;
- stellar wind and mass-loss state;
- eclipses, binary illumination and long-period variation.

### Orbit, rotation and tides

- orbital elements/state needed for seasonal forcing;
- rotation period, obliquity and precession;
- tidal heating and locking state;
- moon/tide cycles relevant to mixing and exposed surfaces;
- instability, migration, impact and encounter events.

### Atmosphere and aerosols

- total pressure, vertical structure and bulk composition;
- constituent partial pressures or inventories;
- temperature/humidity profiles and circulation/mixing summaries;
- aerosol populations: composition, phase, size distribution, concentration, altitude, coverage, optical properties, production, coagulation and settling;
- precipitation/deposition and escape rates;
- optical depth, radiation shielding and surface illumination.

### Solvents and hydrosphere

- solvent identities, phases and inventories;
- stable liquid regions and depth/volume/area;
- salinity/acidity and dissolved resources;
- circulation, mixing and connectivity;
- freeze/thaw, wet/dry and other concentration cycles;
- clouds, droplets, brines, porous media and interface films.

### Surface, interior and regions

- region/volume graph with area, volume, persistence and transport edges;
- temperatures, pressures, radiation and chemistry per habitat candidate;
- crust/mineral composition and catalytic surfaces;
- tectonic, volcanic, weathering, erosion, burial and recycling rates;
- regolith depth and particle-size/fine-fraction distribution;
- porosity, permeability, water/solvent retention and gas-filled pore fraction;
- mineral-bound and freely available nutrient inventories;
- organic-matter, clay/secondary-mineral and aggregate stores by surface region;
- hydrothermal and subsurface energy opportunities;
- albedo, colour and surface-cover facts derived from physical quantities.

### Resources and gradients

- material reservoirs with units and uncertainty/provenance;
- accessible redox, light, thermal, electrical or chemical gradients;
- renewal, depletion and transport rates;
- limiting-element inventories;
- open-boundary sources and sinks.

### Physical events

- impact, eruption, glaciation, ocean loss/gain and atmospheric transition;
- stellar flare, luminosity change, mass loss and engulfment;
- orbital instability, moon disruption, passing-star/Oort disturbance and bombardment episodes;
- authored events with explicit provenance.

## 5. Evolution output returned to SSE

The biology side returns interval-integrated, unit-bearing contributions rather than only tags:

- atmospheric gas production/consumption;
- dissolved and sediment material fluxes;
- biomass, dead matter and burial by region;
- weathering, mineral precipitation and reef/structure formation;
- albedo/pigment/surface-cover changes;
- aerosol and cloud-nucleation contributions;
- mixing, sediment disturbance and habitat engineering;
- heat where material at planetary scale;
- extinction, radiation and innovation events;
- signature-field contributions and derived display tags;
- authored derived-marker facts, entered/left events and their causal evidence;
- requested maximum next step when a transition needs finer resolution.

SSE recalculates physical consequences. Evolution Lab must not directly set “planet temperature” or mutate renderer state.

## 6. Coupled stepping handshake

```text
1. Coordinator asks both engines for their next mandatory boundary.
2. Choose the earliest boundary: physical event, biological event, authored event or accuracy limit.
3. SSE supplies an environment frame/curves for the interval.
4. Evolution advances and returns integrated fluxes, events, signatures and any refinement request.
5. SSE applies fluxes and recalculates physical state.
6. If feedback crosses a declared threshold, repeat the interval at finer resolution.
7. Commit both states and a common checkpoint hash.
8. Compress the next quiet interval or open a detailed event window.
```

The first implementation may use one-way forcing for short steps, but the contract must retain the return channel from the beginning.

## 7. Scripted provider used before SSE

Milestones 1–5 use a deterministic test provider implementing the same frame contract. Scenarios should include:

- stable illuminated microbial film;
- periodic wet/dry or light cycle;
- sustained shadow and recovery;
- mineral mixing pulse;
- oxygenation feedback;
- volcanic aerosol or impact disturbance;
- two connected habitats with a temporary barrier.
- bare-rock/regolith succession with weathering, organic accumulation and erosion, plus a generic authored substrate-state marker.

The provider is replaceable test data, not an alternate environment API.

## 8. Planned changes in SSE once access and milestone readiness exist

1. Define versioned, framework-neutral timeline frame and biological-flux types.
2. Expose physical timeline sampling/interpolation outside UI components.
3. Guarantee stable IDs for bodies, regions, events and material reservoirs.
4. Introduce the master-seed derivation convention and run manifest.
5. Separate calculated physical facts from presentation-only tags.
6. Add the coordinator and common checkpoint/event index.
7. Feed biological outputs through the planetary recalculation path.
8. Mount the shared Evolution Lab components via an adapter/view model.
9. Add deterministic integration fixtures proving that scripted and SSE providers produce identical evolution for identical frames.
10. Test slider scrubbing, checkpoint reconstruction and “interesting event” detail windows across both timelines.

## 9. Acceptance tests for first real coupling

- One exported manifest reproduces the same star, planet and evolutionary checkpoint hashes.
- Reordering unrelated generated objects does not change biological history.
- Adding an unused random stream does not change existing streams.
- A stellar-light change affects producer flux through the environment frame.
- Biological oxygen flux changes a later physical atmosphere frame.
- Scrubbing to a checkpoint reconstructs the same state as continuous play.
- The UI can explain a coupled causal chain across the boundary.
- Disabling the biological return flux produces a deterministic, visibly different counterfactual branch.
- An authored detrital-substrate marker enters from persistent quantitative state, survives a brief threshold dip through hysteresis and leaves after sustained erosion/depletion; changing its label does not change engine behaviour.
