/** Replay the seven supplied calls through the live analyzer. Run with the app open locally. */
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../lib/relationship-scenarios.ts", import.meta.url), "utf8");
const match = source.match(/const briefs = (\[[\s\S]*?\]) as const;/);
if (!match) throw new Error("Could not read the generated scenario library.");
const scenarios = JSON.parse(match[1]);
const expected = {
  "relationship-01": ["schwab_plan", "automated_investing"],
  "relationship-02": ["schwab_plan", "financial_consultant", "wealth_advisory"],
  "relationship-03": ["personalized_indexing", "pledged_asset_line", "charitable_giving", "financial_consultant", "wealth_advisory"],
  "relationship-04": ["schwab_plan", "automated_investing", "financial_consultant"],
  "relationship-05": ["college_529", "education_savings_account", "custodial_account", "schwab_plan"],
  "relationship-06": ["small_business_retirement", "organization_account", "cash_options", "financial_consultant", "schwab_plan"],
  "relationship-07": ["trust_services", "charitable_giving", "financial_consultant", "wealth_advisory"],
};

const origin = process.argv[2] ?? "http://localhost:5173";
const onlyScenario = process.argv[3];
let failed = false;
for (const scenario of scenarios) {
  if (onlyScenario && scenario.id !== onlyScenario) continue;
  const turns = scenario.script.map((line, index) => ({
    id: `turn-${index + 1}`,
    role: line.speaker,
    text: line.text,
    at: index * 12,
  }));
  const response = await fetch(`${origin}/api/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scenarioId: scenario.id, turns }),
    signal: AbortSignal.timeout(60_000),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(`${scenario.id}: ${result.error ?? response.status}`);
  const actual = new Set(result.relationshipPaths.filter((path) => path.status === "emerging" || path.status === "explore" || path.status === "hold").map((path) => path.id));
  const missing = expected[scenario.id].filter((id) => !actual.has(id));
  console.log(`${scenario.id} ${scenario.callerName}: ${[...actual].join(", ")}`);
  if (result.callReason.category === "Unclassified" || scenario.id === "relationship-01" && result.serviceStatus.state !== "resolved") {
    console.error(`  Relationship-path display gate not met: ${result.callReason.category} / ${result.serviceStatus.state}`);
    failed = true;
  }
  if (missing.length) {
    console.error(`  Missing: ${missing.join(", ")}`);
    failed = true;
  }
  const invalidConfidence = result.relationshipPaths.filter((path) => path.status !== "ruled_out" && (typeof path.signalConfidence !== "number" || path.signalConfidence < 0 || path.signalConfidence > 100));
  if (invalidConfidence.length) {
    console.error(`  Invalid signal confidence: ${invalidConfidence.map((path) => path.id).join(", ")}`);
    failed = true;
  }
  if (scenario.id === "relationship-01" && !result.criteria.some((criterion) => criterion.status === "met" && criterion.evidenceIds.length)) {
    console.error("  Automated investing criteria did not capture customer evidence.");
    failed = true;
  }
}
if (failed) process.exitCode = 1;
