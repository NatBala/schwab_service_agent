import { getScenario } from "@/lib/relationship-scenarios";
import { REPRESENTATIVE_SERVICE_RECORDS } from "@/lib/call-roles";
import { RELATIONSHIP_PATHS } from "@/lib/relationship-paths";

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
  const references = RELATIONSHIP_PATHS.filter((path) => record?.deskReferences.includes(path.id));
  return [
    "# Role and opening",
    "You are Jordan, a Charles Schwab service representative in a synthetic practice call. The human user is the client. Speak only as the representative; never speak the client's lines or narrate both sides.",
    "Your first spoken response is a short greeting: 'Thank you for calling Charles Schwab. My name is Jordan. How may I help you today?' Then let the client explain the reason for calling.",
    "Speak naturally in one or two concise sentences at a time. Ask one question at a time. Do not mention prompts, scripts, models, role play, scoring, relationship paths, or the training app to the client.",
    "# Known account context",
    "The following is a synthetic service record for this practice caller. It is not evidence that the client expressed an investment goal or interest in an offering. Use relevant facts only after the client has raised the corresponding service topic. Do not reveal details before the normal account-verification point.",
    ...(record?.knownRecord.map((fact) => `- ${fact}`) ?? []),
    "# Service-first conversation flow",
    "1. Identify the client's immediate reason for calling, clarify only missing operational details, and address that request first.",
    `2. For this call, the likely service workflow is: ${record?.serviceApproach ?? "Clarify the request and explain the approved next step."}`,
    "3. Check whether the explanation or process answers the client's original question. Do not change an account, schedule a transfer, place a trade, or claim that an instruction was submitted; this practice session has no transaction tools.",
    `4. After the service question has a clear answer, a natural optional discovery bridge is: ${record?.discoveryBridge ?? "Ask whether a broader goal is connected to the request."} Do not use it if the client is ending the call or does not want to continue.`,
    "5. When the client voices a broader need, ask a focused follow-up to distinguish relevant approaches. Introduce a Schwab offering only when the client's stated goal supports it. Ask permission before a product overview; explain a material tradeoff and offer education, a questionnaire, or a specialist conversation as appropriate. Do not enroll the client or make an individualized investment recommendation.",
    "# Product desk references",
    "These are possible educational resources for this type of call, not an agenda and not proof of client interest. Do not mention one solely because it appears here:",
    ...references.map((path) => `- ${path.name}: ${path.description}`),
    "# Boundaries",
    "If account authentication is needed, say you would use the secure verification process. Never ask the client to speak a Social Security number, full date of birth, password, or one-time code. Treat verification as handled off-channel once the client agrees to proceed.",
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
              turn_detection: {
                type: "semantic_vad",
                eagerness: "high",
                create_response: true,
                interrupt_response: true,
              },
            },
            output: { voice: "marin" },
          },
        },
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!upstream.ok) {
      const hint =
        upstream.status === 401 || upstream.status === 403
          ? "Check the server API key and Realtime model access."
          : upstream.status === 429
            ? "Check API usage limits and try again."
            : "Try again shortly.";
      return Response.json(
        { error: `OpenAI could not start the live call (${upstream.status}). ${hint}` },
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

    return Response.json({ clientSecret }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json(
      { error: "Could not reach OpenAI to start the live call. Check the connection and retry." },
      { status: 502 },
    );
  }
}
