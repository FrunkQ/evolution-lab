import type {
  EnvironmentFrame,
  EnvironmentProvider,
  SimulationConfig,
  SimulationEvent
} from './types';

function environmentEvent(
  id: string,
  tick: number,
  kind: SimulationEvent['kind'],
  title: string,
  summary: string,
  causes: string[],
  affectedLineageIds: string[]
): SimulationEvent {
  return { id, tick, kind, title, summary, causes, affectedLineageIds };
}

/**
 * Deterministic stand-in for a planetary timeline. SSE will eventually provide
 * frames through the same interface; the evolution engine does not know which
 * provider produced them.
 */
export const scriptedMicrocosmEnvironment: EnvironmentProvider = {
  id: 'scripted-microbial-film',
  version: '0.2.0',
  frameAt(tick: number, config: SimulationConfig): EnvironmentFrame {
    const events: SimulationEvent[] = [];
    const seasonalLight = 70 + 11 * Math.sin((tick / 48) * Math.PI * 2);
    const inShadow = tick >= config.shadowStartsAt && tick <= config.shadowEndsAt;
    const inflows: EnvironmentFrame['inflows'] = {};

    if (tick === config.nutrientPulseAt) {
      inflows.minerals = 68;
      inflows.carbon = 28;
      events.push(
        environmentEvent(
          'nutrient-pulse',
          tick,
          'environment',
          'Mineral-rich water enters the film',
          'A brief mixing event returns buried nutrients to the illuminated layer.',
          ['environmental mixing', 'sediment disturbance'],
          ['basal-loop', 'light-weavers', 'silt-recyclers']
        )
      );
    }

    if (tick === config.shadowStartsAt) {
      events.push(
        environmentEvent(
          'long-shadow',
          tick,
          'environment',
          'A long shadow crosses the habitat',
          'Light harvesting falls sharply; stored biomass and recycling now support the community.',
          ['sustained reduction in incident light'],
          ['light-weavers', 'veil-grazers', 'silt-recyclers']
        )
      );
    }

    if (tick === config.shadowEndsAt + 1) {
      events.push(
        environmentEvent(
          'light-returns',
          tick,
          'ecology',
          'The illuminated film recovers',
          'Dormant recyclers and surviving producers rebuild the resource network.',
          ['light returns', 'persistent detritus pool', 'surviving populations'],
          ['light-weavers', 'silt-recyclers']
        )
      );
    }

    return {
      tick,
      light: Math.max(4, Math.min(90, inShadow ? seasonalLight * config.shadowLightFraction : seasonalLight)),
      inflows,
      events
    };
  }
};
