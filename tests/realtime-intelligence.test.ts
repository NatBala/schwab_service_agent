import assert from "node:assert/strict";
import { test } from "node:test";
import { coachingRequest, parseRealtimeInsights, parseStreamedCue } from "../lib/realtime-intelligence";
import { CRITERIA } from "../lib/analysis-schema";
import { RELATIONSHIP_PATHS } from "../lib/relationship-paths";

const turns = [
  { id: "client", role: "customer" as const, text: "I need the report and want $20,000 invested for retirement in 15 years with automatic management.", at: 1 },
  { id: "rep", role: "representative" as const, text: "The report is under Statements. What investment risk are you comfortable with?", at: 2 },
];
function snapshot() {
  return {
    customerProblem: { immediate: "Find report", impact: "", evidenceIds: ["client"] },
    callReason: { category: "Cost Basis", subcategory: "Cost Basis Reporting", reason: "Cost Basis Report", confidence: "high", evidenceIds: ["client"] },
    serviceStatus: { state: "resolved", summary: "Explained report access", evidenceIds: ["rep"] },
    representativeGuidance: { nextStep: "Listen for risk tolerance", question: "What investment risk are you comfortable with?", rationale: "Goal, funds and delegation established", evidenceIds: ["rep", "client"] },
    tags: [], criteria: CRITERIA.filter(c => ["investing_goal", "investable_funds", "time_horizon", "hands_off_preference"].includes(c.id)).map(c => ({ ...c, status: "met", rationale: "Client stated it", evidenceIds: ["client"] })),
    opportunity: { stage: "potential_fit", title: "Automated investing", rationale: "Client wants delegation", evidenceIds: ["client"], blockers: [] },
    investingApproach: null,
    relationshipPaths: [{ id: "automated_investing", status: "explore", signalConfidence: 85, rationale: "Client prefers delegated investing", nextStep: "Clarify risk and liquidity", evidenceIds: ["client"] }],
  };
}

test("private coaching is isolated from the spoken conversation and uses real transcript IDs", () => {
  const request = coachingRequest(turns, 3);
  assert.equal(request.response.conversation, "none");
  assert.deepEqual(request.response.output_modalities, ["text"]);
  assert.equal(request.response.metadata.version, "3");
  assert.equal(request.response.metadata.throughCustomerTurnId, "client");
  assert.ok(request.response.input[0].content[0].text.includes('"id":"rep"'));
});
test("representative completion unlocks all catalog paths without a client acknowledgement phrase", () => {
  const result = parseRealtimeInsights(JSON.stringify(snapshot()), turns);
  assert.equal(result.serviceStatus.state, "resolved");
  assert.equal(result.relationshipPaths.length, RELATIONSHIP_PATHS.length);
  assert.equal(result.criteria.length, 7);
  assert.equal(result.relationshipPaths[0].status, "explore");
  assert.equal(result.criteria.find(c => c.id === "risk_comfort")?.status, "unknown");
});
test("representative suggestions and invented IDs cannot establish customer suitability", () => {
  const input = snapshot();
  input.relationshipPaths[0].evidenceIds = ["rep", "invented"];
  input.criteria[0].evidenceIds = ["rep"];
  const result = parseRealtimeInsights(JSON.stringify(input), turns);
  assert.equal(result.relationshipPaths.find(p => p.id === "automated_investing")?.status, "possible");
  assert.equal(result.criteria[0].status, "unknown");
});
test("a cash constraint pauses robo discovery and later contradictory evidence can replace earlier criteria", () => {
  const input = snapshot();
  input.criteria.push({ ...CRITERIA[6], status: "not_met", rationale: "Funds needed soon", evidenceIds: ["client"] });
  const result = parseRealtimeInsights(JSON.stringify(input), turns);
  assert.equal(result.relationshipPaths.find(p => p.id === "automated_investing")?.status, "hold");
  assert.equal(result.criteria[6].status, "not_met");
});
test("service still open and incomplete criteria prevent a ready-to-discuss robo recommendation", () => {
  const input = snapshot();
  input.serviceStatus.state = "in_progress";
  input.criteria = [];
  const result = parseRealtimeInsights(JSON.stringify(input), turns);
  assert.equal(result.serviceStatus.state, "in_progress");
  assert.equal(result.relationshipPaths[0].status, "emerging");
});
test("malformed output and out-of-range confidence are rejected", () => {
  assert.throws(() => parseRealtimeInsights("{}", turns));
  const input = snapshot();
  input.relationshipPaths[0].signalConfidence = 101;
  assert.throws(() => parseRealtimeInsights(JSON.stringify(input), turns));
});

test("top three update with new evidence and exclude unassessed or rejected offerings", async () => {
  const { topRelationshipPaths } = await import("../lib/realtime-intelligence");
  const paths = [
    { id: "unknown", status: "possible", signalConfidence: 0, evidenceIds: [], assessed: false },
    { id: "candidate", status: "possible", signalConfidence: 0, evidenceIds: ["client"], assessed: true },
    { id: "rejected", status: "ruled_out", signalConfidence: 99, evidenceIds: ["client"], assessed: true },
    ...[60, 90, 80, 70].map((score, i) => ({ id: `supported-${i}`, status: "explore", signalConfidence: score, evidenceIds: ["client"], assessed: true })),
  ];
  assert.deepEqual(topRelationshipPaths(paths).map(p => p.id), ["supported-1", "supported-2", "supported-3"]);
  paths[2].status = "explore";
  assert.equal(topRelationshipPaths(paths)[0].id, "rejected");
  assert.equal(topRelationshipPaths(paths.slice(0, 2)).length, 1);
  const zeroHold = {id:"zero-hold",status:"hold",signalConfidence:0,evidenceIds:["client"],assessed:true};
  assert.deepEqual(topRelationshipPaths([zeroHold,paths[1]]).map(path => path.id), ["candidate"]);
});

test("a model preference tag cannot discard the entire cue update", () => {
  const input = snapshot();
  const result = parseRealtimeInsights(JSON.stringify({ ...input, tags: [{ id: "preference-1", label: "Prefers automatic management", kind: "preference", evidenceIds: ["client"] }] }), turns);
  assert.equal(result.tags[0].kind, "fact");
  assert.equal(result.criteria.length, 7);
  assert.equal(result.relationshipPaths[0].status, "explore");
});

test("omitted assessments keep cards stable, but explicit rejection replaces earlier evidence", async () => {
  const { mergePathAssessments } = await import("../lib/realtime-intelligence");
  const prior = [{ id: "automated_investing", assessed: true, status: "emerging", evidenceIds: ["client"] }];
  const omitted = [{ id: "automated_investing", assessed: false, status: "possible", evidenceIds: [] as string[] }];
  assert.deepEqual(mergePathAssessments(prior, omitted), prior);
  const rejection = [{ id: "automated_investing", assessed: true, status: "ruled_out", evidenceIds: ["new-answer"] }];
  assert.deepEqual(mergePathAssessments(prior, rejection), rejection);
});

import { openAIConnectionError } from "../lib/openai-errors";
test("connection errors distinguish exhausted quota, spending caps and transient rate limits", () => {
  assert.match(openAIConnectionError(429, JSON.stringify({error:{code:"insufficient_quota",message:"You have no credits remaining"}})), /credits or quota are exhausted/);
  assert.match(openAIConnectionError(429, JSON.stringify({error:{code:"organization_spend_limit_exceeded"}})), /spending or usage limit/);
  assert.match(openAIConnectionError(429, JSON.stringify({error:{code:"rate_limit_exceeded"}})), /temporarily rate-limited/);
  assert.match(openAIConnectionError(429, "invalid body"), /can mean/);
  assert.doesNotMatch(openAIConnectionError(500, "secret private response"), /secret/);
});

test("the streamed cue becomes usable before rankings and criteria finish", () => {
  const data = snapshot();
  const prefix = JSON.stringify({serviceStatus: data.serviceStatus, representativeGuidance: data.representativeGuidance}).slice(0, -1);
  let firstCue = null;
  for (let i = 0; i <= prefix.length; i++) {
    const cue = parseStreamedCue(prefix.slice(0, i), turns);
    if (i < prefix.length) assert.equal(cue, null, "never use incomplete guidance");
    else firstCue = cue;
  }
  assert.equal(firstCue?.representativeGuidance.question, data.representativeGuidance.question);
  assert.equal(parseStreamedCue(prefix + ',"criteria":[{"unfinished":', turns)?.serviceStatus.state, "resolved");
  assert.deepEqual(Object.keys(coachingRequest(turns, 1).response.tools[0].parameters.properties).slice(0, 2), ["serviceStatus", "representativeGuidance"]);
});
test("streamed cues handle escaped quotes/braces and reject fabricated evidence", () => {
  const data = snapshot();
  data.representativeGuidance.question = 'Would you prefer "hands off" {management}?';
  const prefix = JSON.stringify({serviceStatus: data.serviceStatus, representativeGuidance: data.representativeGuidance}).slice(0, -1);
  assert.equal(parseStreamedCue(prefix, turns)?.representativeGuidance.question, data.representativeGuidance.question);
  data.representativeGuidance.evidenceIds = ["invented"];
  assert.equal(parseStreamedCue(JSON.stringify({serviceStatus:data.serviceStatus, representativeGuidance:data.representativeGuidance}).slice(0,-1), turns), null);
  data.representativeGuidance.evidenceIds = ["client"];
  data.serviceStatus.evidenceIds = ["invented"];
  assert.equal(parseStreamedCue(JSON.stringify({serviceStatus:data.serviceStatus, representativeGuidance:data.representativeGuidance}).slice(0,-1), turns)?.serviceStatus.state, "in_progress");
});

import { callPathSummary } from "../lib/call-path-summary";
test("completed calls keep all evidenced paths including later rejections, while the live view stays capped", () => {
  const paths = ["explore", "emerging", "hold", "ruled_out", "possible"].map((status, index) => ({ id: `path-${index}`, name: `Offering ${index}`, status, assessed: true, signalConfidence: 70, evidenceIds: ["client"] }));
  const unused = { id: "unused", name: "Unused offering", status: "possible", assessed: false, signalConfidence: 0, evidenceIds: [] };
  assert.equal(callPathSummary([...paths, unused], turns).length, 5);
});
test("wrap-up includes an offering actually discussed without claiming client fit", () => {
  const path = { id: "automated_investing", name: "Schwab Intelligent Portfolios", status: "possible", assessed: false, evidenceIds: [] };
  const discussed = [...turns, { id: "mention", role: "representative" as const, text: "We could discuss Intelligent Portfolios, if helpful.", at: 3 }];
  assert.equal(callPathSummary([path], discussed).length, 1);
  assert.equal(callPathSummary([path], turns).length, 0);
  assert.equal(callPathSummary([{...path, assessed:true, evidenceIds:["invented"]}], turns).length, 0);
  const plan = {...path,id:"financial_plan",name:"Schwab Plan"};
  assert.equal(callPathSummary([plan],[{id:"generic",role:"representative",text:"Let's build a three-year plan."}]).length,0);
  assert.equal(callPathSummary([plan],[{id:"named",role:"representative",text:"You could explore Schwab Plan."}]).length,1);
});

import { LIVE_TURN_DETECTION, canRunBackgroundCoaching, spokenReplyRequest } from "../lib/realtime-turns";
test("voice turns are coach-first: VAD commits audio but the app requests Jordan's reply", () => {
  assert.equal(LIVE_TURN_DETECTION.create_response, false);
  assert.equal(LIVE_TURN_DETECTION.interrupt_response, true);
  assert.equal(LIVE_TURN_DETECTION.type, "server_vad");
  assert.ok(LIVE_TURN_DETECTION.silence_duration_ms >= 500 && LIVE_TURN_DETECTION.silence_duration_ms <= 800);
  assert.ok(LIVE_TURN_DETECTION.threshold >= 0.6);
  assert.deepEqual(spokenReplyRequest(), {type:"response.create",response:{output_modalities:["audio"]}});
});
test("coaching waits for primary generation and representative transcript, including late ASR", () => {
  const answered = [{role:"customer"},{role:"representative"}];
  assert.equal(canRunBackgroundCoaching(true, false, answered), false);
  assert.equal(canRunBackgroundCoaching(false, true, answered), false);
  assert.equal(canRunBackgroundCoaching(false, false, [{role:"customer"}]), false);
  assert.equal(canRunBackgroundCoaching(false, false, answered), true);
});

import { CUE_TOOL, closePartialJson, cueDirectiveItem, cueRequest, readCue } from "../lib/live-cue";
const cueTurns = [
  { id: "rep0", role: "representative" as const, text: "Thank you for calling Charles Schwab. How may I help you today?", at: 0 },
  { id: "c1", role: "customer" as const, text: "I want to set up an automatic monthly transfer into my brokerage account.", at: 3 },
];
const fullCue = {
  callReason: { category: "Move Money", subcategory: "ACH", reason: "Periodic Request", confidence: "high", evidenceIds: ["c1"] },
  stage: "servicing", serviceState: "in_progress",
  say: "I can help with that. How much would you like to transfer each month?",
  nextStep: "Confirm amount, date and linked bank.", rationale: "Client asked for a recurring transfer.",
  offeringId: "", evidenceIds: ["c1"],
};

test("the live cue is a private, text-only LLM request that can hear unsent audio", () => {
  const request = cueRequest({ version: 4, turns: cueTurns.slice(0, 1), pendingAudioItemId: "item_audio" });
  assert.equal(request.response.conversation, "none");
  assert.deepEqual(request.response.output_modalities, ["text"]);
  assert.equal(request.response.metadata.topic, "live_cue");
  assert.equal(request.response.metadata.throughTurnId, "item_audio");
  assert.match(request.event_id, /^cue-req-4-/);
  assert.deepEqual(request.response.input.at(-1), { type: "item_reference", id: "item_audio" });
  assert.equal(request.response.tool_choice.name, CUE_TOOL.name);
  assert.equal(Object.keys(CUE_TOOL.parameters.properties)[0], "callReason", "call reason streams first");
  assert.equal(cueRequest({ version: 5, turns: cueTurns }).response.input.length, 1, "typed turns need no audio reference");
});

test("the call reason is readable from the stream as soon as its object closes", () => {
  const text = JSON.stringify(fullCue);
  const cut = text.indexOf('"stage"') + 3;
  const early = readCue(text.slice(0, cut), cueTurns);
  assert.equal(early?.callReason?.reason, "Periodic Request");
  assert.equal(early?.say, "");
  const beforeClose = readCue(text.slice(0, text.indexOf('"evidenceIds"') + 5), cueTurns);
  assert.equal(beforeClose?.callReason, null, "an unfinished reason is never shown");
  const midSay = readCue(text.slice(0, text.indexOf("transfer each")), cueTurns);
  assert.ok(midSay?.say.startsWith("I can help with that. How much"));
});

test("cue validation rejects fabricated taxonomy labels and representative-only evidence", () => {
  assert.equal(readCue(JSON.stringify(fullCue), cueTurns, "", true)?.callReason?.taxonomySourceLine, 524);
  const invented = { ...fullCue, callReason: { ...fullCue.callReason, reason: "Made Up Reason" } };
  assert.equal(readCue(JSON.stringify(invented), cueTurns, "", true)?.callReason, null);
  const repOnly = { ...fullCue, callReason: { ...fullCue.callReason, evidenceIds: ["rep0"] } };
  assert.equal(readCue(JSON.stringify(repOnly), cueTurns, "", true)?.callReason, null);
  const audio = { ...fullCue, callReason: { ...fullCue.callReason, evidenceIds: ["item_audio"] } };
  assert.equal(readCue(JSON.stringify(audio), cueTurns.slice(0, 1), "item_audio", true)?.callReason?.reason, "Periodic Request");
  assert.equal(readCue(JSON.stringify({ ...fullCue, offeringId: "not_a_product" }), cueTurns, "", true)?.offeringId, "");
  assert.equal(readCue('{"say":"half', cueTurns, "", true), null, "incomplete output is never treated as final");
});

test("partial JSON repair handles escapes, braces in strings and dangling keys", () => {
  assert.deepEqual(closePartialJson('{"say":"He said \\"hi\\" {ok}'), { say: 'He said "hi" {ok}' });
  assert.deepEqual(closePartialJson('{"a":1,"b"'), { a: 1 });
  assert.deepEqual(closePartialJson('{"a":[1,2'), { a: [1, 2] });
  assert.equal(closePartialJson(""), null);
});

test("the cue becomes a private system directive for Jordan's next reply", () => {
  const cue = readCue(JSON.stringify({ ...fullCue, stage: "discovery", offeringId: "automated_investing" }), cueTurns, "", true)!;
  const event = cueDirectiveItem(cue, "cue_1");
  assert.equal(event.type, "conversation.item.create");
  assert.equal(event.item.role, "system");
  assert.equal(event.item.id, "cue_1");
  const text = event.item.content[0].text;
  assert.match(text, /Do not read this aloud/);
  assert.match(text, /How much would you like to transfer/);
  assert.match(text, /Schwab Intelligent Portfolios/);
  const servicing = cueDirectiveItem({ ...cue, stage: "servicing" }, "cue_2").item.content[0].text;
  assert.doesNotMatch(servicing, /Intelligent Portfolios/, "no offering push while servicing");
});


import { advanceCallStage, retainOfferings } from "../lib/call-progress";
test("the call moves from greeting to service and late cues cannot regress discovery", () => {
  assert.equal(advanceCallStage("greeting", "servicing"), "servicing");
  assert.equal(advanceCallStage("discovery", "servicing"), "discovery");
  assert.equal(advanceCallStage("servicing", "recommendation"), "recommendation");
});
test("new offerings accumulate while existing offerings retain updated assessments", () => {
  const old = [{id: "a", status: "explore"}, {id: "b", status: "emerging"}, {id: "c", status: "emerging"}];
  const result = retainOfferings(old, [{id: "d", status: "explore"}], [{id: "a", status: "ruled_out"}]);
  assert.deepEqual(result.map(card => card.id), ["a", "b", "c", "d"]);
  assert.equal(result[0].status, "ruled_out");
});

import { TRAINING_ACTION_TOOL, validateTrainingAction, persistTrainingAction } from "../lib/training-actions";
import { buildOfferingJourneys, groupOfferings } from "../lib/offering-journey";
import { CUSTOMER_PROFILES } from "../lib/customer-profiles";
import { SCENARIOS } from "../lib/relationship-scenarios";
import { OFFERING_CONVERSATION_OBJECTIVE } from "../lib/offering-conversation";
test("K has a male portrait and complete fictional CRM fields in every scenario", () => {
  for (const profile of Object.values(CUSTOMER_PROFILES)) {
    assert.equal(profile.portrait, "male");
    for (const field of [profile.address, profile.book, profile.segment, profile.advisor, profile.clientId]) assert.ok(field);
    const book = Number(profile.book.replace(/[^0-9.]/g, ""));
    assert.ok(book >= 250000 && book <= 650000);
    assert.ok(["A", "B", "C"].includes(profile.segment));
    assert.ok(profile.accounts.length > 0);
    const accountTotal = profile.accounts.reduce((sum, account) => {
      const balance = account.detail.match(/\$([\d,]+)/);
      assert.ok(balance, `${account.name} must show a balance`);
      return sum + Number(balance[1].replaceAll(",", ""));
    }, 0);
    assert.equal(accountTotal, book);
    assert.doesNotMatch(profile.address, /example|sample|demo/i);
  }
  assert.ok(SCENARIOS.every(scenario => scenario.callerName === "K"));
});
const offerTurns = (offer: string, reply: string) => [{id: "offer", role: "representative", text: offer}, {id: "answer", role: "customer", text: reply}];
const actionInput = { offeringId: "automated_investing", kind: "open_account", accountName: "Intelligent Portfolios account", summary: "Opened the training account", steps: [] as string[] };
test("a change completes after any natural yes to Jordan's offer, or a direct request", () => {
  for (const reply of ["Yes.", "Yeah, sure.", "Sure, why not", "Sounds good", "Okay, go ahead", "Let's do it", "Uh, yeah, that works", "Absolutely"]) {
    assert.equal(validateTrainingAction(actionInput, offerTurns("Would you like me to set up Schwab Intelligent Portfolios for you now?", reply)).consentTurnId, "answer", reply);
  }
  for (const offer of ["Shall I schedule a planning conversation for Tuesday at 2?", "Want me to get that transfer scheduled for the fifth?", "Should I enroll your IRA in Intelligent Portfolios?"]) {
    assert.equal(validateTrainingAction(actionInput, offerTurns(offer, "Yes")).consentTurnId, "answer", offer);
  }
  assert.equal(validateTrainingAction(actionInput, [{id: "ask", role: "customer", text: "Please set up an $800 monthly transfer on the fifth."}]).consentTurnId, "ask");
  // A yes can be followed by setup details before the save.
  const withDetails = [...offerTurns("Would you like me to enroll your IRA in Intelligent Portfolios?", "Yes."), {id: "q", role: "representative", text: "Which account should fund it?"}, {id: "detail", role: "customer", text: "The IRA cash."}];
  assert.equal(validateTrainingAction(actionInput, withDetails).consentTurnId, "answer");
  assert.throws(() => validateTrainingAction({...actionInput, offeringId: "invented"}, offerTurns("Would you like me to set that up?", "Yes")));
});
test("no completion without a yes: hearing more, other answers, facts, questions and declines", () => {
  const offer = "Would you like me to set up Schwab Plan for you now?";
  for (const reply of ["No thanks.", "Not right now.", "Maybe later.", "Let me think about it.", "How much does it cost?", "Hold on.", "I'd rather not."]) {
    assert.throws(() => validateTrainingAction(actionInput, offerTurns(offer, reply)), /has not said yes/, reply);
  }
  // Example 3: "Sure, sure" only agreed to hear about a specialist review.
  assert.throws(() => validateTrainingAction(actionInput, offerTurns("Would you like to hear how that specialist review could fit your situation?", "Sure, sure.")));
  // Example 2: account facts in reply to a goal question.
  assert.throws(() => validateTrainingAction(actionInput, offerTurns("What retirement income goal and spending timeline do you want to focus on first?", "We still owe around 280K on our house and we have a rental property")));
  // Example 1: an earlier request followed by plan options the client never chose between.
  assert.throws(() => validateTrainingAction(actionInput, [
    {id: "c1", role: "customer", text: "I want to open a SEP IRA."},
    {id: "j1", role: "representative", text: "Do you want a plan where employees can make their own contributions, or one funded by employer contributions?"},
    {id: "c2", role: "customer", text: "I thought SEP IRA was automatically the simplest option"},
    {id: "c3", role: "customer", text: "I plan to hire one person next quarter and perhaps three more next year."},
  ]));
  // A yes counts once: it cannot be reused for a different change.
  assert.throws(() => validateTrainingAction(actionInput, offerTurns(offer, "Yes"), ["answer"]));
  assert.throws(() => validateTrainingAction(actionInput, [{id: "j", role: "representative", text: "Hello"}]));
});
test("the completion tool and every prompt are free of authorization steps", () => {
  assert.deepEqual(TRAINING_ACTION_TOOL.parameters.properties.offeringId.enum, [...RELATIONSHIP_PATHS.map(path => path.id), "service_request"]);
  assert.ok(!("consentText" in TRAINING_ACTION_TOOL.parameters.properties));
  assert.ok(!(TRAINING_ACTION_TOOL.parameters.required as readonly string[]).includes("consentText"));
  const asksForAuthorization = /(?<!never )ask (?:the client )?for (?:final )?(?:authori[sz]ation|consent|confirmation)|after final (?:authori[sz]ation|consent)|quote the latest client authori[sz]ation/i;
  assert.doesNotMatch(OFFERING_CONVERSATION_OBJECTIVE, asksForAuthorization);
  assert.match(OFFERING_CONVERSATION_OBJECTIVE, /only after the client says yes in any natural way/);
  assert.match(OFFERING_CONVERSATION_OBJECTIVE, /Never ask for a specific phrase such as 'I authorize'/);
  assert.doesNotMatch(cueRequest({ version: 1, turns }).response.instructions, asksForAuthorization);
  assert.doesNotMatch(coachingRequest(turns, 1).response.instructions, asksForAuthorization);
});
test("journey shows every offering's client trigger, transition and introduction", () => {
  const transcript = [
    {id: "bridge", role: "representative", text: "What do you want these savings to accomplish?", at: 20},
    {id: "need", role: "customer", text: "I want retirement investing managed automatically.", at: 25},
    {id: "intro", role: "representative", text: "Schwab Intelligent Portfolios could help with automated management.", at: 30},
    {id: "planning", role: "representative", text: "A Financial Consultant conversation could also help with your broader plan.", at: 40},
  ];
  const paths = [
    {id: "automated_investing", name: "Schwab Intelligent Portfolios", evidenceIds: ["need"], rationale: "Client wants automation", signalConfidence: 90},
    {id: "financial_consultant", name: "Financial Consultant conversation", evidenceIds: ["need"], rationale: "Client wants retirement planning", signalConfidence: 75},
  ];
  const journey = buildOfferingJourneys(paths, transcript);
  assert.equal(journey.length, 2);
  assert.equal(journey[0].client?.id, "need");
  assert.equal(journey[0].transition?.id, "bridge");
  assert.equal(journey[1].introduction?.id, "planning");
});
test("confidence groups keep high confidence offerings ahead of other candidates", () => {
  const groups = groupOfferings([{id: "low", signalConfidence: 45}, {id: "high", signalConfidence: 92}, {id: "unknown", signalConfidence: null}, {id: "second", signalConfidence: 80}]);
  assert.deepEqual(groups[0].paths.map(path => path.id), ["high", "second"]);
  assert.deepEqual(groups[1].paths.map(path => path.id), ["low", "unknown"]);
});

test("reports preserve named offerings when no background assessment completed", () => {
  const paths = RELATIONSHIP_PATHS.map(path => ({ ...path, status: "possible", assessed: false, evidenceIds: [] }));
  const report = callPathSummary(paths, [{id: "mention", role: "representative", text: "We can explore Intelligent Portfolios, a financial consultant, and a 529 plan."}]);
  for (const id of ["automated_investing", "financial_consultant", "college_529"]) assert.ok(report.some(path => path.id === id));
});

import { POST as createRealtimeSession } from "../app/api/realtime/session/route";
test("realtime session never asks for verification and provides the training completion tool", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.OPENAI_API_KEY;
  let captured: { session?: { instructions?: string; tools?: Array<{name: string}> } } = {};
  process.env.OPENAI_API_KEY = "test-only-dummy-key";
  globalThis.fetch = async (url, options) => {
    assert.equal(String(url), "https://api.openai.com/v1/realtime/client_secrets");
    captured = JSON.parse(String(options?.body));
    return new Response(JSON.stringify({value: "test-only-session"}), {status:200});
  };
  try {
    const response = await createRealtimeSession(new Request("http://localhost/api/realtime/session", {method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({scenarioId:"relationship-01",completedActions:[{offeringName:"Schwab Intelligent Portfolios",summary:"Training account opened",accountName:"Intelligent Portfolios account"}]})}));
    assert.equal(response.status,200);
    assert.ok(captured.session?.tools?.some(tool => tool.name === "complete_training_action"));
    assert.ok(captured.session?.instructions?.includes("Never ask the caller to verify their identity"));
    assert.ok(captured.session?.instructions?.includes("including tax planning"));
    assert.ok(!/ask for final authori[sz]ation|ask for final consent|Quote the latest client authori[sz]ation|consentText/i.test(captured.session?.instructions ?? ""));
    assert.ok(!/demo verification\?|May I complete a quick/i.test(captured.session?.instructions ?? ""));
    assert.ok(captured.session?.instructions?.includes("The tool must return success before you claim completion"));
    assert.ok(captured.session?.instructions?.includes("Training account opened"));
    assert.ok(captured.session?.instructions?.includes('"book":"$312,000"'));
    assert.ok(captured.session?.instructions?.includes('"name":"Traditional IRA"'));
    assert.ok(captured.session?.instructions?.includes("Do not substitute a referral or an appointment for an enrollment"));
    assert.ok(captured.session?.instructions?.includes("Complete multiple accepted offerings separately"));
    assert.ok(captured.session?.instructions?.includes(OFFERING_CONVERSATION_OBJECTIVE));
    assert.ok(!captured.session?.instructions?.includes("offer to confirm it through an approved specialist"));
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  }
});

test("both private coaches keep the offering objective and receive saved execution context", () => {
  const action = {id:"saved", offeringId:"automated_investing", offeringName:"Schwab Intelligent Portfolios", kind:"enroll" as const, accountName:"Schwab brokerage", summary:"Enrollment setup completed", steps:["Reviewed preferences", "Obtained consent"], consentTurnId:"consent", completedAt:"2026-10-01T12:00:00Z"};
  const cue = cueRequest({version:8, turns, completedActions:[action]});
  const background = coachingRequest(turns, 8, [action]);
  for (const request of [cue, background]) {
    assert.ok(request.response.instructions.includes(OFFERING_CONVERSATION_OBJECTIVE));
    const message = request.response.input[0] as { content: Array<{ text: string }> };
    const data = JSON.parse(message.content[0].text);
    assert.equal(data.completedActions[0].offeringId, action.offeringId);
    assert.equal(data.completedActions[0].accountName, action.accountName);
    assert.equal(data.completedActions[0].consentTurnId, action.consentTurnId);
    assert.ok(data.offerings.every((offering: {description?: string}) => offering.description));
    assert.deepEqual(data.turns.map(({id,role,text}: {id:string;role:string;text:string}) => ({id,role,text})), turns.map(({id,role,text}) => ({id,role,text})));
  }
  const directive = cueDirectiveItem(readCue(JSON.stringify({...fullCue,stage:"recommendation",offeringId:"automated_investing"}), cueTurns, "", true)!, "cue_execution").item.content[0].text;
  assert.ok(directive.includes("Schwab Intelligent Portfolios"));
  assert.ok(directive.includes("do not restart discovery because of this cue"));
  assert.ok(directive.includes("After tool success, confirm that saved result"));
});

test("completed enrollments retain the selected account across saved profile reloads", () => {
  const turns = [{id:"review", role:"representative", text:"Would you like me to enroll your brokerage account in Schwab Intelligent Portfolios now?"}, {id:"consent", role:"customer", text:"Yes, please proceed."}];
  const validated = validateTrainingAction({offeringId:"automated_investing",kind:"enroll",accountName:"Self-directed brokerage",summary:"Enrolled in Schwab Intelligent Portfolios",steps:["Reviewed investing goal and horizon", "Selected brokerage account and funding"]}, turns);
  let saved = "";
  persistTrainingAction(validated, [], "enrollment-1", {setItem: (_key, value) => { saved = value; }});
  const reloaded = JSON.parse(saved);
  assert.equal(reloaded[0].kind, "enroll");
  assert.equal(reloaded[0].accountName, "Self-directed brokerage");
  assert.equal(reloaded[0].offeringName, "Schwab Intelligent Portfolios");
  assert.equal(reloaded[0].consentTurnId, "consent");
});

test("training actions persist before success and repeated completion is idempotent", () => {
  const validated = {offeringId:"automated_investing",offeringName:"Schwab Intelligent Portfolios",kind:"open_account" as const,accountName:"Managed training account",summary:"Training account added",steps:["Reviewed funding", "Confirmed setup"],consentTurnId:"consent"};
  let saved = "";
  const storage = {setItem: (key: string, value: string) => { assert.equal(key, "schwab-training-actions-k-v1"); saved = value; }};
  const first = persistTrainingAction(validated, [], "call-1", storage);
  assert.equal(JSON.parse(saved)[0].accountName, "Managed training account");
  const second = persistTrainingAction(validated, first.actions, "call-2", storage);
  assert.equal(second.actions.length, 1);
  assert.equal(second.action.id, "call-1");
  assert.throws(() => persistTrainingAction(validated, [], "call-3", {setItem: () => { throw new Error("Storage unavailable"); }}));
});

import { CROSS_SELL_SCHEMA, crossSellCueContext, crossSellRequestBody, crossSellSystemItem, parseBalance, parseCrossSellPlan, planStatuses, recentOfferings, rememberOfferings } from "../lib/cross-sell";
import { offeringMention } from "../lib/offering-journey";
import { POST as createCrossSellPlan } from "../app/api/cross-sell/route";

const xsellProfile = CUSTOMER_PROFILES["relationship-01"];
function modelPlan() {
  return {
    summary: "Large idle cash balance in the IRA and irregular brokerage deposits.",
    accounts: [
      { name: "Traditional IRA", type: "traditional_ira", balance: 999999, holdings: "38% cash ($114,000), two index funds", heldAway: false },
      { name: "Self-directed brokerage", type: "brokerage", balance: 12000, holdings: "Three ETFs, $3,100 cash", heldAway: false },
      { name: "Workplace 401(k)", type: "workplace_plan", balance: 86000, holdings: "Target-date fund", heldAway: true },
      { name: "Schwab Bank checking", type: "bank", balance: 9000, holdings: "Linked for transfers", heldAway: false },
      { name: "Third extra account", type: "other", balance: 1, holdings: "x", heldAway: false },
    ],
    signals: [
      { id: "s1", label: "$114k idle IRA cash", detail: "$114,000 has sat in cash in the Traditional IRA for seven months.", accountName: "Traditional IRA" },
      { id: "s2", label: "Cash building in brokerage", detail: "Deposits in the brokerage account stay in cash for weeks.", accountName: "Self-directed brokerage" },
      { id: "s1", label: "duplicate", detail: "dup", accountName: "x" },
    ],
    opportunities: [
      { offeringId: "automated_investing", headline: "Put idle IRA cash to work", reason: "Cash has sat uninvested for months.", signalIds: ["s1", "missing"], openingLine: "I noticed a sizable cash balance in your IRA. Would it help to talk about options for it?", discoveryQuestion: "What is that cash meant for?", setupPath: "Enroll the IRA after preferences.", watchOut: "May be reserved for a near-term need." },
      { offeringId: "made_up_offering", headline: "x", reason: "x", signalIds: ["s1"], openingLine: "x", discoveryQuestion: "x", setupPath: "x", watchOut: "x" },
      { offeringId: "automated_investing", headline: "duplicate", reason: "x", signalIds: ["s1"], openingLine: "x", discoveryQuestion: "x", setupPath: "x", watchOut: "x" },
      { offeringId: "schwab_plan", headline: "No supporting data", reason: "x", signalIds: ["nope"], openingLine: "x", discoveryQuestion: "x", setupPath: "x", watchOut: "x" },
      { offeringId: "fractional_shares", headline: "Invest each deposit", reason: "Small deposits sit in cash.", signalIds: ["s2"], openingLine: "I see deposits waiting in cash. Want to hear a simple way to invest small amounts?", discoveryQuestion: "Do you prefer choosing investments yourself?", setupPath: "Enroll the brokerage account.", watchOut: "Prefers hands-off management." },
    ],
    pivots: [
      { clientTopic: "Am I saving enough for retirement?", offeringId: "schwab_plan", approach: "Offer a plan that includes the 401(k)." },
      { clientTopic: "invalid", offeringId: "nope", approach: "x" },
    ],
  };
}

test("the cross-sell request is a strict structured-output call over the full catalog", () => {
  const body = crossSellRequestBody({ scenarioId: "relationship-01", profile: xsellProfile, variationSeed: 42, recentOfferingIds: ["automated_investing"], completedOfferingIds: ["schwab_plan"] });
  assert.equal(body.text.format.type, "json_schema");
  assert.equal(body.text.format.strict, true);
  assert.equal(body.store, false);
  const input = JSON.parse(body.input);
  assert.equal(input.variationSeed, 42);
  assert.deepEqual(input.recentOfferingIds, ["automated_investing"]);
  assert.deepEqual(input.completedOfferingIds, ["schwab_plan"]);
  assert.equal(input.clientRecord.accounts.length, xsellProfile.accounts.length);
  assert.ok(!input.offerings.some((item: { id: string }) => item.id === "service_recovery"));
  assert.ok(!JSON.stringify(CROSS_SELL_SCHEMA).match(/maxLength|minItems|maxItems/), "strict mode keywords only");
  assert.ok(body.instructions.includes("Never make an ID in recentOfferingIds the first opportunity"));
});

test("plan validation keeps recorded balances and drops unsupported or invented offerings", () => {
  const plan = parseCrossSellPlan(modelPlan(), { scenarioId: "relationship-01", profile: xsellProfile }, "plan-1");
  assert.equal(plan.accounts.find(item => item.name === "Traditional IRA")?.balance, 300000, "existing balances are not rewritten");
  assert.match(plan.accounts.find(item => item.name === "Traditional IRA")!.holdings, /38% cash/);
  assert.equal(plan.accounts.filter(item => !item.existing).length, 2, "at most two new accounts");
  assert.equal(plan.book, 12000 + 300000 + 9000, "held-away assets are excluded from the book");
  assert.equal(plan.signals.length, 2, "duplicate signal IDs are removed");
  assert.deepEqual(plan.opportunities.map(item => [item.offeringId, item.priority]), [["automated_investing", 1], ["fractional_shares", 2]]);
  assert.deepEqual(plan.opportunities[0].signalIds, ["s1"]);
  assert.equal(plan.opportunities[0].offeringName, "Schwab Intelligent Portfolios");
  assert.deepEqual(plan.pivots.map(item => item.offeringId), ["schwab_plan"]);
  const completed = parseCrossSellPlan(modelPlan(), { scenarioId: "relationship-01", profile: xsellProfile, completedOfferingIds: ["automated_investing"] }, "plan-2");
  assert.equal(completed.opportunities[0].offeringId, "fractional_shares", "completed offerings are not re-proposed");
  const none = { ...modelPlan(), opportunities: modelPlan().opportunities.filter(item => item.offeringId === "made_up_offering") };
  assert.throws(() => parseCrossSellPlan(none, { scenarioId: "relationship-01", profile: xsellProfile }, "plan-3"));
  assert.equal(parseBalance("$0 · Open; incoming rollover pending"), 0);
  assert.equal(parseBalance("$1.2M · Active"), 1200000);
});

test("Jordan receives the plan as private context and the coach sees live outcomes", () => {
  const plan = parseCrossSellPlan(modelPlan(), { scenarioId: "relationship-01", profile: xsellProfile }, "plan-1");
  const event = crossSellSystemItem(plan, "xsell_1");
  assert.equal(event.type, "conversation.item.create");
  assert.equal(event.item.role, "system");
  const text = event.item.content[0].text;
  assert.match(text, /Do not read it aloud/);
  assert.match(text, /only after the original service request is resolved/);
  assert.match(text, /I noticed a sizable cash balance in your IRA/);
  assert.match(text, /\$114,000 has sat in cash/);
  assert.match(text, /Am I saving enough for retirement/);
  const context = crossSellCueContext(plan, { automated_investing: "declined" })!;
  assert.equal(context.opportunities[0].status, "declined");
  assert.equal(context.opportunities[1].status, "planned");
  const request = cueRequest({ version: 1, turns, crossSellPlan: context });
  assert.equal(JSON.parse((request.response.input[0] as { content: Array<{ text: string }> }).content[0].text).crossSellPlan.opportunities.length, 2);
  assert.match(request.response.instructions, /crossSellPlan, when supplied/);
  assert.equal(crossSellCueContext(null), null);
});

test("plan outcomes follow the conversation: raised, interested, declined, accepted", () => {
  const plan = parseCrossSellPlan(modelPlan(), { scenarioId: "relationship-01", profile: xsellProfile }, "plan-1");
  const talk = [
    { id: "c1", role: "customer", text: "I need a monthly transfer." },
    { id: "r1", role: "representative", text: "Done. I noticed idle cash; Schwab Intelligent Portfolios could help. Interested?" },
    { id: "c2", role: "customer", text: "Yes, tell me more." },
  ];
  assert.deepEqual(planStatuses(plan, talk.slice(0, 1), [], [], offeringMention), { automated_investing: "planned", fractional_shares: "planned" });
  assert.equal(planStatuses(plan, talk.slice(0, 2), [], [], offeringMention).automated_investing, "raised");
  assert.equal(planStatuses(plan, talk, [{ id: "automated_investing", status: "emerging", evidenceIds: ["c2"] }], [], offeringMention).automated_investing, "interested");
  assert.equal(planStatuses(plan, talk, [{ id: "automated_investing", status: "ruled_out", evidenceIds: ["c2"] }], [], offeringMention).automated_investing, "declined");
  assert.equal(planStatuses(plan, talk, [], [{ offeringId: "automated_investing", consentTurnId: "c2" }], offeringMention).automated_investing, "accepted");
  assert.equal(planStatuses(plan, talk, [], [{ offeringId: "automated_investing", consentTurnId: "older-call" }], offeringMention).automated_investing, "raised", "past calls do not count");
});

test("each call steers away from the offerings featured last time", () => {
  const plan = parseCrossSellPlan(modelPlan(), { scenarioId: "relationship-01", profile: xsellProfile }, "plan-1");
  const history = rememberOfferings({ "relationship-02": ["schwab_plan"] }, plan);
  assert.deepEqual(recentOfferings(history, "relationship-01"), ["automated_investing", "fractional_shares"]);
  assert.deepEqual(recentOfferings(history, "relationship-02"), ["schwab_plan"]);
  assert.deepEqual(recentOfferings("garbage", "relationship-01"), []);
});

test("the cross-sell route generates a validated plan through the Responses API", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.OPENAI_API_KEY;
  let captured: Record<string, unknown> = {};
  process.env.OPENAI_API_KEY = "test-only-dummy-key";
  globalThis.fetch = async (url, options) => {
    assert.equal(String(url), "https://api.openai.com/v1/responses");
    captured = JSON.parse(String(options?.body));
    return new Response(JSON.stringify({ output: [{ content: [{ type: "output_text", text: JSON.stringify(modelPlan()) }] }] }), { status: 200 });
  };
  const call = (body: unknown) => createCrossSellPlan(new Request("http://localhost/api/cross-sell", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }));
  try {
    const response = await call({ scenarioId: "relationship-01", recentOfferingIds: ["fractional_shares"] });
    assert.equal(response.status, 200);
    const plan = await response.json() as { id: string; opportunities: Array<{ offeringId: string }> };
    assert.equal(plan.opportunities[0].offeringId, "automated_investing");
    assert.equal(typeof plan.id, "string");
    assert.deepEqual(JSON.parse(String(captured.input)).recentOfferingIds, ["fractional_shares"]);
    assert.equal(typeof JSON.parse(String(captured.input)).variationSeed, "number");
    assert.equal((await call({ scenarioId: "nope" })).status, 404);
    globalThis.fetch = async () => new Response(JSON.stringify({ output: [{ content: [{ type: "output_text", text: "{\"bad\":true}" }] }] }), { status: 200 });
    assert.equal((await call({ scenarioId: "relationship-01" })).status, 502, "invalid model output is rejected");
    delete process.env.OPENAI_API_KEY;
    assert.equal((await call({ scenarioId: "relationship-01" })).status, 503);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  }
});

test("Jordan's instructions and the shared objective cover the pre-call plan", async () => {
  assert.match(OFFERING_CONVERSATION_OBJECTIVE, /pre-call cross-sell plan is available, proactively raise its highest-priority opportunity/);
  assert.match(OFFERING_CONVERSATION_OBJECTIVE, /only the client's answer establishes interest/);
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.OPENAI_API_KEY;
  let instructions = "";
  process.env.OPENAI_API_KEY = "test-only-dummy-key";
  globalThis.fetch = async (_url, options) => {
    instructions = JSON.parse(String(options?.body)).session.instructions;
    return new Response(JSON.stringify({ value: "test-only-session" }), { status: 200 });
  };
  try {
    await createRealtimeSession(new Request("http://localhost/api/realtime/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scenarioId: "relationship-01" }) }));
    assert.match(instructions, /# Pre-call cross-sell plan/);
    assert.match(instructions, /Never read the plan aloud/);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  }
});

import { CUE_STAGES } from "../lib/live-cue";
test("the demo has no verification step anywhere", () => {
  assert.ok(!(CUE_STAGES as readonly string[]).includes("verification"));
  assert.equal(advanceCallStage(null, "greeting"), "greeting");
  for (const scenario of SCENARIOS) for (const line of scenario.script ?? []) assert.doesNotMatch(line.text, /verification/i, scenario.id);
});
