<script lang="ts">
  interface Props {
    labVersion: string;
    engineVersion: string;
    schemaVersion: string;
    providerIdentity: string;
    modeIdentity: string;
    scenarioIdentity: string;
  }

  let {
    labVersion,
    engineVersion,
    schemaVersion,
    providerIdentity,
    modeIdentity,
    scenarioIdentity
  }: Props = $props();
</script>

<div class="version-strip" aria-label="Running and selected versions">
  <span>Lab <strong>v{labVersion}</strong></span>
  <span>Engine <strong>v{engineVersion}</strong></span>
  <span>Schema <strong>{schemaVersion}</strong></span>
  <span>Provider <strong>{providerIdentity}</strong></span>
  <span>Mode <strong>{modeIdentity}</strong></span>
  <span>Scenario <strong>{scenarioIdentity}</strong></span>
</div>
