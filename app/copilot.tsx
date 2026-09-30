"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { OfferingIcon, ConfidenceChart } from "./offering-visuals";
import { canRunBackgroundCoaching, spokenReplyRequest } from "@/lib/realtime-turns";
import { demoVerificationComplete } from "@/lib/demo-verification";
import { callPathSummary } from "@/lib/call-path-summary";
import { openAIConnectionError } from "@/lib/openai-errors";
import {
  Activity,
  ArrowRight,
  AudioLines,
  Check,
  CircleAlert,
  ExternalLink,
  Headphones,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Send,
  Sparkles,
  UserRound,
} from "lucide-react";
import type { CustomerProfile } from "@/lib/customer-profiles";
import type { ClientRoleBrief } from "@/lib/call-roles";
import { coachingRequest, parseRealtimeInsights, topRelationshipPaths, mergePathAssessments, type StreamedCue } from "@/lib/realtime-intelligence";

type Scenario = {
  id: string;
  title: string;
  callerName: string;
  age: number;
  openingReason: string;
  serviceResolution: string;
  sourceCompleteness: "full_script" | "outline";
  profile: CustomerProfile | null;
  customerOpener: string;
  clientBrief: ClientRoleBrief | null;
};

type Turn = {
  id: string;
  role: "customer" | "representative";
  text: string;
  at: number;
};

type Evidence = { evidenceIds: string[] };
type Analysis = {
  customerProblem: Evidence & { immediate: string; impact: string };
  callReason: Evidence & {
    category: string;
    subcategory: string;
    reason: string;
    confidence: "low" | "medium" | "high";
    taxonomySourceLine?: number | null;
  };
  serviceStatus: Evidence & {
    state: "unresolved" | "in_progress" | "resolved";
    summary: string;
  };
  representativeGuidance: Evidence & { nextStep: string; question: string; rationale: string; followUpQuestions?: string[] };
  tags: Array<Evidence & {
    id: string;
    label: string;
    kind: "need" | "fact" | "concern" | "intent" | "guardrail";
  }>;
  criteria: Array<Evidence & {
    id: string;
    label: string;
    status: "met" | "unknown" | "not_met";
    rationale: string;
  }>;
  opportunity: Evidence & {
    stage: "none" | "signal" | "potential_fit" | "ready_to_explore" | "suppressed";
    title: string;
    rationale: string;
    blockers: string[];
  };
  investingApproach: (Evidence & { label: string; description: string }) | null;
  relationshipPaths: Array<Evidence & {
    id: string;
    name: string;
    family: string;
    description: string;
    sourceUrl: string;
    status: "possible" | "emerging" | "explore" | "hold" | "ruled_out";
    signalConfidence: number | null;
    assessed?: boolean;
    question?: string;
    rationale: string;
    nextStep: string;
  }>;
};

type Draft = { id: string; role: Turn["role"]; text: string };
type JourneyEvent = { id: string; pathId: string; title: string; state: string; quote: string; evidenceIds: string[]; at: number };
type CallStatus = "idle" | "ready" | "connecting" | "live" | "preview" | "ended" | "error";
type PendingCustomerItem = { responseId: string; parts: Map<number, string> };
type QuickReason = Analysis["callReason"];

const OPENING_REASONS: Record<string, { pattern: RegExp; category: string; subcategory: string; reason: string }> = {
  "relationship-01": { pattern: /automatic transfer|recurring transfer|monthly transfer|\bach\b|every month/i, category: "Move Money", subcategory: "ACH", reason: "Periodic Request" },
  "relationship-02": { pattern: /balance|account value|total value/i, category: "Client Inquiries", subcategory: "Account Balance", reason: "Account Balance" },
  "relationship-03": { pattern: /cost basis|gain(?:s)? and loss(?:es)?|unrealized/i, category: "Cost Basis", subcategory: "Cost Basis Reporting", reason: "Cost Basis Report" },
  "relationship-04": { pattern: /rollover|401\s?\(?k\)?|former (?:employer|plan)|old employer/i, category: "Retirements", subcategory: "Rollover", reason: "IRA Rollover" },
  "relationship-05": { pattern: /daughter|baby|newborn|child|grandparents|account for (?:her|him|them)/i, category: "New Accounts", subcategory: "Opening Accounts", reason: "Create a New Account" },
  "relationship-06": { pattern: /sep[ -]?ira|self.employed|retirement plan|business/i, category: "Retirements", subcategory: "Small Business Plans", reason: "Plan Setup" },
  "relationship-07": { pattern: /beneficiar|estate plan/i, category: "Account Maintenance", subcategory: "Beneficiaries", reason: "Update Beneficiary" },
};

function comparableTranscript(value: string) {
  return value.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

function isRepeatedOpening(earlier: Turn, later: Turn) {
  if (earlier.role !== "customer" || later.role !== "customer") return false;
  if (Math.abs(later.at - earlier.at) > 12) return false;
  const first = comparableTranscript(earlier.text);
  const second = comparableTranscript(later.text);
  return first.length >= 18 && second.length >= first.length &&
    (second === first || second.startsWith(first + " "));
}

function timeLabel(seconds: number) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const remainder = Math.floor(seconds % 60).toString().padStart(2, "0");
  return minutes + ":" + remainder;
}

function scrollToEvidence(ids: string[]) {
  const first = ids[0];
  if (!first) return;
  const element = document.getElementById("turn-" + first);
  const container = element?.closest(".transcript-feed");
  if (!element || !(container instanceof HTMLElement)) return;
  const distance = element.getBoundingClientRect().top - container.getBoundingClientRect().top;
  container.scrollTo({ top: container.scrollTop + distance - 60, behavior: "smooth" });
}

function CueBoard({ analysis, cue, paths, turns, updating, speaking, onEvidence }: {
  analysis: Analysis | null;
  cue: StreamedCue | null;
  paths: Analysis["relationshipPaths"];
  turns: Turn[];
  updating: boolean;
  speaking: boolean;
  onEvidence: (ids: string[]) => void;
}) {
  const question = cue?.representativeGuidance.question ?? analysis?.representativeGuidance.question;
  return <section className="cue-board" aria-label="Live cue board" aria-live="polite">
    <div className="cue-board-heading"><span><Sparkles size={16} /> REPRESENTATIVE CUE BOARD</span><b>{speaking ? "Listening" : updating ? cue ? "Cue ready · assessing fit" : "Updating cue…" : "Cue ready"}</b></div>
    <div className="ask-next"><span>ASK NEXT</span><h2>{question || "What can I help you with today?"}</h2>{(cue || analysis) && <p>{(cue?.serviceStatus.state ?? analysis?.serviceStatus.state) === "resolved" ? "Discover the broader goal · one question at a time" : "Resolve the service question first"}</p>}</div>
    <div className="cue-paths-heading"><strong>Top relationship paths</strong><span>{paths.length} / 3</span></div>
    {paths.length ? <div className="compact-cue-list">{paths.map((path, index) => <article key={path.id} className={"compact-cue-card " + path.status}>
      <div className="compact-cue-title"><OfferingIcon id={path.id} /><span className="cue-rank">{index + 1}</span><h3>{path.name}</h3></div>
      <ConfidenceChart value={path.signalConfidence} unknown={path.status === "possible"} />
      <p className="cue-fit">{path.status === "hold" ? "Clarify constraint" : path.status === "possible" ? "Discovery candidate" : "Relevant signal"} · {path.rationale}</p>
      {path.question && <div className="cue-question"><small>ASK</small><strong>{path.question}</strong></div>}
      <details className="cue-details"><summary>Evidence{path.id === "automated_investing" ? " & 7 criteria" : " & next step"}</summary><p>{path.nextStep}</p><q>{turns.findLast(turn => turn.role === "customer" && path.evidenceIds.includes(turn.id))?.text}</q>{path.evidenceIds.length > 0 && <button type="button" onClick={() => onEvidence(path.evidenceIds)}>View customer evidence <ArrowRight size={12} /></button>}{path.id === "automated_investing" && analysis && <AutomatedCriteria criteria={analysis.criteria} onEvidence={onEvidence} />}<a href={path.sourceUrl} target="_blank" rel="noreferrer">Product reference <ExternalLink size={12} /></a></details>
    </article>)}</div> : <div className="cue-empty">Discovery paths will appear here as the client answers. No offering established yet.</div>}
    {!!analysis?.representativeGuidance.followUpQuestions?.length && <details className="cue-followups"><summary>Next questions to keep in reserve</summary>{analysis.representativeGuidance.followUpQuestions.map((item, index) => <p key={index}>{index + 1}. {item}</p>)}</details>}
    <small className="cue-footnote">Confidence measures conversation evidence. Candidates still need discovery.</small>
  </section>;
}

function CallReasonVisual({ analysis, quickReason, fastReason, score, serviceProgress, onEvidence }: {
  analysis: Analysis | null;
  quickReason: QuickReason | null;
  fastReason: QuickReason | null;
  score: number;
  serviceProgress: number;
  onEvidence: (ids: string[]) => void;
}) {
  const confirmedReason = analysis && analysis.callReason.category !== "Unclassified" ? analysis.callReason : null;
  const reason = fastReason ?? confirmedReason ?? quickReason;
  const identified = !!reason && reason.category !== "Unclassified";
  return <section className="live-call-reason" aria-label="Live call reason" aria-live="polite">
    <span className="reason-symbol"><Headphones size={21} /></span>
    <div className="live-reason-copy"><small>CALL REASON <b>{confirmedReason ? "Identified" : quickReason ? "Initial match" : "Listening"}</b></small><h2>{identified ? reason.reason : "Listening for the call reason"}</h2><p>{identified ? `${reason.category} · ${reason.subcategory}` : "Populates automatically from the conversation"}</p></div>
    <div className="live-service-progress"><span>Service <b>{serviceProgress}%</b></span><div><i style={{width: `${serviceProgress}%`}} /></div>{identified && reason.evidenceIds.length > 0 && <button type="button" onClick={() => onEvidence(reason.evidenceIds)}>Evidence <ArrowRight size={11} /></button>}</div>
    <span className="sr-only">Call reason confidence {score} percent</span>
  </section>;
}

function CompletedCallSummary({ paths, turns, onEvidence }: { paths: Analysis["relationshipPaths"]; turns: Turn[]; onEvidence: (ids: string[]) => void }) {
  const labels: Record<string, string> = { possible: "Discovery candidate", emerging: "Relevant signal", explore: "Ready to explore", hold: "Constraint to clarify", ruled_out: "Ruled out" };
  return <section className="completed-path-summary" aria-label="Completed call relationship summary">
    <div className="completed-summary-heading"><div><small>CALL COMPLETE</small><h2>Relationship paths covered</h2></div><span>{paths.length} {paths.length === 1 ? "path" : "paths"}</span></div>
    <p>All paths discussed or discovered in this call, with their latest evidence and status.</p>
    {paths.length ? <div className="completed-path-list">{paths.map(path => {
      const namedTurns = turns.filter(turn => turn.text.toLowerCase().includes(path.name.replace(/^Schwab /, "").toLowerCase())).map(turn => turn.id);
      const ids = path.evidenceIds.length ? path.evidenceIds : namedTurns;
      return <article className={"completed-path-card " + path.status} key={path.id}><div className="compact-cue-title"><OfferingIcon id={path.id} /><h3>{path.name}</h3></div><span className="summary-path-status">{labels[path.status]}</span><ConfidenceChart value={path.signalConfidence} unknown={path.status === "possible" || !path.evidenceIds.length} /><p>{path.evidenceIds.length ? path.rationale : "Mentioned in the conversation; client fit has not been established."}</p>{path.evidenceIds.length > 0 && <p className="summary-next-step"><strong>Next step</strong> {path.nextStep}</p>}<button type="button" disabled={!ids.length} onClick={() => onEvidence(ids)}>Conversation evidence <ArrowRight size={12} /></button></article>;
    })}</div> : <div className="cue-empty">No relationship offering was established or discussed in the captured conversation.</div>}
    <small className="cue-footnote">Confidence reflects conversation evidence, not eligibility or suitability. Unknown relevance is shown without a percentage.</small>
  </section>;
}

function ClientProfilePanel({ name, age, profile, turns, verified, onVerify }: {
  name: string; age: number; profile: CustomerProfile; turns: Turn[]; verified: boolean; onVerify: () => void;
}) {
  const words = turns.filter(turn => turn.role === "customer").map(turn => turn.text.toLowerCase()).join(" ");
  const learned = profile.discoverable.filter(fact => fact.phrases.some(phrase => words.includes(phrase.toLowerCase())));
  return <aside className="client-profile-rail" aria-label="Client profile">
    <div className="profile-rail-heading"><UserRound size={16} /><strong>Client profile</strong><span>{verified ? "Verified" : "Locked"}</span></div>
    <div className="profile-identity"><Image width={104} height={104} priority unoptimized src={profile.portrait === "male" ? "/profiles/client-male.png" : "/profiles/client-female.png"} alt={`Fictional training portrait for ${name}`} /><h2>{name}</h2><p>{age > 0 ? `Age ${age} · ` : ""}Demo client</p><span className={verified ? "" : "pending"}>{verified ? <Check size={12} /> : <UserRound size={12} />}{verified ? "Verification confirmed" : "Verification pending"}</span></div>
    {!verified ? <div className="profile-locked"><h2>Open account snapshot</h2><p>Confirm the secure verification step to view the client’s accounts.</p><button type="button" onClick={onVerify}>Confirm demo verification <Check size={14} /></button><small>Off-channel training verification · no identity credentials required here.</small></div> : <>
      <div className="profile-section profile-relationship"><small>RELATIONSHIP</small><p>{profile.relationship}</p></div>
      <div className="profile-section"><small>CURRENT SERVICE NEED</small><p>{profile.context}</p></div>
      <div className="profile-section"><h3>Accounts <span>{profile.accounts.length}</span></h3>{profile.accounts.length ? profile.accounts.map(account => <div className="profile-account" key={account.name}><strong>{account.name}</strong><span>{account.detail}</span></div>) : <p>No existing account confirmed in the script.</p>}</div>
      <div className="profile-section"><h3>Learned in this call</h3>{learned.length ? <div className="profile-learned">{learned.map(fact => <span key={fact.label}>{fact.label}</span>)}</div> : <p>Goals and household details will appear as the client shares them.</p>}</div>
      <details className="profile-section"><summary>Demo contact history</summary><p>{profile.priorContacts} simulated prior contacts</p><p>Last: {profile.lastContact}</p></details>
      <div className="profile-provenance">Script-based training profile · synthetic portrait. Contact history is illustrative.</div>
    </>}
  </aside>;
}

function CallWaveform({ speaker, waiting }: { speaker: "customer" | "representative" | null; waiting: boolean }) {
  return <div className={"call-waveform " + (speaker ?? (waiting ? "thinking" : "idle"))} aria-label={speaker === "customer" ? "Client speaking" : speaker === "representative" ? "Jordan speaking" : waiting ? "Preparing reply" : "Audio ready"}>
    <div className="wave-bars" aria-hidden="true">{Array.from({ length: 63 }, (_, i) => <i key={i} style={{ height: `${(4 + Math.pow(Math.sin(i * .31), 2) * (12 + 30 * Math.pow(Math.sin(i * .097), 2))).toFixed(3)}px`, animationDelay: `${(i * -.065).toFixed(3)}s` }} />)}</div>
    <span>{speaker === "customer" ? "CLIENT SPEAKING" : speaker === "representative" ? "JORDAN SPEAKING" : waiting ? "JORDAN PREPARING REPLY" : "READY TO LISTEN"}</span>
  </div>;
}

function AutomatedCriteria({ criteria, onEvidence }: { criteria: Analysis["criteria"]; onEvidence: (ids: string[]) => void }) {
  const met = criteria.filter((item) => item.status === "met").length;
  return <div className="path-criteria">
    <div className="path-criteria-head"><strong>Automated investing requirements</strong><span>{met} of {criteria.length} established</span></div>
    <div className="path-criteria-track"><i style={{ width: `${criteria.length ? met / criteria.length * 100 : 0}%` }} /></div>
    <div className="path-criteria-list">{criteria.map(criterion => <div key={criterion.id} className={"criterion-detail " + criterion.status}><button type="button" className={"path-criterion " + criterion.status} disabled={!criterion.evidenceIds.length} onClick={() => onEvidence(criterion.evidenceIds)}><span>{criterion.status === "met" ? <Check size={12} /> : criterion.status === "not_met" ? "!" : "?"}</span>{criterion.label}<b>{criterion.status === "met" ? "Established" : criterion.status === "not_met" ? "Conflict" : "Unknown"}</b></button><small>{criterion.rationale}</small></div>)}</div>
    <p>Conversation evidence only. The formal investor questionnaire determines eligibility and portfolio recommendations.</p>
  </div>;
}

function CallTransition({ customerTurn, representativeTurn, milestones, serviceEvent, onEvidence }: {
  customerTurn: Turn | null;
  representativeTurn: Turn | null | undefined;
  milestones: JourneyEvent[];
  serviceEvent: JourneyEvent | undefined;
  onEvidence: (ids: string[]) => void;
}) {
  return <section className="transition-visual" aria-label="Call relationship transition">
    <div className="transition-glow" aria-hidden="true" />
    <div className="transition-header"><span>CALL JOURNEY</span><b>THE MOMENT IT CHANGED</b></div>
    {customerTurn ? <>
      <div className="transition-main"><div className="transition-time"><small>TRANSITION POINT</small><strong>{timeLabel(customerTurn.at)}</strong><span>From the original request to a broader need</span></div><div className="transition-connector" aria-hidden="true"><i /><span><Sparkles size={20} /></span><i /></div><div className="transition-path"><small>FIRST RELATIONSHIP SIGNAL</small><strong>{milestones[0]?.title ?? "A broader need"}</strong><span>Supported by the customer&apos;s words</span></div></div>
      <div className="transition-dialogue">{representativeTurn && <button type="button" onClick={() => onEvidence([representativeTurn.id])}><span>REPRESENTATIVE OPENED DISCOVERY · {timeLabel(representativeTurn.at)}</span><q>{representativeTurn.text}</q></button>}<button type="button" onClick={() => onEvidence([customerTurn.id])}><span>CUSTOMER REVEALED THE NEED · {timeLabel(customerTurn.at)}</span><q>{customerTurn.text}</q></button></div>
      <div className="transition-milestones"><span className="transition-milestone service"><i />{serviceEvent ? "Service answered" : "Service discussed"}</span>{milestones.map((event) => <button type="button" key={event.pathId} onClick={() => onEvidence(event.evidenceIds)}><i />{event.title}</button>)}</div>
    </> : <div className="transition-empty"><strong>No deeper transition documented</strong><p>The call remained focused on the original service request. No customer statement established a relationship path.</p></div>}
  </section>;
}

export default function Copilot({ scenarios }: { scenarios: Scenario[] }) {
  const [scenarioId, setScenarioId] = useState("");
  const [status, setStatus] = useState<CallStatus>("idle");
  const [seconds, setSeconds] = useState(0);
  const [muted, setMuted] = useState(false);
  const [speaker, setSpeaker] = useState<"customer" | "representative" | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [, setCueLatencyMs] = useState<number | null>(null);
  const [analyzedCustomerTurnId, setAnalyzedCustomerTurnId] = useState("");
  const [journeyEvents, setJourneyEvents] = useState<JourneyEvent[]>([]);
  const [, setLatestPathId] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [streamedCue, setStreamedCue] = useState<StreamedCue | null>(null);
  const [awaitingCustomerReply, setAwaitingCustomerReply] = useState(false);
  const [callError, setCallError] = useState("");
  const [analysisError, setAnalysisError] = useState("");
  const [typedReply, setTypedReply] = useState("");
  const [micAvailable, setMicAvailable] = useState(true);
  const [openingMic, setOpeningMic] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [centerTab, setCenterTab] = useState<"transcript" | "timeline">("transcript");
  const [insightTab, setInsightTab] = useState<"insights" | "references">("insights");
  const [transcriptOpen, setTranscriptOpen] = useState(true);
  const [serviceProgress, setServiceProgress] = useState(0);
  const [reasonScore, setReasonScore] = useState(0);
  const [quickReason, setQuickReason] = useState<QuickReason | null>(null);
  const [verificationConfirmed, setVerificationConfirmed] = useState(false);

  const peerRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RTCDataChannel | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const turnsRef = useRef<Turn[]>([]);
  const analysisRef = useRef<Analysis | null>(null);
  const primaryGenerationRef = useRef(false);
  const typedReplyPendingRef = useRef(false);
  const activeCoachingIdRef = useRef("");
  const clientSpeakingRef = useRef(false);
  const coachingResponseIdsRef = useRef(new Set<string>());
  const replyTimingRef = useRef<{ started: number; cueMs: number | null; requestMs: number | null; audioStarted: boolean } | null>(null);
  const coachingInFlightRef = useRef(false);
  const coachingTimeoutRef = useRef<number | null>(null);
  const completeIdsRef = useRef(new Set<string>());
  const itemOrderRef = useRef(new Map<string, number>());
  const itemTimeRef = useRef(new Map<string, number>());
  const pendingCustomerItemsRef = useRef(new Map<string, PendingCustomerItem>());
  const responseItemIdsRef = useRef(new Map<string, Set<string>>());
  const responseStatusRef = useRef(new Map<string, string>());
  const openingMicRef = useRef(false);
  const openingResponseIdRef = useRef("");
  const openingMicTimerRef = useRef<number | null>(null);
  const speakerFallbackTimerRef = useRef<number | null>(null);
  const representativeResponseActiveRef = useRef(false);
  const nextItemOrderRef = useRef(0);
  const startedAtRef = useRef(0);
  const analysisTimerRef = useRef<number | null>(null);
  const analysisVersionRef = useRef(0);
  const analysisPendingRef = useRef<{ turns: Turn[]; scenarioId: string } | null>(null);
  const clientSpeechStoppedAtRef = useRef<number | null>(null);
  const lastCueRenderedTurnRef = useRef("");
  const previewTimerRef = useRef<number | null>(null);
  const transcriptFeedRef = useRef<HTMLDivElement | null>(null);
  const lastScenarioIdRef = useRef("");

  const selected = useMemo(
    () => scenarios.find((item) => item.id === scenarioId),
    [scenarioId, scenarios],
  );
  const draftList = Object.values(drafts);
  const isInCall = status === "connecting" || status === "live" || status === "preview";
  const waitingForRepresentative = awaitingCustomerReply && status === "live";
  const displayServiceProgress = serviceProgress;
  const displayReasonScore = reasonScore;
  const relationshipReady = analysis?.serviceStatus.state === "resolved";
  const completedPaths = analysis ? callPathSummary(analysis.relationshipPaths, turns) : [];
  const visiblePaths: Analysis["relationshipPaths"] = analysis ? topRelationshipPaths(analysis.relationshipPaths) : [];
  const latestCustomerTurn = turns.findLast((turn) => turn.role === "customer");
  const firstPathEvent = relationshipReady ? journeyEvents.find((event) => event.pathId !== "call-reason" && event.pathId !== "service" && event.pathId !== "service_recovery") : undefined;
  const pivotTurnIndex = firstPathEvent ? turns.findIndex((turn) => firstPathEvent.evidenceIds.includes(turn.id)) : -1;
  const pivotCustomerTurn = pivotTurnIndex >= 0 ? turns[pivotTurnIndex] : null;
  const serviceEvent = journeyEvents.find((event) => event.pathId === "service");
  const pivotRepresentativeTurn = pivotTurnIndex >= 0 ? [...turns.slice(0, pivotTurnIndex)].reverse().find((turn) => turn.role === "representative" && turn.at >= (serviceEvent?.at ?? 0) && /\?|\b(?:what|how|when|why|tell me|would you|do you|could you)\b/i.test(turn.text)) : null;
  const pathMilestones = relationshipReady ? journeyEvents.filter((event, index, all) => event.pathId !== "call-reason" && event.pathId !== "service" && event.pathId !== "service_recovery" && all.findIndex((item) => item.pathId === event.pathId) === index).slice(0, 5) : [];

  useEffect(() => {
    if (status !== "live") return;
    const timer = window.setInterval(() => {
      setSeconds(Math.floor((Date.now() - startedAtRef.current) / 1000));
    }, 500);
    return () => window.clearInterval(timer);
  }, [status]);

  useEffect(() => {
    const feed = transcriptFeedRef.current;
    if (feed) feed.scrollTo({ top: feed.scrollHeight, behavior: "smooth" });
  }, [turns.length, draftList.length]);

  useEffect(() => {
    if (status !== "live" || speaker === "customer" || !latestCustomerTurn ||
        analyzedCustomerTurnId !== latestCustomerTurn.id ||
        lastCueRenderedTurnRef.current === latestCustomerTurn.id) return;
    const frame = window.requestAnimationFrame(() => {
      lastCueRenderedTurnRef.current = latestCustomerTurn.id;
      if (clientSpeechStoppedAtRef.current !== null) {
        setCueLatencyMs(Math.max(0, Math.round(performance.now() - clientSpeechStoppedAtRef.current)));
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [analyzedCustomerTurnId, latestCustomerTurn, speaker, status]);

  useEffect(() => {
    return () => {
      analysisVersionRef.current += 1;
      if (analysisTimerRef.current !== null) window.clearTimeout(analysisTimerRef.current);
      if (coachingTimeoutRef.current !== null) window.clearTimeout(coachingTimeoutRef.current);
      if (previewTimerRef.current !== null) window.clearTimeout(previewTimerRef.current);
      if (openingMicTimerRef.current !== null) window.clearTimeout(openingMicTimerRef.current);
      if (speakerFallbackTimerRef.current !== null) window.clearTimeout(speakerFallbackTimerRef.current);
      channelRef.current?.close();
      peerRef.current?.close();
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  function resetForScenario(id: string) {
    if (isInCall) return;
    cancelAnalysis();
    setScenarioId(id);
    setStatus("ready");
    setSeconds(0);
    setMuted(false);
    setOpeningMic(false);
    openingMicRef.current = false;
    openingResponseIdRef.current = "";
    setSpeaker(null);
    setTurns([]);
    turnsRef.current = [];
    completeIdsRef.current.clear();
    itemOrderRef.current.clear();
    itemTimeRef.current.clear();
    pendingCustomerItemsRef.current.clear();
    responseItemIdsRef.current.clear();
    responseStatusRef.current.clear();
    nextItemOrderRef.current = 0;
    setDrafts({});
    setAnalysis(null);
    setCueLatencyMs(null);
    clientSpeechStoppedAtRef.current = null;
    lastCueRenderedTurnRef.current = "";
    setAnalyzedCustomerTurnId("");
    analysisRef.current = null;
    coachingResponseIdsRef.current.clear();
    setJourneyEvents([]);
    setLatestPathId("");
    setAwaitingCustomerReply(false);
    representativeResponseActiveRef.current = false;
    setCallError("");
    setAnalysisError("");
    setTypedReply("");
    setMicAvailable(true);
    setPreviewMode(false);
    setCenterTab("transcript");
    setInsightTab("insights");
    setTranscriptOpen(true);
    setServiceProgress(0);
    resetDisplayScores();
    setVerificationConfirmed(false);
  }

  function stopConnection(nextStatus: CallStatus = "ended") {
    cancelAnalysis();
    if (previewTimerRef.current !== null) window.clearTimeout(previewTimerRef.current);
    if (openingMicTimerRef.current !== null) window.clearTimeout(openingMicTimerRef.current);
    if (speakerFallbackTimerRef.current !== null) window.clearTimeout(speakerFallbackTimerRef.current);
    speakerFallbackTimerRef.current = null;
    openingMicTimerRef.current = null;
    openingMicRef.current = false;
    openingResponseIdRef.current = "";
    setOpeningMic(false);
    channelRef.current?.close();
    channelRef.current = null;
    peerRef.current?.close();
    peerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.srcObject = null;
    }
    setSpeaker(null);
    representativeResponseActiveRef.current = false;
    setDrafts({});
    setStatus(nextStatus);
  }

  function cancelAnalysis() {
    analysisVersionRef.current += 1;
    replyTimingRef.current = null;
    setStreamedCue(null);
    coachingInFlightRef.current = false;
    if (coachingTimeoutRef.current !== null) window.clearTimeout(coachingTimeoutRef.current);
    coachingTimeoutRef.current = null;
    analysisPendingRef.current = null;
    primaryGenerationRef.current = false;
    typedReplyPendingRef.current = false;
    activeCoachingIdRef.current = "";
    clientSpeakingRef.current = false;
    if (analysisTimerRef.current !== null) window.clearTimeout(analysisTimerRef.current);
    analysisTimerRef.current = null;
    setAnalyzing(false);
  }

  function acceptAnalysis(next: Analysis | null) {
    if (!next) return;
    // A omitted catalog entry is not a retraction. Explicit reassessments,
    // including conflicts and rejections, replace previous evidence immediately.
    const previous = analysisRef.current;
    const stable = { ...next, relationshipPaths: mergePathAssessments(previous?.relationshipPaths ?? [], next.relationshipPaths) };
    recordInsightEvents(previous, stable, turnsRef.current);
    analysisRef.current = stable;
    setAnalysis(stable);
    if (next.callReason.category !== "Unclassified") {
      const evidenceCount = next.callReason.evidenceIds.length;
      const estimate = Math.min(97,
        (next.callReason.confidence === "high" ? 83 : next.callReason.confidence === "medium" ? 57 : 28)
        + Math.min(14, Math.max(0, evidenceCount - 1) * 7),
      );
      setReasonScore((current) => Math.max(current, estimate));
    }
    const milestone = next.serviceStatus.state === "resolved" ? 100 : next.serviceStatus.state === "in_progress" ? 55 : 20;
    setServiceProgress(milestone);
  }

  function resetDisplayScores() {
    setReasonScore(0);
    setQuickReason(null);
  }

  function queueAnalysis(nextTurns: Turn[], activeScenarioId: string) {
    analysisPendingRef.current = { turns: nextTurns, scenarioId: activeScenarioId };
    if (channelRef.current?.readyState !== "open") return;
    if (coachingInFlightRef.current) return;
    if (analysisTimerRef.current !== null) window.clearTimeout(analysisTimerRef.current);
    runPendingAnalysis();
  }

  function runPendingAnalysis() {
    analysisTimerRef.current = null;
    const channel = channelRef.current;
    const pending = analysisPendingRef.current;
    if (!pending || coachingInFlightRef.current || channel?.readyState !== "open" || !canRunBackgroundCoaching(primaryGenerationRef.current, clientSpeakingRef.current, pending.turns)) return;
    analysisPendingRef.current = null;
    coachingInFlightRef.current = true;
    setAnalyzing(true);
    setAnalysisError("");
    channel.send(JSON.stringify(coachingRequest(pending.turns, analysisVersionRef.current)));
    coachingTimeoutRef.current = window.setTimeout(() => {
      coachingInFlightRef.current = false;
      setAnalyzing(false);
      setAnalysisError("Cue update delayed. Keeping the previous cards.");
      cancelBackgroundCoaching();
      if (analysisPendingRef.current) runPendingAnalysis();
    }, 30000);
  }

  function itemOrder(id: string) {
    let order = itemOrderRef.current.get(id);
    if (order === undefined) {
      order = nextItemOrderRef.current++;
      itemOrderRef.current.set(id, order);
      itemTimeRef.current.set(id, Math.max(0, Math.round((Date.now() - startedAtRef.current) / 1000)));
    }
    return order;
  }

  function recordInsightEvents(previous: Analysis | null, current: Analysis, nextTurns: Turn[]) {
    const newEvents: JourneyEvent[] = [];
    const fromEvidence = (pathId: string, title: string, state: string, ids: string[]) => {
      const source = [...nextTurns].reverse().find((turn) => ids.includes(turn.id) && (pathId === "service" || turn.role === "customer"));
      if (!source) return;
      newEvents.push({ id: `${pathId}-${state}-${source.id}`, pathId, title, state, quote: source.text.slice(0, 175), evidenceIds: [source.id], at: source.at });
    };
    if (current.callReason.category !== "Unclassified" && (!previous || previous.callReason.category === "Unclassified")) {
      fromEvidence("call-reason", "Call reason identified", current.callReason.reason, current.callReason.evidenceIds);
    }
    if (current.serviceStatus.state === "resolved" && previous?.serviceStatus.state !== "resolved") {
      fromEvidence("service", "Service request answered", "Resolved", current.serviceStatus.evidenceIds);
    }
    if (current.serviceStatus.state === "resolved") {
      for (const path of current.relationshipPaths.filter(path => path.status === "emerging" || path.status === "explore" || path.status === "hold")) {
        const prior = previous?.serviceStatus.state === "resolved" ? previous.relationshipPaths.find((item) => item.id === path.id) : undefined;
        if (!prior || prior.status !== path.status || path.evidenceIds.some((id) => !prior.evidenceIds.includes(id))) {
          fromEvidence(path.id, path.name, prior ? path.status === "explore" ? "Ready to explore" : "More evidence" : "New path", path.evidenceIds);
        }
      }
    }
    if (newEvents.length) {
      setJourneyEvents((events) => [...events, ...newEvents.filter((event) => !events.some((prior) => prior.id === event.id))].slice(-48));
      const latestPath = newEvents.findLast((event) => event.pathId !== "call-reason" && event.pathId !== "service" && event.pathId !== "service_recovery");
      if (latestPath) setLatestPathId(latestPath.pathId);
    }
  }

  function commitTurn(id: string, role: Turn["role"], transcript: string, activeScenarioId: string) {
    const text = transcript.trim();
    if (!text || completeIdsRef.current.has(id)) return;
    // A standalone "I" is a common cut-off ASR pickup when the mic interrupts audio.
    if (role === "customer" && comparableTranscript(text) === "i") {
      setDrafts((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      return;
    }
    completeIdsRef.current.add(id);
    const order = itemOrder(id);
    const turn: Turn = {
      id,
      role,
      text,
      at: itemTimeRef.current.get(id) ?? 0,
    };
    const superseded = role === "customer" ? turnsRef.current.findLast((prior) =>
      itemOrder(prior.id) < order && isRepeatedOpening(prior, turn) && !turnsRef.current.some((between) =>
        between.role === "representative" && itemOrder(between.id) > itemOrder(prior.id) &&
        itemOrder(between.id) < order,
      ),
    ) : undefined;
    const nextTurns = [...turnsRef.current.filter((prior) => prior.id !== superseded?.id), turn].sort(
      (first, second) => itemOrder(first.id) - itemOrder(second.id),
    );
    turnsRef.current = nextTurns;
    setTurns(nextTurns);
    if (nextTurns.some((entry) => entry.role === "customer")) {
      if (role === "customer") setCueLatencyMs(null);
      const opening = OPENING_REASONS[activeScenarioId];
      if (role === "customer" && opening?.pattern.test(text)) {
        setQuickReason((current) => current ?? {
          category: opening.category,
          subcategory: opening.subcategory,
          reason: opening.reason,
          confidence: "medium",
          evidenceIds: [id],
        });
        setReasonScore((current) => Math.max(current, 46));
        setServiceProgress((current) => Math.max(current, 20));
      }
    }
    if (role === "representative" && nextTurns.some(entry => entry.role === "customer")) {
      // Jordan’s actual Realtime question is authoritative.
      // A slower assessment must not show an unrelated question as already asked.
      const question = text.match(/[^.!?]+\?/g)?.at(-1)?.trim().replace(/^[”’"\s]+/, "");
      if (question) {
        setStreamedCue({ serviceStatus: { state: analysisRef.current?.serviceStatus.state ?? "in_progress" }, representativeGuidance: { question, nextStep: "Listen to the client's answer.", rationale: "Question from Jordan's actual response.", evidenceIds: [id], followUpQuestions: [] } });
      }
    }
    setDrafts((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    setAwaitingCustomerReply(role === "customer" && !representativeResponseActiveRef.current);
    if (nextTurns.some(turn => turn.role === "customer")) queueAnalysis(nextTurns, activeScenarioId);
  }

  function rememberCustomerItem(id: string, responseId: string) {
    itemOrder(id);
    if (!pendingCustomerItemsRef.current.has(id)) {
      pendingCustomerItemsRef.current.set(id, { responseId, parts: new Map() });
    }
    if (responseId && !responseStatusRef.current.has(responseId)) {
      const ids = responseItemIdsRef.current.get(responseId) ?? new Set<string>();
      ids.add(id);
      responseItemIdsRef.current.set(responseId, ids);
    }
  }

  function finishCustomerItem(id: string, activeScenarioId: string) {
    const pending = pendingCustomerItemsRef.current.get(id);
    if (!pending) return;
    const transcript = [...pending.parts.entries()]
      .sort(([first], [second]) => first - second)
      .map(([, part]) => part)
      .join(" ")
      .trim();
    if (transcript) commitTurn(id, "representative", transcript, activeScenarioId);
    pendingCustomerItemsRef.current.delete(id);
    setDrafts((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  }

  function releaseOpeningMic(delay = 250) {
    if (!openingMicRef.current) return;
    if (openingMicTimerRef.current !== null) window.clearTimeout(openingMicTimerRef.current);
    openingMicTimerRef.current = window.setTimeout(() => {
      openingMicTimerRef.current = null;
      if (!openingMicRef.current) return;
      openingMicRef.current = false;
      openingResponseIdRef.current = "";
      streamRef.current?.getAudioTracks().forEach((track) => { track.enabled = true; });
      setOpeningMic(false);
      setMuted(false);
    }, delay);
  }

  function cancelBackgroundCoaching() {
    analysisVersionRef.current += 1;
    if (activeCoachingIdRef.current && channelRef.current?.readyState === "open") {
      channelRef.current.send(JSON.stringify({ type: "response.cancel", response_id: activeCoachingIdRef.current }));
    }
    activeCoachingIdRef.current = "";
    coachingInFlightRef.current = false;
    if (coachingTimeoutRef.current !== null) window.clearTimeout(coachingTimeoutRef.current);
    coachingTimeoutRef.current = null;
    analysisPendingRef.current = null;
    setAnalyzing(false);
  }

  function requestTypedResponse() {
    if (!typedReplyPendingRef.current || primaryGenerationRef.current || representativeResponseActiveRef.current || channelRef.current?.readyState !== "open") return;
    typedReplyPendingRef.current = false;
    primaryGenerationRef.current = true;
    if (replyTimingRef.current) replyTimingRef.current.requestMs = Math.round(performance.now() - replyTimingRef.current.started);
    channelRef.current.send(JSON.stringify(spokenReplyRequest()));
  }

  function handleRealtimeEvent(event: Record<string, unknown>, activeScenarioId: string) {
    const type = String(event.type ?? "");
    const privateResponse = event.response as { id?: string; status?: string; metadata?: Record<string, string>; output?: Array<{ type?: string; name?: string; arguments?: string }> } | undefined;
    if (privateResponse?.metadata?.topic === "relationship_coaching") {
      const current = Number(privateResponse.metadata.version) === analysisVersionRef.current;
      if (privateResponse.id) {
        coachingResponseIdsRef.current.add(privateResponse.id);
        if (type === "response.created") {
          if (!current || primaryGenerationRef.current || clientSpeakingRef.current) {
            channelRef.current?.send(JSON.stringify({ type: "response.cancel", response_id: privateResponse.id }));
          } else activeCoachingIdRef.current = privateResponse.id;
        }
      }
      if (type === "response.done" && current) {
        if (coachingTimeoutRef.current !== null) window.clearTimeout(coachingTimeoutRef.current);
        coachingTimeoutRef.current = null;
        activeCoachingIdRef.current = "";
        coachingInFlightRef.current = false;
        try {
          const result = privateResponse.output?.find(item => item.type === "function_call" && item.name === "publish_relationship_insights");
          if (privateResponse.status === "completed" && result?.arguments && privateResponse.metadata.throughTurnId === turnsRef.current.at(-1)?.id) {
            const insights = parseRealtimeInsights(result.arguments, turnsRef.current);
            acceptAnalysis(insights);
            // Never overwrite the question Jordan actually asked with a later assessment.
            setStreamedCue(currentCue => currentCue ? { ...currentCue, serviceStatus: insights.serviceStatus } : null);
            setAnalyzedCustomerTurnId(privateResponse.metadata.throughCustomerTurnId);
            setAnalysisError("");
          }
        } catch {
          setAnalysisError("The evidence update could not be read. Keeping the previous cards.");
        }
        setAnalyzing(false);
        runPendingAnalysis();
      }
      return;
    }
    if (coachingResponseIdsRef.current.has(String(event.response_id ?? ""))) return;
    if (type === "output_audio_buffer.started") {
      const timing = replyTimingRef.current;
      if (timing && timing.requestMs !== null && !timing.audioStarted) {
        timing.audioStarted = true;
        console.info("Realtime reply timing " + JSON.stringify({ cueMs: timing.cueMs, requestMs: timing.requestMs, audioMs: Math.round(performance.now() - timing.started) }));
      }
      return;
    }
    if (type === "output_audio_buffer.stopped") {
      if (speakerFallbackTimerRef.current !== null) window.clearTimeout(speakerFallbackTimerRef.current);
      speakerFallbackTimerRef.current = null;
      representativeResponseActiveRef.current = false;
      setSpeaker(null);
      const responseId = String(event.response_id ?? "");
      if (!openingResponseIdRef.current || !responseId || responseId === openingResponseIdRef.current) {
        releaseOpeningMic();
      }
      requestTypedResponse();
      return;
    }
    if (type === "input_audio_buffer.committed") {
      if (typeof event.item_id === "string") itemOrder(event.item_id);
      return;
    }
    if (type === "conversation.item.created" || type === "conversation.item.added" || type === "response.output_item.added") {
      const item = event.item as { id?: unknown } | undefined;
      if (typeof item?.id === "string") {
        itemOrder(item.id);
        if (type === "response.output_item.added") {
          rememberCustomerItem(item.id, String(event.response_id ?? ""));
        }
      }
      return;
    }
    if (type === "input_audio_buffer.speech_started") {
      cancelBackgroundCoaching();
      typedReplyPendingRef.current = false;
      clientSpeechStoppedAtRef.current = null;
      clientSpeakingRef.current = true;
      setSpeaker("customer");
      setAwaitingCustomerReply(false);
      return;
    }
    if (type === "input_audio_buffer.speech_stopped") {
      clientSpeakingRef.current = false;
      primaryGenerationRef.current = true;
      clientSpeechStoppedAtRef.current = performance.now();
      replyTimingRef.current = { started: performance.now(), cueMs: null, requestMs: null, audioStarted: false };
      setSpeaker(null);
      setAwaitingCustomerReply(true);
      return;
    }
    if (type === "response.created") {
      const response = event.response as { id?: unknown } | undefined;
      if (openingMicRef.current && !openingResponseIdRef.current && typeof response?.id === "string") {
        openingResponseIdRef.current = response.id;
      }
      primaryGenerationRef.current = true;
      if (replyTimingRef.current && replyTimingRef.current.requestMs === null) replyTimingRef.current.requestMs = Math.round(performance.now() - replyTimingRef.current.started);
      representativeResponseActiveRef.current = true;
      setSpeaker("representative");
      setAwaitingCustomerReply(false);
      return;
    }
    if (type === "response.done") {
      if (speakerFallbackTimerRef.current !== null) window.clearTimeout(speakerFallbackTimerRef.current);
      speakerFallbackTimerRef.current = window.setTimeout(() => { representativeResponseActiveRef.current = false; setSpeaker(null); speakerFallbackTimerRef.current = null; }, 20000);
      const response = event.response as {
        id?: unknown;
        status?: unknown;
        output?: Array<{ id?: unknown; content?: Array<{ transcript?: unknown }> }>;
      } | undefined;
      const responseId = String(response?.id ?? "");
      const responseStatus = String(response?.status ?? "");
      if (openingMicRef.current && (!openingResponseIdRef.current || responseId === openingResponseIdRef.current)) {
        // Playback normally ends with output_audio_buffer.stopped. Keep a bounded fallback
        // for browsers that omit it so the representative can still speak.
        releaseOpeningMic(4000);
      }
      if (responseId) responseStatusRef.current.set(responseId, responseStatus);
      const ids = new Set(responseItemIdsRef.current.get(responseId) ?? []);
      for (const item of response?.output ?? []) {
        if (typeof item.id !== "string") continue;
        ids.add(item.id);
        rememberCustomerItem(item.id, responseId);
        const pending = pendingCustomerItemsRef.current.get(item.id);
        if (pending && !pending.parts.size) {
          item.content?.forEach((part, index) => {
            if (typeof part.transcript === "string") pending.parts.set(index, part.transcript);
          });
        }
      }
      for (const id of ids) {
        if (responseStatus === "completed") {
          finishCustomerItem(id, activeScenarioId);
        } else {
          pendingCustomerItemsRef.current.delete(id);
          setDrafts((current) => {
            const next = { ...current };
            delete next[id];
            return next;
          });
        }
      }
      responseItemIdsRef.current.delete(responseId);
      primaryGenerationRef.current = false;
      runPendingAnalysis();
      return;
    }
    if (type === "error") {
      const info = event.error as { message?: string; event_id?: string } | undefined;
      if (info?.event_id?.startsWith("coaching-")) {
        coachingInFlightRef.current = false;
        if (coachingTimeoutRef.current !== null) window.clearTimeout(coachingTimeoutRef.current);
        setAnalyzing(false);
        setAnalysisError("Cue update unavailable. Keeping the previous cards.");
        activeCoachingIdRef.current = "";
        return;
      }
      setCallError(info?.message ?? "The live session reported an error.");
      primaryGenerationRef.current = false;
      representativeResponseActiveRef.current = false;
      setAwaitingCustomerReply(false);
      setSpeaker(null);
      return;
    }
    const isRepresentative = type.startsWith("response.output_audio_transcript.");
    const isCustomer = type.startsWith("conversation.item.input_audio_transcription.");
    if (!isCustomer && !isRepresentative) return;
    const role: Turn["role"] = isCustomer ? "customer" : "representative";
    const id = String(event.item_id ?? event.response_id ?? (role + "-current"));
    if (isRepresentative) {
      const responseStatus = responseStatusRef.current.get(String(event.response_id ?? ""));
      if (responseStatus && responseStatus !== "completed") return;
    }
    if (isRepresentative) rememberCustomerItem(id, String(event.response_id ?? ""));
    if (type.endsWith(".delta")) {
      if (completeIdsRef.current.has(id)) return;
      const delta = String(event.delta ?? "");
      if (!delta) return;
      if (isRepresentative) {
        const pending = pendingCustomerItemsRef.current.get(id);
        const index = Number(event.content_index ?? 0);
        if (pending) {
          const text = (pending.parts.get(index) ?? "") + delta;
          pending.parts.set(index, text);
          const question = text.match(/[^.!?]+\?/g)?.at(-1)?.trim();
          if (question && turnsRef.current.some(turn => turn.role === "customer")) {
            setStreamedCue({ serviceStatus: { state: analysisRef.current?.serviceStatus.state ?? "in_progress" }, representativeGuidance: { question, nextStep: "Listen to the client's answer.", rationale: "Question from Jordan's live response.", evidenceIds: [], followUpQuestions: [] } });
          }
        }
      }
      setDrafts((current) => {
        const previous = current[id];
        return {
          ...current,
          [id]: {
            id,
            role,
            text: (previous?.text ?? "") + delta,
          },
        };
      });
      return;
    }
    if (type.endsWith(".done") || type.endsWith(".completed")) {
      const transcript = String(event.transcript ?? "");
      if (transcript) {
        if (isRepresentative) {
          const pending = pendingCustomerItemsRef.current.get(id);
          if (pending) pending.parts.set(Number(event.content_index ?? 0), transcript);
          const responseStatus = responseStatusRef.current.get(String(event.response_id ?? ""));
          if (!responseStatus || responseStatus === "completed") finishCustomerItem(id, activeScenarioId);
          if (responseStatus && responseStatus !== "completed") {
            pendingCustomerItemsRef.current.delete(id);
            setDrafts((current) => {
              const next = { ...current };
              delete next[id];
              return next;
            });
          }
        } else {
          commitTurn(id, role, transcript, activeScenarioId);
        }
      }
    }
  }

  function prepareCall() {
    if (!scenarios.length || isInCall) return;
    const choices = scenarios.filter((item) => item.id !== lastScenarioIdRef.current);
    const picked = choices[Math.floor(Math.random() * choices.length)] ?? scenarios[0];
    lastScenarioIdRef.current = picked.id;
    resetForScenario(picked.id);
  }

  async function startCall(textOnly = false) {
    if (!selected || isInCall) return;
    const activeScenarioId = selected.id;
    cancelAnalysis();
    setStatus("connecting");
    setTranscriptOpen(true);
    setServiceProgress(0);
    resetDisplayScores();
    setPreviewMode(false);
    setCallError("");
    setAnalysisError("");
    setAnalysis(null);
    setCueLatencyMs(null);
    clientSpeechStoppedAtRef.current = null;
    lastCueRenderedTurnRef.current = "";
    setAnalyzedCustomerTurnId("");
    analysisRef.current = null;
    coachingResponseIdsRef.current.clear();
    setJourneyEvents([]);
    setLatestPathId("");
    setTurns([]);
    turnsRef.current = [];
    completeIdsRef.current.clear();
    itemOrderRef.current.clear();
    itemTimeRef.current.clear();
    pendingCustomerItemsRef.current.clear();
    responseItemIdsRef.current.clear();
    responseStatusRef.current.clear();
    nextItemOrderRef.current = 0;
    setDrafts({});
    setAwaitingCustomerReply(false);
    representativeResponseActiveRef.current = false;
    setSeconds(0);
    setMuted(false);
    setOpeningMic(false);
    openingMicRef.current = false;
    openingResponseIdRef.current = "";
    if (openingMicTimerRef.current !== null) window.clearTimeout(openingMicTimerRef.current);
    openingMicTimerRef.current = null;

    try {
      const tokenResponse = await fetch("/api/realtime/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarioId: activeScenarioId }),
      });
      const tokenPayload = await tokenResponse.json() as { clientSecret?: string; representativeInstructions?: string; error?: string };
      if (!tokenResponse.ok) throw new Error(tokenPayload.error || "Could not start the live representative.");
      const ephemeral = String(tokenPayload.clientSecret ?? "");
      if (!ephemeral) throw new Error("The live session did not return a client secret.");

      const peer = new RTCPeerConnection();
      peerRef.current = peer;
      peer.ontrack = (trackEvent) => {
        if (!audioRef.current) return;
        audioRef.current.srcObject = trackEvent.streams[0];
        void audioRef.current.play().catch(() => {});
      };
      peer.onconnectionstatechange = () => {
        if (peer.connectionState === "failed") {
          setCallError("The live audio connection failed. Try starting the call again.");
          stopConnection("error");
        }
      };

      if (textOnly) {
        peer.addTransceiver("audio", { direction: "recvonly" });
        setMicAvailable(false);
      } else {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          });
          streamRef.current = stream;
          stream.getAudioTracks().forEach((track) => {
            track.enabled = false;
            peer.addTrack(track, stream);
          });
          openingMicRef.current = true;
          setOpeningMic(true);
          setMuted(true);
          setMicAvailable(true);
        } catch {
          peer.addTransceiver("audio", { direction: "recvonly" });
          setMicAvailable(false);
        }
      }

      const channel = peer.createDataChannel("oai-events");
      channelRef.current = channel;
      channel.onmessage = (message) => {
        try {
          handleRealtimeEvent(JSON.parse(message.data) as Record<string, unknown>, activeScenarioId);
        } catch {
          // Ignore malformed events; keep the live media path active.
        }
      };
      channel.onopen = () => {
        startedAtRef.current = Date.now();
        setStatus("live");
        channel.send(JSON.stringify({
          type: "response.create",
          response: { output_modalities: ["audio"] },
        }));
      };

      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      const answerResponse = await fetch("https://api.openai.com/v1/realtime/calls", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + ephemeral,
          "Content-Type": "application/sdp",
        },
        body: offer.sdp,
      });
      if (!answerResponse.ok) {
        throw new Error(openAIConnectionError(answerResponse.status, await answerResponse.text()));
      }
      await peer.setRemoteDescription({
        type: "answer",
        sdp: await answerResponse.text(),
      });
    } catch (error) {
      setCallError(error instanceof Error ? error.message : "Could not start the live representative.");
      stopConnection("error");
    }
  }

  function toggleMute() {
    if (openingMicRef.current) return;
    const track = streamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = muted;
    setMuted(!muted);
  }

  function sendTypedReply() {
    const text = typedReply.trim();
    const channel = channelRef.current;
    if (!text || !channel || channel.readyState !== "open") return;
    channel.send(JSON.stringify({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text }],
      },
    }));
    cancelBackgroundCoaching();
    replyTimingRef.current = { started: performance.now(), cueMs: null, requestMs: null, audioStarted: false };
    typedReplyPendingRef.current = true;
    // Request audio immediately. Background assessment waits for primary generation.
    requestTypedResponse();
    commitTurn("typed-" + Date.now(), "customer", text, scenarioId);
    setTypedReply("");
  }

  function jumpToEvidence(ids: string[]) {
    setCenterTab("transcript");
    setTranscriptOpen(true);
    window.setTimeout(() => scrollToEvidence(ids), 120);
  }

  return (
    <div className="studio reference-studio">
      <audio ref={audioRef} autoPlay playsInline aria-hidden="true" />
      <aside className="nav-rail">
        <div className="schwab-mark" aria-label="Charles Schwab training demo"><span>charles</span><strong>SCHWAB</strong></div>
        <nav className="rail-navigation" aria-label="Workspace">
          <button type="button" className="rail-link active" onClick={() => setInsightTab("insights")}><AudioLines size={19} /><span>Live Call</span></button>
          <button type="button" className="rail-link" onClick={() => setTranscriptOpen(true)}><Headphones size={18} /><span>Transcript</span></button>
          <button type="button" className="rail-link" onClick={() => setInsightTab("references")}><ExternalLink size={18} /><span>Knowledge</span></button>
        </nav>
        <div className="rail-note"><Activity size={21} /><strong>Ready to help</strong><span>Smarter conversations.<br />Clearer decisions.</span></div>
      </aside>

      <div className="app-content">
        <header className="app-topbar">
          <p>Relationship Copilot<small>Listen closely. Connect confidently.</small></p>
          <div className="app-topbar-actions">
            <span className="training-label"><span /> TRAINING SIMULATION</span>
            <div className={"top-speaker " + (speaker ?? (waitingForRepresentative ? "thinking" : "idle"))} role="status" aria-live="polite"><span className="top-speaker-wave" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /></span><span>{speaker === "customer" ? "You are speaking" : speaker === "representative" ? "Jordan speaking" : waitingForRepresentative ? "Jordan preparing reply" : status === "live" ? "Your turn" : "Audio ready"}</span></div>
            <span className="representative-avatar">YOU</span>
            <span className="representative-name">Client<small>{selected?.callerName ?? "Practice call"}</small></span>
          </div>
        </header>

        <div className="call-strip">
          <div className="call-strip-state">
            <span className={"call-state-pill" + (status === "live" ? " live" : status === "preview" ? " preview" : "")}><span /> {status === "live" ? "Live Call" : status === "preview" ? "Sample Replay" : status === "connecting" ? "Connecting" : status === "ended" ? previewMode ? "Sample Complete" : "Call Ended" : status === "ready" ? "Role Ready" : "Choose a Call"}</span>
            <time>{timeLabel(seconds)}</time>
          </div>
          <div className="call-strip-person">
            <strong>{selected?.callerName ?? "New caller"}</strong>
            <span>{selected ? "You play the client · Jordan is the AI representative" : "Choose a fresh client role to begin"}</span>
          </div>
          <CallWaveform speaker={speaker} waiting={waitingForRepresentative} />
          <div className="call-strip-actions">
            {status === "live" || status === "preview" ? (
              <button className="strip-end" type="button" onClick={() => stopConnection("ended")}><PhoneOff size={16} /> {status === "preview" ? "Stop Replay" : "End Call"}</button>
            ) : (
              <button className="strip-start" type="button" disabled={status === "connecting"} onClick={() => status === "ready" ? void startCall() : prepareCall()}><Phone size={16} /> {status === "connecting" ? "Connecting…" : status === "ready" ? "Call Jordan" : "New Client Role"}</button>
            )}
          </div>
        </div>



        {callError && <div className="call-error" role="alert"><CircleAlert size={17} />{callError}</div>}

        <main className={"call-grid insight-focus" + (transcriptOpen ? " transcript-open" : "") + (selected?.profile ? " with-profile" : "")}>
          {transcriptOpen && <section className="transcript-pane" aria-label="Conversation">
            <div className="pane-tabs">
              <button type="button" className={centerTab === "transcript" ? "active" : ""} onClick={() => setCenterTab("transcript")}>Live Transcript</button>
              <button type="button" className={centerTab === "timeline" ? "active" : ""} onClick={() => setCenterTab("timeline")}>Call Timeline</button>
              <span className="pane-tab-spacer" />
              <span className="capture-indicator"><span className={status === "live" ? "on" : ""} /> {status === "live" ? "LIVE" : "READY"}</span>
            </div>

            {centerTab === "transcript" ? (
              <>
                {analysis?.tags.length ? <div className="live-tags">{analysis.tags.map((tag) => <button type="button" key={tag.id} className={"live-tag kind-" + tag.kind} onClick={() => jumpToEvidence(tag.evidenceIds)}>{tag.label}</button>)}</div> : null}
                <div className="transcript-feed" ref={transcriptFeedRef}>
                  {turns.length === 0 && draftList.length === 0 ? (
                    <div className="reference-empty"><span><AudioLines size={28} /></span><h2>{status === "ready" ? "Your role is ready" : "Start a conversation"}</h2><p>{status === "ready" ? "Call Jordan when you are ready. He will greet you; explain why you called, then respond naturally to his questions." : "Choose a client role. Every insight will be grounded in what you and Jordan say."}</p></div>
                  ) : (
                    <>
                      {turns.map((turn) => (
                        <article id={"turn-" + turn.id} key={turn.id} className={"feed-turn role-" + turn.role}>
                          <span className="feed-avatar">{turn.role === "customer" ? "YOU" : "JR"}</span>
                          <div><time>{timeLabel(turn.at)}</time><p>{turn.text}</p></div>
                        </article>
                      ))}
                      {draftList.map((draft) => (
                        <article key={draft.id} className={"feed-turn role-" + draft.role + " draft"}>
                          <span className="feed-avatar">{draft.role === "customer" ? "YOU" : "JR"}</span>
                          <div><time>CAPTURING</time><p>{draft.text}<span className="cursor" /></p></div>
                        </article>
                      ))}
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="timeline-feed">
                {turns.length ? turns.map((turn, index) => <button type="button" key={turn.id} onClick={() => jumpToEvidence([turn.id])}><span className="timeline-index">{(index + 1).toString().padStart(2, "0")}</span><span><strong>{turn.role === "customer" ? `You · ${selected?.callerName}` : "Jordan · representative"}</strong><small>{turn.text}</small></span><time>{timeLabel(turn.at)}</time></button>) : <div className="reference-empty"><span><Activity size={28} /></span><h2>Call timeline</h2><p>Conversation milestones will appear here as the call unfolds.</p></div>}
              </div>
            )}
            <div className="transcript-bottom">
              <div className="speaking-status"><span className={"mini-wave" + (speaker ? " active" : "")}><i /><i /><i /><i /></span><strong>{speaker === "customer" ? "You are speaking…" : speaker === "representative" ? "Jordan is speaking…" : waitingForRepresentative ? "Jordan preparing reply…" : status === "live" ? "Your turn" : "Live captions begin when the call starts"}</strong><span className="speaking-dots">•••</span></div>
            </div>
          </section>}

          <aside className="call-right" aria-label="AI insights">
            <div className="pane-tabs">
              <button type="button" className={insightTab === "insights" ? "active" : ""} onClick={() => setInsightTab("insights")}>AI Insights</button>
              <button type="button" className={insightTab === "references" ? "active" : ""} onClick={() => setInsightTab("references")}>References</button>
              <span className="pane-tab-spacer" /><span className="capture-indicator"><span className={status === "live" ? "on" : ""} /> {analyzing ? "ASSESSING" : status === "live" ? "LIVE" : "READY"}</span><button type="button" className="transcript-toggle" onClick={() => setTranscriptOpen((open) => !open)}>{transcriptOpen ? "Hide transcript" : "Show transcript"}</button>
            </div>
            {insightTab === "insights" ? (
              <div className="right-feed decision-view">
                <CallReasonVisual analysis={analysis} quickReason={quickReason} fastReason={null} score={displayReasonScore} serviceProgress={displayServiceProgress} onEvidence={jumpToEvidence} />
                {status === "ended" ? <CompletedCallSummary paths={completedPaths} turns={turns} onEvidence={jumpToEvidence} /> : <CueBoard analysis={analysis} cue={streamedCue} paths={visiblePaths} turns={turns} updating={analyzing} speaking={speaker === "customer"} onEvidence={jumpToEvidence} />}
                {status === "ended" && <CallTransition customerTurn={pivotCustomerTurn} representativeTurn={pivotRepresentativeTurn} milestones={pathMilestones} serviceEvent={serviceEvent} onEvidence={jumpToEvidence} />}
                {analysisError && <div className="analysis-error" role="status"><CircleAlert size={16} />{analysisError}</div>}
              </div>
            ) : (
              <div className="reference-list">
                <h2>Approved source material</h2>
                <p>Current Schwab references for paths raised in this call. Eligibility and suitability require the formal Schwab process.</p>
                {relationshipReady && visiblePaths.map((path) => <a key={path.id} href={path.sourceUrl} target="_blank" rel="noreferrer"><strong>{path.name}</strong><small>{path.description}</small><ExternalLink size={16} /></a>)}
                {(!relationshipReady || visiblePaths.length === 0) && <p>Relevant offering references will appear after the original service request is completed.</p>}
                {analysis?.callReason.taxonomySourceLine && <div className="taxonomy-reference"><strong>Call reason taxonomy</strong><small>Category: {analysis.callReason.category} · Subcategory: {analysis.callReason.subcategory} · Source row {analysis.callReason.taxonomySourceLine}</small></div>}
                {analysis && analysis.callReason.category !== "Unclassified" && !analysis.callReason.taxonomySourceLine && <div className="taxonomy-reference"><strong>Scenario classification</strong><small>Category: {analysis.callReason.category} · Subcategory: {analysis.callReason.subcategory} · Demo mapping for the expanded script library</small></div>}
              </div>
            )}
          </aside>
          {selected?.profile && <ClientProfilePanel name={selected.callerName} age={selected.age} profile={selected.profile} turns={turns} verified={verificationConfirmed || demoVerificationComplete(turns)} onVerify={() => setVerificationConfirmed(true)} />}
        </main>

        {status === "live" && <div className="call-composer"><span className={"mini-wave" + (speaker ? " active" : "")}><i /><i /><i /><i /></span><strong>{speaker === "customer" ? "You are speaking…" : speaker === "representative" ? "Jordan is speaking…" : waitingForRepresentative ? "Jordan preparing reply…" : "Your turn as client"}</strong><div className="typed-reply"><input value={typedReply} onChange={(event) => setTypedReply(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") sendTypedReply(); }} placeholder={micAvailable ? "Speak or type as the client…" : "Type as the client…"} aria-label="Type a reply as the client" /><button type="button" onClick={sendTypedReply} disabled={!typedReply.trim()} aria-label="Send typed reply"><Send size={17} /></button></div></div>}

        <footer className="call-footer">
          <div className="footer-controls"><button type="button" onClick={toggleMute} disabled={status !== "live" || !micAvailable || openingMic}>{muted ? <MicOff size={18} /> : <Mic size={18} />}{muted ? "Unmute" : "Mute"}</button><span className="footer-divider" /><span>{openingMic ? "Microphone opens after Jordan greets you" : micAvailable ? "Microphone " + (status === "live" ? "connected" : "ready") : "Type to reply"}</span>{status === "ready" && <><span className="footer-divider" /><button type="button" onClick={() => void startCall(true)}>Call Jordan by text</button></>}</div>
          <div className="footer-status"><span className={analyzing ? "active" : ""} /><span>{analysisError ? "Realtime coaching needs attention" : analyzing ? "Updating offering evidence in background" : waitingForRepresentative ? "Waiting for Jordan's response" : analysis ? "Insights up to date" : "Awaiting conversation"}</span></div>
        </footer>
      </div>
    </div>
  );
}
