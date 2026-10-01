import type { CustomerProfile } from "@/lib/customer-profiles";
import type { ClientRoleBrief } from "@/lib/call-roles";

export type Scenario = {
  id: string;
  title: string;
  callerName: string;
  age: number;
  openingReason: string;
  serviceResolution: string;
  sourceCompleteness: "full_script" | "outline";
  profile: CustomerProfile | null;
  customerOpener: string;
  clientBrief: ClientRoleBrief | null;
};

export type Turn = {
  id: string;
  role: "customer" | "representative";
  text: string;
  at: number;
};

type Evidence = { evidenceIds: string[] };
export type Analysis = {
  customerProblem: Evidence & { immediate: string; impact: string };
  callReason: Evidence & {
    category: string;
    subcategory: string;
    reason: string;
    confidence: "low" | "medium" | "high";
    taxonomySourceLine?: number | null;
  };
  serviceStatus: Evidence & {
    state: "unresolved" | "in_progress" | "resolved";
    summary: string;
  };
  representativeGuidance: Evidence & { nextStep: string; question: string; rationale: string; followUpQuestions?: string[] };
  tags: Array<Evidence & {
    id: string;
    label: string;
    kind: "need" | "fact" | "concern" | "intent" | "guardrail";
  }>;
  criteria: Array<Evidence & {
    id: string;
    label: string;
    status: "met" | "unknown" | "not_met";
    rationale: string;
  }>;
  opportunity: Evidence & {
    stage: "none" | "signal" | "potential_fit" | "ready_to_explore" | "suppressed";
    title: string;
    rationale: string;
    blockers: string[];
  };
  investingApproach: (Evidence & { label: string; description: string }) | null;
  relationshipPaths: Array<Evidence & {
    id: string;
    name: string;
    family: string;
    description: string;
    sourceUrl: string;
    status: "possible" | "emerging" | "explore" | "hold" | "ruled_out";
    signalConfidence: number | null;
    assessed?: boolean;
    question?: string;
    rationale: string;
    nextStep: string;
  }>;
};

export type JourneyEvent = { id: string; pathId: string; title: string; state: string; quote: string; evidenceIds: string[]; at: number };
export type CallStatus = "idle" | "ready" | "connecting" | "live" | "ended" | "error";
/** Lifecycle of the LLM cue for the current client turn. */
export type CueStatus = "idle" | "thinking" | "streaming" | "directing" | "delivering" | "delivered" | "late" | "error";
