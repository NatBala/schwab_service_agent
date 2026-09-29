import type { TaxonomyEntry } from "./taxonomy";

/** These are synthetic role-play briefs, not live customer records or approved service scripts. */
export type ScriptLine = {
  speaker: "representative" | "customer";
  text: string;
};

export type Scenario = {
  id: string;
  title: string;
  callerName: string | null;
  age: number | null;
  openingReason: string;
  customerOpener: string;
  rolePlayHiddenFacts: string[];
  serviceResolution: string;
  /** The customer's own related concern to raise once the original service need is handled. */
  postServiceBridge: string;
  /** Customer concerns from the supplied call, ordered as a natural discovery arc. */
  discoveryBeats: string[];
  opportunityCues: string[];
  guardrails: string[];
  investingApproach: string;
  expectedTaxonomy: TaxonomyEntry | null;
  sourceCompleteness: "full_script" | "outline";
  /** Exact spoken dialogue where the prior conversation exposed the complete script. */
  script?: ScriptLine[];
};
