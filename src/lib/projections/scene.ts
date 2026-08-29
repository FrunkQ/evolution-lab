export interface ExperimentSceneView {
  id: string;
  eyebrow: string;
  title: string;
  setting: string;
  premise: string;
  question: string;
  boundary: string;
}

export const MICROBIAL_SCENE_VIEW: ExperimentSceneView = Object.freeze({
  id: 'biology/microbial-flask-scene@0.1.0',
  eyebrow: 'The scene · a warm mineral film',
  title: 'A tiny world learning to live with change',
  setting: 'A shallow, illuminated film contains carbon, reduced minerals and a small amount of oxygen. Seasonal light rises and falls; one nutrient-rich mixing event briefly replenishes the system.',
  premise: 'Simple chemical replicators are already present. Three authored ecological innovations can become active when their conditions are met: light harvesting, recycling of remains and direct grazing.',
  question: 'Can those roles form a persistent resource loop, and what happens when a long shadow removes most of their strongest external energy supply?',
  boundary: 'This is an aggregate conceptual model in experimental units. It starts after the origin of life and does not claim calibrated ecology or open-ended evolution.'
});

export const ALIEN_LAKE_SCENE_VIEW: ExperimentSceneView = Object.freeze({
  id: 'exobiology/alien-lake-scene@0.1.0',
  eyebrow: 'The scene · a layered alien lake',
  title: 'Different light reaches different neighbourhoods',
  setting: 'A fictional lake has a bright surface, a mixed middle and a dim sediment refuge. A pinned stellar surface spectrum is filtered with depth while finite nutrient and remains move through connected liquid habitats.',
  premise: 'Three aggregate populations begin with different, costly spectral response functions. One seeded daughter response appears later; a turbidity pulse eventually changes the deeper energy field.',
  question: 'Can field-matched responses persist without breaking the material ledger, and can a stable habitat hide behind one boundary before returning to exact detail?',
  boundary: 'This is a deterministic architecture probe with fictional response functions and uncalibrated lake units. It tests contracts and causal accounting; it does not predict alien pigments or a real ecosystem.'
});
