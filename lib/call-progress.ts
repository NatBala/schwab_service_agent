const STAGES = ["greeting", "servicing", "discovery", "recommendation", "closing"] as const;
type Stage = typeof STAGES[number];
export function advanceCallStage(current: Stage | null, next: Stage | null): Stage | null {
  if (!next) return current;
  return current && STAGES.indexOf(current) > STAGES.indexOf(next) ? current : next;
}
/** Retain discovered cards in discovery order while updating their latest evidence. */
export function retainOfferings<T extends { id: string }>(previous: T[], discovered: T[], updates: T[]): T[] {
  const cards = new Map(previous.map(card => [card.id, card]));
  for (const card of discovered) cards.set(card.id, card);
  for (const card of updates) if (cards.has(card.id)) cards.set(card.id, card);
  return [...cards.values()];
}
