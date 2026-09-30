/** Classify upstream failures without displaying arbitrary response bodies or credentials. */
export function openAIConnectionError(status: number, body: string): string {
  let code = "";
  let type = "";
  let message = "";
  try {
    const parsed = JSON.parse(body);
    code = typeof parsed?.error?.code === "string" ? parsed.error.code : "";
    type = typeof parsed?.error?.type === "string" ? parsed.error.type : "";
    message = typeof parsed?.error?.message === "string" ? parsed.error.message : "";
  } catch { /* Non-JSON errors still get a safe status-based explanation. */ }
  const detail = `${code} ${type} ${message}`.toLowerCase();
  if (/spend_limit|usage_limit|monthly.*limit/.test(detail)) return "OpenAI API spending or usage limit reached. Review the API organization/project limits before starting another call.";
  if (/insufficient_quota|credit|balance|current quota|billing quota/.test(detail)) return "OpenAI API credits or quota are exhausted. Check API billing and the project budget, then start a new call. Retrying alone will not restore access.";
  if (status === 429 && /rate_limit|slow_down|requests per|tokens per/.test(detail)) return "OpenAI temporarily rate-limited the live call. Wait briefly before starting one new call; check Realtime rate limits if it continues.";
  if (status === 429) return "OpenAI rejected the live call (429). This can mean exhausted API credits, a spending limit, or temporary rate limiting. Check API billing and limits before retrying.";
  if (status === 401 || status === 403) return "OpenAI could not authorize the live call. Check the server API key and Realtime model/project access.";
  return `OpenAI could not connect the live representative (${status}). Try again shortly.`;
}
