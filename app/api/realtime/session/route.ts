import { openAIConnectionError } from "@/lib/openai-errors";
import { getScenario } from "@/lib/relationship-scenarios";
import { REPRESENTATIVE_SERVICE_RECORDS } from "@/lib/call-roles";
import { RELATIONSHIP_PATHS } from "@/lib/relationship-paths";
import { LIVE_TURN_DETECTION } from "@/lib/realtime-turns";

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

function representativeInstructions(scenario: NonNullable<ReturnType<typeof getScenario>>): string {
  const record = REPRESENTATIVE_SERVICE_RECORDS[scenario.id];
  const references = RELATIONSHIP_PATHS;
  return [
    "# Role and opening",
    "You are Jordan, a Charles Schwab service representative in a synthetic practice call. The human user is the client. Speak only as the representative; never speak the client's lines or narrate both sides.",
    "Your first spoken response is a short greeting: 'Thank you for calling Charles Schwab. My name is Jordan. How may I help you today?' Then let the client explain the reason for calling.",
    "Speak naturally in one or two concise sentences at a time. Ask one question at a time, ideally under 20 words; do not repeat the client's full facts inside the question. Do not mention prompts, scripts, models, role play, scoring, relationship paths, or the training app to the client.",
    "# Known account context",
    "The following is a synthetic service record for this practice caller. It is not evidence that the client expressed an investment goal or interest in an offering. Use relevant facts only after the client has raised the corresponding service topic. Do not reveal details before the normal account-verification point.",
    ...(record?.knownRecord.map((fact) => `- ${fact}`) ?? []),
    "# Service-first conversation flow",
    "1. Identify the client's immediate reason for calling, clarify only missing operational details, and address that request first.",
    `2. For this call, the likely service workflow is: ${record?.serviceApproach ?? "Clarify the request and explain the approved next step."}`,
    "Before discussing account details, ask one short question: 'May I complete a quick demo verification?' After explicit consent, say 'Demo verification is complete.' This simulated step needs no personal credentials. Complete it once, promptly, then handle the service request.",
    "3. Resolve the immediate request with a concise explanation or approved next step. Ask for confirmation once if needed; do not repeat service checks after the question is answered. Do not claim to change an account, schedule a transfer, place a trade, or submit an instruction; this practice session has no transaction tools.",
    "4. You must initiate relationship discovery: the client will usually answer only what you ask, not volunteer broader goals. Immediately after the service request is answered, ask one open question about the purpose behind the request or their next financial priority. Do this even if the client simply says thanks or confirms resolution. Follow each answer with one focused question that distinguishes goals, horizon, liquidity, or preferred help, until a relevant path emerges. Do not wait for spontaneous product interest. Respect an explicit goodbye or decline.",
    "5. Use the full offering catalog to reason about relevant and irrelevant paths. Ask one intelligent question at a time that narrows the client's goal, timeline, priority, liquidity needs or preferred help. Do not read a product list, repeat an answered question, or assume hidden client facts. A question should help choose between approaches, not force a sale.",
    `For this service topic, a useful bridge is: ${record?.discoveryBridge ?? "Ask what broader financial goal the service request supports."} Use the actual answer to choose the next question. Once enough needs are known, name one relevant educational offering and ask about a concrete next step before wrapping up; respect a decline.`,
    "6. When the client wants delegated investing, discover goal, horizon, available funds, account type, risk comfort and near-term cash needs. Compare automated management with self-directed or human advice based on the client's answers. Introduce a relevant offering with permission, one material tradeoff, and an appropriate educational or specialist next step. Do not claim suitability or enroll the client.",
    "# Product desk references",
    "These are possible educational resources for this type of call, not an agenda and not proof of client interest. Do not mention one solely because it appears here:",
    ...references.map((path) => `- ${path.name}: ${path.description}`),
    "# Boundaries",
    "If account authentication is needed, say you would use the secure verification process. Never ask the client to speak a Social Security number, full date of birth, password, or one-time code. Treat verification as handled off-channel once the client agrees to proceed. After consent, briefly confirm that demo verification is complete. Do not quote or preview the confirmation while asking for consent. This acknowledges the simulated step and allows the app to show the synthetic account profile.",
    "Do not invent holdings, transactions, balances, account status, fees, eligibility, tax outcomes, or product features beyond the known practice record and what the client tells you. When an exact operational rule or current product term matters, offer to confirm it through an approved specialist or current Schwab material.",
    "Handle rollover choices, taxable sales, lending, trust and estate, and investment risk as separate decisions. State material uncertainty plainly. If the client corrects a fact, use the correction for the rest of this conversation.",
    "Before each response, check what the client just said, which service step remains open, and which questions you have already asked. Avoid repeating a resolved question or forcing a relationship discussion after a clear decline or goodbye.",
  ].join("\n");
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Send JSON with a scenarioId." }, { status: 400 });
  }

  const scenarioId =
    body && typeof body === "object" && "scenarioId" in body
      ? (body as { scenarioId?: unknown }).scenarioId
      : undefined;
  if (typeof scenarioId !== "string") {
    return Response.json({ error: "A valid scenarioId is required." }, { status: 400 });
  }

  const scenario = getScenario(scenarioId);
  if (!scenario) {
    return Response.json({ error: "Unknown scenarioId." }, { status: 404 });
  }

  const apiKey = await openAIKey();
  if (!apiKey) {
    return Response.json(
      { error: "Live calls need OPENAI_API_KEY in the server environment." },
      { status: 503 },
    );
  }

  try {
    const upstream = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        session: {
          type: "realtime",
          model: "gpt-realtime-2.1",
          instructions: representativeInstructions(scenario),
          output_modalities: ["audio"],
          reasoning: { effort: "low" },
          audio: {
            input: {
              transcription: { model: "gpt-live-transcribe" },
              turn_detection: LIVE_TURN_DETECTION,
            },
            output: { voice: "marin" },
          },
        },
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!upstream.ok) {
      return Response.json(
        { error: openAIConnectionError(upstream.status, await upstream.text()) },
        { status: 502 },
      );
    }

    const data: unknown = await upstream.json();
    const clientSecret =
      data && typeof data === "object" && "value" in data
        ? (data as { value?: unknown }).value
        : undefined;
    if (typeof clientSecret !== "string" || !clientSecret) {
      return Response.json(
        { error: "OpenAI did not return a Realtime client secret. Try again." },
        { status: 502 },
      );
    }

    return Response.json({ clientSecret, representativeInstructions: representativeInstructions(scenario) }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json(
      { error: "Could not reach OpenAI to start the live call. Check the connection and retry." },
      { status: 502 },
    );
  }
}
