import { RELATIONSHIP_PATHS } from "./relationship-paths";
export type TrainingAction = {
  id: string;
  offeringId: string;
  offeringName: string;
  kind: "open_account" | "update_account" | "enroll" | "schedule";
  accountName: string;
  summary: string;
  steps: string[];
  /** The client turn that asked for or said yes to this action. */
  consentTurnId: string;
  completedAt: string;
};
export const TRAINING_ACTION_TOOL = {
  type: "function",
  name: "complete_training_action",
  description: "Complete a change in the synthetic training workspace only after the client asked for it or said yes to your short yes/no question offering to set it up. Agreeing to hear more, answering another question or sharing facts is not a yes. Never ask for a specific phrase. Never implies a real financial transaction.",
  parameters: {
    type: "object",
    properties: {
      offeringId: { type: "string", enum: [...RELATIONSHIP_PATHS.map(path => path.id), "service_request"], description: "Exact catalog offering ID, or service_request for the original service request" },
      kind: { type: "string", enum: ["open_account", "update_account", "enroll", "schedule"] },
      accountName: { type: "string", description: "New account name for open_account; selected existing account for enroll or update_account; empty only when no account applies" },
      summary: { type: "string", description: "Precise change the client asked for or said yes to" },
      steps: { type: "array", items: { type: "string" }, description: "Setup details covered with the client; may be empty" },
    },
    required: ["offeringId", "kind", "accountName", "summary", "steps"],
    additionalProperties: false,
  },
} as const;

type GateTurn = { id: string; role: string; text: string };

/** Natural agreement: any ordinary yes. No specific phrase is ever required. */
const AFFIRMATIVE = /^(?:(?:uh|um|oh|ok|okay|well|yeah|so|great|perfect|right)[,.!\s]+)*(?:yes|yeah|yep|yup|ya|sure|ok|okay|alright|all right|absolutely|definitely|certainly|of course|please|go ahead|sounds good|sounds great|that works|works for me|perfect|great|let'?s do (?:it|that|this)|let'?s go|do it|please do|i'?d like that|i would like that|i'?d love that|why not|correct|that'?s right|exactly|fine|deal|for sure|go for it|i agree|agreed|yes please)\b/i;
const AFFIRMATIVE_ANYWHERE = /\b(?:yes|go ahead|sounds good|let'?s do (?:it|that)|please do|set (?:it|that|this) up|sign me up|go for it|do it)\b/i;
const NEGATIVE = /\b(?:no|nope|nah|not (?:now|yet|today|sure|ready|right now|interested)|don'?t|do not|wait|hold on|hang on|maybe|later|cancel|stop|never ?mind|rather not|i'?ll think|think about it|let me think|not for me|i'?m good|skip)\b/i;
/** A client asking for the change directly. */
const REQUEST_VERB = /\b(?:set\b[^.?!]{0,40}\bup|sign me up|enrol|open\b|schedul|book|activat|submit|start\b|transfer|move\b|update|change|add\b|go ahead and)/i;
const REQUEST_ASK = /\b(?:please|can you|could you|would you|will you|i'?d like (?:you )?to|i would like (?:you )?to|i want (?:you )?to|i need (?:you )?to|let'?s|go ahead)\b/i;
/** Jordan's yes/no offer to carry out the change (not to explain or discuss it). */
const PROPOSAL_ASK = /\b(?:would you like (?:me|us)? ?to|shall (?:i|we)|should (?:i|we)|do you want (?:me|us)? ?to|want me to|can (?:i|we)|may (?:i|we)|ready (?:for me )?to|okay (?:if i|for me to|to)|is that okay|does that (?:sound|work)|sound good|like to (?:go ahead|proceed|move forward|get)|ready to (?:go ahead|proceed|move forward))\b/i;
const PROPOSAL_ACTION = /\b(?:set\b[^?]{0,40}\bup|enrol|open\b|schedul|book|activat|submit|proceed|go ahead|move forward|get\b[^?]{0,40}\b(?:started|going|set up|scheduled|enrolled|opened)|add\b|start\b|put (?:that|it|this) in place|save|finali[sz])/i;
const DISCUSS_ONLY = /\b(?:hear|learn|talk|tell you|explain|walk you through|go over|discuss|more about|know more|information|details? on|look at|explore|overview)\b/i;

const sentences = (text: string) => text.match(/[^.?!]+[.?!]?/g)?.map(part => part.trim()).filter(Boolean) ?? [];
const without = (text: string) => text.replace(/\bwhy not\b|\bno problem\b|\bno worries\b|\bnot a problem\b/gi, " ");
function isNegative(text: string) { return NEGATIVE.test(without(text)); }
function isAffirmative(text: string) {
  const clean = text.trim();
  if (isNegative(clean) || /\?/.test(without(clean)) && !AFFIRMATIVE.test(clean)) return false;
  return AFFIRMATIVE.test(clean) || AFFIRMATIVE_ANYWHERE.test(clean);
}
function isRequest(text: string) {
  return !isNegative(text) && sentences(text).some(sentence => REQUEST_VERB.test(sentence) && REQUEST_ASK.test(sentence));
}
function isProposal(text: string) {
  return sentences(text).some(sentence => sentence.endsWith("?") && PROPOSAL_ASK.test(sentence) && PROPOSAL_ACTION.test(sentence) && !DISCUSS_ONLY.test(sentence));
}

export const NOT_AGREED_MESSAGE = "Not completed: the client has not said yes to setting this up. Do not say it is done. Answer what the client just said, then ask one short yes/no question naming what you will set up, such as \"Would you like me to set up Schwab Plan for you now?\", and wait for their answer. Any natural yes is enough; never ask for a specific phrase or ask them to repeat.";

/**
 * The client turn that agrees to this action, or null. Agreement is either the
 * client's latest turn asking for the change, or any natural yes given right after
 * Jordan's yes/no offer to set it up (setup details may follow), with no later decline. Agreeing to hear
 * more, answering a different question or sharing facts is not agreement.
 * An agreement already used for a different completed action does not count again.
 */
export function findClientAgreement(turns: GateTurn[], usedAgreementIds: Iterable<string> = []): GateTurn | null {
  const used = new Set(usedAgreementIds);
  const lastClient = turns.findLastIndex(turn => turn.role === "customer");
  if (lastClient < 0) return null;
  if (isRequest(turns[lastClient].text) && !used.has(turns[lastClient].id)) return turns[lastClient];
  // Look back over the recent setup exchange for Jordan's offer and the client's yes.
  for (let index = lastClient; index >= Math.max(0, lastClient - 7); index--) {
    const turn = turns[index];
    if (turn.role !== "customer") continue;
    if (isNegative(turn.text)) return null;
    const offer = turns.slice(0, index).findLast(prior => prior.role === "representative");
    if (isAffirmative(turn.text) && offer && isProposal(offer.text)) return used.has(turn.id) ? null : turn;
  }
  return null;
}

export function validateTrainingAction(input: unknown, turns: Array<{ id: string; role: string; text: string }>, usedAgreementIds: Iterable<string> = []): Omit<TrainingAction, "id" | "completedAt"> {
  if (!input || typeof input !== "object") throw new Error("Invalid training action.");
  const value = input as Record<string, unknown>;
  const offering = RELATIONSHIP_PATHS.find(path => path.id === value.offeringId);
  if (!offering && value.offeringId !== "service_request") throw new Error("Unknown offering.");
  if (!["open_account", "update_account", "enroll", "schedule"].includes(String(value.kind))) throw new Error("Unknown action type.");
  // The client must have asked for it or said yes to Jordan's offer. Any natural yes counts.
  const client = findClientAgreement(turns, usedAgreementIds);
  if (!client) throw new Error(NOT_AGREED_MESSAGE);
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
