/** Coach-first turns: server VAD commits the client audio, then the app requests an
 * LLM cue and asks Jordan to reply with that cue as a private directive. */
export const LIVE_TURN_DETECTION = {
  type: "server_vad",
  threshold: 0.65,
  prefix_padding_ms: 300,
  silence_duration_ms: 650,
  create_response: false,
  interrupt_response: true,
} as const;

export function spokenReplyRequest() {
  return { type: "response.create", response: { output_modalities: ["audio"] } };
}

/** ASR may arrive before or after the generated representative transcript. */
export function canRunBackgroundCoaching(generating: boolean, clientSpeaking: boolean, turns: Array<{ role: string }>) {
  return !generating && !clientSpeaking && turns.at(-1)?.role === "representative" && turns.some(turn => turn.role === "customer");
}
