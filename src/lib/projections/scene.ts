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
