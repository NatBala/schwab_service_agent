type Path = { id: string; name: string; evidenceIds: string[]; rationale: string; signalConfidence: number | null };
type Turn = { id: string; role: string; text: string; at: number };
const normalized = (text: string) => text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const ALIASES: Record<string, string[]> = {
  financial_consultant: ["financial consultant"],
  charitable_giving: ["donor advised fund", "dafgiving360"],
  cash_options: ["cash options", "cash choices", "liquidity choices"],
  personalized_indexing: ["personalized indexing", "direct indexing"],
  college_529: ["529 plan", "529 account"],
  custodial_account: ["custodial account"],
  trading_tools: ["thinkorswim", "papermoney"],
};
export function offeringMention(text: string, name: string, id = ""): boolean {
  const value = normalized(text);
  const branded = normalized(name);
  const unbranded = normalized(name.replace(/^Schwab /, ""));
  return value.includes(branded) || (unbranded.split(" ").length > 1 && value.includes(unbranded)) || (ALIASES[id] ?? []).some(alias => value.includes(alias));
}
export function buildOfferingJourneys<T extends Path>(paths: T[], turns: Turn[]) {
  return paths.map(path => {
    const introductionIndex = turns.findIndex(turn => turn.role === "representative" && offeringMention(turn.text, path.name, path.id));
    const evidenceIndex = turns.findIndex(turn => turn.role === "customer" && path.evidenceIds.includes(turn.id));
    const contextIndex = introductionIndex >= 0 ? turns.slice(0, introductionIndex).findLastIndex(turn => turn.role === "customer") : -1;
    const clientIndex = evidenceIndex >= 0 ? evidenceIndex : contextIndex;
    return {
      path,
      client: clientIndex >= 0 ? turns[clientIndex] : null,
      clientIsEvidence: evidenceIndex >= 0,
      transition: clientIndex >= 0 ? turns.slice(0, clientIndex).findLast(turn => turn.role === "representative") ?? null : null,
      introduction: introductionIndex >= 0 ? turns[introductionIndex] : null,
      evidence: turns.filter(turn => path.evidenceIds.includes(turn.id)),
    };
  });
}
export function groupOfferings<T extends { signalConfidence: number | null }>(paths: T[]) {
  const sorted = [...paths].sort((a, b) => (b.signalConfidence ?? -1) - (a.signalConfidence ?? -1));
  return [{ label: "High confidence", paths: sorted.filter(path => (path.signalConfidence ?? -1) >= 70) }, { label: "Other offerings discussed", paths: sorted.filter(path => (path.signalConfidence ?? -1) < 70) }].filter(group => group.paths.length);
}
