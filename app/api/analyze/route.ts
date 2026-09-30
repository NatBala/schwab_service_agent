import { CRITERIA, analysisSchema } from "@/lib/analysis-schema";
import { getScenario } from "@/lib/relationship-scenarios";
import { TAXONOMY } from "@/lib/taxonomy";
import { RELATIONSHIP_PATHS } from "@/lib/relationship-paths";

export const dynamic = "force-dynamic";

type Turn = {
  id: string;
  role: "customer" | "representative";
  text: string;
  at: number;
};

type EvidenceOwner = { evidenceIds: string[] };
type ModelAnalysis = {
  customerProblem: {
    immediate: string;
    impact: string;
    evidenceIds: string[];
  };
  callReason: {
    category: string;
    subcategory: string;
    reason: string;
    confidence: "low" | "medium" | "high";
    evidenceIds: string[];
  };
  serviceStatus: {
    state: "unresolved" | "in_progress" | "resolved";
    summary: string;
    evidenceIds: string[];
  };
  representativeGuidance: {
    nextStep: string;
    question: string;
    rationale: string;
    evidenceIds: string[];
  };
  tags: Array<{
    id: string;
    label: string;
    kind: "need" | "fact" | "concern" | "intent" | "guardrail";
    evidenceIds: string[];
  }>;
  criteria: Array<{
    id: string;
    label: string;
    status: "met" | "unknown" | "not_met";
    rationale: string;
    evidenceIds: string[];
  }>;
  opportunity: {
    stage: "none" | "signal" | "potential_fit" | "ready_to_explore" | "suppressed";
    title: string;
    rationale: string;
    evidenceIds: string[];
    blockers: string[];
  };
  investingApproach: {
    label: string;
    description: string;
    evidenceIds: string[];
  } | null;
  relationshipPaths: Array<{
    id: (typeof RELATIONSHIP_PATHS)[number]["id"];
    status: "possible" | "emerging" | "explore" | "hold" | "ruled_out";
    rationale: string;
    nextStep: string;
    evidenceIds: string[];
  }>;
};

const SCENARIO_PATH_HINTS: Record<string, string[]> = {
  "relationship-01": ["schwab_plan", "automated_investing", "fractional_shares"],
  "relationship-02": ["schwab_plan", "financial_consultant", "wealth_advisory"],
  "relationship-03": ["personalized_indexing", "pledged_asset_line", "charitable_giving", "financial_consultant", "wealth_advisory"],
  "relationship-04": ["schwab_plan", "automated_investing", "financial_consultant"],
  "relationship-05": ["college_529", "education_savings_account", "custodial_account", "schwab_plan"],
  "relationship-06": ["small_business_retirement", "organization_account", "cash_options", "financial_consultant", "schwab_plan"],
  "relationship-07": ["trust_services", "wealth_advisory", "charitable_giving", "financial_consultant"],
};

const OPENING_REASON_PATTERNS: Record<string, RegExp> = {
  "relationship-01": /automatic transfer|recurring transfer|monthly transfer|ach|every month/i,
  "relationship-02": /balance|account value|total value/i,
  "relationship-03": /cost basis|gain(?:s)? and loss(?:es)?|unrealized/i,
  "relationship-04": /rollover|401\s?\(?k\)?|former (?:employer|plan)|old employer/i,
  "relationship-05": /daughter|baby|newborn|child|grandparents|account for (?:her|him|them)/i,
  "relationship-06": /sep[ -]?ira|self.employed|retirement plan|business/i,
  "relationship-07": /beneficiar|estate plan/i,
};

const PATH_SIGNAL_PATTERNS: Record<string, Record<string, RegExp>> = {
  "relationship-01": {
    schwab_plan: /how much.*sav|enough|retirement|on track|financial plan/i,
    automated_investing: /etf|invest.*deposit|allocat|manage|rebalance|choose.*invest/i,
    fractional_shares: /self.directed|want to choose|learn.*invest/i,
  },
  "relationship-02": {
    schwab_plan: /retire|on track|401|pension|financial plan/i,
    financial_consultant: /coordinat|several|multiple|who helps|property|mother|estate|someone.*walk.*through|specialist.*(?:plan|help)|help.*results/i,
    wealth_advisory: /ongoing|coordinat.*(?:invest|retire|estate|tax|property)|several things.*work together|estate.*(?:old|year)|company stock.*(?:mother|property)/i,
  },
  "relationship-03": {
    personalized_indexing: /employer stock|concentrat|same company|exposure|index funds?/i,
    pledged_asset_line: /borrow|liquid|renovation|tax payment|sell.*gain/i,
    charitable_giving: /donat|charit|appreciated shares|my cpa/i,
    financial_consultant: /coordinat|separately|three separate|first conversation|multiple.*decision/i,
    wealth_advisory: /coordinat|separately|multiple.*decision|wealth advis/i,
  },
  "relationship-04": {
    schwab_plan: /on track|retirement|how much.*sav|financial plan/i,
    automated_investing: /invest|what.*buy|rebalance|manage.*portfolio/i,
    financial_consultant: /human|person|advisor|complex|complicat|who helps|plan.*(?:together|help)/i,
  },
  "relationship-05": {
    college_529: /education|college|529|tuition|school/i,
    education_savings_account: /education savings account|\besa\b|529.*(?:other|compare|alternative)|what if.*college|not.*college/i,
    custodial_account: /flexib|lock|other purpose|broader|custodial|not.*only.*education/i,
    schwab_plan: /own retirement|both.*retirement|model both|balance.*education/i,
  },
  "relationship-06": {
    small_business_retirement: /employee|hir|staff|simple|401|compare.*plan/i,
    organization_account: /operating cash|business cash|reserve|organization account|payroll/i,
    cash_options: /operating cash|business cash|reserve|payroll|liquid/i,
    financial_consultant: /personal retirement|coordinat|personal investments|business.*personal/i,
    schwab_plan: /personal retirement|never combined|retirement plan for me/i,
  },
  "relationship-07": {
    trust_services: /trustee|trust administration|daughter.*burden|family trust/i,
    wealth_advisory: /coordinat|family planning|estate.*complex|several pieces/i,
    charitable_giving: /charit|donat|philanthrop/i,
    financial_consultant: /coordinat|who coordinates|several pieces/i,
  },
};

const PATH_DISCOVERY_QUESTIONS: Record<string, string> = {
  schwab_plan: "Would it help to see these goals and accounts together in a broader plan?",
  automated_investing: "Would you prefer to choose and rebalance investments yourself, or explore having that managed?",
  fractional_shares: "Would you rather learn to choose individual investments yourself?",
  financial_consultant: "Would a conversation with a specialist help connect these decisions?",
  wealth_advisory: "Are you looking for ongoing advice across investments and other financial goals?",
  personalized_indexing: "Do you want to discuss how concentrated holdings affect your broader portfolio?",
  pledged_asset_line: "Are you considering borrowing for a near-term need instead of selling investments?",
  charitable_giving: "Are charitable gifts part of what you are trying to plan?",
  college_529: "Is the money intended specifically for education?",
  education_savings_account: "Would you like to compare education-focused account choices?",
  custodial_account: "Should the money remain available for your child's goals beyond education?",
  small_business_retirement: "Are you looking to establish retirement benefits for yourself or employees?",
  organization_account: "Does the business have longer-term assets beyond its operating cash needs?",
  cash_options: "How much cash must stay available for payroll and near-term expenses?",
  trust_services: "Would help with future trust administration ease a concern for your family?",
};

const POST_SERVICE_BRIDGES: Record<string, string> = {
  "relationship-01": "What is this monthly transfer helping you work toward?",
  "relationship-02": "Now that the account total is clear, is it part of a larger goal you are trying to track?",
  "relationship-03": "What prompted you to review the gains and losses now?",
  "relationship-04": "Once the rollover is sorted, what would you like these assets to support?",
  "relationship-05": "As you plan for your daughter, are there other family goals you are weighing alongside this account?",
  "relationship-06": "Beyond choosing a retirement plan, what other business or personal decisions are you weighing?",
  "relationship-07": "Is this beneficiary update part of a broader family or estate plan you are reviewing?",
};

async function openAIKey(): Promise<string | undefined> {
  if (process.env.OPENAI_API_KEY?.trim()) return process.env.OPENAI_API_KEY.trim();
  try {
    const { env } = await import("cloudflare:workers");
    return (env as Cloudflare.Env & { OPENAI_API_KEY?: string }).OPENAI_API_KEY?.trim();
  } catch {
    return undefined;
  }
}

function badRequest(message: string) {
  return Response.json({ error: message }, { status: 400 });
}

function parseTurns(value: unknown): Turn[] | null {
  if (!Array.isArray(value) || value.length > 120) return null;
  const seen = new Set<string>();
  const turns: Turn[] = [];
  let totalLength = 0;

  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const candidate = item as Record<string, unknown>;
    if (
      typeof candidate.id !== "string" ||
      !candidate.id.trim() ||
      candidate.id.length > 100 ||
      seen.has(candidate.id) ||
      (candidate.role !== "customer" && candidate.role !== "representative") ||
      typeof candidate.text !== "string" ||
      candidate.text.length > 4000 ||
      typeof candidate.at !== "number" ||
      !Number.isFinite(candidate.at) ||
      candidate.at < 0
    ) {
      return null;
    }
    const text = candidate.text.trim();
    if (!text) return null;
    totalLength += text.length;
    if (totalLength > 60_000) return null;
    seen.add(candidate.id);
    turns.push({ id: candidate.id, role: candidate.role, text, at: candidate.at });
  }
  return turns;
}

function initialAnalysis() {
  return {
    customerProblem: {
      immediate: "Waiting for the caller's problem.",
      impact: "",
      evidenceIds: [] as string[],
    },
    callReason: {
      category: "Unclassified",
      subcategory: "Unclassified",
      reason: "Waiting for the caller",
      confidence: "low" as const,
      evidenceIds: [] as string[],
      taxonomySourceLine: null as number | null,
    },
    serviceStatus: {
      state: "unresolved" as const,
      summary: "The representative has not heard the caller's issue yet.",
      evidenceIds: [] as string[],
    },
    representativeGuidance: {
      nextStep: "Listen to the caller's immediate request.",
      question: "How can I help you today?",
      rationale: "The customer has not described the reason for the call yet.",
      evidenceIds: [] as string[],
    },
    tags: [] as ModelAnalysis["tags"],
    criteria: CRITERIA.map((criterion) => ({
      ...criterion,
      status: "unknown" as const,
      rationale: "Not discussed yet.",
      evidenceIds: [] as string[],
    })),
    opportunity: {
      stage: "none" as const,
      title: "No investing signal yet",
      rationale: "Wait for the caller to establish a need or preference.",
      evidenceIds: [] as string[],
      blockers: [] as string[],
    },
    investingApproach: null,
    relationshipPaths: [] as ModelAnalysis["relationshipPaths"],
    evidence: [] as Turn[],
  };
}

function verifiedIds(owner: EvidenceOwner, turnMap: Map<string, Turn>, customerOnly = true) {
  return Array.from(new Set(owner.evidenceIds)).filter((id) => {
    const turn = turnMap.get(id);
    return turn && (!customerOnly || turn.role === "customer");
  });
}

function compactText(value: string, limit: number) {
  const content = value.trim();
  if (content.length <= limit) return content;
  const preview = content.slice(0, limit);
  const sentenceEnd = Math.max(preview.lastIndexOf("."), preview.lastIndexOf("?"), preview.lastIndexOf("!"));
  if (sentenceEnd >= limit * 0.55) return preview.slice(0, sentenceEnd + 1);
  const wordEnd = preview.lastIndexOf(" ");
  return preview.slice(0, wordEnd > 0 ? wordEnd : limit).trimEnd() + "…";
}

function cleanAnalysis(raw: ModelAnalysis, turns: Turn[], scenarioId: string) {
  const turnMap = new Map(turns.map((turn) => [turn.id, turn]));
  const problemIds = verifiedIds(raw.customerProblem, turnMap);
  const customerProblem = problemIds.length
    ? {
        immediate: raw.customerProblem.immediate.trim().slice(0, 240),
        impact: raw.customerProblem.impact.trim().slice(0, 240),
        evidenceIds: problemIds,
      }
    : { immediate: "Listening for the caller's problem.", impact: "", evidenceIds: [] as string[] };
  const classificationIds = verifiedIds(raw.callReason, turnMap);
  const matchedTaxonomy = TAXONOMY.find(
    (item) =>
      item.category === raw.callReason.category &&
      item.subcategory === raw.callReason.subcategory &&
      item.reason === raw.callReason.reason,
  );
  const openingTurn = turns.find((turn) => turn.role === "customer" && OPENING_REASON_PATTERNS[scenarioId]?.test(turn.text));
  const expectedTaxonomy = getScenario(scenarioId)?.expectedTaxonomy;
  const genericChildAccountOpening = scenarioId === "relationship-05" && openingTurn &&
    !/education|college|529|esa|school|tuition/i.test(openingTurn.text);
  const callReason = genericChildAccountOpening && expectedTaxonomy
    ? { ...expectedTaxonomy, confidence: "medium" as const, evidenceIds: [openingTurn.id], taxonomySourceLine: expectedTaxonomy.sourceLine }
    : matchedTaxonomy && classificationIds.length
    ? {
        ...raw.callReason,
        evidenceIds: classificationIds,
        taxonomySourceLine: matchedTaxonomy.sourceLine,
      }
    : openingTurn && expectedTaxonomy
      ? { ...expectedTaxonomy, confidence: "medium" as const, evidenceIds: [openingTurn.id], taxonomySourceLine: expectedTaxonomy.sourceLine }
    : {
        category: "Unclassified",
        subcategory: "Unclassified",
        reason: "Call reason still being established",
        confidence: "low" as const,
        evidenceIds: [] as string[],
        taxonomySourceLine: null,
      };

  const serviceIds = verifiedIds(raw.serviceStatus, turnMap, false);
  const acknowledgement = /\b(that (?:answers|explains|clarifies|helps|makes sense)|that(?:'|’)s (?:exactly what i needed|all i needed|helpful|clear)|i (?:see|understand|get it)|got it|understood|perfect|exactly|correct|yes[,.;\s]+(?:that(?:'|’)s|that is|it does|correct)|thank you for (?:explaining|clarifying)|the (?:beneficiary )?update is complete|the instruction is scheduled|that is what i needed|i found (?:it|the report))\b/i;
  const customerAcknowledged = serviceIds.some((id) => {
    const turn = turnMap.get(id);
    return turn?.role === "customer" &&
      turns.findIndex((item) => item.id === id) > 1 &&
      acknowledgement.test(turn.text);
  });
  const transferConfirmed = scenarioId === "relationship-01" && turns.some((turn) =>
    turn.role === "representative" && /(?:instruction|transfer).*(?:scheduled|active|confirmed)|shows as scheduled/i.test(turn.text)) &&
    turns.some((turn) => turn.role === "customer" && /(?:i approved it|that(?:'|’)s correct|that is correct)/i.test(turn.text));
  const serviceStatus = {
    ...raw.serviceStatus,
    state:
      transferConfirmed ? ("resolved" as const) : raw.serviceStatus.state === "resolved" && !customerAcknowledged
        ? ("in_progress" as const)
        : raw.serviceStatus.state,
    evidenceIds: transferConfirmed ? [...new Set([...serviceIds, ...turns.filter((turn) => turn.role === "customer" && /(?:i approved it|that(?:'|’)s correct|that is correct)/i.test(turn.text)).map((turn) => turn.id)])] : serviceIds,
  };
  const guidanceIds = verifiedIds(raw.representativeGuidance, turnMap);
  const representativeGuidance = {
    nextStep: compactText(raw.representativeGuidance.nextStep, 180),
    question: compactText(raw.representativeGuidance.question, 180),
    rationale: compactText(raw.representativeGuidance.rationale, 220),
    evidenceIds: guidanceIds,
  };

  const tagKeys = new Set<string>();
  const tags = raw.tags.slice(0, 8).flatMap((tag) => {
    const evidenceIds = verifiedIds(tag, turnMap);
    const label = tag.label.trim().slice(0, 80);
    const id = `${tag.kind}-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
    if (!evidenceIds.length || !label || tagKeys.has(id)) return [];
    tagKeys.add(id);
    return [{ ...tag, id, label, evidenceIds }];
  });

  const criteria = CRITERIA.map((requiredCriterion) => {
    const item = raw.criteria.find((criterion) => criterion.id === requiredCriterion.id);
    const evidenceIds = item ? verifiedIds(item, turnMap) : [];
    return {
      ...requiredCriterion,
      status: item && evidenceIds.length ? item.status : ("unknown" as const),
      rationale:
        item && evidenceIds.length
          ? item.rationale.trim()
          : "The caller has not established this yet.",
      evidenceIds,
    };
  });
  const investingGoalEstablished = criteria.some((criterion) => criterion.id === "investing_goal" && criterion.status === "met");
  const timeHorizonEstablished = criteria.some((criterion) => criterion.id === "time_horizon" && criterion.status === "met");
  const fundsCriterion = criteria.find((criterion) => criterion.id === "investable_funds");
  if (fundsCriterion?.status === "met" && (!investingGoalEstablished || !timeHorizonEstablished)) {
    fundsCriterion.status = "unknown";
    fundsCriterion.rationale = "An account amount was mentioned, but its availability for a stated long-term goal is not established yet.";
    fundsCriterion.evidenceIds = [];
  }

  const opportunityIds = verifiedIds(raw.opportunity, turnMap);
  const metCriteria = new Set(
    criteria.filter((criterion) => criterion.status === "met").map((criterion) => criterion.id),
  );
  const readinessCriteria = [
    "investing_goal",
    "investable_funds",
    "time_horizon",
    "eligible_account",
    "hands_off_preference",
  ] as const;
  let opportunityStage = raw.opportunity.stage;
  if (criteria.some((criterion) => criterion.id === "liquidity_needs" && criterion.status === "not_met")) {
    opportunityStage = "suppressed";
  }
  if (
    opportunityStage === "ready_to_explore" &&
    (serviceStatus.state !== "resolved" ||
      !readinessCriteria.every((id) => metCriteria.has(id)))
  ) {
    opportunityStage = "potential_fit";
  }
  if (
    opportunityStage === "potential_fit" &&
    readinessCriteria.filter((id) => metCriteria.has(id)).length < 2
  ) {
    opportunityStage = "signal";
  }
  const opportunity = opportunityStage !== "none" && opportunityIds.length
    ? { ...raw.opportunity, stage: opportunityStage, evidenceIds: opportunityIds }
    : {
        stage: "none" as const,
        title: "No investing signal yet",
        rationale: "No caller statement supports an investing opportunity yet.",
        evidenceIds: [] as string[],
        blockers: [] as string[],
      };

  const approachIds = raw.investingApproach
    ? verifiedIds(raw.investingApproach, turnMap)
    : [];
  const investingApproach =
    raw.investingApproach &&
    approachIds.length &&
    (opportunity.stage === "potential_fit" || opportunity.stage === "ready_to_explore")
      ? { ...raw.investingApproach, evidenceIds: approachIds }
      : null;

  const scenarioPaths = SCENARIO_PATH_HINTS[scenarioId] ?? [];
  const customerTurns = turns.filter((turn) => turn.role === "customer");
  const relationshipPaths = scenarioPaths.flatMap((id) => {
    const catalog = RELATIONSHIP_PATHS.find((path) => path.id === id);
    if (!catalog) return [];
    const candidate = raw.relationshipPaths.find((path) => path.id === id);
    const signalPattern = PATH_SIGNAL_PATTERNS[scenarioId]?.[id];
    const modelEvidence = candidate ? verifiedIds(candidate, turnMap) : [];
    const matchedEvidence = modelEvidence.filter((turnId) =>
      !signalPattern || signalPattern.test(turnMap.get(turnId)?.text ?? ""));
    const spokenSignal = [...customerTurns].reverse().find((turn) => signalPattern?.test(turn.text));
    let pathEvidence = candidate?.status === "hold" || candidate?.status === "ruled_out"
      ? modelEvidence
      : matchedEvidence.length ? matchedEvidence : spokenSignal ? [spokenSignal.id] : [];
    let status: ModelAnalysis["relationshipPaths"][number]["status"] = pathEvidence.length
      ? candidate && candidate.status !== "possible" ? candidate.status : "emerging"
      : "possible";
    if (id === "automated_investing") {
      const hasRoboContext = metCriteria.has("hands_off_preference") && investingGoalEstablished && timeHorizonEstablished;
      if (!hasRoboContext && status === "explore") status = "emerging";
      if (opportunity.stage === "suppressed" && status !== "ruled_out" && opportunity.evidenceIds.length) {
        status = "hold";
        pathEvidence = pathEvidence.length ? pathEvidence : opportunity.evidenceIds;
      }
    }
    if (status === "explore" && serviceStatus.state !== "resolved") status = "emerging";
    const evidenceIds = status === "possible" ? [] : pathEvidence;
    const rationale = id === "automated_investing" && status === "hold" && candidate?.status === "possible"
      ? "The caller described a constraint that pauses a long-term automated investing discussion."
      : status === "possible"
      ? "A possible path to clarify. The caller has not established a need for this offering yet."
      : candidate && candidate.status !== "possible" && matchedEvidence.length
        ? candidate.rationale.trim().slice(0, 220)
        : `The caller said: “${(turnMap.get(pathEvidence[0])?.text ?? "").slice(0, 145)}”`;
    const nextStep = status === "possible"
      ? PATH_DISCOVERY_QUESTIONS[id] ?? `Would you like to explore ${catalog.family.toLowerCase()} after we address your request?`
      : candidate?.nextStep.trim().slice(0, 180) || "Clarify the customer's priority.";
    const signalConfidence = status === "possible" ? 0 : status === "ruled_out" ? null
      : status === "explore" ? Math.min(94, 79 + evidenceIds.length * 5)
      : status === "hold" ? Math.min(69, 47 + evidenceIds.length * 5)
      : Math.min(77, 54 + evidenceIds.length * 7);
    return [{ ...catalog, status, rationale, nextStep, evidenceIds, signalConfidence }];
  });
  const planningTurn = customerTurns.find((turn) =>
    /\b(plan for (?:my )?retirement|help (?:me )?plan|financial plan(?:ning)?|planning for|put .* (?:together|in one place))\b/i.test(turn.text));
  const planningPath = relationshipPaths.find((path) => path.id === "schwab_plan");
  if (planningTurn && (!planningPath || planningPath.status === "possible") && scenarioPaths.includes("schwab_plan")) {
    const catalog = RELATIONSHIP_PATHS.find((path) => path.id === "schwab_plan");
    if (catalog) {
      const replacement = {
      ...catalog,
      status: serviceStatus.state === "resolved" ? "explore" : "emerging",
      rationale: `The caller said: “${planningTurn.text.slice(0, 145)}”`,
      nextStep: "Clarify the planning goal and offer an educational Schwab Plan overview after the service request is addressed.",
      evidenceIds: [planningTurn.id],
      signalConfidence: serviceStatus.state === "resolved" ? 84 : 61,
      } as (typeof relationshipPaths)[number];
      if (planningPath) relationshipPaths[relationshipPaths.indexOf(planningPath)] = replacement;
      else relationshipPaths.push(replacement);
    }
  }
  const statusRank = { explore: 0, emerging: 1, hold: 2, possible: 3, ruled_out: 4 };
  const supportedCount = relationshipPaths.filter((path) => path.status === "emerging" || path.status === "explore").length;
  const priority = (path: (typeof relationshipPaths)[number]) =>
    path.id === "financial_consultant" && supportedCount >= 3 && (path.status === "emerging" || path.status === "explore") ? -1 : statusRank[path.status];
  relationshipPaths.sort((a, b) => priority(a) - priority(b) || scenarioPaths.indexOf(a.id) - scenarioPaths.indexOf(b.id));

  // A completed service request can open discovery, but it does not establish a product need.
  // Keep the live cue useful when the model leaves the question blank or jumps to an offering.
  if (serviceStatus.state === "resolved" && supportedCount === 0) {
    const lastCustomerTurn = customerTurns.at(-1);
    const customerClosed = lastCustomerTurn && /\b(?:that(?:'|’)s all|that is all|no other questions|goodbye|bye|have a (?:good|great) day)\b/i.test(lastCustomerTurn.text);
    representativeGuidance.nextStep = customerClosed
      ? "Close the call and document the resolved service request."
      : "Ask one optional question about the goal behind the resolved request; follow the customer's lead.";
    representativeGuidance.question = customerClosed ? "" : POST_SERVICE_BRIDGES[scenarioId] ?? "Is there a broader goal behind this request that you would like help thinking through?";
    representativeGuidance.rationale = customerClosed
      ? "The customer closed the conversation after the service answer."
      : "The original request was answered, and the customer has not yet expressed a need for a particular offering.";
    representativeGuidance.evidenceIds = lastCustomerTurn ? [lastCustomerTurn.id] : [];
  }

  const usedIds = new Set([
    ...customerProblem.evidenceIds,
    ...callReason.evidenceIds,
    ...serviceStatus.evidenceIds,
    ...representativeGuidance.evidenceIds,
    ...tags.flatMap((tag) => tag.evidenceIds),
    ...criteria.flatMap((criterion) => criterion.evidenceIds),
    ...opportunity.evidenceIds,
    ...(investingApproach?.evidenceIds ?? []),
    ...relationshipPaths.flatMap((path) => path.evidenceIds),
  ]);

  return {
    customerProblem,
    callReason,
    serviceStatus,
    representativeGuidance,
    tags,
    criteria,
    opportunity,
    investingApproach,
    relationshipPaths,
    evidence: turns.filter((turn) => usedIds.has(turn.id)),
  };
}

function outputText(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const response = value as {
    output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
  };
  return (
    response.output
      ?.flatMap((item) => item.content ?? [])
      .filter((part) => part.type === "output_text")
      .map((part) => part.text ?? "")
      .join("") || null
  );
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Send JSON with scenarioId and turns.");
  }
  if (!body || typeof body !== "object") return badRequest("Invalid analysis request.");
  const input = body as Record<string, unknown>;
  const scenario =
    typeof input.scenarioId === "string"
      ? getScenario(input.scenarioId)
      : undefined;
  if (!scenario) {
    return badRequest("Choose a valid scenarioId.");
  }
  const turns = parseTurns(input.turns);
  if (!turns) {
    return badRequest(
      "Turns must have unique id, customer or representative role, text, and numeric at; maximum 120 turns.",
    );
  }
  if (!turns.length) {
    return Response.json(initialAnalysis(), { headers: { "Cache-Control": "no-store" } });
  }

  const apiKey = await openAIKey();
  if (!apiKey) {
    return Response.json(
      { error: "Live analysis needs OPENAI_API_KEY in the server environment." },
      { status: 503 },
    );
  }

  const pathHints = SCENARIO_PATH_HINTS[scenario.id] ?? [];

  const instructions = [
    "You analyze a financial services practice call. The human user speaks as the client, and a Realtime voice model speaks as the service representative. Customer-role turns are the human client's statements; representative-role turns are the model's actual spoken responses.",
    "Use only the supplied transcript turns as evidence. Do not use unstated scenario facts. A representative's question or suggestion does not establish a customer preference, need, or acceptance.",
    "In customerProblem, explain the caller's concrete immediate problem in one plain sentence. In impact, state the consequence or broader need only if the caller actually voiced it; otherwise return an empty string. Cite supporting customer turns. Make this understandable to a representative who has not read the script.",
    "Select the primary reason for the call from the exact taxonomy entries supplied. If the customer's reason is not yet clear, use Unclassified for category, subcategory, and reason with no evidence IDs.",
    "Distinguish cash treatment from cash-product shopping: if the client asks why a completed transfer is still uninvested, classify the account or transfer status using the closest taxonomy entry. Use Cash Sweeps or Money Market Fund only when the client asks about sweep mechanics, money-market funds, yields, or cash alternatives. Do not raise confidence merely because an entry contains the word cash.",
    "The scenario guide gives a candidate taxonomy label and safety boundaries. It is not evidence. Use the candidate only if the customer actually states a supporting reason; choose a different taxonomy entry if the spoken reason differs.",
    "Mark the service issue resolved when a later customer turn explicitly acknowledges that the original request was answered, such as 'that explains it' or 'that's exactly what I needed'. Cite that acknowledgement in serviceStatus.evidenceIds; citing only the opening complaint or a generic 'yes, please' is insufficient. Do not ask the customer to confirm resolution again after such an acknowledgement. Keep an actually unresolved service need prominent.",
    "Return representativeGuidance as the representative's next live conversation move, refreshed after the latest transcript turn from either side. Read the representative's actual latest response and do not suggest repeating a question, explanation, product, or handoff they have already given. If the representative just asked the client a question, nextStep should be to listen for that answer and question should be empty. Otherwise nextStep is a short action the representative can take; question is one brief, spoken, specific question they could ask next, or empty if the client has ended the call. Rationale explains why this move follows from a customer statement, and evidenceIds cite the relevant customer turn, preferably the latest one when it adds information. While the service request is unresolved, give the specific service action or clarification needed; do not pivot to an offering. Once the customer confirms the service answer, suggest a natural bridge from that topic to a broader goal, without assuming a hidden need. When a supported relationship path emerges, name the path in nextStep and guide the representative to test the remaining need, ask permission to explain it, or pause for a stated constraint. If multiple paths are supported, choose the next question that best distinguishes them. Do not script a product pitch, claim suitability, expose hidden scenario beats, or imply the client requested something they have not said. Avoid generic prompts such as 'Anything else?' or 'Would you like to discuss opportunities?'.",
    "Return 0-8 short tags for distinct customer facts, needs, concerns, intent, or guardrails. Attach exact turn IDs that support each tag.",
    "Return all seven investing criteria by their specified stable IDs. Mark met only for a customer statement that establishes the criterion. Mark not_met only for a customer statement that rules it out. Otherwise mark unknown. For investable_funds, an account balance by itself never suffices: met requires at least $5,000 available for an established long-term investing goal and time horizon. For liquidity_needs, met means these particular funds are not needed soon; not_met means they are needed in the near term.",
    "Current program facts for educational screening: Schwab Intelligent Portfolios has a $5,000 opening minimum; supported account types include individual and joint taxable brokerage accounts and several IRA types, including Traditional, Roth, Rollover, and Inherited. A formal goals, risk, and timeline questionnaire comes before any portfolio proposal. Portfolios include an allocation to cash. Tax-loss harvesting is opt-in only for eligible taxable Intelligent Portfolios accounts with at least $50,000; a balance in another brokerage account does not establish eligibility, and tax benefits are not guaranteed. Do not assume the customer is eligible from the scenario brief or name alone.",
    "The opportunity and seven criteria are specifically about automated investing, not about general relationship depth. Use stage none for calls about planning, banking, lending, education, trusts, giving, business retirement, active trading, service recovery, or a self-directed preference unless the caller separately expresses a wish for automated portfolio management. Use signal for one early automated-investing cue; potential_fit only with multiple positive cues and no strong blocker; ready_to_explore only after goal, time horizon, funds, and preference are sufficiently understood; suppressed if a stated blocker makes the approach inappropriate or the customer declines it.",
    "A request to understand an account balance, cash sweep, money-market option, yield, report, transfer, or fee is a service reason, not by itself an automated-investing signal. In particular, a large cash balance alone must remain stage none until the customer expresses a long-term investing purpose, trouble deciding how to invest, or interest in delegating portfolio management. If the same funds are needed for a near-term home purchase, suppress the investing opportunity and keep the service analysis focused on cash access and settlement.",
    "An investing approach, if warranted, must be educational and generic. Do not recommend enrollment, securities, allocations, returns, or claim suitability. Prefer language such as 'could explore a diversified automated approach' when supported. Use null if too little is known or a blocker suppresses the opportunity.",
    "Evaluate every relationshipPath in the supplied scenario catalog on every turn. Return possible with no evidence when no related need has been voiced; the interface holds all relationship paths until the original service request is completed. Return emerging only after a customer statement reveals a need genuinely related to that path. A service request by itself does not establish a relationship path. Return explore only when the original service request is addressed and the customer's need is clear enough for an educational discussion. Use hold for a material unresolved constraint and ruled_out when the caller explicitly rejects or clearly rules out a path. Every supported state needs the exact customer turn ID. Explain what changed in this call; do not infer facts from the scenario guide. Multiple paths may emerge at different moments; make the path that best coordinates the expressed needs primary. Never claim enrollment or suitability.",
    "For Schwab Intelligent Portfolios, the caller's difficulty selecting or maintaining investments can support an early emerging signal, but it is not a qualified fit. Do not mark explore until the caller establishes an investing goal, time horizon, and explicit preference for delegated portfolio selection or ongoing management. Generic retirement planning, a large balance, cash, a wire, a 529 question, a tax report, or a referral request does not qualify on its own.",
    "The seven shortlisted scripts describe multi-step journeys. For example, a cost-basis report remains service-only until the caller raises concentration, then liquidity, then giving. Surface each path only when the corresponding customer need is heard. A rollover requires process support before investment management. Keep the original reason and service status primary.",
    "The synthetic scenario guide is background for interpretation and guardrails, never evidence that the live customer said or agreed to anything. Analyze the actual transcript and do not assume the customer reached a scripted milestone.",
    "Keep an unresolved original service issue prominent in serviceStatus. After the caller explicitly confirms resolution, update serviceStatus; consider any separately expressed investing need only when the customer actually states it.",
    "Do not infer a hidden investing concern or product interest from the scenario guide or example dialogue. If the customer ends the call without expressing an investing need, leave the opportunity at stage none.",
    "Every evidenceIds entry must be an ID from a supplied turn. Use only customer turn IDs for call reason, tags, criteria, opportunity, and approach. Do not fabricate quotes or sources.",
  ].join("\n");

  try {
    const upstream = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5.6-luna",
        reasoning: { effort: "none" },
        store: false,
        max_output_tokens: 4000,
        instructions,
        input: JSON.stringify({
          taxonomy: TAXONOMY,
          criteria: CRITERIA,
          relationshipPathCatalog: RELATIONSHIP_PATHS.filter((path) => pathHints.includes(path.id)),
          scenarioGuide: {
            taxonomyCandidate: scenario.expectedTaxonomy,
            serviceResolution: scenario.serviceResolution,
            guardrails: scenario.guardrails,
            educationalApproach: scenario.investingApproach,
            sourceCompleteness: scenario.sourceCompleteness,
            pathHints,
          },
          turns,
        }),
        text: {
          format: {
            type: "json_schema",
            name: "call_intelligence",
            strict: true,
            schema: analysisSchema,
          },
        },
      }),
      signal: AbortSignal.timeout(25_000),
    });

    if (!upstream.ok) {
      const hint =
        upstream.status === 401 || upstream.status === 403
          ? "Check the server API key and model access."
          : upstream.status === 429
            ? "Check API usage limits and retry."
            : "Try again shortly.";
      return Response.json(
        { error: `OpenAI could not analyze this call (${upstream.status}). ${hint}` },
        { status: 502 },
      );
    }

    const text = outputText(await upstream.json());
    if (!text) {
      return Response.json(
        { error: "OpenAI returned no analysis. Please retry." },
        { status: 502 },
      );
    }
    const parsed = JSON.parse(text) as ModelAnalysis;
    return Response.json(cleanAnalysis(parsed, turns, scenario.id), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error && error.name === "TimeoutError"
            ? "Call analysis timed out. Please retry."
            : "Could not complete call analysis. Check the connection and retry.",
      },
      { status: 502 },
    );
  }
}
