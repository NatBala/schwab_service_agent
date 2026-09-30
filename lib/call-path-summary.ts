type SummaryPath = { id: string; name: string; status: string; assessed?: boolean; evidenceIds: string[] };
type SummaryTurn = { id: string; role: string; text: string };
const normalized = (text: string) => text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
/** The live shortlist is capped at three; the wrap-up preserves every assessed
 * path with evidence, plus offerings actually named in the conversation. */
export function callPathSummary<T extends SummaryPath>(paths: T[], turns: SummaryTurn[]): T[] {
  const ids = new Set(turns.map(turn => turn.id));
  return paths.filter(path => path.id !== "service_recovery" && (
    (path.assessed && path.evidenceIds.some(id => ids.has(id))) ||
    turns.some(turn => {
      const text = normalized(turn.text);
      const name = normalized(path.name);
      const unbranded = normalized(path.name.replace(/^Schwab /, ""));
      return text.includes(name) || (unbranded.split(" ").length > 1 && text.includes(unbranded));
    })
  ));
}
