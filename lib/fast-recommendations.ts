import { RELATIONSHIP_PATHS, type RelationshipPathId } from "./relationship-paths";

/** A deliberately small, synchronous first pass for the live representative cue. */
export type FastTurn = {
  id: string;
  role: "customer" | "representative";
  text: string;
  at: number;
};

export type FastPacket = {
  throughCustomerTurnId: string;
  /** Scenario catalog only. These IDs are not claims that the caller has a need. */
  candidatePathIds: RelationshipPathId[];
  /** Explicit caller constraints, used to hide unsuitable watchlist candidates. */
  blockedPathIds: RelationshipPathId[];
  callReason: {
    category: string;
    subcategory: string;
    reason: string;
    confidence: number;
    evidenceIds: string[];
  } | null;
  serviceState: "unresolved" | "in_progress" | "resolved";
  /** An ordinal 0–100 service indicator, not a probability. */
  serviceProgress: number;
  paths: Array<{
    id: RelationshipPathId;
    name: string;
    family: string;
    description: string;
    sourceUrl: string;
    status: "emerging" | "explore" | "hold";
    /** Heuristic signal strength, not a suitability or eligibility score. */
    signalConfidence: number;
    rationale: string;
    nextStep: string;
    evidenceIds: string[];
  }>;
  guidance: {
    title: string;
    nextStep: string;
    question: string;
    rationale: string;
    evidenceIds: string[];
    pathId?: RelationshipPathId;
  };
  facts: Array<{ id: string; label: string; evidenceIds: string[] }>;
};

type ScenarioConfig = {
  reason: [string, string, string];
  opening: RegExp;
  serviceActivity: RegExp;
  serviceAnswer: RegExp;
  serviceQuestion: string;
  bridgeQuestion: string;
};

const SCENARIOS: Record<string, ScenarioConfig> = {
  "relationship-01": {
    reason: ["Move Money", "ACH", "Periodic Request"],
    opening: /automatic transfer|recurring transfer|monthly transfer|\bACH\b|transfer.{0,45}every month/i,
    serviceActivity: /linked bank|recurring instruction|transfer.{0,45}(?:amount|frequency|day|date|begin|approve|scheduled)/i,
    serviceAnswer: /(?:recurring|monthly|transfer|instruction).{0,120}(?:scheduled|active|confirmed|review|submit|set up)|(?:review|submit|set up).{0,120}(?:recurring|monthly|transfer|instruction)/i,
    serviceQuestion: "What amount, schedule, start date, and linked account should the recurring transfer use?",
    bridgeQuestion: "What is this monthly transfer helping you work toward?",
  },
  "relationship-02": {
    reason: ["Client Inquiries", "Account Balance", "Account Balance"],
    opening: /\b(?:balance|account value|total value|value of my (?:Schwab )?accounts)\b/i,
    serviceActivity: /current value|combined value|recent activity|market.price|withdrawal|difference from last week/i,
    serviceAnswer: /(?:current|combined).{0,35}value|difference.{0,100}(?:market|withdrawal|transaction)|(?:market|withdrawal).{0,100}difference/i,
    serviceQuestion: "Does the account value and recent activity explain the difference you noticed?",
    bridgeQuestion: "Is that account total part of a larger goal you are tracking?",
  },
  "relationship-03": {
    reason: ["Cost Basis", "Cost Basis Reporting", "Cost Basis Report"],
    opening: /cost basis|unrealized gain|gain.{0,12}loss|gains-and-losses report/i,
    serviceActivity: /positions area|cost.basis|unrealized.gain|export option|report/i,
    serviceAnswer: /positions.{0,120}(?:cost.basis|unrealized|export)|(?:cost.basis|unrealized).{0,100}(?:positions|export|report)/i,
    serviceQuestion: "Can you see the complete gains-and-losses view or its export?",
    bridgeQuestion: "What decision prompted you to review those gains and losses?",
  },
  "relationship-04": {
    reason: ["Retirements", "Rollover", "IRA Rollover"],
    opening: /rollover|roll over|old employer.{0,70}401|former plan|move.{0,60}401.{0,40}IRA/i,
    serviceActivity: /former plan|direct.rollover|rollover consultant|rollover specialist|plan rules|distribution/i,
    serviceAnswer: /(?:connect|route|refer).{0,100}rollover (?:consultant|specialist)|(?:approved|current|exact).{0,55}direct.rollover instructions/i,
    serviceQuestion: "Would you like the rollover specialist to review the exact instructions and any former-plan forms?",
    bridgeQuestion: "Once the rollover instructions are clear, what would you like these assets to support?",
  },
  "relationship-05": {
    reason: ["New Accounts", "Opening Accounts", "Create a New Account"],
    opening: /(?:daughter|son|baby|newborn|child|grandchild).{0,100}(?:account|save|contribut)|(?:account|save).{0,100}(?:daughter|son|baby|newborn|child|grandchild)/i,
    serviceActivity: /education|529|custodial|account (?:categories|structures|options)|grandparent/i,
    serviceAnswer: /(?:compare|review|explain).{0,90}(?:529|ESA|custodial|account (?:structures|choices|types))|education.savings (?:conversation|specialist)/i,
    serviceQuestion: "Is this money mainly for education, or should it remain available for other goals?",
    bridgeQuestion: "As you plan for your child, are there other family goals to weigh alongside this account?",
  },
  "relationship-06": {
    reason: ["Retirements", "Small Business Plans", "Plan Setup"],
    opening: /SEP[ -]?IRA|small.business retirement plan|self.employed.{0,65}(?:retirement|plan|IRA)/i,
    serviceActivity: /SEP|SIMPLE|401|employee|plan structure|retirement.plan/i,
    serviceAnswer: /(?:compare|review|route|connect).{0,100}(?:SEP|SIMPLE|401|retirement.plan|small.business retirement)|(?:SEP|SIMPLE|401).{0,100}(?:compare|review|specialist)/i,
    serviceQuestion: "Before completing a SEP application, should we compare plan requirements for your expected employees?",
    bridgeQuestion: "Beyond the retirement plan, what business or personal decisions are you weighing?",
  },
  "relationship-07": {
    reason: ["Account Maintenance", "Beneficiaries", "Update Beneficiary"],
    opening: /beneficiar|estate plan.{0,60}(?:account|match|update)/i,
    serviceActivity: /beneficiar|designation|written instructions|percentages/i,
    serviceAnswer: /beneficiar.{0,100}(?:review|submit|update|names|percentages|secure)|(?:review|submit|update).{0,100}beneficiar/i,
    serviceQuestion: "Are the names and percentages aligned with your attorney’s written instructions?",
    bridgeQuestion: "Is the beneficiary update part of a broader family or estate plan you are reviewing?",
  },
};

const SCENARIO_CANDIDATES: Record<string, RelationshipPathId[]> = {
  "relationship-01": ["schwab_plan", "automated_investing", "fractional_shares"],
  "relationship-02": ["schwab_plan", "financial_consultant", "wealth_advisory"],
  "relationship-03": ["personalized_indexing", "pledged_asset_line", "charitable_giving", "financial_consultant", "wealth_advisory"],
  "relationship-04": ["schwab_plan", "automated_investing", "financial_consultant"],
  "relationship-05": ["college_529", "education_savings_account", "custodial_account", "schwab_plan"],
  "relationship-06": ["small_business_retirement", "organization_account", "cash_options", "financial_consultant", "schwab_plan"],
  "relationship-07": ["trust_services", "wealth_advisory", "charitable_giving", "financial_consultant"],
};

const DISCOVERY_QUESTIONS: Partial<Record<RelationshipPathId, string>> = {
  schwab_plan: "Is there a goal or decision you would like to view in a broader plan?",
  automated_investing: "Would you prefer to choose and maintain investments yourself, or have help managing them?",
  fractional_shares: "Would you like to learn how to choose investments yourself?",
  financial_consultant: "Would help connecting these decisions be useful?",
  wealth_advisory: "Are you looking for ongoing advice across more than one financial goal?",
  personalized_indexing: "Are you trying to limit overlap or concentration in your investments?",
  pledged_asset_line: "Are you comparing ways to meet a cash need without selling investments now?",
  charitable_giving: "Are charitable gifts part of what you are planning?",
  college_529: "Is this money intended primarily for education?",
  education_savings_account: "Would comparing education account rules help with your decision?",
  custodial_account: "Should the money remain available for goals beyond education?",
  small_business_retirement: "Will employees be covered by the retirement plan you are considering?",
  organization_account: "Does the business have assets beyond its near-term operating reserve?",
  cash_options: "How much business cash needs to stay available for payroll and taxes?",
  trust_services: "Would a future professional trustee address a concern for your family?",
};

/** A discovery prompt for a possible path; it does not assert a customer need. */
export function fastDiscoveryQuestion(pathId: RelationshipPathId): string {
  return DISCOVERY_QUESTIONS[pathId] ?? "Is there a broader goal behind this request that you would like to discuss?";
}

type Candidate = FastPacket["paths"][number] & {
  title: string;
  question: string;
  lastEvidenceIndex: number;
};

function uniqueIds(turns: Array<FastTurn | null | undefined>): string[] {
  return [...new Set(turns.filter((turn): turn is FastTurn => !!turn).map((turn) => turn.id))];
}

function explicitBlocks(scenarioId: string, customer: FastTurn[]): RelationshipPathId[] {
  const lastIndex = (pattern: RegExp) => customer.findLastIndex((turn) => pattern.test(turn.text));
  const blocks = new Set<RelationshipPathId>();
  if (scenarioId === "relationship-01" || scenarioId === "relationship-04") {
    const selfDirected = lastIndex(/\b(?:i (?:want|prefer|would rather) to (?:choose|select|manage|rebalance).{0,35}myself|i(?:'|’)m not interested in (?:managed|automated)|i don(?:'|’)t want (?:managed|automated))\b/i);
    const managed = lastIndex(/\b(?:rather have it managed|prefer.{0,25}managed|don(?:'|’)t want to (?:select|rebalance)|manage (?:the )?investments for me)\b/i);
    const nearTerm = lastIndex(/\b(?:need (?:these|the) (?:deposits|contributions|funds|money).{0,35}(?:soon|this year|next year|for expenses)|cannot keep (?:these|the) (?:funds|money) invested|can(?:'|’)t keep (?:these|the) (?:funds|money) invested)\b/i);
    if (selfDirected > managed || nearTerm >= 0) blocks.add("automated_investing");
    if (managed > selfDirected && managed >= 0) blocks.add("fractional_shares");
  }
  if (scenarioId === "relationship-02" || scenarioId === "relationship-03" || scenarioId === "relationship-07") {
    const declinedOngoing = lastIndex(/^\s*i (?:only|just) want (?:the|a) (?:financial )?plan\b|\bi don(?:'|’)t want ongoing advice\b/i);
    const requestedOngoing = lastIndex(/\b(?:want|need|prefer).{0,30}(?:ongoing|long.term|comprehensive).{0,30}(?:advice|advisor|relationship)\b/i);
    if (declinedOngoing > requestedOngoing) blocks.add("wealth_advisory");
  }
  if (scenarioId === "relationship-03") {
    const rejectsBorrowing = lastIndex(/\b(?:i don(?:'|’)t want to borrow|i do not want to borrow|borrowing is off the table|i ruled out borrowing)\b/i);
    const reopensBorrowing = lastIndex(/\b(?:want to compare borrowing|consider borrowing|borrow instead of selling)\b/i);
    if (rejectsBorrowing > reopensBorrowing || lastIndex(/\b(?:only retirement assets|all (?:of )?my assets are in (?:an? )?(?:IRA|retirement account))\b/i) >= 0) {
      blocks.add("pledged_asset_line");
    }
  }
  if (scenarioId === "relationship-05") {
    if (lastIndex(/\b(?:education is not (?:a|the) goal|this is not for education|do not want an education.only account)\b/i) >= 0) {
      blocks.add("college_529");
      blocks.add("education_savings_account");
    }
  }
  if (scenarioId === "relationship-06" && lastIndex(/\b(?:all (?:of )?(?:the|our|my) (?:business )?(?:cash|money) is needed for (?:payroll|taxes|operations)|nothing (?:is )?left beyond operating (?:cash|needs))\b/i) >= 0) {
    blocks.add("organization_account");
  }
  if (scenarioId === "relationship-07" && lastIndex(/\b(?:i don(?:'|’)t want a professional trustee|i do not want a professional trustee|my daughter has agreed to be successor trustee)\b/i) >= 0) {
    blocks.add("trust_services");
  }
  return [...blocks];
}

/** Only customer speech can establish an opportunity. Representative speech can establish service work. */
export function computeFastPacket(scenarioId: string, turns: FastTurn[]): FastPacket {
  const config = SCENARIOS[scenarioId];
  const usable = turns.filter((turn) => turn && typeof turn.id === "string" && typeof turn.text === "string" &&
    (turn.role === "customer" || turn.role === "representative"));
  const customer = usable.filter((turn) => turn.role === "customer");
  const lastCustomer = customer.at(-1);
  const lastCustomerId = lastCustomer?.id ?? "";
  const emptyGuidance = {
    title: "Listen for the call reason",
    nextStep: "Let the caller explain what they need help with.",
    question: "How can I help you today?",
    rationale: "The caller has not yet stated a service request.",
    evidenceIds: [] as string[],
  };
  if (!config || !lastCustomer) {
    return {
      throughCustomerTurnId: lastCustomerId,
      candidatePathIds: [...(SCENARIO_CANDIDATES[scenarioId] ?? [])],
      blockedPathIds: [],
      callReason: null,
      serviceState: "unresolved",
      serviceProgress: 0,
      paths: [],
      guidance: emptyGuidance,
      facts: [],
    };
  }

  const latest = (pattern: RegExp) => [...customer].reverse().find((turn) => pattern.test(turn.text)) ?? null;
  const blockedPathIds = explicitBlocks(scenarioId, customer);
  const indexOf = (turn: FastTurn | null | undefined) => turn ? usable.indexOf(turn) : -1;
  const customerAfter = (index: number, pattern: RegExp) => customer.find((turn) => indexOf(turn) > index && pattern.test(turn.text)) ?? null;
  const representative = usable.filter((turn) => turn.role === "representative");
  // Limit the taxonomy match to the opening. Later discovery words cannot rewrite the call reason.
  const opening = customer.slice(0, 2).find((turn) => config.opening.test(turn.text)) ?? null;
  const callReason = opening ? {
    category: config.reason[0],
    subcategory: config.reason[1],
    reason: config.reason[2],
    confidence: 92,
    evidenceIds: [opening.id],
  } : null;
  const serviceActivity = opening ? representative.find((turn) =>
    indexOf(turn) > indexOf(opening) && config.serviceActivity.test(turn.text)) ?? null : null;
  const serviceAnswer = opening ? representative.find((turn) =>
    indexOf(turn) > indexOf(opening) && config.serviceAnswer.test(turn.text)) ?? null : null;

  let resolved = false;
  let resolvingCustomer: FastTurn | null = null;
  if (serviceAnswer) {
    const answerIndex = indexOf(serviceAnswer);
    switch (scenarioId) {
      case "relationship-01": {
        // The demo has no transaction tools. A clear setup explanation can address
        // the service question without claiming that a transfer was scheduled.
        resolvingCustomer = customerAfter(answerIndex, /\b(?:that helps|that makes sense|got it|i understand|that(?:'|’)s clear|i see|thanks|thank you|i can do that|show me|let(?:'|’)s do that)\b/i);
        resolved = !!resolvingCustomer;
        break;
      }
      case "relationship-02":
        resolvingCustomer = customerAfter(answerIndex, /\b(?:that explains (?:the |it|my )?(?:difference|change)|now i understand (?:the )?(?:difference|change)|that answers my (?:balance|account value) question|that makes sense)\b/i);
        resolved = !!resolvingCustomer;
        break;
      case "relationship-03":
        resolvingCustomer = customerAfter(answerIndex, /\b(?:i see it|i found (?:it|the report)|that's what i needed|that is what i needed|got the report)\b/i);
        resolved = !!resolvingCustomer;
        break;
      case "relationship-04":
        // The script routes exact instructions to a specialist; it does not claim a rollover occurred.
        resolvingCustomer = customerAfter(answerIndex, /\b(?:that(?:'|’)s clear|that helps|got it|once it arrives|after the rollover|instructions (?:are|sound) clear|connect me|let(?:'|’)s do that)\b/i);
        resolved = !!resolvingCustomer;
        break;
      case "relationship-05":
        resolvingCustomer = customerAfter(answerIndex, /\b(?:want to understand the tradeoffs|understand the tradeoffs|let(?:'|’)s compare|arrange the (?:education|account) conversation|that helps|great|that(?:'|’)s what we need)\b/i);
        resolved = !!resolvingCustomer;
        break;
      case "relationship-06":
        resolvingCustomer = customerAfter(answerIndex, /\b(?:want to compare|let(?:'|’)s compare|more useful than simply opening|route me|connect me|that makes sense|thank you)\b/i);
        resolved = !!resolvingCustomer;
        break;
      case "relationship-07":
        // Confirm the update process was understood; no beneficiary change is claimed.
        resolvingCustomer = customerAfter(answerIndex, /\b(?:that helps|that makes sense|got it|i understand|that(?:'|’)s clear|i see|thanks|thank you|that(?:'|’)s correct|i can do that)\b/i);
        resolved = !!resolvingCustomer;
        break;
    }
  }

  const serviceState: FastPacket["serviceState"] = resolved ? "resolved" : serviceActivity ? "in_progress" : "unresolved";
  const serviceProgress = resolved ? 100 : serviceAnswer ? 85 : serviceActivity ? 55 : callReason ? 25 : 0;
  const facts: FastPacket["facts"] = [];
  const addFact = (id: string, label: string, ...evidence: Array<FastTurn | null | undefined>) => {
    const evidenceIds = uniqueIds(evidence);
    if (evidenceIds.length && !facts.some((fact) => fact.id === id)) facts.push({ id, label, evidenceIds });
  };
  if (opening) addFact("original-service-request", config.reason[2], opening);

  const serviceEvidence = uniqueIds([opening, lastCustomer, resolvingCustomer]);
  if (!resolved) {
    let nextStep = "Address the original service request before discussing a relationship path.";
    let question = config.serviceQuestion;
    if (serviceAnswer) {
      nextStep = "Check that the service answer or specialist handoff addresses the caller's request.";
    } else if (serviceActivity) {
      nextStep = "Complete the service details and confirm the outcome or next owner.";
    }
    if (scenarioId === "relationship-01" && /\b(?:automatically invest|ETFs?|what.*invest)\b/i.test(lastCustomer.text)) {
      nextStep = "Clarify how to review and submit the transfer securely, then explain that a cash transfer does not itself select investments.";
      question = "Does the recurring transfer process make sense, including what you would review before submitting it?";
    } else if (scenarioId === "relationship-02" && /\b(?:retire|retirement|401\s?\(?k\)?)\b/i.test(lastCustomer.text)) {
      nextStep = "Finish explaining the account-value difference, then return to the retirement question.";
      question = "Does the account activity explain the lower value you noticed?";
    } else if (scenarioId === "relationship-03" && /\b(?:employer stock|gain|tax|renovation|charit)\b/i.test(lastCustomer.text)) {
      nextStep = "Confirm the caller found the gains-and-losses view before exploring the new decision.";
      question = "Can you see the complete report you called about?";
    } else if (scenarioId === "relationship-04" && /\b(?:automatically invest|what.*buy|on track|rebalance)\b/i.test(lastCustomer.text)) {
      nextStep = "Complete the direct-rollover instruction handoff and answer the factual investing question.";
      question = "Is the path for getting the former plan's direct-rollover instructions clear?";
    } else if (scenarioId === "relationship-05") {
      if (/\b(?:deduction|tax)\b/i.test(lastCustomer.text)) {
        nextStep = "Explain that account tax treatment depends on the family's circumstances and compare the account rules.";
        question = "Would a side-by-side review of the account rules and tax questions help you choose?";
      } else if (/\b(?:grandparent|parents contribute|contribute directly)\b/i.test(lastCustomer.text)) {
        nextStep = "Cover how family contributions work for each account structure before selecting one.";
        question = "Are the grandparents planning one-time gifts, recurring gifts, or both?";
      } else if (/\b(?:own retirement|model both|saving too much for education)\b/i.test(lastCustomer.text)) {
        nextStep = "Keep the parents' retirement goal in view while finishing the child-account comparison.";
        question = "What contribution level would you be comfortable comparing against your retirement savings goal?";
      } else if (/\b(?:not attend college|tradeoffs|flexib|locking)\b/i.test(lastCustomer.text)) {
        nextStep = "Compare education use, other permitted uses, and account control before choosing an account.";
        question = "How much flexibility would you want if your daughter's plans change?";
      }
    } else if (scenarioId === "relationship-06") {
      if (/\b(?:hir|employee|staff|SEP|SIMPLE|401)\b/i.test(lastCustomer.text)) {
        nextStep = "Compare plan structures and employee implications before processing a SEP application.";
        question = "How many employees do you expect over the next year?";
      } else if (/\b(?:cash|payroll|taxes|business bank)\b/i.test(lastCustomer.text)) {
        nextStep = "Record the payroll reserve need and finish the retirement-plan specialist handoff first.";
        question = "Is the plan-comparison handoff clear before we look at business cash needs?";
      } else if (/\b(?:personal retirement|coordinat|personal investments)\b/i.test(lastCustomer.text)) {
        nextStep = "Note the personal planning need while confirming ownership of the business-plan request.";
        question = "Would comparing the employee plan first be the right next step?";
      }
    } else if (scenarioId === "relationship-07" && /\b(?:trustee|daughter|charit|estate)\b/i.test(lastCustomer.text)) {
      nextStep = "Finish explaining how to review and submit the beneficiary update before exploring the separate estate concern.";
      question = "Is the beneficiary update process clear, including how you will verify the names and percentages?";
    }
    return {
      throughCustomerTurnId: lastCustomerId,
      candidatePathIds: [...(SCENARIO_CANDIDATES[scenarioId] ?? [])],
      blockedPathIds,
      callReason,
      serviceState,
      serviceProgress,
      paths: [],
      guidance: {
        title: "Resolve the call reason",
        nextStep,
        question,
        rationale: "The original request has not yet been confirmed as addressed.",
        evidenceIds: serviceEvidence,
      },
      facts,
    };
  }

  const candidates: Candidate[] = [];
  const addPath = (
    id: RelationshipPathId,
    anchor: FastTurn | null,
    support: Array<FastTurn | null>,
    status: Candidate["status"],
    rationale: string,
    nextStep: string,
    question: string,
    factLabel: string,
  ) => {
    if (!anchor) return;
    if (blockedPathIds.includes(id)) return;
    const catalog = RELATIONSHIP_PATHS.find((path) => path.id === id);
    if (!catalog) return;
    const evidenceIds = uniqueIds([anchor, ...support]);
    // Supporting context can be older or newer; the customer's actual path
    // statement determines when this cue became relevant.
    const lastEvidenceIndex = indexOf(anchor);
    candidates.push({
      ...catalog,
      status,
      signalConfidence: status === "explore" ? 86 : status === "hold" ? 58 : 70,
      rationale,
      nextStep,
      evidenceIds,
      title: status === "hold" ? `Clarify ${catalog.name}` : `Explore ${catalog.name}`,
      question,
      lastEvidenceIndex,
    });
    addFact(id, factLabel, anchor, ...support);
  };
  const laterDecline = (anchor: FastTurn | null, pattern: RegExp) => {
    const decline = latest(pattern);
    return !!anchor && !!decline && indexOf(decline) > indexOf(anchor);
  };

  switch (scenarioId) {
    case "relationship-01": {
      const directPlanning = latest(/\b(?:how much.{0,30}(?:save|contribute)|(?:\$?800|monthly|contributions?|saving).{0,65}enough|enough.{0,55}retir|on track|financial plan|model.{0,30}retir)\b/i);
      const planningReply = latest(/\b(?:yes[,. ]+)?i don(?:'|’)t know the answer to either one\b/i);
      const priorPlanningPrompt = planningReply && [...representative].reverse().find((turn) =>
        indexOf(turn) < indexOf(planningReply) && /\b(?:\$?800|monthly|contribution)\b.{0,110}\b(?:retirement|outcome|enough)\b/i.test(turn.text));
      const planning = directPlanning ?? (priorPlanningPrompt ? planningReply : null);
      const retirementGoal = latest(/\b(?:retire|retirement|401\s?\(?k\)?|monthly contributions?)\b/i);
      if (planning && retirementGoal) addPath("schwab_plan", planning, [retirementGoal], "explore",
        "The caller wants to know how regular savings support a retirement goal.",
        "Connect the savings question to a planning conversation; do not imply a projected outcome.",
        "What retirement date and other savings should the plan include?", "Retirement savings question");
      const managed = latest(/\b(?:rather have (?:it|the portfolio|investments) managed|prefer (?:it|them|the portfolio) managed|have (?:a|the) portfolio built and maintained|don(?:'|’)t (?:want to |enjoy )?(?:select|choose|rebalance|make investment decisions)|manage (?:the )?investments for me)\b/i);
      const investingProblem = latest(/\b(?:ETF|allocat|invest.{0,25}deposit|money.{0,30}sits in cash|investment decisions|rebalance)\b/i);
      const horizon = latest(/\b(?:\d+ years?|decades?|long.term|stay invested|retire in)\b/i);
      if (managed && investingProblem && !laterDecline(managed, /\b(?:rather manage (?:it|them) myself|prefer to choose myself|not interested in (?:managed|automated))\b/i)) {
        addPath("automated_investing", managed, [investingProblem, retirementGoal, horizon],
          retirementGoal && horizon ? "explore" : "emerging",
          "The caller described difficulty maintaining investments and a preference for management.",
          "Clarify the goal, time horizon, and preference before an educational automated-investing comparison.",
          "Would you like to compare managing the investments yourself with a managed portfolio?", "Prefers help managing investments");
      }
      const selfDirected = latest(/\b(?:i (?:want|prefer|would rather) to (?:learn|choose|pick|select).{0,35}(?:invest|stock|ETF)|i prefer to manage (?:it|them|investments) myself)\b/i);
      if (selfDirected && !laterDecline(selfDirected, /\b(?:rather have it managed|don(?:'|’)t want to choose|don(?:'|’)t enjoy making investment decisions)\b/i)) {
        addPath("fractional_shares", selfDirected, [], "emerging",
          "The caller explicitly prefers learning and choosing investments personally.",
          "Offer education suited to the caller's self-directed preference.",
          "Would educational tools for choosing investments yourself be useful?", "Prefers self-directed learning");
      }
      break;
    }
    case "relationship-02": {
      const retirement = latest(/\b(?:retire|retirement|on track)\b/i);
      const adequacy = latest(/\b(?:good or bad|enough|on track|retire in|financial plan|single financial plan|complete the plan)\b/i);
      if (retirement && adequacy) addPath("schwab_plan", adequacy, [retirement], "explore",
        "The caller is asking whether the account value supports retirement, which needs more than one balance.",
        "Explore a combined retirement plan using the caller's stated accounts and goals.",
        "Which outside assets, income sources, and expenses should be included?", "Wants a retirement-readiness view");
      const coordinated = latest(/\b(?:who helps me|someone.{0,35}(?:help|walk me)|consultant|want.{0,35}(?:help|coordinat)|several things.{0,35}work together|need.{0,35}work together)\b/i);
      if (coordinated && retirement) addPath("financial_consultant", coordinated, [retirement],
        /\b(?:who helps me|consultant|want.{0,35}(?:help|coordinat))\b/i.test(coordinated.text) ? "explore" : "emerging",
        "The caller wants help connecting retirement information and decisions.",
        "Ask whether the caller wants a person to interpret and coordinate the plan.",
        "Would a consultant help you interpret the plan and connect the decisions?", "Wants help coordinating decisions");
      const ongoing = latest(/\b(?:ongoing|long.term|continuing|comprehensive).{0,45}(?:advice|advisor|relationship|financial help|wealth)|(?:advisor|advice).{0,45}(?:ongoing|long.term|comprehensive)\b/i);
      if (ongoing && !laterDecline(ongoing, /\b(?:only want the plan|manage everything myself|don(?:'|’)t want ongoing advice)\b/i)) {
        addPath("wealth_advisory", ongoing, [coordinated], "emerging",
          "The caller expressed interest in advice extending beyond a one-time plan.",
          "Clarify the desired scope and duration of advice before discussing advisory choices.",
          "Are you looking for ongoing advice across these goals, or a one-time planning review?", "Interested in ongoing advice");
      }
      break;
    }
    case "relationship-03": {
      const concentration = latest(/\b(?:employer stock|concentrat|same company|same industry|overlap)\b/i);
      const taxAware = latest(/\b(?:rest of (?:the|my) portfolio structured|avoid.{0,45}(?:same|overlap|exposure)|not unknowingly buying|exclude my employer|stock exclusion|tax.loss|don(?:'|’)t monitor every holding)\b/i);
      if (concentration && taxAware) addPath("personalized_indexing", taxAware, [concentration], "emerging",
        "The caller wants to manage concentration or overlapping holdings without assuming a sale.",
        "Explore how a specialist could review exposure, exclusions, and tax considerations.",
        "Which holdings or industries are you trying to avoid adding to?", "Wants concentration management");
      const liquidity = latest(/\b(?:need.{0,50}(?:\$[\d,]+|renovation|tax payment)|\$[\d,]+.{0,45}(?:renovation|tax)|raise.{0,25}(?:cash|money))\b/i);
      const saleConcern = latest(/\b(?:sell(?:ing)?.{0,50}(?:gain|tax|stock)|borrow.{0,40}(?:instead|sell)|compare.{0,45}(?:interest|tax))\b/i);
      if (liquidity && saleConcern && !laterDecline(saleConcern, /\b(?:do not want to borrow|don(?:'|’)t want to borrow|ruled out borrowing)\b/i)) {
        addPath("pledged_asset_line", saleConcern, [liquidity], "emerging",
          "The caller has a near-term cash need and wants to compare it with selling appreciated holdings.",
          "Route a borrowing-versus-sale comparison to qualified specialists; discuss costs and collateral risk.",
          "What amount and timing must the liquidity option cover?", "Needs liquidity without assuming a sale");
      }
      const giving = latest(/\b(?:donat|charit|philanthrop|appreciated shares)\b/i);
      const recurringGiving = latest(/\b(?:donat.{0,35}(?:year|annually|regularly|several)|several charit|appreciated shares|donor.advised|ongoing giving)\b/i);
      if (giving && recurringGiving) addPath("charitable_giving", recurringGiving, [giving], "emerging",
        "The caller described recurring charitable gifts and interest in appreciated shares.",
        "Compare direct gifts and organized giving with a charitable specialist and tax advisor.",
        "Are you looking at direct gifts this year, or a longer-term giving approach?", "Recurring charitable giving");
      const coordination = latest(/\b(?:coordinated conversation|don(?:'|’)t want.{0,60}decisions separately|what do you recommend as the first conversation|three separate things to consider|one coordinated discussion)\b/i);
      if (coordination && candidates.length >= 2) addPath("financial_consultant", coordination, [], "explore",
        "The caller wants one conversation across several connected decisions.",
        "Make a Financial Consultant the coordinating next step; keep each specialist review distinct.",
        "Which of the investment, liquidity, and giving decisions is most time-sensitive?", "Requests coordinated decisions");
      const ongoing = latest(/\b(?:ongoing|long.term|continuing|comprehensive).{0,45}(?:advice|advisor|relationship|wealth)\b/i);
      if (ongoing) addPath("wealth_advisory", ongoing, [coordination], "emerging",
        "The caller expressed interest in a continuing advisory relationship.",
        "Clarify the desired breadth of ongoing advice before an advisory discussion.",
        "Would you want ongoing help coordinating these decisions after the immediate needs are handled?", "Interested in continuing advice");
      break;
    }
    case "relationship-04": {
      const planning = latest(/\b(?:on track for retirement|whether i(?:'|’)m on track|how much.{0,30}save|financial plan|plan shows)\b/i);
      const retirement = latest(/\b(?:retire|retirement|401\s?\(?k\)?|403\s?\(?b\)?)\b/i);
      if (planning && retirement) addPath("schwab_plan", planning, [retirement], "explore",
        "The caller is uncertain whether combined retirement savings support the goal.",
        "Explore a plan including the rollover and stated outside retirement accounts.",
        "When do you hope to retire, and which other accounts should be included?", "Needs retirement planning");
      const management = latest(/\b(?:don(?:'|’)t want to (?:select|choose|rebalance)|want.{0,30}(?:managed|management)|prefer.{0,30}(?:managed|rebalance)|manage (?:the|my) IRA for me)\b/i);
      const ira = latest(/\b(?:rollover IRA|the IRA|old 401|former plan|rollover)\b/i);
      const timeline = latest(/\b(?:\d+\s?(?:or \d+ )?years?|retire in|long.term)\b/i);
      if (management && ira && !laterDecline(management, /\b(?:want to choose myself|rather invest it myself|not interested in managed)\b/i)) {
        addPath("automated_investing", management, [ira, retirement, timeline],
          retirement && timeline ? "explore" : "emerging",
          "The caller prefers not to choose and rebalance rollover investments alone.",
          "Explain managed-investing choices educationally after the rollover process is clear.",
          "Would you like to compare a managed IRA approach with choosing investments yourself?", "Prefers managed rollover investing");
      }
      const human = latest(/\b(?:want.{0,35}(?:person|human|advisor|consultant)|who helps.{0,40}(?:plan|retirement)|need.{0,35}(?:advisor|consultant)|someone.{0,35}coordinate)\b/i);
      if (human) addPath("financial_consultant", human, [], "emerging",
        "The caller asked for a person to help coordinate retirement decisions.",
        "Clarify the support they want before a consultant referral.",
        "Would you like a person to help connect the plan and rollover decisions?", "Wants human retirement guidance");
      break;
    }
    case "relationship-05": {
      const education = latest(/\b(?:mostly education|for (?:her|his|their) education|college savings|tuition|education expenses|529)\b/i);
      if (education && !laterDecline(education, /\b(?:not (?:for )?education|education is not the goal)\b/i)) {
        addPath("college_529", education, [], "emerging",
          "The family identified education as an important goal but has not chosen an account.",
          "Compare education-focused choices and their tradeoffs without assuming a 529 is best.",
          "How important is education-specific treatment versus flexibility if plans change?", "Education is a stated goal");
      }
      const esa = latest(/\b(?:education savings account|\bESA\b|compare.{0,25}529|529.{0,45}(?:does not attend college|not attend college|other|alternative))\b/i);
      if (esa) addPath("education_savings_account", esa, [education], "emerging",
        "The family wants to compare education account rules and what happens if plans change.",
        "Have an education specialist compare account uses, contribution rules, and tax questions.",
        "Which account rules matter most if your child uses less for education than expected?", "Wants education-account comparison");
      const flexibility = latest(/\b(?:nervous about locking|flexib|non.education|not.{0,25}only.{0,20}education|first home|starting a business|custodial|other purpose)\b/i);
      if (flexibility) addPath("custodial_account", flexibility, [], "emerging",
        "The family wants to understand uses beyond education and who controls the funds.",
        "Compare flexible gifting with the account-control tradeoffs.",
        "Should the money be available for non-education goals, and who should control it?", "Wants flexibility beyond education");
      const ownRetirement = latest(/\b(?:our own retirement|my retirement|not enough for.{0,20}retirement|model both|saving too much for education)\b/i);
      if (ownRetirement) addPath("schwab_plan", ownRetirement, [education], "explore",
        "The parents want to weigh education contributions against their own retirement goal.",
        "Explore a plan that models both goals before deciding contribution amounts.",
        "What contribution level feels sustainable while protecting your retirement goal?", "Balancing education and retirement");
      break;
    }
    case "relationship-06": {
      const hiring = latest(/\b(?:hir(?:e|ing)|employee|staff|first full.time|more next year)\b/i);
      const planChoice = latest(/\b(?:SEP|SIMPLE|401|retirement.plan|what else should i consider|plan (?:type|choice))\b/i);
      if (hiring && planChoice) addPath("small_business_retirement", hiring, [planChoice], "explore",
        "Expected employees affect the choice of business retirement plan.",
        "Compare plan structures with a small-business retirement specialist before opening one.",
        "How many employees do you expect, and when will they join?", "Hiring affects retirement-plan choice");
      const cash = latest(/\b(?:operating cash|business bank account|\$250,000|business cash|payroll|taxes)\b/i);
      const liquidity = latest(/\b(?:available for payroll|available for taxes|immediately available|near.term|operating cash|don(?:'|’)t need immediately)\b/i);
      if (cash && liquidity) addPath("cash_options", liquidity, [cash], "emerging",
        "The business has cash needs that require ready access for payroll and taxes.",
        "Clarify required reserves and timing before comparing cash choices.",
        "How much must stay immediately available for payroll and taxes?", "Business cash has liquidity needs");
      const separate = latest(/\b(?:business assets.{0,45}separate|separate.{0,45}business|organization account|business.{0,40}investment account|don(?:'|’)t want everything mixed together legally)\b/i);
      const surplus = latest(/\b(?:\$250,000|not (?:needed|need) immediately|longer.term (?:business )?assets|surplus (?:business )?cash)\b/i);
      if (separate && surplus) addPath("organization_account", separate, [surplus], "hold",
        "The caller wants business assets kept separate but has not established how much can be invested beyond operating needs.",
        "Clarify the business reserve before discussing an organization account.",
        "After payroll and tax reserves, is any business money intended for longer-term investing?", "Wants legally separate business assets");
      const personal = latest(/\b(?:neglected my personal retirement|personal retirement|my own retirement|never combined.{0,45}business|personal financial plan)\b/i);
      if (personal) addPath("schwab_plan", personal, [], "explore",
        "The caller wants a personal retirement view that accounts for the business.",
        "Explore a personal plan while keeping business and personal accounts legally separate.",
        "What personal retirement goals should be considered alongside the business?", "Needs personal retirement planning");
      const coordination = latest(/\b(?:decisions coordinated|coordinate.{0,45}(?:business|personal)|business and personal.{0,30}together|both sides.{0,25}coordinate)\b/i);
      if (coordination) addPath("financial_consultant", coordination, [personal], "explore",
        "The caller wants coordination across separate business and personal decisions.",
        "Connect the caller with a consultant to coordinate the relationship without mixing account ownership.",
        "Which business and personal decisions need to be reviewed together first?", "Requests business-personal coordination");
      break;
    }
    case "relationship-07": {
      const burden = latest(/\b(?:daughter.{0,65}(?:uncomfortable|burden|successor trustee)|successor trustee|professional trustee|trust administration|fall on my daughter)\b/i);
      if (burden) addPath("trust_services", burden, [], "explore",
        "The caller is concerned about the future successor trustee role.",
        "Explore professional trust administration with the estate attorney involved.",
        "Is the main concern a future successor trustee or help administering the trust now?", "Concerned about successor trustee burden");
      const charitable = latest(/\b(?:part of the estate.{0,50}charit|continue supporting.{0,30}charit|children.{0,55}choosing the charit|charitable legacy|donor.advised fund)\b/i);
      if (charitable) addPath("charitable_giving", charitable, [], "emerging",
        "The caller wants continuing charitable support with family participation.",
        "Compare ongoing giving choices with charitable, legal, and tax specialists.",
        "Do you picture fixed gifts, or ongoing grant decisions involving your children?", "Wants continuing family giving");
      const coordination = latest(/\b(?:who coordinates it|coordinat.{0,45}(?:trust|charit|estate)|several pieces|more pieces.{0,25}realized)\b/i);
      if (coordination && burden && charitable) addPath("financial_consultant", coordination, [burden, charitable], "explore",
        "The caller wants trust and charitable conversations connected.",
        "Make a consultant the relationship coordinator and keep legal decisions with the attorney.",
        "Which trust and giving questions should the coordinator address first?", "Requests coordinated legacy planning");
      const ongoing = latest(/\b(?:ongoing|long.term|continuing|comprehensive).{0,45}(?:advice|advisor|relationship|wealth)\b/i);
      if (ongoing) addPath("wealth_advisory", ongoing, [coordination], "emerging",
        "The caller requested an ongoing advisory relationship across broader goals.",
        "Clarify the desired scope before discussing advisory choices.",
        "Are you seeking ongoing advice beyond these specific trust and giving questions?", "Interested in ongoing advice");
      break;
    }
  }

  // Recent customer evidence controls the primary cue as new needs appear. Explicit
  // coordination usually becomes the next move once several paths are present.
  candidates.sort((first, second) => second.lastEvidenceIndex - first.lastEvidenceIndex ||
    second.signalConfidence - first.signalConfidence);
  const focused = candidates[0];
  const customerClosed = /\b(?:that(?:'|’)s all|no other questions|goodbye|bye|have a (?:good|great) day)\b/i.test(lastCustomer.text);
  const guidance: FastPacket["guidance"] = customerClosed ? {
    title: "Close the conversation",
    nextStep: "Summarize the service result and any agreed follow-up.",
    question: "",
    rationale: "The caller indicated that the conversation is complete.",
    evidenceIds: [lastCustomer.id],
  } : focused ? {
    title: focused.title,
    nextStep: focused.nextStep,
    question: focused.question,
    rationale: focused.rationale,
    evidenceIds: focused.evidenceIds,
    pathId: focused.id,
  } : {
    title: "Ask about the goal",
    nextStep: "Ask one optional question related to the resolved service request.",
    question: config.bridgeQuestion,
    rationale: "The original request was addressed, and the caller has not established a specific relationship need.",
    evidenceIds: [lastCustomer.id],
  };

  return {
    throughCustomerTurnId: lastCustomerId,
    candidatePathIds: [...(SCENARIO_CANDIDATES[scenarioId] ?? [])],
    blockedPathIds,
    callReason,
    serviceState,
    serviceProgress,
    paths: candidates.map((path) => ({
      id: path.id,
      name: path.name,
      family: path.family,
      description: path.description,
      sourceUrl: path.sourceUrl,
      status: path.status,
      signalConfidence: path.signalConfidence,
      rationale: path.rationale,
      nextStep: path.nextStep,
      evidenceIds: path.evidenceIds,
    })),
    guidance,
    facts: facts.slice(0, 8),
  };
}
