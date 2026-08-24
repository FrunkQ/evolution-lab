import type { LineageDefinition, SimulationConfig } from './types';

export const MICROBIAL_SCENARIO_ID = 'lab/microbial-flask-001';
export const MICROBIAL_SCENARIO_VERSION = '0.1.0';
export const MICROBIAL_SCENARIO_IDENTITY = `${MICROBIAL_SCENARIO_ID}@${MICROBIAL_SCENARIO_VERSION}`;

export const DEFAULT_CONFIG: SimulationConfig = {
  duration: 360,
  nutrientPulseAt: 156,
  shadowStartsAt: 232,
  shadowEndsAt: 268
};

export const LINEAGES: LineageDefinition[] = [
  {
    id: 'basal-loop',
    emergedAt: 0,
    color: '#b7c7d9',
    shortName: 'Basal loops',
    habitat: 'Warm mineral film',
    vocabulary: {
      story:
        'Tiny chemical loops cling to the warm mineral film: unhurried, fragile and very difficult to kill completely.',
      ecology:
        'A basal chemotrophic guild using dissolved reduced compounds in a connected surface film.',
      chemistry:
        'Carbon-fixing replicators couple oxidation of reduced mineral species to membrane maintenance and reproduction.'
    },
    capabilities: [
      { id: 'compartment', label: 'Compartments', kind: 'structure', cost: 'Membrane material' },
      { id: 'chemotrophy', label: 'Chemotrophy', kind: 'metabolism', cost: 'Reduced minerals' }
    ]
  },
  {
    id: 'light-weavers',
    parentId: 'basal-loop',
    emergedAt: 24,
    color: '#68e0a3',
    shortName: 'Light weavers',
    habitat: 'Illuminated water film',
    vocabulary: {
      story:
        'Green-gold veils spread across the light, turning bare carbon into living colour and leaving a strange reactive gas behind.',
      ecology:
        'A phototrophic producer guild that dominates the illuminated film when carbon and mineral nutrients remain available.',
      chemistry:
        'Pigment-assisted charge separation drives carbon fixation; oxygen is emitted as a reactive metabolic by-product.'
    },
    capabilities: [
      { id: 'compartment', label: 'Compartments', kind: 'structure', cost: 'Membrane material' },
      { id: 'phototrophy', label: 'Light harvesting', kind: 'metabolism', cost: 'Pigment synthesis' },
      { id: 'oxygen-tolerance', label: 'Oxygen tolerance', kind: 'survival', cost: 'Antioxidant chemistry' }
    ]
  },
  {
    id: 'silt-recyclers',
    parentId: 'basal-loop',
    emergedAt: 63,
    color: '#ffc46b',
    shortName: 'Silt recyclers',
    habitat: 'Dim sediment boundary',
    vocabulary: {
      story:
        'Amber films gather beneath the living veil, feeding on everything that falls and returning old bodies to the water.',
      ecology:
        'A detritivore guild that mineralises dead biomass and closes the microcosm’s brown food web.',
      chemistry:
        'Heterotrophic pathways oxidise reduced organic matter, releasing soluble mineral nutrients and carbon compounds.'
    },
    capabilities: [
      { id: 'compartment', label: 'Compartments', kind: 'structure', cost: 'Membrane material' },
      { id: 'detritivory', label: 'Detritus recycling', kind: 'metabolism', cost: 'Oxidants' },
      { id: 'dormancy', label: 'Dormancy', kind: 'survival', cost: 'Slow reproduction' }
    ]
  },
  {
    id: 'veil-grazers',
    parentId: 'basal-loop',
    emergedAt: 126,
    color: '#f07f73',
    shortName: 'Veil grazers',
    habitat: 'Producer-rich surface boundary',
    vocabulary: {
      story:
        'Fast red sparks move through the green veil, puncturing its builders and opening the first true arms race.',
      ecology:
        'A motile grazer guild exploiting abundant producers; its arrival converts a producer monopoly into a trophic cycle.',
      chemistry:
        'Membrane-recognition catalysts and active transport allow direct acquisition of pre-concentrated organic matter.'
    },
    capabilities: [
      { id: 'compartment', label: 'Compartments', kind: 'structure', cost: 'Membrane material' },
      { id: 'motility', label: 'Directed motility', kind: 'interaction', cost: 'High maintenance energy' },
      { id: 'grazing', label: 'Cell grazing', kind: 'metabolism', cost: 'Capture structures' }
    ]
  }
];
