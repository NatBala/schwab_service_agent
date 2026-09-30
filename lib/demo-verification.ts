type VerificationTurn = { role: string; text: string };
/** Synthetic accounts only. Explicit consent completes the quick demo step;
 * ordinary off-channel verification still requires a completion confirmation. */
export function demoVerificationComplete(turns: VerificationTurn[]): boolean {
  let requested = false;
  let consented = false;
  let quickDemoRequested = false;
  for (const turn of turns) {
    if (turn.role === "representative") {
      if (consented && /(?:^|[.!]\s+)(?:thank you[,!]\s*)?(?:(?:demo|your|the)\s+)?verification (?:is |has been )?complete(?:d)?(?:[.!]|$)/i.test(turn.text)) return true;
      if (/verif(?:y|ication)|authenticat/i.test(turn.text) && /\?|proceed|agree|permission/i.test(turn.text)) {
        requested = true;
        // An actual request, not a quoted promise about a future confirmation.
        quickDemoRequested = /(?:may|can|could) (?:i|we) (?:complete|do|perform|run) (?:a |the )?(?:quick |brief )?demo verification\?/i.test(turn.text);
      }
    } else if (requested && turn.role === "customer") {
      const declined = /\b(?:no|not|don't|do not|decline|won't)\b/i.test(turn.text);
      consented = !declined && /^(?:yes|sure|okay|ok|please|go ahead|i agree)|\b(?:proceed|verify me|agree to verification)\b/i.test(turn.text.trim());
      if (quickDemoRequested && consented) return true;
      requested = false;
      quickDemoRequested = false;
    }
  }
  return false;
}
