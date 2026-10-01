import { offeringMention } from "./offering-journey";
type SummaryPath = { id: string; name: string; status: string; assessed?: boolean; evidenceIds: string[] };
type SummaryTurn = { id: string; role: string; text: string };
/** The wrap-up preserves every assessed
 * path with evidence, plus offerings actually named in the conversation. */
export function callPathSummary<T extends SummaryPath>(paths: T[], turns: SummaryTurn[]): T[] {
  const ids = new Set(turns.map(turn => turn.id));
  return paths.filter(path => path.id !== "service_recovery" && (
    (path.assessed && path.evidenceIds.some(id => ids.has(id))) ||
    turns.some(turn => offeringMention(turn.text, path.name, path.id))
  ));
}
