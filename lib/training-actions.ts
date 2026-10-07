import { RELATIONSHIP_PATHS } from "./relationship-paths";
export type TrainingAction = {
  id: string;
  offeringId: string;
  offeringName: string;
  kind: "open_account" | "update_account" | "enroll" | "schedule";
  accountName: string;
  summary: string;
  steps: string[];
  /** Latest client turn when the action was completed (the client's request or agreement). */
  consentTurnId: string;
  completedAt: string;
};
export const TRAINING_ACTION_TOOL = {
  type: "function",
  name: "complete_training_action",
  description: "Complete a change the client asked for or agreed to in the synthetic training workspace. Call it as soon as the needed setup details are known; there is no separate authorization step. Never implies a real financial transaction.",
  parameters: {
    type: "object",
    properties: {
      offeringId: { type: "string", enum: [...RELATIONSHIP_PATHS.map(path => path.id), "service_request"], description: "Exact catalog offering ID, or service_request for the original service request" },
      kind: { type: "string", enum: ["open_account", "update_account", "enroll", "schedule"] },
      accountName: { type: "string", description: "New account name for open_account; selected existing account for enroll or update_account; empty only when no account applies" },
      summary: { type: "string", description: "Precise change the client asked for or agreed to" },
      steps: { type: "array", items: { type: "string" }, description: "Setup details covered with the client; may be empty" },
    },
    required: ["offeringId", "kind", "accountName", "summary", "steps"],
    additionalProperties: false,
  },
} as const;
export function validateTrainingAction(input: unknown, turns: Array<{ id: string; role: string; text: string }>): Omit<TrainingAction, "id" | "completedAt"> {
  if (!input || typeof input !== "object") throw new Error("Invalid training action.");
  const value = input as Record<string, unknown>;
  const offering = RELATIONSHIP_PATHS.find(path => path.id === value.offeringId);
  if (!offering && value.offeringId !== "service_request") throw new Error("Unknown offering.");
  if (!["open_account", "update_account", "enroll", "schedule"].includes(String(value.kind))) throw new Error("Unknown action type.");
  // The client's agreement in conversation is enough: no consent quote, phrase or confirmation step.
  // The action is linked to the latest client turn so the call report can place it.
  const client = turns.findLast(turn => turn.role === "customer");
  if (!client) throw new Error("Complete the action after the client has asked for it.");
  if (typeof value.summary !== "string" || !value.summary.trim() || value.summary.length > 500) throw new Error("A concise action summary is required.");
  const steps = Array.isArray(value.steps) ? value.steps.filter((step): step is string => typeof step === "string" && !!step.trim()).map(step => step.trim().slice(0, 300)).slice(0, 12) : [];
  if (typeof value.accountName !== "string" || value.accountName.length > 120 || value.kind === "open_account" && !value.accountName.trim()) throw new Error("Provide a name for the new account.");
  return { offeringId: String(value.offeringId), offeringName: offering?.name ?? "Service request", kind: value.kind as TrainingAction["kind"], accountName: value.accountName.trim(), summary: value.summary.trim(), steps, consentTurnId: client.id };
}

export function persistTrainingAction(
  validated: Omit<TrainingAction, "id" | "completedAt">,
  previous: TrainingAction[],
  callId: string,
  storage: Pick<Storage, "setItem">,
): { action: TrainingAction; actions: TrainingAction[] } {
  const existing = previous.find(action => action.consentTurnId === validated.consentTurnId && action.offeringId === validated.offeringId && action.kind === validated.kind);
  const action: TrainingAction = existing ?? { ...validated, id: callId, completedAt: new Date().toISOString() };
  const actions = existing ? previous : [...previous, action];
  storage.setItem("schwab-training-actions-k-v1", JSON.stringify(actions));
  return { action, actions };
}
