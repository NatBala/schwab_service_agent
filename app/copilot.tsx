"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { canRunBackgroundCoaching, spokenReplyRequest } from "@/lib/realtime-turns";
import { demoVerificationComplete } from "@/lib/demo-verification";
import { callPathSummary } from "@/lib/call-path-summary";
import { openAIConnectionError } from "@/lib/openai-errors";
import { RELATIONSHIP_PATHS } from "@/lib/relationship-paths";
import { TAXONOMY } from "@/lib/taxonomy";
import {
  AudioLines,
  CircleAlert,
  Keyboard,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  RefreshCw,
  Send,
  Sparkles,
  Zap,
} from "lucide-react";
import { coachingRequest, parseRealtimeInsights, topRelationshipPaths, mergePathAssessments } from "@/lib/realtime-intelligence";
import { CUE_BUDGET_MS, cueDirectiveItem, cueRequest, readCue, type CueContext, type CueReason, type CueStage, type LiveCue } from "@/lib/live-cue";
import type { Analysis, CallStatus, CueStatus, JourneyEvent, Scenario, Turn } from "./studio-types";
import {
  CallReasonHero,
  CallTransition,
  CallWaveform,
  ClientProfilePanel,
  CompletedCallSummary,
  CueHero,
  OpportunityBoard,
  StageTrack,
  timeLabel,
  type OfferingCard,
} from "./studio-ui";

type Draft = { id: string; role: Turn["role"]; text: string };
type PendingCustomerItem = { responseId: string; parts: Map<number, string> };
type PendingCue = {
  version: number;
  /** Client turn the cue answers: an audio item ID or a committed typed turn ID. */
  clientTurnId: string;
  startedAt: number;
  budgetTimer: number | null;
  replied: boolean;
  /** Set when the API rejected an audio reference; the cue waits for the transcript instead. */
  awaitingTranscript: boolean;
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

function scrollToEvidence(ids: string[]) {
  const first = ids[0];
  if (!first) return;
  const element = document.getElementById("turn-" + first);
  const container = element?.closest(".chat-feed");
  if (!element || !(container instanceof HTMLElement)) return;
  const distance = element.getBoundingClientRect().top - container.getBoundingClientRect().top;
  container.scrollTo({ top: container.scrollTop + distance - 60, behavior: "smooth" });
  element.classList.remove("pulse");
  void element.offsetWidth;
  element.classList.add("pulse");
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
  const [journeyEvents, setJourneyEvents] = useState<JourneyEvent[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [awaitingCustomerReply, setAwaitingCustomerReply] = useState(false);
  const [callError, setCallError] = useState("");
  const [analysisError, setAnalysisError] = useState("");
  const [typedReply, setTypedReply] = useState("");
  const [micAvailable, setMicAvailable] = useState(true);
  const [openingMic, setOpeningMic] = useState(false);
  const [verificationConfirmed, setVerificationConfirmed] = useState(false);
  const [cue, setCue] = useState<LiveCue | null>(null);
  const [cueStatus, setCueStatus] = useState<CueStatus>("idle");
  const [cueLatencyMs, setCueLatencyMs] = useState<number | null>(null);
  const [callReason, setCallReason] = useState<CueReason | null>(null);
  const [reasonLatencyMs, setReasonLatencyMs] = useState<number | null>(null);
  const [reasonFlash, setReasonFlash] = useState(false);
  const [directedTurnIds, setDirectedTurnIds] = useState<string[]>([]);
  // Stage and offering focus persist between cues so the view does not flicker while the next one streams.
  const [stage, setStage] = useState<CueStage | null>(null);
  const [focusOfferingId, setFocusOfferingId] = useState("");

  const peerRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RTCDataChannel | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const turnsRef = useRef<Turn[]>([]);
  const analysisRef = useRef<Analysis | null>(null);
  const primaryGenerationRef = useRef(false);
  const primaryResponseActiveRef = useRef(false);
  const replyQueuedRef = useRef(false);
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
  const analysisVersionRef = useRef(0);
  const analysisPendingRef = useRef<{ turns: Turn[]; scenarioId: string } | null>(null);
  const transcriptFeedRef = useRef<HTMLDivElement | null>(null);
  const lastScenarioIdRef = useRef("");
  // LLM cue pipeline.
  const cueContextRef = useRef<CueContext>({});
  const cueVersionRef = useRef(0);
  const cuePendingRef = useRef<PendingCue | null>(null);
  const cueResponseIdsRef = useRef(new Set<string>());
  const activeCueIdRef = useRef("");
  const cueArgumentsRef = useRef(new Map<string, string>());
  const audioCueUnsupportedRef = useRef(false);
  const directiveItemIdRef = useRef("");
  const directedResponseIdsRef = useRef(new Set<string>());
  const directNextResponseRef = useRef(false);
  const callReasonRef = useRef<CueReason | null>(null);
  const firstClientTurnEndRef = useRef<number | null>(null);
  const reasonFlashTimerRef = useRef<number | null>(null);

  const selected = useMemo(
    () => scenarios.find((item) => item.id === scenarioId),
    [scenarioId, scenarios],
  );
  const draftList = Object.values(drafts);
  const isInCall = status === "connecting" || status === "live";
  const waitingForRepresentative = awaitingCustomerReply && status === "live";
  const relationshipReady = analysis?.serviceStatus.state === "resolved" || cue?.serviceState === "resolved";
  const completedPaths = analysis ? callPathSummary(analysis.relationshipPaths, turns) : [];
  const offeringCards = useMemo<OfferingCard[]>(() => {
    const assessed: OfferingCard[] = analysis ? topRelationshipPaths(analysis.relationshipPaths) : [];
    const focusId = focusOfferingId;
    if (!focusId) return assessed;
    const existing = assessed.find(path => path.id === focusId);
    if (existing) return [{ ...existing, focus: true }, ...assessed.filter(path => path.id !== focusId)];
    const catalog = RELATIONSHIP_PATHS.find(path => path.id === focusId);
    if (!catalog) return assessed;
    // The live coach chose this offering before the background assessment caught up.
    const focus: OfferingCard = { ...catalog, status: "emerging", signalConfidence: null, assessed: false, focus: true, question: "", rationale: "Selected by the live coach from the client's latest answer.", nextStep: "", evidenceIds: [] };
    return [focus, ...assessed].slice(0, 3);
  }, [analysis, focusOfferingId]);
  const displayStage = stage ?? (status === "live" ? "greeting" : null);
  const latestJordanTurn = turns.findLast((turn) => turn.role === "representative");
  const firstPathEvent = relationshipReady ? journeyEvents.find((event) => event.pathId !== "call-reason" && event.pathId !== "service" && event.pathId !== "service_recovery") : undefined;
  const pivotTurnIndex = firstPathEvent ? turns.findIndex((turn) => firstPathEvent.evidenceIds.includes(turn.id)) : -1;
  const pivotCustomerTurn = pivotTurnIndex >= 0 ? turns[pivotTurnIndex] : null;
  const serviceEvent = journeyEvents.find((event) => event.pathId === "service");
  const pivotRepresentativeTurn = pivotTurnIndex >= 0 ? [...turns.slice(0, pivotTurnIndex)].reverse().find((turn) => turn.role === "representative" && turn.at >= (serviceEvent?.at ?? 0) && /\?|\b(?:what|how|when|why|tell me|would you|do you|could you)\b/i.test(turn.text)) : null;
  const pathMilestones = relationshipReady ? journeyEvents.filter((event, index, all) => event.pathId !== "call-reason" && event.pathId !== "service" && event.pathId !== "service_recovery" && all.findIndex((item) => item.pathId === event.pathId) === index).slice(0, 5) : [];
  const reasonConfirmed = !!callReason && analysis?.callReason.reason === callReason.reason && analysis.callReason.category === callReason.category;
  const focusName = RELATIONSHIP_PATHS.find(path => path.id === (cue?.complete ? cue.offeringId : focusOfferingId))?.name ?? "";

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
    return () => {
      analysisVersionRef.current += 1;
      cueVersionRef.current += 1;
      if (coachingTimeoutRef.current !== null) window.clearTimeout(coachingTimeoutRef.current);
      if (openingMicTimerRef.current !== null) window.clearTimeout(openingMicTimerRef.current);
      if (speakerFallbackTimerRef.current !== null) window.clearTimeout(speakerFallbackTimerRef.current);
      if (reasonFlashTimerRef.current !== null) window.clearTimeout(reasonFlashTimerRef.current);
      channelRef.current?.close();
      peerRef.current?.close();
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  function resetCallState() {
    cancelAnalysis();
    clearCue();
    setSeconds(0);
    setMuted(false);
    setOpeningMic(false);
    openingMicRef.current = false;
    openingResponseIdRef.current = "";
    if (openingMicTimerRef.current !== null) window.clearTimeout(openingMicTimerRef.current);
    openingMicTimerRef.current = null;
    setSpeaker(null);
    setTurns([]);
    turnsRef.current = [];
    completeIdsRef.current.clear();
    itemOrderRef.current.clear();
    itemTimeRef.current.clear();
    pendingCustomerItemsRef.current.clear();
    responseItemIdsRef.current.clear();
    responseStatusRef.current.clear();
    coachingResponseIdsRef.current.clear();
    cueResponseIdsRef.current.clear();
    cueArgumentsRef.current.clear();
    directedResponseIdsRef.current.clear();
    directNextResponseRef.current = false;
    directiveItemIdRef.current = "";
    audioCueUnsupportedRef.current = false;
    nextItemOrderRef.current = 0;
    setDrafts({});
    setAnalysis(null);
    analysisRef.current = null;
    setJourneyEvents([]);
    setAwaitingCustomerReply(false);
    representativeResponseActiveRef.current = false;
    primaryResponseActiveRef.current = false;
    replyQueuedRef.current = false;
    setCallError("");
    setAnalysisError("");
    setCue(null);
    setCueStatus("idle");
    setCueLatencyMs(null);
    setCallReason(null);
    callReasonRef.current = null;
    setReasonLatencyMs(null);
    setReasonFlash(false);
    firstClientTurnEndRef.current = null;
    setDirectedTurnIds([]);
    setStage(null);
    setFocusOfferingId("");
  }

  function resetForScenario(id: string) {
    if (isInCall) return;
    resetCallState();
    setScenarioId(id);
    setStatus("ready");
    setTypedReply("");
    setMicAvailable(true);
    setVerificationConfirmed(false);
  }

  function stopConnection(nextStatus: CallStatus = "ended") {
    cancelAnalysis();
    clearCue();
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
    setCueStatus((current) => current === "thinking" || current === "streaming" || current === "directing" ? "idle" : current);
    setStatus(nextStatus);
  }

  /* ───────────── Live cue: LLM-generated before Jordan speaks ───────────── */

  function send(payload: unknown) {
    const channel = channelRef.current;
    if (channel?.readyState !== "open") return false;
    channel.send(JSON.stringify(payload));
    return true;
  }

  function clearCue() {
    cueVersionRef.current += 1;
    const pending = cuePendingRef.current;
    if (pending?.budgetTimer != null) window.clearTimeout(pending.budgetTimer);
    cuePendingRef.current = null;
    if (activeCueIdRef.current) send({ type: "response.cancel", response_id: activeCueIdRef.current });
    activeCueIdRef.current = "";
  }

  function assessmentSummary() {
    const current = analysisRef.current;
    if (!current) return null;
    return {
      serviceState: current.serviceStatus.state,
      supportedOfferings: topRelationshipPaths(current.relationshipPaths).map(({ id, status, signalConfidence }) => ({ id, status, signalConfidence })),
      criteria: current.criteria.filter(item => item.status !== "unknown").map(({ id, status }) => ({ id, status })),
    };
  }

  /** Ask the LLM coach for the next cue. Jordan waits (within a budget) for it. */
  function requestCue(clientTurnId: string, audio: boolean) {
    clearCue();
    cancelBackgroundCoaching();
    const version = cueVersionRef.current;
    const startedAt = performance.now();
    const pending: PendingCue = { version, clientTurnId, startedAt, budgetTimer: null, replied: false, awaitingTranscript: false };
    pending.budgetTimer = window.setTimeout(() => {
      if (cuePendingRef.current !== pending || pending.replied) return;
      setCueStatus("late");
      replyToClient(null);
    }, CUE_BUDGET_MS);
    cuePendingRef.current = pending;
    setCue(null);
    setCueLatencyMs(null);
    setCueStatus("thinking");
    if (audio && audioCueUnsupportedRef.current) {
      pending.awaitingTranscript = true;
      return;
    }
    sendCueRequest(pending, audio);
  }

  function sendCueRequest(pending: PendingCue, audio: boolean) {
    const request = cueRequest({
      version: pending.version,
      turns: turnsRef.current,
      pendingAudioItemId: audio ? pending.clientTurnId : undefined,
      context: cueContextRef.current,
      assessment: assessmentSummary(),
    });
    if (!send(request)) replyToClient(null);
  }

  /** Inject the cue as a private directive, then ask Jordan to speak. */
  function replyToClient(nextCue: LiveCue | null) {
    const pending = cuePendingRef.current;
    if (pending) {
      if (pending.replied) return;
      pending.replied = true;
      if (pending.budgetTimer !== null) window.clearTimeout(pending.budgetTimer);
      pending.budgetTimer = null;
    }
    if (channelRef.current?.readyState !== "open") return;
    if (nextCue && nextCue.say) {
      if (directiveItemIdRef.current) {
        send({ event_id: `cue-del-${directiveItemIdRef.current}`, type: "conversation.item.delete", item_id: directiveItemIdRef.current });
      }
      const itemId = `cue_${Date.now().toString(36)}_${cueVersionRef.current}`.slice(0, 32);
      send({ event_id: `cue-dir-${itemId}`, ...cueDirectiveItem(nextCue, itemId) });
      directiveItemIdRef.current = itemId;
      directNextResponseRef.current = true;
      setCueStatus("directing");
    } else {
      directNextResponseRef.current = false;
    }
    if (primaryResponseActiveRef.current) {
      replyQueuedRef.current = true;
      return;
    }
    sendPrimaryReply();
  }

  function sendPrimaryReply() {
    replyQueuedRef.current = false;
    primaryGenerationRef.current = true;
    primaryResponseActiveRef.current = true;
    if (replyTimingRef.current) replyTimingRef.current.requestMs = Math.round(performance.now() - replyTimingRef.current.started);
    send(spokenReplyRequest());
  }

  function noteCallReason(reason: CueReason | null) {
    if (!reason) return;
    const current = callReasonRef.current;
    // The original reason stays stable; a low-confidence first read can be refined.
    if (current && (current.confidence !== "low" || current.reason === reason.reason)) return;
    callReasonRef.current = reason;
    setCallReason(reason);
    if (!current) {
      const origin = firstClientTurnEndRef.current;
      setReasonLatencyMs(origin !== null ? Math.max(0, performance.now() - origin) : null);
      setReasonFlash(true);
      if (reasonFlashTimerRef.current !== null) window.clearTimeout(reasonFlashTimerRef.current);
      reasonFlashTimerRef.current = window.setTimeout(() => setReasonFlash(false), 3200);
    }
  }

  function handleCueEvent(type: string, event: Record<string, unknown>): boolean {
    const response = event.response as { id?: string; status?: string; metadata?: Record<string, string>; output?: Array<{ type?: string; name?: string; arguments?: string }> } | undefined;
    if (response?.metadata?.topic === "live_cue") {
      const current = Number(response.metadata.version) === cueVersionRef.current && cuePendingRef.current?.version === cueVersionRef.current;
      if (response.id) cueResponseIdsRef.current.add(response.id);
      if (type === "response.created" && response.id) {
        if (!current) send({ type: "response.cancel", response_id: response.id });
        else activeCueIdRef.current = response.id;
      }
      if (type === "response.done") {
        if (activeCueIdRef.current === response.id) activeCueIdRef.current = "";
        if (!current) return true;
        const pending = cuePendingRef.current!;
        const output = response.output?.find(item => item.type === "function_call" && item.name === "publish_next_cue");
        const text = output?.arguments ?? cueArgumentsRef.current.get(response.id ?? "") ?? "";
        const finished = response.status === "completed" ? readCue(text, turnsRef.current, pending.clientTurnId, true) : null;
        if (!finished) {
          if (response.status !== "cancelled") setCueStatus(pending.replied ? "late" : "error");
          replyToClient(null);
          return true;
        }
        setCue(finished);
        if (finished.stage) setStage(finished.stage);
        setFocusOfferingId(finished.offeringId);
        noteCallReason(finished.callReason);
        setCueLatencyMs(Math.round(performance.now() - pending.startedAt));
        if (replyTimingRef.current) replyTimingRef.current.cueMs = Math.round(performance.now() - replyTimingRef.current.started);
        if (pending.replied) setCueStatus("late");
        else replyToClient(finished);
      }
      return true;
    }
    const responseId = String(event.response_id ?? "");
    if (!cueResponseIdsRef.current.has(responseId)) return false;
    if (type === "response.function_call_arguments.delta") {
      const text = (cueArgumentsRef.current.get(responseId) ?? "") + String(event.delta ?? "");
      cueArgumentsRef.current.set(responseId, text);
      const pending = cuePendingRef.current;
      if (pending && activeCueIdRef.current === responseId) {
        const partial = readCue(text, turnsRef.current, pending.clientTurnId);
        if (partial) {
          noteCallReason(partial.callReason);
          if (partial.stage) setStage(partial.stage);
          if (!pending.replied) {
            setCue(partial);
            setCueStatus("streaming");
          }
        }
      }
    }
    return true;
  }

  /* ───────────── Background assessment (offerings and criteria) ───────────── */

  function cancelAnalysis() {
    analysisVersionRef.current += 1;
    replyTimingRef.current = null;
    coachingInFlightRef.current = false;
    if (coachingTimeoutRef.current !== null) window.clearTimeout(coachingTimeoutRef.current);
    coachingTimeoutRef.current = null;
    analysisPendingRef.current = null;
    primaryGenerationRef.current = false;
    activeCoachingIdRef.current = "";
    clientSpeakingRef.current = false;
    setAnalyzing(false);
  }

  function acceptAnalysis(next: Analysis | null) {
    if (!next) return;
    // An omitted catalog entry is not a retraction. Explicit reassessments,
    // including conflicts and rejections, replace previous evidence immediately.
    const previous = analysisRef.current;
    const stable = { ...next, relationshipPaths: mergePathAssessments(previous?.relationshipPaths ?? [], next.relationshipPaths) };
    recordInsightEvents(previous, stable, turnsRef.current);
    analysisRef.current = stable;
    setAnalysis(stable);
    if (next.callReason.category !== "Unclassified" && next.callReason.evidenceIds.length) {
      const entry = TAXONOMY.find(item => item.category === next.callReason.category && item.subcategory === next.callReason.subcategory && item.reason === next.callReason.reason);
      if (entry) noteCallReason({ ...next.callReason, taxonomySourceLine: entry.sourceLine });
    }
  }

  function queueAnalysis(nextTurns: Turn[], activeScenarioId: string) {
    analysisPendingRef.current = { turns: nextTurns, scenarioId: activeScenarioId };
    if (channelRef.current?.readyState !== "open") return;
    if (coachingInFlightRef.current) return;
    runPendingAnalysis();
  }

  function runPendingAnalysis() {
    const channel = channelRef.current;
    const pending = analysisPendingRef.current;
    const cueBusy = !!cuePendingRef.current && !cuePendingRef.current.replied;
    if (!pending || cueBusy || coachingInFlightRef.current || channel?.readyState !== "open" || !canRunBackgroundCoaching(primaryGenerationRef.current, clientSpeakingRef.current, pending.turns)) return;
    analysisPendingRef.current = null;
    coachingInFlightRef.current = true;
    setAnalyzing(true);
    setAnalysisError("");
    channel.send(JSON.stringify(coachingRequest(pending.turns, analysisVersionRef.current)));
    coachingTimeoutRef.current = window.setTimeout(() => {
      coachingInFlightRef.current = false;
      setAnalyzing(false);
      setAnalysisError("Offering assessment delayed. Keeping the previous cards.");
      cancelBackgroundCoaching();
      if (analysisPendingRef.current) runPendingAnalysis();
    }, 30000);
  }

  function cancelBackgroundCoaching() {
    analysisVersionRef.current += 1;
    if (activeCoachingIdRef.current) send({ type: "response.cancel", response_id: activeCoachingIdRef.current });
    activeCoachingIdRef.current = "";
    coachingInFlightRef.current = false;
    if (coachingTimeoutRef.current !== null) window.clearTimeout(coachingTimeoutRef.current);
    coachingTimeoutRef.current = null;
    analysisPendingRef.current = null;
    setAnalyzing(false);
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
    const turn: Turn = { id, role, text, at: itemTimeRef.current.get(id) ?? 0 };
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
    setDrafts((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    // The API rejected an audio reference earlier: the cue for this turn waits for its transcript.
    const pending = cuePendingRef.current;
    if (role === "customer" && pending?.awaitingTranscript && pending.clientTurnId === id && !pending.replied) {
      pending.awaitingTranscript = false;
      sendCueRequest(pending, false);
    }
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
    if (transcript) {
      if (directedResponseIdsRef.current.has(pending.responseId)) setDirectedTurnIds((ids) => ids.includes(id) ? ids : [...ids, id]);
      commitTurn(id, "representative", transcript, activeScenarioId);
    }
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
    if (handleCueEvent(type, event)) return;
    const privateResponse = event.response as { id?: string; status?: string; metadata?: Record<string, string>; output?: Array<{ type?: string; name?: string; arguments?: string }> } | undefined;
    if (privateResponse?.metadata?.topic === "relationship_coaching") {
      const current = Number(privateResponse.metadata.version) === analysisVersionRef.current;
      if (privateResponse.id) {
        coachingResponseIdsRef.current.add(privateResponse.id);
        if (type === "response.created") {
          if (!current || primaryGenerationRef.current || clientSpeakingRef.current) {
            send({ type: "response.cancel", response_id: privateResponse.id });
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
            acceptAnalysis(parseRealtimeInsights(result.arguments, turnsRef.current));
            setAnalysisError("");
          }
        } catch {
          setAnalysisError("The offering assessment could not be read. Keeping the previous cards.");
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
      return;
    }
    if (type === "input_audio_buffer.committed") {
      if (typeof event.item_id === "string") {
        itemOrder(event.item_id);
        if (firstClientTurnEndRef.current === null) firstClientTurnEndRef.current = performance.now();
        // Coach first: the LLM hears the committed audio and writes Jordan's cue.
        requestCue(event.item_id, true);
      }
      return;
    }
    if (type === "conversation.item.created" || type === "conversation.item.added" || type === "response.output_item.added") {
      const item = event.item as { id?: unknown; role?: unknown } | undefined;
      if (typeof item?.id === "string" && item.role !== "system") {
        itemOrder(item.id);
        if (type === "response.output_item.added") {
          rememberCustomerItem(item.id, String(event.response_id ?? ""));
        }
      }
      return;
    }
    if (type === "input_audio_buffer.speech_started") {
      // Barge-in: the client is talking again, so any cue in progress is stale.
      cancelBackgroundCoaching();
      clearCue();
      clientSpeakingRef.current = true;
      setCueStatus((current) => current === "thinking" || current === "streaming" || current === "directing" ? "idle" : current);
      setSpeaker("customer");
      setAwaitingCustomerReply(false);
      return;
    }
    if (type === "input_audio_buffer.speech_stopped") {
      clientSpeakingRef.current = false;
      primaryGenerationRef.current = true;
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
      if (typeof response?.id === "string" && directNextResponseRef.current) {
        directedResponseIdsRef.current.add(response.id);
        directNextResponseRef.current = false;
        setCueStatus("delivering");
      }
      primaryGenerationRef.current = true;
      primaryResponseActiveRef.current = true;
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
      if (directedResponseIdsRef.current.has(responseId)) setCueStatus((current) => current === "delivering" ? "delivered" : current);
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
      primaryResponseActiveRef.current = false;
      if (replyQueuedRef.current) {
        sendPrimaryReply();
        return;
      }
      runPendingAnalysis();
      return;
    }
    if (type === "error") {
      const info = event.error as { message?: string; event_id?: string } | undefined;
      const eventId = info?.event_id ?? "";
      if (eventId.startsWith("coaching-")) {
        coachingInFlightRef.current = false;
        if (coachingTimeoutRef.current !== null) window.clearTimeout(coachingTimeoutRef.current);
        setAnalyzing(false);
        setAnalysisError("Offering assessment unavailable. Keeping the previous cards.");
        activeCoachingIdRef.current = "";
        return;
      }
      if (eventId.startsWith("cue-del-")) return;
      if (eventId.startsWith("cue-")) {
        const pending = cuePendingRef.current;
        if (eventId.startsWith("cue-req-") && pending && !pending.replied && !audioCueUnsupportedRef.current) {
          // Audio item references were rejected: use this turn's transcript instead.
          audioCueUnsupportedRef.current = true;
          if (turnsRef.current.some(turn => turn.id === pending.clientTurnId)) sendCueRequest(pending, false);
          else pending.awaitingTranscript = true;
          return;
        }
        setCueStatus(pending?.replied ? "late" : "error");
        replyToClient(null);
        return;
      }
      setCallError(info?.message ?? "The live session reported an error.");
      primaryGenerationRef.current = false;
      primaryResponseActiveRef.current = false;
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
        if (pending) pending.parts.set(index, (pending.parts.get(index) ?? "") + delta);
      }
      setDrafts((current) => {
        const previous = current[id];
        return { ...current, [id]: { id, role, text: (previous?.text ?? "") + delta } };
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
    resetCallState();
    setStatus("connecting");

    try {
      const tokenResponse = await fetch("/api/realtime/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarioId: activeScenarioId }),
      });
      const tokenPayload = await tokenResponse.json() as { clientSecret?: string; cueContext?: CueContext; error?: string };
      if (!tokenResponse.ok) throw new Error(tokenPayload.error || "Could not start the live representative.");
      const ephemeral = String(tokenPayload.clientSecret ?? "");
      if (!ephemeral) throw new Error("The live session did not return a client secret.");
      cueContextRef.current = tokenPayload.cueContext ?? {};

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
        primaryResponseActiveRef.current = true;
        channel.send(JSON.stringify({ type: "response.create", response: { output_modalities: ["audio"] } }));
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
      await peer.setRemoteDescription({ type: "answer", sdp: await answerResponse.text() });
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
    if (!text || channelRef.current?.readyState !== "open") return;
    const id = `typed_${Date.now().toString(36)}`;
    send({ type: "conversation.item.create", item: { id, type: "message", role: "user", content: [{ type: "input_text", text }] } });
    replyTimingRef.current = { started: performance.now(), cueMs: null, requestMs: null, audioStarted: false };
    if (firstClientTurnEndRef.current === null) firstClientTurnEndRef.current = performance.now();
    commitTurn(id, "customer", text, scenarioId);
    setAwaitingCustomerReply(true);
    // Coach first, then Jordan: the cue request carries the typed turn as text.
    requestCue(id, false);
    setTypedReply("");
  }

  function jumpToEvidence(ids: string[]) {
    window.setTimeout(() => scrollToEvidence(ids), 60);
  }

  const statusLabel = status === "live" ? "Live call" : status === "connecting" ? "Connecting" : status === "ended" ? "Call ended" : status === "ready" ? "Role ready" : status === "error" ? "Needs attention" : "No active call";

  return (
    <div className="studio">
      <audio ref={audioRef} autoPlay playsInline aria-hidden="true" />
      {reasonFlash && callReason && <div className="reason-toast" role="status"><Sparkles size={15} /> Call reason identified: <strong>{callReason.reason}</strong></div>}

      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true"><Zap size={18} /></span>
          <div><strong>Relationship Copilot</strong><small>AI coach for Schwab service calls</small></div>
        </div>
        <div className="topbar-right">
          <span className="training-chip"><i /> Training simulation · synthetic clients</span>
          <span className={"status-chip " + status}><i />{statusLabel}</span>
        </div>
      </header>

      <section className={"callbar " + status}>
        <div className="callbar-person">
          <span className="callbar-avatar" aria-hidden="true">{selected ? selected.callerName.split(" ").map(part => part[0]).join("").slice(0, 2) : <AudioLines size={20} />}</span>
          <div>
            <small>{selected ? "YOU ARE PLAYING" : "PRACTICE CALL"}</small>
            <strong>{selected?.callerName ?? "Pick a client role"}</strong>
            <span>{selected ? `Jordan, the AI representative, answers · ${selected.openingReason}` : "A random synthetic client is chosen for each call"}</span>
          </div>
        </div>
        <CallWaveform speaker={speaker} waiting={waitingForRepresentative} />
        <div className="callbar-actions">
          <time>{timeLabel(seconds)}</time>
          {status === "live" && <button type="button" className="icon-btn" onClick={toggleMute} disabled={!micAvailable || openingMic} aria-label={muted ? "Unmute" : "Mute"} title={openingMic ? "Microphone opens after Jordan's greeting" : muted ? "Unmute" : "Mute"}>{muted ? <MicOff size={17} /> : <Mic size={17} />}</button>}
          {status === "live" || status === "connecting" ? (
            <button className="btn-end" type="button" onClick={() => stopConnection("ended")}><PhoneOff size={16} /> End call</button>
          ) : status === "ready" ? <>
            <button className="btn-ghost" type="button" onClick={() => void startCall(true)}><Keyboard size={15} /> Text call</button>
            <button className="btn-call" type="button" onClick={() => void startCall()}><Phone size={16} /> Call Jordan</button>
          </> : (
            <button className="btn-call" type="button" onClick={prepareCall}><RefreshCw size={15} /> {status === "ended" || status === "error" ? "New client role" : "Choose a client role"}</button>
          )}
          {status === "ready" && <button className="btn-ghost subtle" type="button" onClick={prepareCall} aria-label="Pick a different client role"><RefreshCw size={14} /></button>}
        </div>
      </section>

      <StageTrack stage={displayStage} />

      {callError && <div className="call-error" role="alert"><CircleAlert size={17} />{callError}</div>}

      <main className={"workspace" + (selected?.profile ? " with-client" : "")}>
        <section className="panel chat" aria-label="Conversation">
          <div className="panel-head"><strong>Live conversation</strong><span className={"live-dot" + (status === "live" ? " on" : "")}><i />{status === "live" ? "Captions live" : "Ready"}</span></div>
          {analysis?.tags.length ? <div className="tag-row">{analysis.tags.map((tag) => <button type="button" key={tag.id} className={"tag kind-" + tag.kind} onClick={() => jumpToEvidence(tag.evidenceIds)}>{tag.label}</button>)}</div> : null}
          <div className="chat-feed" ref={transcriptFeedRef}>
            {turns.length === 0 && draftList.length === 0 ? (
              <div className="chat-empty">
                <span><AudioLines size={26} /></span>
                <h3>{status === "ready" ? "Your role is ready" : "Start a practice call"}</h3>
                <p>{status === "ready" ? "Call Jordan, explain why you are calling, then answer naturally. Watch the AI coach steer every reply." : "Choose a client role. Every insight is grounded in what you and Jordan actually say."}</p>
              </div>
            ) : (
              <>
                {turns.map((turn) => (
                  <article id={"turn-" + turn.id} key={turn.id} className={"bubble role-" + turn.role}>
                    <span className="bubble-avatar">{turn.role === "customer" ? "You" : "JR"}</span>
                    <div>
                      <header><strong>{turn.role === "customer" ? selected?.callerName ?? "Client" : "Jordan"}</strong><time>{timeLabel(turn.at)}</time>{directedTurnIds.includes(turn.id) && <span className="directed"><Zap size={10} /> coach-directed</span>}</header>
                      <p>{turn.text}</p>
                    </div>
                  </article>
                ))}
                {draftList.map((draft) => (
                  <article key={draft.id} className={"bubble role-" + draft.role + " draft"}>
                    <span className="bubble-avatar">{draft.role === "customer" ? "You" : "JR"}</span>
                    <div><header><strong>{draft.role === "customer" ? "You" : "Jordan"}</strong><time>live</time></header><p>{draft.text}<span className="caret" /></p></div>
                  </article>
                ))}
              </>
            )}
          </div>
          {status === "live" && <div className="composer">
            <input value={typedReply} onChange={(event) => setTypedReply(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") sendTypedReply(); }} placeholder={micAvailable ? "Speak, or type as the client…" : "Type as the client…"} aria-label="Type a reply as the client" />
            <button type="button" onClick={sendTypedReply} disabled={!typedReply.trim()} aria-label="Send typed reply"><Send size={16} /></button>
          </div>}
        </section>

        <section className="coach" aria-label="AI coach">
          <CallReasonHero reason={callReason} latencyMs={reasonLatencyMs} flash={reasonFlash} confirmed={reasonConfirmed} live={status === "live"} clientSpeaking={speaker === "customer"} onEvidence={jumpToEvidence} />
          {status === "ended" ? <>
            <CompletedCallSummary paths={completedPaths} onEvidence={jumpToEvidence} />
            <CallTransition customerTurn={pivotCustomerTurn} representativeTurn={pivotRepresentativeTurn} milestones={pathMilestones} serviceEvent={serviceEvent} onEvidence={jumpToEvidence} />
          </> : <>
            <CueHero cue={cue} status={cueStatus} latencyMs={cueLatencyMs} jordanLine={cueStatus === "delivered" ? latestJordanTurn?.text ?? "" : ""} offeringName={focusName} live={status === "live"} onEvidence={jumpToEvidence} />
            <OpportunityBoard paths={offeringCards} analysis={analysis} turns={turns} assessing={analyzing} serviceDone={relationshipReady} onEvidence={jumpToEvidence} />
          </>}
          {analysisError && <div className="soft-error" role="status"><CircleAlert size={15} />{analysisError}</div>}
        </section>

        {selected?.profile && <ClientProfilePanel name={selected.callerName} age={selected.age} profile={selected.profile} brief={selected.clientBrief} turns={turns} verified={verificationConfirmed || demoVerificationComplete(turns)} onVerify={() => setVerificationConfirmed(true)} />}
      </main>
    </div>
  );
}
