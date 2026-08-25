export type HelpAudience = 'curious' | 'biology' | 'engine';

export interface HelpLens {
  id: HelpAudience;
  label: string;
  heading: string;
  scopeNote: string;
  paragraphs: readonly string[];
  terms: readonly { term: string; meaning: string }[];
  sourceFactIds: readonly string[];
  limitationIds: readonly string[];
}
export interface ConceptDemoOutput { id: string; label: string; relation: 'direct' | 'inverse'; lowText: string; highText: string; }
export interface ConceptDemo {
  id: string;
  title: string;
  summary: string;
  disclaimer: string;
  slider: { label: string; minimum: number; maximum: number; step: number; initialValue: number; unit: string; };
  outputs: readonly ConceptDemoOutput[];
}
export interface HelpTopic {
  id: string;
  version: string;
  title: string;
  intro: string;
  lenses: Record<HelpAudience, HelpLens>;
  diagram: { kind: 'paired-rerun'; label: string; shared: string; changed: string; comparison: string; };
  conceptDemo: ConceptDemo;
}
