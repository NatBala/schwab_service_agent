"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowRight,
  AudioLines,
  Check,
  ChevronDown,
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
import { computeFastPacket, fastDiscoveryQuestion, type FastPacket } from "@/lib/fast-recommendations";
import { RELATIONSHIP_PATHS } from "@/lib/relationship-paths";

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
type PreviewLine = { speaker: "customer" | "representative"; text: string };

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
  representativeGuidance: Evidence & { nextStep: string; question: string; rationale: string };
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

function RecommendationTile({ analysis, fastPacket, focusedPath, otherPaths, serviceProgress, ended, customerSpeaking, awaitingClientAnswer, modelGuidanceCurrent, fresh, error, latestCustomerTurn, latestRepresentativeTurn, evidenceTurn, cueLatencyMs, onEvidence }: {
  analysis: Analysis | null;
  fastPacket: FastPacket | null;
  focusedPath: Analysis["relationshipPaths"][number] | undefined;
  otherPaths: Analysis["relationshipPaths"];
  serviceProgress: number;
  ended: boolean;
  customerSpeaking: boolean;
  awaitingClientAnswer: boolean;
  modelGuidanceCurrent: boolean;
  fresh: boolean;
  error: string;
  latestCustomerTurn: Turn | undefined;
  latestRepresentativeTurn: Turn | undefined;
  evidenceTurn: Turn | undefined;
  cueLatencyMs: number | null;
  onEvidence: (ids: string[]) => void;
}) {
  const awaitingCue = !ended && (customerSpeaking || (!!latestCustomerTurn && !fresh));
  if (awaitingCue) return <section className="recommendation-tile cue-pending" aria-label="Representative guidance" aria-live="polite">
    <div className="recommendation-top"><span className="recommendation-eyebrow"><Sparkles size={16} /> COPILOT GUIDANCE FOR JORDAN</span><span className={"recommendation-live" + (!error ? " updating" : "")}><i />{error ? "Unavailable" : customerSpeaking ? "Listening" : "Updating"}</span></div>
    <div className="recommendation-intro"><div><span className="recommendation-stage">{customerSpeaking ? "CUSTOMER SPEAKING" : "CUSTOMER FINISHED"}</span><h2>{error ? "Next move unavailable" : customerSpeaking ? "Listen for the need" : "Finding your next move"}</h2><p>{error ? "The latest answer could not be analyzed. Continue the service conversation and check the insight status below." : customerSpeaking ? "The next cue will follow this answer." : "Building a cue from the latest customer statement."}</p></div></div>
    <div className="recommendation-bottom"><span>Service request <b>{serviceProgress}%</b></span><div className="recommendation-progress"><i style={{ width: `${serviceProgress}%` }} /></div></div>
  </section>;
  const guidance = modelGuidanceCurrent ? analysis?.representativeGuidance ?? fastPacket?.guidance : fastPacket?.guidance ?? analysis?.representativeGuidance;
  const isDiscovery = !!focusedPath;
  const title = fastPacket?.guidance.title ?? focusedPath?.name ?? (analysis?.serviceStatus.state === "resolved" ? "Open the broader conversation" : "Handle the call reason");
  const nextStep = awaitingClientAnswer ? "Let the client answer Jordan's latest question before advancing the conversation." : guidance?.nextStep || "Listen to the caller's request and clarify the next service step.";
  const question = ended || awaitingClientAnswer ? "" : guidance?.question;
  const evidenceIds = guidance?.evidenceIds.length ? guidance.evidenceIds : focusedPath?.evidenceIds ?? [];
  const summary = focusedPath?.rationale ?? fastPacket?.guidance.rationale ?? analysis?.serviceStatus.summary ?? "The caller's immediate request will appear here.";
  return <section className={"recommendation-tile" + (isDiscovery ? " has-path" : " service-mode")} aria-label="Representative guidance" aria-live="polite">
    <div className="recommendation-top"><span className="recommendation-eyebrow"><Sparkles size={16} /> {ended ? "RECOMMENDED FOLLOW-UP" : "COPILOT GUIDANCE FOR JORDAN"}</span><span className="recommendation-live"><i />{ended ? "At call close" : cueLatencyMs !== null && latestCustomerTurn ? `Ready in ${cueLatencyMs} ms` : latestCustomerTurn ? `After client · ${timeLabel(latestCustomerTurn.at)}` : "Ready"}</span></div>
    <div className="recommendation-intro"><div><span className="recommendation-stage">{awaitingClientAnswer ? "CLIENT TURN" : isDiscovery ? focusedPath.status === "explore" ? "READY TO EXPLORE" : focusedPath.status === "hold" ? "PAUSE AND CLARIFY" : "NEED DETECTED" : (fastPacket?.serviceState ?? analysis?.serviceStatus.state) === "resolved" ? "SERVICE ANSWERED" : "SERVICE FIRST"}</span><h2>{title}</h2><p>{summary}</p></div>{isDiscovery && <span className="recommendation-family">{focusedPath.family}</span>}</div>
    <div className="recommendation-action"><span>{ended ? "FOLLOW-UP STEP" : "SUGGESTED NEXT MOVE"}</span><strong>{nextStep}</strong>{question && <p><b>Possible question</b> “{question}”</p>}{guidance?.rationale && guidance.rationale !== summary && <small className="recommendation-why">WHY NOW · {guidance.rationale}</small>}</div>
    {latestRepresentativeTurn && <div className="representative-grounding"><span>JORDAN ACTUALLY SAID · {timeLabel(latestRepresentativeTurn.at)}</span><p>{latestRepresentativeTurn.text}</p></div>}
    {evidenceTurn && evidenceIds.includes(evidenceTurn.id) && <button type="button" className="recommendation-evidence" onClick={() => onEvidence(evidenceIds)}><span>HEARD FROM THE CUSTOMER</span><q>{evidenceTurn.text}</q><ArrowRight size={16} /></button>}
    <div className="recommendation-bottom"><span>Service request <b>{serviceProgress}%</b></span><div className="recommendation-progress"><i style={{ width: `${serviceProgress}%` }} /></div>{otherPaths.length > 0 && <div className="recommendation-other"><small>ALSO EMERGING</small>{otherPaths.slice(0, 3).map((path) => <span key={path.id}>{path.name}</span>)}</div>}</div>
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
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  return <section className="reason-visual" aria-label="Call reason and confidence">
    <div className="reason-visual-gauge" role="img" aria-label={`Call reason confidence ${score} percent`}>
      <svg viewBox="0 0 112 112" aria-hidden="true"><circle className="reason-visual-track" cx="56" cy="56" r={radius} /><circle className="reason-visual-fill" cx="56" cy="56" r={radius} strokeDasharray={circumference} strokeDashoffset={circumference * (1 - score / 100)} /></svg>
      <span><strong>{score}<small>%</small></strong><small>confidence</small></span>
    </div>
    <div className="reason-visual-content">
      <div className="reason-visual-head"><span>CALL REASON · LIVE CLASSIFICATION</span><b>{fastReason || confirmedReason ? "Identified" : quickReason ? "Initial match" : "Listening"}</b></div>
      <h2>{identified ? reason.reason : "Listening for the call reason"}</h2>
      <div className="reason-visual-taxonomy"><span><small>CATEGORY</small><strong>{identified ? reason.category : "Awaiting caller"}</strong></span><i /><span><small>SUBCATEGORY</small><strong>{identified ? reason.subcategory : "—"}</strong></span></div>
      <div className="reason-visual-bottom"><span>Service request <b>{serviceProgress}%</b></span><div><i style={{ width: `${serviceProgress}%` }} /></div>{identified && !!reason.evidenceIds.length && <button type="button" onClick={() => onEvidence(reason.evidenceIds)}>View evidence <ArrowRight size={13} /></button>}</div>
    </div>
  </section>;
}

function CustomerProfileStrip({ name, age, profile, turns, expanded, onToggle }: {
  name: string;
  age: number;
  profile: CustomerProfile;
  turns: Turn[];
  expanded: boolean;
  onToggle: () => void;
}) {
  const customerWords = turns.filter((turn) => turn.role === "customer").map((turn) => turn.text.toLowerCase()).join(" ");
  const learned = profile.discoverable.filter((fact) => fact.phrases.some((phrase) => customerWords.includes(phrase.toLowerCase())));
  return <section className="customer-profile" aria-label="Customer profile">
    <div className="profile-primary"><span className="profile-avatar"><UserRound size={19} /></span><span><small>CLIENT PROFILE · SYNTHETIC CRM</small><strong>{name}</strong></span></div>
    <div className="profile-metric"><small>AGE</small><strong>{age > 0 ? age : "Not on file"}</strong></div>
    <div className="profile-metric"><small>RELATIONSHIP</small><strong>{profile.relationship}</strong></div>
    <div className="profile-metric"><small>ACCOUNTS</small><strong>{profile.accounts.length ? `${profile.accounts.length} on file` : "Not established"}</strong></div>
    <div className="profile-metric"><small>PRIOR CONTACTS</small><strong>{profile.priorContacts} simulated</strong></div>
    <button className="profile-expand" type="button" aria-expanded={expanded} onClick={onToggle}>View profile <ChevronDown size={15} /></button>
    {expanded && <div className="profile-detail">
      <div className="profile-detail-head"><div><small>RELATIONSHIP SNAPSHOT</small><h2>{name}</h2><p>{profile.context}</p></div><span>Training data</span></div>
      <div className="profile-detail-grid">
        <div><h3>Accounts and assets</h3>{profile.accounts.length ? profile.accounts.map((account) => <div className="profile-account" key={account.name}><strong>{account.name}</strong><span>{account.detail}</span></div>) : <p>No existing Schwab account confirmed for this caller.</p>}</div>
        <div><h3>Contact history</h3><div className="profile-account"><strong>{profile.priorContacts} prior simulated {profile.priorContacts === 1 ? "contact" : "contacts"}</strong><span>Most recent: {profile.lastContact}</span></div><p>Contact history is added for this demo and is not a supplied call record.</p></div>
        <div><h3>Learned in this call</h3>{learned.length ? <div className="profile-learned">{learned.map((fact) => <span key={fact.label}>{fact.label}</span>)}</div> : <p>Household and goal details appear here when the customer shares them.</p>}</div>
      </div>
    </div>}
  </section>;
}

function AutomatedCriteria({ criteria, onEvidence }: { criteria: Analysis["criteria"]; onEvidence: (ids: string[]) => void }) {
  const met = criteria.filter((item) => item.status === "met").length;
  return <div className="path-criteria">
    <div className="path-criteria-head"><strong>Automated investing requirements</strong><span>{met} of {criteria.length} established</span></div>
    <div className="path-criteria-track"><i style={{ width: `${criteria.length ? met / criteria.length * 100 : 0}%` }} /></div>
    <div className="path-criteria-list">{criteria.map((criterion) => <button type="button" key={criterion.id} className={"path-criterion " + criterion.status} title={criterion.rationale} disabled={!criterion.evidenceIds.length} onClick={() => onEvidence(criterion.evidenceIds)}><span>{criterion.status === "met" ? <Check size={12} /> : criterion.status === "not_met" ? "!" : "·"}</span>{criterion.label}</button>)}</div>
    <p>Conversation evidence only. The formal investor questionnaire determines eligibility and portfolio recommendations.</p>
  </div>;
}

function OfferingTile({ path, criteria, turns, current, rank, onEvidence }: {
  path: Analysis["relationshipPaths"][number];
  criteria: Analysis["criteria"];
  turns: Turn[];
  current: boolean;
  rank?: number;
  onEvidence: (ids: string[]) => void;
}) {
  const quote = [...turns].reverse().find((turn) => turn.role === "customer" && path.evidenceIds.includes(turn.id));
  const status = {
    possible: "To explore",
    emerging: "Signal detected",
    explore: "Ready to discuss",
    hold: "On hold",
    ruled_out: "Ruled out",
  }[path.status];
  return <article className={"offering-tile status-" + path.status + (current ? " is-current" : "") + (rank === 1 ? " top-recommendation" : "") + (path.id === "automated_investing" ? " automated-tile" : "")}>
    <div className="offering-tile-top"><span>{path.family}</span><b>{rank ? `#${rank} · ${status}` : status}</b></div>
    <div className="offering-title-row"><h3>{path.name}</h3>{path.signalConfidence !== null && <strong>{path.signalConfidence}%<small>signal confidence</small></strong>}</div>
    {path.signalConfidence !== null && <div className="offering-confidence"><i style={{ width: `${path.signalConfidence}%` }} /></div>}
    <p className="offering-rationale">{path.status === "possible" ? "No customer statement supports this path yet. Explore only if the caller raises a related need." : path.rationale}</p>
    <div className="offering-guidance"><span>{path.status === "possible" ? "DISCOVERY GUIDELINE" : "NEXT STEP"}</span><p>{path.nextStep}</p></div>
    {quote && <button type="button" className="offering-evidence" onClick={() => onEvidence(path.evidenceIds)}><q>{quote.text}</q><ArrowRight size={14} /></button>}
    {path.id === "automated_investing" && criteria.length > 0 && <AutomatedCriteria criteria={criteria} onEvidence={onEvidence} />}
    <a className="offering-source" href={path.sourceUrl} target="_blank" rel="noreferrer">Schwab source <ExternalLink size={13} /></a>
  </article>;
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
  const [fastPacket, setFastPacket] = useState<FastPacket | null>(null);
  const [cueLatencyMs, setCueLatencyMs] = useState<number | null>(null);
  const [analyzedCustomerTurnId, setAnalyzedCustomerTurnId] = useState("");
  const [analyzedTurnId, setAnalyzedTurnId] = useState("");
  const [journeyEvents, setJourneyEvents] = useState<JourneyEvent[]>([]);
  const [latestPathId, setLatestPathId] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
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
  const [profileOpen, setProfileOpen] = useState(false);
  const [briefOpen, setBriefOpen] = useState(true);

  const peerRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RTCDataChannel | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const turnsRef = useRef<Turn[]>([]);
  const fastPacketRef = useRef<FastPacket | null>(null);
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
  const analysisAbortRef = useRef<AbortController | null>(null);
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
  const fastReason: QuickReason | null = fastPacket?.callReason ? {
    ...fastPacket.callReason,
    confidence: fastPacket.callReason.confidence >= 80 ? "high" : fastPacket.callReason.confidence >= 55 ? "medium" : "low",
  } : null;
  const displayServiceProgress = fastPacket?.serviceProgress ?? serviceProgress;
  const displayReasonScore = fastPacket?.callReason?.confidence ?? reasonScore;
  const reasonIdentified = !!fastReason || !!quickReason || !!analysis && analysis.callReason.category !== "Unclassified";
  const relationshipReady = reasonIdentified && fastPacket?.serviceState === "resolved";
  const visiblePaths: Analysis["relationshipPaths"] = relationshipReady ? fastPacket?.paths ?? [] : [];
  // Preserve the fast engine's order so the leading tile and live cue agree.
  const recommendedPaths = visiblePaths.filter((path) => path.status === "emerging" || path.status === "explore");
  const heldPaths = visiblePaths.filter((path) => path.status === "hold");
  const watchPaths: Analysis["relationshipPaths"] = relationshipReady ? (fastPacket?.candidatePathIds ?? [])
    .filter((id) => !visiblePaths.some((path) => path.id === id) && !fastPacket?.blockedPathIds.includes(id))
    .flatMap((id) => {
      const catalog = RELATIONSHIP_PATHS.find((path) => path.id === id);
      return catalog ? [{ ...catalog, status: "possible" as const, signalConfidence: 0, rationale: "No customer statement supports this path yet.", nextStep: fastDiscoveryQuestion(id), evidenceIds: [] }] : [];
    }) : [];
  const currentCriteria = analyzedCustomerTurnId === fastPacket?.throughCustomerTurnId ? analysis?.criteria ?? [] : [];
  const focusedPath = recommendedPaths[0] ?? heldPaths[0];
  const latestCustomerTurn = turns.findLast((turn) => turn.role === "customer");
  const latestRepresentativeTurn = turns.findLast((turn) => turn.role === "representative");
  const recommendationEvidenceIds = fastPacket?.guidance.evidenceIds.length ? fastPacket.guidance.evidenceIds : focusedPath?.evidenceIds ?? [];
  const recommendationEvidenceTurn = [...turns].reverse().find((turn) => turn.role === "customer" && recommendationEvidenceIds.includes(turn.id));
  const firstPathEvent = relationshipReady ? journeyEvents.find((event) => event.pathId !== "call-reason" && event.pathId !== "service") : undefined;
  const pivotTurnIndex = firstPathEvent ? turns.findIndex((turn) => firstPathEvent.evidenceIds.includes(turn.id)) : -1;
  const pivotCustomerTurn = pivotTurnIndex >= 0 ? turns[pivotTurnIndex] : null;
  const serviceEvent = journeyEvents.find((event) => event.pathId === "service");
  const pivotRepresentativeTurn = pivotTurnIndex >= 0 ? [...turns.slice(0, pivotTurnIndex)].reverse().find((turn) => turn.role === "representative" && turn.at >= (serviceEvent?.at ?? 0) && /\?|\b(?:what|how|when|why|tell me|would you|do you|could you)\b/i.test(turn.text)) : null;
  const pathMilestones = relationshipReady ? journeyEvents.filter((event, index, all) => event.pathId !== "call-reason" && event.pathId !== "service" && all.findIndex((item) => item.pathId === event.pathId) === index).slice(0, 5) : [];

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
        fastPacket?.throughCustomerTurnId !== latestCustomerTurn.id ||
        lastCueRenderedTurnRef.current === latestCustomerTurn.id) return;
    const frame = window.requestAnimationFrame(() => {
      lastCueRenderedTurnRef.current = latestCustomerTurn.id;
      if (clientSpeechStoppedAtRef.current !== null) {
        setCueLatencyMs(Math.max(0, Math.round(performance.now() - clientSpeechStoppedAtRef.current)));
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [fastPacket, latestCustomerTurn, speaker, status]);

  useEffect(() => {
    return () => {
      analysisVersionRef.current += 1;
      analysisAbortRef.current?.abort();
      if (analysisTimerRef.current !== null) window.clearTimeout(analysisTimerRef.current);
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
    setFastPacket(null);
    setCueLatencyMs(null);
    clientSpeechStoppedAtRef.current = null;
    lastCueRenderedTurnRef.current = "";
    setAnalyzedCustomerTurnId("");
    setAnalyzedTurnId("");
    fastPacketRef.current = null;
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
    setProfileOpen(false);
    setBriefOpen(true);
  }

  function stopConnection(nextStatus: CallStatus = "ended") {
    if (nextStatus === "error") cancelAnalysis();
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
    analysisPendingRef.current = null;
    if (analysisTimerRef.current !== null) window.clearTimeout(analysisTimerRef.current);
    analysisTimerRef.current = null;
    analysisAbortRef.current?.abort();
    analysisAbortRef.current = null;
    setAnalyzing(false);
  }

  function acceptAnalysis(next: Analysis | null) {
    if (!next) return;
    setAnalysis((current) => ({
      ...next,
      criteria: next.criteria.map((criterion) => {
        if (criterion.status !== "unknown") return criterion;
        const established = current?.criteria.find((item) => item.id === criterion.id && item.status !== "unknown");
        return established ?? criterion;
      }),
    }));
    if (next.callReason.category !== "Unclassified") {
      const evidenceCount = next.callReason.evidenceIds.length;
      const estimate = Math.min(97,
        (next.callReason.confidence === "high" ? 83 : next.callReason.confidence === "medium" ? 57 : 28)
        + Math.min(14, Math.max(0, evidenceCount - 1) * 7),
      );
      setReasonScore((current) => Math.max(current, estimate));
    }
    const milestone = next.serviceStatus.state === "resolved" ? 100 : next.serviceStatus.state === "in_progress" ? 55 : 20;
    setServiceProgress((current) => Math.max(current, milestone));
  }

  function resetDisplayScores() {
    setReasonScore(0);
    setQuickReason(null);
  }

  function queueAnalysis(nextTurns: Turn[], activeScenarioId: string) {
    analysisPendingRef.current = { turns: nextTurns, scenarioId: activeScenarioId };
    setAnalyzing(true);
    setAnalysisError("");
    if (analysisAbortRef.current) {
      // A newer transcript is more useful than an older request still in flight.
      analysisAbortRef.current.abort();
      return;
    }
    if (analysisTimerRef.current !== null) window.clearTimeout(analysisTimerRef.current);
    analysisTimerRef.current = window.setTimeout(() => {
      analysisTimerRef.current = null;
      void runPendingAnalysis();
    }, 300);
  }

  async function runPendingAnalysis() {
    if (analysisAbortRef.current) return;
    const pending = analysisPendingRef.current;
    if (!pending) return;
    analysisPendingRef.current = null;
    const controller = new AbortController();
    analysisAbortRef.current = controller;
    const version = analysisVersionRef.current;
    setAnalyzing(true);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarioId: pending.scenarioId, turns: pending.turns }),
        signal: controller.signal,
      });
      const payload = await response.json() as Analysis & { error?: string };
      if (!response.ok) throw new Error(payload.error || "Insight analysis is unavailable.");
      if (version === analysisVersionRef.current && !controller.signal.aborted) {
        acceptAnalysis(payload as Analysis);
        setAnalyzedCustomerTurnId(pending.turns.findLast((turn) => turn.role === "customer")?.id ?? "");
        setAnalyzedTurnId(pending.turns.at(-1)?.id ?? "");
        setAnalysisError("");
      }
    } catch (error) {
      if (version === analysisVersionRef.current && !controller.signal.aborted && !analysisPendingRef.current) {
        setAnalysisError(error instanceof Error ? error.message : "Insight analysis is unavailable.");
      }
    } finally {
      if (analysisAbortRef.current === controller) {
        analysisAbortRef.current = null;
        if (analysisPendingRef.current) {
          analysisTimerRef.current = window.setTimeout(() => {
            analysisTimerRef.current = null;
            void runPendingAnalysis();
          }, 100);
        } else {
          setAnalyzing(false);
        }
      }
    }
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

  function recordFastEvents(previous: FastPacket | null, current: FastPacket, nextTurns: Turn[]) {
    const newEvents: JourneyEvent[] = [];
    const fromEvidence = (pathId: string, title: string, state: string, ids: string[]) => {
      const source = [...nextTurns].reverse().find((turn) => turn.role === "customer" && ids.includes(turn.id));
      if (!source) return;
      newEvents.push({ id: `${pathId}-${state}-${source.id}`, pathId, title, state, quote: source.text.slice(0, 175), evidenceIds: [source.id], at: source.at });
    };
    if (current.callReason && !previous?.callReason) {
      fromEvidence("call-reason", "Call reason identified", current.callReason.reason, current.callReason.evidenceIds);
    }
    if (current.serviceState === "resolved" && previous?.serviceState !== "resolved") {
      fromEvidence("service", "Service request answered", "Resolved", [current.throughCustomerTurnId]);
    }
    if (current.serviceState === "resolved") {
      for (const path of current.paths) {
        const prior = previous?.serviceState === "resolved" ? previous.paths.find((item) => item.id === path.id) : undefined;
        if (!prior || prior.status !== path.status || path.evidenceIds.some((id) => !prior.evidenceIds.includes(id))) {
          fromEvidence(path.id, path.name, prior ? path.status === "explore" ? "Ready to explore" : "More evidence" : "New path", path.evidenceIds);
        }
      }
    }
    if (newEvents.length) {
      setJourneyEvents((events) => [...events, ...newEvents.filter((event) => !events.some((prior) => prior.id === event.id))].slice(-48));
      const latestPath = newEvents.findLast((event) => event.pathId !== "call-reason" && event.pathId !== "service");
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
      const nextFastPacket = computeFastPacket(activeScenarioId, nextTurns);
      recordFastEvents(fastPacketRef.current, nextFastPacket, nextTurns);
      fastPacketRef.current = nextFastPacket;
      setFastPacket(nextFastPacket);
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
    if (role === "customer") setBriefOpen(false);
    setDrafts((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    setAwaitingCustomerReply(role === "customer" && !representativeResponseActiveRef.current);
    if (nextTurns.some((entry) => entry.role === "customer")) queueAnalysis(nextTurns, activeScenarioId);
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

  function handleRealtimeEvent(event: Record<string, unknown>, activeScenarioId: string) {
    const type = String(event.type ?? "");
    if (type === "output_audio_buffer.stopped") {
      if (speakerFallbackTimerRef.current !== null) window.clearTimeout(speakerFallbackTimerRef.current);
      speakerFallbackTimerRef.current = null;
      representativeResponseActiveRef.current = false;
      setSpeaker(null);
      const responseId = String(event.response_id ?? "");
      if (!openingResponseIdRef.current || !responseId || responseId === openingResponseIdRef.current) {
        releaseOpeningMic();
      }
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
      clientSpeechStoppedAtRef.current = null;
      setSpeaker("customer");
      setAwaitingCustomerReply(false);
      return;
    }
    if (type === "input_audio_buffer.speech_stopped") {
      clientSpeechStoppedAtRef.current = performance.now();
      setSpeaker(null);
      setAwaitingCustomerReply(true);
      return;
    }
    if (type === "response.created") {
      const response = event.response as { id?: unknown } | undefined;
      if (openingMicRef.current && !openingResponseIdRef.current && typeof response?.id === "string") {
        openingResponseIdRef.current = response.id;
      }
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
      return;
    }
    if (type === "error") {
      const info = event.error as { message?: string } | undefined;
      setCallError(info?.message ?? "The live session reported an error.");
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
    setProfileOpen(false);
    setPreviewMode(false);
    setCallError("");
    setAnalysisError("");
    setAnalysis(null);
    setFastPacket(null);
    setCueLatencyMs(null);
    clientSpeechStoppedAtRef.current = null;
    lastCueRenderedTurnRef.current = "";
    setAnalyzedCustomerTurnId("");
    setAnalyzedTurnId("");
    fastPacketRef.current = null;
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
      const tokenPayload = await tokenResponse.json() as { clientSecret?: string; error?: string };
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
        throw new Error("OpenAI could not connect the live representative (" + answerResponse.status + ").");
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
    channel.send(JSON.stringify({
      type: "response.create",
      response: { output_modalities: ["audio"] },
    }));
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
          <p>Advisor-grade insights.<br />In the moment.</p>
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
          <div className="call-strip-random"><Sparkles size={17} /><span><strong>Live representative</strong><small>New client role each call</small></span></div>
          <div className="call-strip-actions">
            {status === "live" || status === "preview" ? (
              <button className="strip-end" type="button" onClick={() => stopConnection("ended")}><PhoneOff size={16} /> {status === "preview" ? "Stop Replay" : "End Call"}</button>
            ) : (
              <button className="strip-start" type="button" disabled={status === "connecting"} onClick={() => status === "ready" ? void startCall() : prepareCall()}><Phone size={16} /> {status === "connecting" ? "Connecting…" : status === "ready" ? "Call Jordan" : "New Client Role"}</button>
            )}
          </div>
        </div>

        {selected?.profile && <CustomerProfileStrip name={selected.callerName} age={selected.age} profile={selected.profile} turns={turns} expanded={profileOpen} onToggle={() => setProfileOpen((open) => !open)} />}

        {callError && <div className="call-error" role="alert"><CircleAlert size={17} />{callError}</div>}

        <main className={"call-grid insight-focus" + (transcriptOpen ? " transcript-open" : "")}>
          {transcriptOpen && <section className="transcript-pane" aria-label="Conversation">
            <div className="pane-tabs">
              <button type="button" className={centerTab === "transcript" ? "active" : ""} onClick={() => setCenterTab("transcript")}>Live Transcript</button>
              <button type="button" className={centerTab === "timeline" ? "active" : ""} onClick={() => setCenterTab("timeline")}>Call Timeline</button>
              <span className="pane-tab-spacer" />
              <span className="capture-indicator"><span className={status === "live" ? "on" : ""} /> {status === "live" ? "LIVE" : "READY"}</span>
            </div>

            {centerTab === "transcript" ? (
              <>
                {selected?.clientBrief && <section className={"client-role-brief" + (briefOpen ? " open" : "")} aria-label="Your client role"><button type="button" className="client-role-brief-toggle" onClick={() => setBriefOpen((open) => !open)} aria-expanded={briefOpen}><span>YOUR ROLE · {selected.callerName}</span><span>{briefOpen ? "Hide brief" : "View brief"} <ChevronDown size={15} /></span></button>{briefOpen && <div className="client-role-brief-body"><p>{selected.clientBrief.situation}</p><strong>Share these details when Jordan asks</strong><ul>{selected.clientBrief.ifAsked.map((fact) => <li key={fact}>{fact}</li>)}</ul><small>Speak naturally as the client. Jordan only has the synthetic service record; your broader goals emerge from what you say.</small></div>}</section>}
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
              <span className="pane-tab-spacer" /><span className="capture-indicator"><span className={status === "live" ? "on" : ""} /> {analyzing ? "UPDATING" : status === "live" ? "LIVE" : "READY"}</span><button type="button" className="transcript-toggle" onClick={() => setTranscriptOpen((open) => !open)}>{transcriptOpen ? "Hide transcript" : "Show transcript"}</button>
            </div>
            {insightTab === "insights" ? (
              <div className="right-feed decision-view">
                <CallReasonVisual analysis={analysis} quickReason={quickReason} fastReason={fastReason} score={displayReasonScore} serviceProgress={displayServiceProgress} onEvidence={jumpToEvidence} />
                {status === "ended" && <CallTransition customerTurn={pivotCustomerTurn} representativeTurn={pivotRepresentativeTurn} milestones={pathMilestones} serviceEvent={serviceEvent} onEvidence={jumpToEvidence} />}
                <RecommendationTile key={fastPacket?.throughCustomerTurnId || "waiting"} analysis={analysis} fastPacket={fastPacket} focusedPath={focusedPath} otherPaths={visiblePaths.filter((path) => path.id !== focusedPath?.id)} serviceProgress={displayServiceProgress} ended={status === "ended"} customerSpeaking={status === "live" && speaker === "customer"} awaitingClientAnswer={status === "live" && turns.at(-1)?.role === "representative"} modelGuidanceCurrent={!!analysis && analyzedTurnId === turns.at(-1)?.id} fresh={!latestCustomerTurn || fastPacket?.throughCustomerTurnId === latestCustomerTurn.id} error={fastPacket ? "" : analysisError} latestCustomerTurn={latestCustomerTurn} latestRepresentativeTurn={latestRepresentativeTurn} evidenceTurn={recommendationEvidenceTurn} cueLatencyMs={cueLatencyMs} onEvidence={jumpToEvidence} />
                {relationshipReady && <section className="offering-landscape" aria-label="Schwab offering paths" aria-live="polite">
                  <div className="offering-landscape-head"><div><span>RELATIONSHIP INTELLIGENCE</span><h2>Recommended paths</h2><p>Ranked by what the customer has said. New evidence can change the order.</p></div><b>{recommendedPaths.length} supported · {watchPaths.length} on radar</b></div>
                  <div className="recommendation-engine-banner"><Sparkles size={17} /><span>{recommendedPaths.length ? <><strong>Leading path: {recommendedPaths[0].name}</strong><small>Compare the customer evidence and next step in each tile.</small></> : <><strong>No supported offering yet</strong><small>Explore the customer&apos;s broader need before discussing a product.</small></>}</span></div>
                  {recommendedPaths.length > 0 && <div className="offering-grid">{recommendedPaths.map((path, index) => <OfferingTile key={path.id} path={path} criteria={currentCriteria} turns={turns} current={path.id === latestPathId} rank={index + 1} onEvidence={jumpToEvidence} />)}</div>}
                  {heldPaths.length > 0 && <div className="offering-group"><h3>Needs review</h3><div className="offering-grid">{heldPaths.map((path) => <OfferingTile key={path.id} path={path} criteria={currentCriteria} turns={turns} current={path.id === latestPathId} onEvidence={jumpToEvidence} />)}</div></div>}
                  {watchPaths.length > 0 && <div className="offering-group watchlist"><h3>On the radar <small>Questions to test, not recommendations</small></h3><div className="offering-grid">{watchPaths.map((path) => <OfferingTile key={path.id} path={path} criteria={currentCriteria} turns={turns} current={false} onEvidence={jumpToEvidence} />)}</div></div>}
                  <p className="offering-disclaimer">Signal confidence reflects conversation evidence. It is not a suitability or eligibility score.</p>
                </section>}
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
        </main>

        {status === "live" && <div className="call-composer"><span className={"mini-wave" + (speaker ? " active" : "")}><i /><i /><i /><i /></span><strong>{speaker === "customer" ? "You are speaking…" : speaker === "representative" ? "Jordan is speaking…" : waitingForRepresentative ? "Jordan preparing reply…" : "Your turn as client"}</strong><div className="typed-reply"><input value={typedReply} onChange={(event) => setTypedReply(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") sendTypedReply(); }} placeholder={micAvailable ? "Speak or type as the client…" : "Type as the client…"} aria-label="Type a reply as the client" /><button type="button" onClick={sendTypedReply} disabled={!typedReply.trim()} aria-label="Send typed reply"><Send size={17} /></button></div></div>}

        <footer className="call-footer">
          <div className="footer-controls"><button type="button" onClick={toggleMute} disabled={status !== "live" || !micAvailable || openingMic}>{muted ? <MicOff size={18} /> : <Mic size={18} />}{muted ? "Unmute" : "Mute"}</button><span className="footer-divider" /><span>{openingMic ? "Microphone opens after Jordan greets you" : micAvailable ? "Microphone " + (status === "live" ? "connected" : "ready") : "Type to reply"}</span>{status === "ready" && <><span className="footer-divider" /><button type="button" onClick={() => void startCall(true)}>Call Jordan by text</button></>}</div>
          <div className="footer-status"><span className={analyzing ? "active" : ""} /><span>{analysisError ? "Deeper insight update failed · live guidance remains available" : analyzing && fastPacket ? "Live guidance ready · enriching insights" : analyzing ? "Analyzing latest turn" : waitingForRepresentative ? "Waiting for Jordan's response" : analysis ? "Insights up to date" : "Awaiting conversation"}</span></div>
        </footer>
      </div>
    </div>
  );
}
