import { CUSTOMER_PROFILES } from "@/lib/customer-profiles";
import { CLIENT_ROLE_BRIEFS, REPRESENTATIVE_SERVICE_RECORDS } from "@/lib/call-roles";
import { crossSellRequestBody, parseCrossSellPlan } from "@/lib/cross-sell";
import { openAIConnectionError } from "@/lib/openai-errors";

export const dynamic = "force-dynamic";

async function openAIKey(): Promise<string | undefined> {
  if (process.env.OPENAI_API_KEY?.trim()) return process.env.OPENAI_API_KEY.trim();
  try {
    const { env } = await import("cloudflare:workers");
    return (env as Cloudflare.Env & { OPENAI_API_KEY?: string }).OPENAI_API_KEY?.trim();
  } catch {
    return undefined;
  }
}

function outputText(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const response = value as { output?: Array<{ content?: Array<{ type?: string; text?: string }> }> };
  return response.output?.flatMap((item) => item.content ?? []).filter((part) => part.type === "output_text").map((part) => part.text ?? "").join("") || null;
}

const stringList = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").slice(0, 30) : [];

/** Generate a fresh synthetic account enrichment and cross-sell plan for one call. */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Send JSON with a scenarioId." }, { status: 400 });
  }
  const scenarioId = typeof body?.scenarioId === "string" ? body.scenarioId : "";
  const profile = CUSTOMER_PROFILES[scenarioId];
  if (!profile) return Response.json({ error: "Unknown scenarioId." }, { status: 404 });

  const apiKey = await openAIKey();
  if (!apiKey) return Response.json({ error: "The cross-sell plan needs OPENAI_API_KEY in the server environment." }, { status: 503 });

  const input = {
    scenarioId,
    profile,
    clientBrief: CLIENT_ROLE_BRIEFS[scenarioId] ?? null,
    serviceRecord: REPRESENTATIVE_SERVICE_RECORDS[scenarioId] ?? null,
    recentOfferingIds: stringList(body.recentOfferingIds),
    completedOfferingIds: stringList(body.completedOfferingIds),
    variationSeed: Math.floor(Math.random() * 1_000_000),
  };

  try {
    const upstream = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(crossSellRequestBody(input)),
      signal: AbortSignal.timeout(30_000),
    });
    if (!upstream.ok) {
      return Response.json({ error: openAIConnectionError(upstream.status, await upstream.text()) }, { status: 502 });
    }
    const text = outputText(await upstream.json());
    if (!text) return Response.json({ error: "OpenAI returned no cross-sell plan. Try again." }, { status: 502 });
    const plan = parseCrossSellPlan(JSON.parse(text), input, crypto.randomUUID());
    return Response.json(plan, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "TimeoutError";
    return Response.json({ error: timedOut ? "The cross-sell plan timed out. Try again." : "Could not build a valid cross-sell plan. Try again." }, { status: 502 });
  }
}
