import { RELATIONSHIP_PATHS } from "./relationship-paths";
export type TrainingAction = {
  id: string;
  offeringId: string;
  offeringName: string;
  kind: "open_account" | "update_account" | "enroll" | "schedule";
  accountName: string;
  summary: string;
  steps: string[];
  consentTurnId: string;
  completedAt: string;
};
export const TRAINING_ACTION_TOOL = {
  type: "function",
  name: "complete_training_action",
  description: "Complete an explicitly authorized action in the synthetic training workspace only. Walk through the relevant steps first, obtain final client confirmation, then call this tool. Never implies a real financial transaction.",
  parameters: {
    type: "object",
    properties: {
      offeringId: { type: "string", description: "Catalog offering ID, or service_request for the original service request" },
      kind: { type: "string", enum: ["open_account", "update_account", "enroll", "schedule"] },
      accountName: { type: "string", description: "New account name for open_account; otherwise empty" },
      summary: { type: "string", description: "Precise change authorized by the client" },
      steps: { type: "array", items: { type: "string" }, description: "Setup steps actually covered with the client" },
      consentText: { type: "string", description: "Exact most recent client words giving final consent; quote their completed transcript" },
    },
    required: ["offeringId", "kind", "accountName", "summary", "steps", "consentText"],
    additionalProperties: false,
  },
} as const;
export function validateTrainingAction(input: unknown, turns: Array<{ id: string; role: string; text: string }>): Omit<TrainingAction, "id" | "completedAt"> {
  if (!input || typeof input !== "object") throw new Error("Invalid training action.");
  const value = input as Record<string, unknown>;
  const offering = RELATIONSHIP_PATHS.find(path => path.id === value.offeringId);
  if (!offering && value.offeringId !== "service_request") throw new Error("Unknown offering.");
  if (!["open_account", "update_account", "enroll", "schedule"].includes(String(value.kind))) throw new Error("Unknown action type.");
  const clientIndex = turns.findLastIndex(turn => turn.role === "customer");
  const client = turns[clientIndex];
  const proposal = turns.slice(0, clientIndex).findLast(turn => turn.role === "representative");
  const normalize = (text: string) => text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  if (!client || typeof value.consentText !== "string" || normalize(client.text) !== normalize(value.consentText)) throw new Error("Wait for the latest client transcript and quote its final authorization exactly.");
  if (/\b(no|not|don't|do not|decline|cancel|wait|maybe)\b/i.test(client.text) || !/\b(yes|agree|proceed|go ahead|confirm|please do|let's do|accept|do it)\b/i.test(client.text)) throw new Error("Final explicit client authorization is required.");
  if (!proposal || !/\b(confirm|proceed|authorize|go ahead|permission)\b/i.test(proposal.text)) throw new Error("Review the proposed action with the client and ask for final confirmation first.");
  if (typeof value.summary !== "string" || !value.summary.trim() || value.summary.length > 500) throw new Error("A concise action summary is required.");
  if (!Array.isArray(value.steps) || !value.steps.length || value.steps.length > 12 || value.steps.some(step => typeof step !== "string" || !step.trim() || step.length > 300)) throw new Error("List the setup steps covered in the call.");
  if (typeof value.accountName !== "string" || value.accountName.length > 120 || value.kind === "open_account" && !value.accountName.trim()) throw new Error("Provide a name for the new account.");
  return { offeringId: String(value.offeringId), offeringName: offering?.name ?? "Service request", kind: value.kind as TrainingAction["kind"], accountName: value.accountName.trim(), summary: value.summary.trim(), steps: value.steps as string[], consentTurnId: client.id };
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
