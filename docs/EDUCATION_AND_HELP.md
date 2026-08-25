# Education and help

## Purpose and claim level

Evolution Lab is a learning and exploration tool, not an academic claim or a scientific proof. It should be plausibly close to relevant scientific thinking at the population-aggregate level, explicit about its assumptions, and easy to challenge. A useful specialist review asks whether the represented mechanisms, trade-offs, omissions and causal explanations are defensible at that level—not whether an uncalibrated prototype predicts exact natural rates.

The interface must help a curious person build enough understanding to question the model precisely. It uses ordinary language first, then adds biological and implementation depth without changing the underlying facts.

## One result, three cumulative lenses

```mermaid
flowchart LR
    R[One recorded result] --> C[Curious lens<br/>What happened?]
    C --> B[Biology lens<br/>What mechanisms could explain it?]
    B --> E[Engine lens<br/>How was it represented and checked?]
    E --> U[Better understanding<br/>and more precise feedback]
```

- **Curious** assumes no biology or computer-science knowledge. It keeps useful terms but explains them immediately.
- **Biology** adds the represented ecological mechanisms, assumptions and scientific caveats.
- **Engine** adds data, thresholds, deterministic comparison and implementation limits. Terms such as “fitness vector” are appropriate here when defined.
- The lenses are cumulative views over shared fact and limitation identifiers. They must not become three competing stories.

A short claim-level note belongs near the top of specialist views so a reviewer knows what kind of challenge is useful.

## Two local controls with different jobs

```mermaid
flowchart TB
    S[Selected lineage] --> V{Vocabulary}
    V --> VS[Story]
    V --> VE[Ecology]
    V --> VC[Chemistry]

    R[Experiment result] --> H{Help depth}
    H --> HC[Curious]
    H --> HB[Biology]
    H --> HE[Engine]
```

Story/Ecology/Chemistry changes how the selected lineage is described. It therefore lives inside the lineage-description area. Curious/Biology/Engine changes the depth of explanation for an experiment result. It lives inside the help panel. Keeping each control beside the words it affects avoids an apparent fourth, conflicting language system.

## Diagrams, captures and concept demos

Documentation should teach visually where a relationship is easier to see than to read. Use:

- small diagrams for cause, data flow and boundaries;
- labelled captures from the real UI when explaining a real control or result;
- paired “with/without” views for comparisons;
- tiny concept demos for one relationship at a time.

A UI capture must show, or be accompanied by, the relevant Lab/mode/scenario version identity. A capture is an explanation of that release, not timeless scientific evidence.

A concept demo is presentation-only:

```mermaid
flowchart LR
    Q[One concept] --> S[One simple slider]
    S --> M[Illustrative relationship]
    M --> L[What it shows<br/>and what it leaves out]
    L --> A[Return to the real Lab experiment]
```

Concept demos do not call the engine, change a seed, modify experiment state or claim to predict the main simulation. They may use deliberately simple direct or inverse mappings as long as the UI labels them as illustrations.

## Current Exobiology example

The reference history is saved immediately before the long shadow as a content-hashed checkpoint. Control and shadow futures resume from that identical stored past and exact rounded state. The only declared difference is whether usable light receives the scripted reduction.

```mermaid
flowchart LR
    P[One verified checkpoint<br/>same past, state, seed, rules and provider] --> O[Shadow future<br/>light reduced]
    P --> C[Control future<br/>seasonal light continues]
    O --> V[Same-time stored views]
    C --> V
    V --> B[Living mass]
    V --> F[New living mass]
    V --> S[Community strain]
    V --> R[Resources]
    V --> Q[Survival · recovery · loss<br/>instability · retained functions]
```

The current view can honestly show aggregate active biomass, positive population productivity, biomass-weighted stress, stored resource values and which predefined authored capabilities remain represented. It checks the checkpoint hash and prefix, declared branch isolation, exact resume/repeatability, finite state, non-negative stocks and one unsupported-runaway pattern. It still cannot prove complete matter/energy conservation, account for material introduced by prototype floors and caps, or establish scientific calibration. “Recovery” means returning to a declared fraction of the continuing same-time control for a declared duration; it does not mean that every lineage or ecological relationship returned to its former state.

The cause-and-effect trail is generated from stored facts rather than hand-written per result: fork, first resource difference, first population-productivity difference, deepest bottleneck and outcome. Selecting a step moves the shared inspection day; it does not mutate either future.
## Ownership

- Framework-neutral help content and concept-demo projections: `src/lib/help`.
- Framework-neutral checkpoint control/shadow evaluation: `src/lib/analysis`.
- Scene-setting projection: `src/lib/projections/scene.ts`.
- Help and feedback rendering: `src/lib/components/HelpPanel.svelte` and `ExperimentFeedback.svelte`.
- Lineage vocabulary control: `src/lib/components/LineageInspector.svelte`.
- Canonical code and test routing: `docs/ENGINE_MAP.md`.

Do not duplicate these facts as independent component-local prose. New diagrams or help views should project the same named facts, assumptions and limitations.
