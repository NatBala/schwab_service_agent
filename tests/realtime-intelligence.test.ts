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

import { demoVerificationComplete } from "../lib/demo-verification";
import { LIVE_TURN_DETECTION, canRunBackgroundCoaching, spokenReplyRequest } from "../lib/realtime-turns";
test("voice turns are coach-first: VAD commits audio but the app requests Jordan's reply", () => {
  assert.equal(LIVE_TURN_DETECTION.create_response, false);
  assert.equal(LIVE_TURN_DETECTION.interrupt_response, true);
  assert.equal(LIVE_TURN_DETECTION.type, "server_vad");
  assert.ok(LIVE_TURN_DETECTION.silence_duration_ms <= 400);
  assert.deepEqual(spokenReplyRequest(), {type:"response.create",response:{output_modalities:["audio"]}});
});
test("coaching waits for primary generation and representative transcript, including late ASR", () => {
  const answered = [{role:"customer"},{role:"representative"}];
  assert.equal(canRunBackgroundCoaching(true, false, answered), false);
  assert.equal(canRunBackgroundCoaching(false, true, answered), false);
  assert.equal(canRunBackgroundCoaching(false, false, [{role:"customer"}]), false);
  assert.equal(canRunBackgroundCoaching(false, false, answered), true);
});
test("explicit quick demo consent immediately reveals synthetic accounts, unrelated yes and declines do not", () => {
  const request = {role:"representative",text:"May I complete a quick demo verification?"};
  assert.equal(demoVerificationComplete([request,{role:"customer",text:"Yes, go ahead."}]), true);
  assert.equal(demoVerificationComplete([request,{role:"customer",text:"No thanks."}]), false);
  assert.equal(demoVerificationComplete([{role:"representative",text:"Would you like to discuss retirement?"},{role:"customer",text:"Yes."}]), false);
  assert.equal(demoVerificationComplete([request,{role:"customer",text:"I need help first."},{role:"representative",text:"Is that all?"},{role:"customer",text:"Yes."}]), false);
});
test("profile accounts unlock only after verification consent and confirmation", () => {
  const request = {role:"representative", text:'Would you like to proceed? Then I will say, “Demo verification is complete.”'};
  assert.equal(demoVerificationComplete([request]), false);
  assert.equal(demoVerificationComplete([request, {role:"customer",text:"Yes, proceed."}, {role:"representative",text:"Demo verification is complete. Let's review the account."}]), true);
  assert.equal(demoVerificationComplete([request, {role:"customer",text:"No, don't proceed."}, {role:"representative",text:"Demo verification is complete."}]), false);
  assert.equal(demoVerificationComplete([{role:"representative",text:"Demo verification is complete."}]), false);
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
