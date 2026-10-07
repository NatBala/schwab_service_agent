import { z } from "zod";
import { RELATIONSHIP_PATHS } from "./relationship-paths";
import type { CustomerProfile } from "./customer-profiles";

/**
 * Pre-call cross-sell plan. For every call an LLM enriches the synthetic client
 * record with account detail and selects 2–3 Schwab offerings the account data
 * supports, each with its reason and an opening line for after the service
 * request. It also prepares how to handle other topics the client may raise.
 * All data is synthetic; the plan is guidance for the training representative.
 */

export const CROSS_SELL_MODEL = "gpt-5.6-luna";
const OFFERING_IDS = RELATIONSHIP_PATHS.map(path => path.id).filter(id => id !== "service_recovery");
const ACCOUNT_TYPES = ["brokerage", "traditional_ira", "roth_ira", "rollover_ira", "bank", "organization", "education", "custodial", "trust", "workplace_plan", "other"] as const;

// Strict structured outputs: no length/count keywords; parseCrossSellPlan enforces limits.
const text = () => ({ type: "string" as const });
export const CROSS_SELL_SCHEMA = {
  type: "object",
  properties: {
    summary: text(),
    accounts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: text(),
          type: { type: "string", enum: [...ACCOUNT_TYPES] },
          balance: { type: "number" },
          holdings: text(),
          heldAway: { type: "boolean" },
        },
        required: ["name", "type", "balance", "holdings", "heldAway"],
        additionalProperties: false,
      },
    },
    signals: {
      type: "array",
      items: {
        type: "object",
        properties: { id: text(), label: text(), detail: text(), accountName: text() },
        required: ["id", "label", "detail", "accountName"],
        additionalProperties: false,
      },
    },
    opportunities: {
      type: "array",
      items: {
        type: "object",
        properties: {
          offeringId: { type: "string", enum: OFFERING_IDS },
          headline: text(),
          reason: text(),
          signalIds: { type: "array", items: text() },
          openingLine: text(),
          discoveryQuestion: text(),
          setupPath: text(),
          watchOut: text(),
        },
        required: ["offeringId", "headline", "reason", "signalIds", "openingLine", "discoveryQuestion", "setupPath", "watchOut"],
        additionalProperties: false,
      },
    },
    pivots: {
      type: "array",
      items: {
        type: "object",
        properties: { clientTopic: text(), offeringId: { type: "string", enum: OFFERING_IDS }, approach: text() },
        required: ["clientTopic", "offeringId", "approach"],
        additionalProperties: false,
      },
    },
  },
  required: ["summary", "accounts", "signals", "opportunities", "pivots"],
  additionalProperties: false,
} as const;

export const CROSS_SELL_INSTRUCTIONS = [
  "You prepare a pre-call cross-sell plan for a Charles Schwab service-representative training simulation. Every client, balance and holding is fictional synthetic data.",
  "1. Enrich the client record. Return every existing account with its exact name and balance, adding realistic holdings detail (cash share, fund or stock positions, contribution or deposit patterns, recent activity). You may add at most two new accounts, Schwab or held away, if they make a cross-sell reason realistic. Keep everything consistent with the client's role brief and the service record.",
  "2. Signals: 3–6 concrete, observable data facts a representative could see on screen, each tied to an account, e.g. \"$84,000 has sat in cash in the Traditional IRA for seven months\". Signals are data, never assumptions about the client's feelings or intentions.",
  "3. Opportunities: 2–3 different catalog offerings, ranked strongest first, each supported by at least one signal ID. reason connects the signals to the offering in one or two sentences. openingLine is what the representative says after the original service request is complete: reference the account fact neutrally (\"I noticed…\"), say briefly why it may matter, and ask permission to talk about it. At most 40 words, no suitability claims, guarantees, returns or tax promises. discoveryQuestion is the one question to ask if the client is open. setupPath is how this offering is completed in the workspace (enroll, open an account or schedule). watchOut is the main reason it might not fit.",
  "4. Pivots: 2–4 different topics this client might raise instead, each mapped to a catalog offering with a short approach.",
  "Make every call different: use variationSeed to vary which holdings, signals and offerings you feature. Never make an ID in recentOfferingIds the first opportunity, and never propose an ID in completedOfferingIds. Do not select an offering only because it appears in the catalog; the account data must support it.",
].join("\n");

export type CrossSellInput = {
  scenarioId: string;
  profile: CustomerProfile;
  clientBrief?: { situation: string; ifAsked: string[] } | null;
  serviceRecord?: { knownRecord: string[]; serviceApproach: string } | null;
  recentOfferingIds?: string[];
  completedOfferingIds?: string[];
  variationSeed: number;
};

/** OpenAI Responses API request body that produces the plan. */
export function crossSellRequestBody(input: CrossSellInput) {
  return {
    model: CROSS_SELL_MODEL,
    reasoning: { effort: "low" },
    store: false,
    max_output_tokens: 3500,
    instructions: CROSS_SELL_INSTRUCTIONS,
    input: JSON.stringify({
      variationSeed: input.variationSeed,
      recentOfferingIds: input.recentOfferingIds ?? [],
      completedOfferingIds: input.completedOfferingIds ?? [],
      clientRecord: {
        book: input.profile.book,
        segment: input.profile.segment,
        relationship: input.profile.relationship,
        accounts: input.profile.accounts,
        lastContact: input.profile.lastContact,
        currentServiceNeed: input.profile.context,
      },
      clientRoleBrief: input.clientBrief ?? null,
      serviceRecord: input.serviceRecord ?? null,
      offerings: RELATIONSHIP_PATHS.filter(path => path.id !== "service_recovery").map(({ id, name, family, description }) => ({ id, name, family, description })),
    }),
    text: { format: { type: "json_schema", name: "cross_sell_plan", strict: true, schema: CROSS_SELL_SCHEMA } },
  };
}

const rawSchema = z.object({
  summary: z.string(),
  accounts: z.array(z.object({ name: z.string(), type: z.enum(ACCOUNT_TYPES), balance: z.number(), holdings: z.string(), heldAway: z.boolean() })),
  signals: z.array(z.object({ id: z.string(), label: z.string(), detail: z.string(), accountName: z.string() })).min(1),
  opportunities: z.array(z.object({
    offeringId: z.string(), headline: z.string(), reason: z.string(), signalIds: z.array(z.string()),
    openingLine: z.string(), discoveryQuestion: z.string(), setupPath: z.string(), watchOut: z.string(),
  })).min(1),
  pivots: z.array(z.object({ clientTopic: z.string(), offeringId: z.string(), approach: z.string() })),
});

export type CrossSellAccount = { name: string; type: string; balance: number; holdings: string; heldAway: boolean; existing: boolean };
export type CrossSellSignal = { id: string; label: string; detail: string; accountName: string };
export type CrossSellOpportunity = {
  offeringId: string; offeringName: string; family: string; priority: number;
  headline: string; reason: string; signalIds: string[];
  openingLine: string; discoveryQuestion: string; setupPath: string; watchOut: string;
};
export type CrossSellPivot = { clientTopic: string; offeringId: string; offeringName: string; approach: string };
export type CrossSellPlan = {
  id: string;
  scenarioId: string;
  generatedAt: string;
  summary: string;
  book: number;
  accounts: CrossSellAccount[];
  signals: CrossSellSignal[];
  opportunities: CrossSellOpportunity[];
  pivots: CrossSellPivot[];
};

/** "$12,000 · Active" → 12000. Unknown values are 0. */
export function parseBalance(detail: string): number {
  const match = detail.match(/\$\s?([\d,]+(?:\.\d+)?)\s*([kKmM])?/);
  if (!match) return 0;
  const value = Number(match[1].replace(/,/g, ""));
  const scale = match[2]?.toLowerCase() === "m" ? 1_000_000 : match[2]?.toLowerCase() === "k" ? 1_000 : 1;
  return Math.round(value * scale);
}

const sameName = (first: string, second: string) => first.trim().toLowerCase() === second.trim().toLowerCase();
const clip = (value: string, max: number) => value.trim().slice(0, max);

/**
 * Validate model output against the catalog and the existing record. Existing
 * accounts keep their recorded balances; offerings must be real catalog IDs,
 * distinct, not already completed, and backed by a signal that exists.
 */
export function parseCrossSellPlan(value: unknown, input: Pick<CrossSellInput, "scenarioId" | "profile" | "completedOfferingIds">, id: string, now = new Date()): CrossSellPlan {
  const raw = rawSchema.parse(value);
  const existing: CrossSellAccount[] = input.profile.accounts.map(account => {
    const enriched = raw.accounts.find(item => sameName(item.name, account.name));
    return {
      name: account.name,
      type: enriched?.type ?? "other",
      balance: parseBalance(account.detail),
      holdings: clip(enriched?.holdings || account.detail.replace(/^\$[\d,.]+\s*·?\s*/, ""), 160),
      heldAway: false,
      existing: true,
    };
  });
  const added = raw.accounts
    .filter(item => !existing.some(account => sameName(account.name, item.name)) && item.name.trim() && Number.isFinite(item.balance) && item.balance >= 0 && item.balance < 50_000_000)
    .slice(0, 2)
    .map(item => ({ name: clip(item.name, 60), type: item.type, balance: Math.round(item.balance), holdings: clip(item.holdings, 160), heldAway: item.heldAway, existing: false }));
  const accounts = [...existing, ...added];

  const signals = raw.signals
    .filter((signal, index, all) => signal.id.trim() && all.findIndex(other => other.id === signal.id) === index)
    .slice(0, 6)
    .map(signal => ({ id: clip(signal.id, 12), label: clip(signal.label, 70), detail: clip(signal.detail, 180), accountName: clip(signal.accountName, 60) }));
  const signalIds = new Set(signals.map(signal => signal.id));
  const completed = new Set(input.completedOfferingIds ?? []);
  const catalog = (offeringId: string) => RELATIONSHIP_PATHS.find(path => path.id === offeringId && path.id !== "service_recovery");

  const opportunities: CrossSellOpportunity[] = [];
  for (const item of raw.opportunities) {
    const offering = catalog(item.offeringId);
    const supported = item.signalIds.filter(signalId => signalIds.has(signalId));
    if (!offering || completed.has(offering.id) || opportunities.some(other => other.offeringId === offering.id) || !supported.length || !item.openingLine.trim()) continue;
    opportunities.push({
      offeringId: offering.id, offeringName: offering.name, family: offering.family, priority: opportunities.length + 1,
      headline: clip(item.headline, 80), reason: clip(item.reason, 240), signalIds: supported.slice(0, 3),
      openingLine: clip(item.openingLine, 260), discoveryQuestion: clip(item.discoveryQuestion, 160),
      setupPath: clip(item.setupPath, 180), watchOut: clip(item.watchOut, 160),
    });
    if (opportunities.length === 3) break;
  }
  if (!opportunities.length) throw new Error("The plan did not contain a supported catalog offering.");

  const pivots = raw.pivots.flatMap(pivot => {
    const offering = catalog(pivot.offeringId);
    return offering && pivot.clientTopic.trim() ? [{ clientTopic: clip(pivot.clientTopic, 90), offeringId: offering.id, offeringName: offering.name, approach: clip(pivot.approach, 220) }] : [];
  }).slice(0, 4);

  return {
    id,
    scenarioId: input.scenarioId,
    generatedAt: now.toISOString(),
    summary: clip(raw.summary, 220),
    book: accounts.filter(account => !account.heldAway).reduce((sum, account) => sum + account.balance, 0),
    accounts,
    signals,
    opportunities,
    pivots,
  };
}

export const formatMoney = (value: number) => "$" + Math.round(value).toLocaleString("en-US");

/** Private system item that gives Jordan the plan. It never triggers a reply on its own. */
export function crossSellSystemItem(plan: CrossSellPlan, itemId: string) {
  const signal = (signalId: string) => plan.signals.find(item => item.id === signalId);
  const lines = [
    "Pre-call cross-sell plan for this caller. This is synthetic account data you can see on screen, not something the client said. Do not read it aloud or mention a plan.",
    "Use it only after the original service request is resolved. Then raise opportunity 1 in your own words: reference the account fact, say briefly why it may matter, and ask permission to discuss it. If the client declines, acknowledge it and you may offer the next opportunity once; stop after a second decline or a goodbye. If the client raises a different topic, follow the matching approach below. Accepted offerings follow the normal setup and complete_training_action steps, with no authorization step.",
    "Accounts: " + plan.accounts.map(account => `${account.name} ${formatMoney(account.balance)}${account.heldAway ? " (held away)" : ""}: ${account.holdings}`).join("; "),
    "Account signals: " + plan.signals.map(item => `[${item.id}] ${item.detail}`).join(" "),
    ...plan.opportunities.map(item => `Opportunity ${item.priority}: ${item.offeringName}. Why: ${item.reason} Data: ${item.signalIds.map(signalId => signal(signalId)?.detail ?? "").filter(Boolean).join(" ")} Opener: "${item.openingLine}" Then ask: "${item.discoveryQuestion}" Setup: ${item.setupPath} Watch out: ${item.watchOut}`),
    ...plan.pivots.map(item => `If the client raises "${item.clientTopic}": ${item.offeringName}. ${item.approach}`),
  ];
  return { type: "conversation.item.create", item: { id: itemId, type: "message", role: "system", content: [{ type: "input_text", text: lines.join("\n") }] } };
}

/** Compact plan for the live coach, with the outcome of each opportunity so far. */
export function crossSellCueContext(plan: CrossSellPlan | null, statuses: Record<string, PlanStatus> = {}) {
  if (!plan) return null;
  return {
    opportunities: plan.opportunities.map(item => ({
      offeringId: item.offeringId, priority: item.priority, status: statuses[item.offeringId] ?? "planned",
      reason: item.reason, openingLine: item.openingLine, discoveryQuestion: item.discoveryQuestion,
      accountFacts: item.signalIds.map(signalId => plan.signals.find(signal => signal.id === signalId)?.detail).filter(Boolean),
    })),
    pivots: plan.pivots.map(({ clientTopic, offeringId, approach }) => ({ clientTopic, offeringId, approach })),
  };
}

export type PlanStatus = "planned" | "raised" | "interested" | "accepted" | "declined";
type StatusPath = { id: string; status: string; evidenceIds: string[] };
type StatusTurn = { id: string; role: string; text: string };
type StatusAction = { offeringId: string; consentTurnId: string };

/**
 * Outcome of each planned offering in this call. Interest and declines come from
 * the LLM assessment of the client's words; acceptance from a completed action.
 */
export function planStatuses(plan: CrossSellPlan, turns: StatusTurn[], paths: StatusPath[], actions: StatusAction[], mentioned: (text: string, name: string, id: string) => boolean): Record<string, PlanStatus> {
  const turnIds = new Set(turns.map(turn => turn.id));
  return Object.fromEntries(plan.opportunities.map(item => {
    const path = paths.find(candidate => candidate.id === item.offeringId);
    let status: PlanStatus = "planned";
    if (actions.some(action => action.offeringId === item.offeringId && turnIds.has(action.consentTurnId))) status = "accepted";
    else if (path?.status === "ruled_out" && path.evidenceIds.some(id => turnIds.has(id))) status = "declined";
    else if ((path?.status === "emerging" || path?.status === "explore") && path.evidenceIds.some(id => turnIds.has(id))) status = "interested";
    else if (turns.some(turn => turn.role === "representative" && mentioned(turn.text, item.offeringName, item.offeringId))) status = "raised";
    return [item.offeringId, status];
  }));
}

/** Offerings featured in recent calls per caller, so the next plan differs. */
export const CROSS_SELL_HISTORY_KEY = "schwab-cross-sell-history-v1";
export function recentOfferings(history: unknown, scenarioId: string): string[] {
  if (!history || typeof history !== "object") return [];
  const list = (history as Record<string, unknown>)[scenarioId];
  return Array.isArray(list) ? list.filter((id): id is string => typeof id === "string").slice(0, 6) : [];
}
export function rememberOfferings(history: unknown, plan: CrossSellPlan): Record<string, string[]> {
  const base = history && typeof history === "object" ? { ...(history as Record<string, string[]>) } : {};
  base[plan.scenarioId] = [...plan.opportunities.map(item => item.offeringId), ...recentOfferings(base, plan.scenarioId)].filter((id, index, all) => all.indexOf(id) === index).slice(0, 6);
  return base;
}
