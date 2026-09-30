import { RELATIONSHIP_PATHS } from "./relationship-paths";

export const CRITERIA = [
  { id: "investing_goal", label: "Investing goal" },
  { id: "investable_funds", label: "At least $5,000 to invest" },
  { id: "time_horizon", label: "Time horizon" },
  { id: "eligible_account", label: "Potentially eligible account type" },
  { id: "hands_off_preference", label: "Interest in a managed approach" },
  { id: "risk_comfort", label: "Risk comfort" },
  { id: "liquidity_needs", label: "No near-term need for these funds" },
] as const;

const evidenceIdsSchema = { type: "array", items: { type: "string" } };
export const analysisSchema = {
  type: "object",
  properties: {
    customerProblem: {
      type: "object",
      properties: {
        immediate: { type: "string" },
        impact: { type: "string" },
        evidenceIds: evidenceIdsSchema,
      },
      required: ["immediate", "impact", "evidenceIds"],
      additionalProperties: false,
    },
    callReason: {
      type: "object",
      properties: {
        category: { type: "string" },
        subcategory: { type: "string" },
        reason: { type: "string" },
        confidence: { type: "string", enum: ["low", "medium", "high"] },
        evidenceIds: evidenceIdsSchema,
      },
      required: ["category", "subcategory", "reason", "confidence", "evidenceIds"],
      additionalProperties: false,
    },
    serviceStatus: {
      type: "object",
      properties: {
        state: { type: "string", enum: ["unresolved", "in_progress", "resolved"] },
        summary: { type: "string" },
        evidenceIds: evidenceIdsSchema,
      },
      required: ["state", "summary", "evidenceIds"],
      additionalProperties: false,
    },
    representativeGuidance: {
      type: "object",
      properties: {
        nextStep: { type: "string" },
        question: { type: "string" },
        rationale: { type: "string" },
        evidenceIds: evidenceIdsSchema,
      },
      required: ["nextStep", "question", "rationale", "evidenceIds"],
      additionalProperties: false,
    },
    tags: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          label: { type: "string" },
          kind: {
            type: "string",
            enum: ["need", "fact", "concern", "intent", "guardrail"],
          },
          evidenceIds: evidenceIdsSchema,
        },
        required: ["id", "label", "kind", "evidenceIds"],
        additionalProperties: false,
      },
    },
    criteria: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string", enum: CRITERIA.map((criterion) => criterion.id) },
          label: { type: "string" },
          status: { type: "string", enum: ["met", "unknown", "not_met"] },
          rationale: { type: "string" },
          evidenceIds: evidenceIdsSchema,
        },
        required: ["id", "label", "status", "rationale", "evidenceIds"],
        additionalProperties: false,
      },
    },
    opportunity: {
      type: "object",
      properties: {
        stage: {
          type: "string",
          enum: ["none", "signal", "potential_fit", "ready_to_explore", "suppressed"],
        },
        title: { type: "string" },
        rationale: { type: "string" },
        evidenceIds: evidenceIdsSchema,
        blockers: { type: "array", items: { type: "string" } },
      },
      required: ["stage", "title", "rationale", "evidenceIds", "blockers"],
      additionalProperties: false,
    },
    investingApproach: {
      anyOf: [
        {
          type: "object",
          properties: {
            label: { type: "string" },
            description: { type: "string" },
            evidenceIds: evidenceIdsSchema,
          },
          required: ["label", "description", "evidenceIds"],
          additionalProperties: false,
        },
        { type: "null" },
      ],
    },
    relationshipPaths: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string", enum: RELATIONSHIP_PATHS.map((path) => path.id) },
          status: { type: "string", enum: ["possible", "emerging", "explore", "hold", "ruled_out"] },
          rationale: { type: "string" },
          nextStep: { type: "string" },
          evidenceIds: evidenceIdsSchema,
        },
        required: ["id", "status", "rationale", "nextStep", "evidenceIds"],
        additionalProperties: false,
      },
    },
  },
  required: [
    "customerProblem",
    "callReason",
    "serviceStatus",
    "representativeGuidance",
    "tags",
    "criteria",
    "opportunity",
    "investingApproach",
    "relationshipPaths",
  ],
  additionalProperties: false,
} as const;

