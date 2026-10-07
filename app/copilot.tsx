"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { validateTrainingAction, persistTrainingAction, type TrainingAction } from "@/lib/training-actions";
import { advanceCallStage, retainOfferings } from "@/lib/call-progress";
import { canRunBackgroundCoaching, spokenReplyRequest } from "@/lib/realtime-turns";
import { callPathSummary } from "@/lib/call-path-summary";
import { openAIConnectionError } from "@/lib/openai-errors";
import { RELATIONSHIP_PATHS } from "@/lib/relationship-paths";
import { TAXONOMY } from "@/lib/taxonomy";
import { offeringMention } from "@/lib/offering-journey";
import { CROSS_SELL_HISTORY_KEY, crossSellCueContext, crossSellSystemItem, planStatuses, recentOfferings, rememberOfferings, type CrossSellPlan, type PlanStatus } from "@/lib/cross-sell";
import {
  AudioLines,
  CircleAlert,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Send,
  Sparkles,
  Zap,
} from "lucide-react";
import { coachingRequest, parseRealtimeInsights, topRelationshipPaths, mergePathAssessments } from "@/lib/realtime-intelligence";
import { CUE_BUDGET_MS, cueDirectiveItem, cueRequest, readCue, type CueContext, type CueReason, type CueStage, type LiveCue } from "@/lib/live-cue";
import type { Analysis, CallStatus, CueStatus, JourneyEvent, Scenario, Turn } from "./studio-types";
import {
  CallReasonHero,
  CallWaveform,
  ClientProfilePanel,
  CompletedCallSummary,
  CrossSellPlanCard,
  CueHero,
  OpportunityBoard,
  StageTrack,
  timeLabel,
  type OfferingCard,
} from "./studio-ui";

type Draft = { id: string; role: Turn["role"]; text: string };
type CrossSellState = { status: "idle" | "loading" | "ready" | "error"; plan: CrossSellPlan | null; error: string };
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
  // Pre-call cross-sell plan, generated fresh for every call.
  const [crossSell, setCrossSell] = useState<CrossSellState>({ status: "idle", plan: null, error: "" });
  const crossSellRef = useRef<CrossSellPlan | null>(null);
  const crossSellVersionRef = useRef(0);
  const crossSellSentRef = useRef("");
  const planStatusRef = useRef<Record<string, PlanStatus>>({});
  const [retainedOfferings, setRetainedOfferings] = useState<OfferingCard[]>([]);
  const [trainingActions, setTrainingActions] = useState<TrainingAction[]>([]);
  const trainingActionsRef = useRef<TrainingAction[]>([]);
  const completedToolCallsRef = useRef(new Set<string>());
  const reportVersionRef = useRef(0);
  const [reportUpdating, setReportUpdating] = useState(false);
  function loadTrainingActions() {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem("schwab-training-actions-k-v1") ?? "[]");
      if (Array.isArray(saved)) {
        const actions = saved.filter((value): value is TrainingAction => !!value && typeof value === "object" && typeof value.id === "string" && Array.isArray(value.steps) && typeof value.summary === "string" && typeof value.accountName === "string");
        trainingActionsRef.current = actions;
        setTrainingActions(actions);
      }
    } catch { /* Storage may be unavailable; completion will report that explicitly. */ }
  }

  const peerRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RTCDataChannel | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const turnsRef = useRef<Turn[]>([]);
  const analysisRef = useRef<Analysis | null>(null);
  const primaryGenerationRef = useRef(false);
  const primaryResponseActiveRef = useRef(false);
  const replyQueuedRef = useRef(false);
  const replyWatchdogRef = useRef<number | null>(null);
  const spokenResponseIdRef = useRef("");
  const [replyStalled, setReplyStalled] = useState(false);
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
  const draftList = Object.values(drafts).filter(draft => !turns.some(turn => turn.id === draft.id));
  const transcriptEntries = [
    ...turns.map(turn => ({ ...turn, partial: false })),
    ...draftList.map(draft => ({ ...draft, at: itemTimeRef.current.get(draft.id) ?? 0, partial: true })),
  ].sort((first, second) => (itemOrderRef.current.get(first.id) ?? 0) - (itemOrderRef.current.get(second.id) ?? 0));
  const isInCall = status === "connecting" || status === "live";
  const waitingForRepresentative = awaitingCustomerReply && status === "live";
  const relationshipReady = analysis?.serviceStatus.state === "resolved" || cue?.serviceState === "resolved";

  const discoveredOfferings = useMemo<OfferingCard[]>(() => {
    const assessed: OfferingCard[] = analysis ? topRelationshipPaths(analysis.relationshipPaths) : [];
    const focusId = focusOfferingId;
    if (!focusId) return assessed;
    const existing = assessed.find(path => path.id === focusId);
    if (existing) return [{ ...existing, focus: true }, ...assessed.filter(path => path.id !== focusId)];
    const catalog = RELATIONSHIP_PATHS.find(path => path.id === focusId);
    if (!catalog) return assessed;
    // The live coach chose this offering before the background assessment caught up.
    const focus: OfferingCard = { ...catalog, status: "emerging", signalConfidence: null, assessed: false, focus: true, question: "", rationale: "Selected by the live coach from the client's latest answer.", nextStep: "", evidenceIds: [] };
    return [focus, ...assessed];
  }, [analysis, focusOfferingId]);
  const offeringCards = retainOfferings(retainedOfferings, discoveredOfferings, analysis?.relationshipPaths ?? []).sort((first, second) => (second.signalConfidence ?? -1) - (first.signalConfidence ?? -1));
  const reportPaths = offeringCards.map(path => ({ ...path, evidenceIds: [...path.evidenceIds] }));
  for (const path of analysis?.relationshipPaths ?? []) if (!reportPaths.some(card => card.id === path.id)) reportPaths.push({ ...path, evidenceIds: [...path.evidenceIds] });
  for (const catalog of RELATIONSHIP_PATHS) if (!reportPaths.some(path => path.id === catalog.id)) reportPaths.push({ ...catalog, status: "possible", assessed: false, signalConfidence: null, evidenceIds: [], rationale: "Mentioned in the conversation; relevance is not yet assessed.", nextStep: "", question: "" });
  const callActions = trainingActions.filter(action => transcriptEntries.some(turn => turn.id === action.consentTurnId));
  for (const action of callActions) {
    if (action.offeringId === "service_request") continue;
    const path = reportPaths.find(path => path.id === action.offeringId);
    if (path) {
      path.evidenceIds = [...new Set([...path.evidenceIds, action.consentTurnId])];
      path.assessed = true;
      if (!path.rationale || path.status === "possible") path.rationale = "The client agreed to: " + action.summary;
      path.status = "explore";
    }
  }
  const summaryPaths = callPathSummary(reportPaths, transcriptEntries);
  const completedPaths = [...reportPaths.filter(path => path.id !== "service_recovery" && offeringCards.some(card => card.id === path.id)), ...summaryPaths.filter(path => !offeringCards.some(card => card.id === path.id))].map(path => ({ ...path, evidenceIds: [...new Set([...journeyEvents.filter(event => event.pathId === path.id).flatMap(event => event.evidenceIds), ...path.evidenceIds])] }));
  const displayStage = status === "ended" ? "closing" : advanceCallStage(stage, status === "live" ? "greeting" : null);
  const latestJordanTurn = turns.findLast((turn) => turn.role === "representative");
  const reasonConfirmed = !!callReason && analysis?.callReason.reason === callReason.reason && analysis.callReason.category === callReason.category;
  const focusName = RELATIONSHIP_PATHS.find(path => path.id === (cue?.complete ? cue.offeringId : focusOfferingId))?.name ?? "";
  const planStatus = crossSell.plan ? planStatuses(crossSell.plan, turns, analysis?.relationshipPaths ?? [], callActions, offeringMention) : {};
  planStatusRef.current = planStatus;

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
  }, [turns, drafts]);

  useEffect(() => {
    return () => {
      analysisVersionRef.current += 1;
      cueVersionRef.current += 1;
      if (coachingTimeoutRef.current !== null) window.clearTimeout(coachingTimeoutRef.current);
      if (openingMicTimerRef.current !== null) window.clearTimeout(openingMicTimerRef.current);
      if (speakerFallbackTimerRef.current !== null) window.clearTimeout(speakerFallbackTimerRef.current);
      if (reasonFlashTimerRef.current !== null) window.clearTimeout(reasonFlashTimerRef.current);
      clearReplyWatchdog();
      channelRef.current?.close();
      peerRef.current?.close();
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  function resetCallState() {
    reportVersionRef.current += 1;
    crossSellVersionRef.current += 1;
    crossSellRef.current = null;
    crossSellSentRef.current = "";
    setCrossSell({ status: "idle", plan: null, error: "" });
    setReportUpdating(false);
    completedToolCallsRef.current.clear();
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
    clearReplyWatchdog();
    setReplyStalled(false);
    spokenResponseIdRef.current = "";
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
    setRetainedOfferings([]);
  }

  function resetForScenario(id: string) {
    if (isInCall) return;
    resetCallState();
    setScenarioId(id);
    setStatus("ready");
    setTypedReply("");
    setMicAvailable(true);
  }

  function stopConnection(nextStatus: CallStatus = "ended") {
    clearReplyWatchdog();
    setReplyStalled(false);
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
    setCueStatus((current) => current === "thinking" || current === "streaming" || current === "directing" ? "idle" : current);
    setStatus(nextStatus);
    if (nextStatus === "ended" && scenarioId && turnsRef.current.length) void finalizeCallReport(scenarioId, transcriptEntries);
  }

  async function finalizeCallReport(activeScenarioId: string, reportTurns: Turn[]) {
    const version = ++reportVersionRef.current;
    setReportUpdating(true);
    try {
      const response = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scenarioId: activeScenarioId, turns: reportTurns.slice(-120) }), signal: AbortSignal.timeout(30000) });
      if (!response.ok) throw new Error("Final assessment unavailable");
      const result = await response.json() as Analysis;
      if (version === reportVersionRef.current) acceptAnalysis(result);
    } catch {
      if (version === reportVersionRef.current) setAnalysisError("Final assessment unavailable. The report below preserves the conversation and discovered offerings.");
    } finally {
      if (version === reportVersionRef.current) setReportUpdating(false);
    }
  }

  function completeTrainingAction(callId: string, argumentsText: string) {
    if (!callId || completedToolCallsRef.current.has(callId)) return;
    completedToolCallsRef.current.add(callId);
    let output: unknown;
    try {
      const validated = validateTrainingAction(JSON.parse(argumentsText), turnsRef.current);
      // Persist successfully before acknowledging completion to the representative.
      const { action, actions } = persistTrainingAction(validated, trainingActionsRef.current, callId, localStorage);
      trainingActionsRef.current = actions;
      setTrainingActions(actions);
      output = { success: true, simulation: true, action, availability: "Saved in this profile and available on the next visit to this workspace." };
    } catch (error) {
      output = { success: false, simulation: true, error: error instanceof Error ? error.message : "Training action could not be completed." };
    }
    // The next reply must address the tool result, not repeat an earlier setup cue.
    if (directiveItemIdRef.current) {
      send({ type: "conversation.item.delete", item_id: directiveItemIdRef.current });
      directiveItemIdRef.current = "";
    }
    send({ type: "conversation.item.create", item: { type: "function_call_output", call_id: callId, output: JSON.stringify(output) } });
    replyQueuedRef.current = true;
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
      completedActions: trainingActionsRef.current,
      crossSellPlan: crossSellCueContext(crossSellRef.current, planStatusRef.current),
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
      watchReply();
      return;
    }
    sendPrimaryReply();
  }

  function clearReplyWatchdog() {
    if (replyWatchdogRef.current !== null) window.clearTimeout(replyWatchdogRef.current);
    replyWatchdogRef.current = null;
  }

  function watchReply() {
    clearReplyWatchdog();
    replyWatchdogRef.current = window.setTimeout(() => {
      replyWatchdogRef.current = null;
      if (channelRef.current?.readyState !== "open") return;
      if (spokenResponseIdRef.current && primaryResponseActiveRef.current) {
        send({ type: "response.cancel", response_id: spokenResponseIdRef.current });
      }
      primaryGenerationRef.current = false;
      primaryResponseActiveRef.current = false;
      representativeResponseActiveRef.current = false;
      replyQueuedRef.current = false;
      setAwaitingCustomerReply(false);
      setSpeaker(null);
      releaseOpeningMic(0);
      setReplyStalled(true);
      setCallError("The representative's reply stalled. You can retry the reply or continue speaking.");
    }, 15000);
  }

  function sendPrimaryReply() {
    replyQueuedRef.current = false;
    spokenResponseIdRef.current = "";
    setReplyStalled(false);
    setCallError("");
    primaryGenerationRef.current = true;
    primaryResponseActiveRef.current = true;
    if (replyTimingRef.current) replyTimingRef.current.requestMs = Math.round(performance.now() - replyTimingRef.current.started);
    if (send({ event_id: `spoken-${Date.now()}`, ...spokenReplyRequest() })) watchReply();
    else {
      primaryGenerationRef.current = false;
      primaryResponseActiveRef.current = false;
      setCallError("The voice connection is unavailable. Please start a new call.");
    }
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
        if (finished.stage) setStage(current => advanceCallStage(current, finished.stage));
        trackFocusOffering(finished.offeringId);
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
          if (partial.stage) setStage(current => advanceCallStage(current, partial.stage));
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

  function trackFocusOffering(id: string) {
    setFocusOfferingId(id);
    const catalog = RELATIONSHIP_PATHS.find(path => path.id === id);
    if (!catalog) return;
    setRetainedOfferings(previous => previous.some(path => path.id === id) ? previous : [...previous, { ...catalog, status: "emerging", signalConfidence: null, assessed: false, question: "", rationale: "Selected by the live coach from the client's latest answer.", nextStep: "", evidenceIds: [] }]);
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
    setRetainedOfferings(previous => retainOfferings(previous, topRelationshipPaths(stable.relationshipPaths), stable.relationshipPaths));
    if (stable.serviceStatus.state === "resolved") setStage(current => advanceCallStage(current, stable.relationshipPaths.some(path => path.status === "explore" && path.evidenceIds.length) ? "recommendation" : "discovery"));
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
    channel.send(JSON.stringify(coachingRequest(pending.turns, analysisVersionRef.current, trainingActionsRef.current)));
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
    completeIdsRef.current.add(id);
    itemOrder(id);
    const turn: Turn = { id, role, text, at: itemTimeRef.current.get(id) ?? 0 };
    const nextTurns = [...turnsRef.current, turn].sort(
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
    if (type === "response.output_audio.delta" || type === "response.output_audio_transcript.delta") watchReply();
    if (type === "output_audio_buffer.started") {
      void audioRef.current?.play().catch(() => {
        setCallError("Audio playback paused. Retry the reply to resume audio.");
        setReplyStalled(true);
      });
      const timing = replyTimingRef.current;
      if (timing && timing.requestMs !== null && !timing.audioStarted) {
        timing.audioStarted = true;
        console.info("Realtime reply timing " + JSON.stringify({ cueMs: timing.cueMs, requestMs: timing.requestMs, audioMs: Math.round(performance.now() - timing.started) }));
      }
      return;
    }
    if (type === "output_audio_buffer.stopped" || type === "output_audio_buffer.cleared") {
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
      clearReplyWatchdog();
      replyQueuedRef.current = false;
      setReplyStalled(false);
      setCallError("");
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
      spokenResponseIdRef.current = String(response?.id ?? "");
      watchReply();
      primaryGenerationRef.current = true;
      primaryResponseActiveRef.current = true;
      representativeResponseActiveRef.current = true;
      setSpeaker("representative");
      setAwaitingCustomerReply(false);
      return;
    }
    if (type === "response.done") {
      clearReplyWatchdog();
      if (speakerFallbackTimerRef.current !== null) window.clearTimeout(speakerFallbackTimerRef.current);
      speakerFallbackTimerRef.current = window.setTimeout(() => { representativeResponseActiveRef.current = false; setSpeaker(null); speakerFallbackTimerRef.current = null; }, 20000);
      const response = event.response as {
        id?: unknown;
        status?: unknown;
        output?: Array<{ id?: unknown; type?: string; name?: string; call_id?: string; arguments?: string; content?: Array<{ transcript?: unknown }> }>;
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
        if (item.type === "function_call" && item.name === "complete_training_action" && responseStatus === "completed") {
          completeTrainingAction(String(item.call_id ?? ""), String(item.arguments ?? "{}"));
          continue;
        }
        if (typeof item.id !== "string") continue;
        ids.add(item.id);
        rememberCustomerItem(item.id, responseId);
        const pending = pendingCustomerItemsRef.current.get(item.id);
        if (pending) {
          item.content?.forEach((part, index) => {
            if (typeof part.transcript === "string") pending.parts.set(index, part.transcript);
          });
        }
      }
      for (const id of ids) {
        // Interrupted replies still contain words already shown to the client.
        // Preserve their partial caption instead of deleting it.
        if (responseStatus === "completed") finishCustomerItem(id, activeScenarioId);
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
      if (eventId.startsWith("xsell-")) {
        crossSellSentRef.current = "";
        setAnalysisError("Jordan could not receive the cross-sell plan. The call continues with normal discovery.");
        return;
      }
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
      clearReplyWatchdog();
      releaseOpeningMic(0);
      setReplyStalled(true);
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
      itemOrder(id);
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
            // Keep the interrupted caption visible as an unfinished turn.
          }
        } else {
          commitTurn(id, role, transcript, activeScenarioId);
        }
      }
    }
  }

  function prepareCall() {
    if (!scenarios.length || isInCall) return;
    loadTrainingActions();
    const choices = scenarios.filter((item) => item.id !== lastScenarioIdRef.current);
    const picked = choices[Math.floor(Math.random() * choices.length)] ?? scenarios[0];
    lastScenarioIdRef.current = picked.id;
    resetForScenario(picked.id);
    void startCall(picked.id);
    void loadCrossSell(picked.id);
  }

  /** Generate this call's synthetic account enrichment and cross-sell plan, in parallel with connecting. */
  async function loadCrossSell(activeScenarioId: string) {
    const version = ++crossSellVersionRef.current;
    setCrossSell({ status: "loading", plan: null, error: "" });
    let history: unknown = {};
    try { history = JSON.parse(localStorage.getItem(CROSS_SELL_HISTORY_KEY) ?? "{}"); } catch { /* storage unavailable */ }
    try {
      const response = await fetch("/api/cross-sell", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarioId: activeScenarioId, recentOfferingIds: recentOfferings(history, activeScenarioId), completedOfferingIds: trainingActionsRef.current.map(action => action.offeringId) }),
        signal: AbortSignal.timeout(40000),
      });
      const payload = await response.json() as CrossSellPlan & { error?: string };
      if (version !== crossSellVersionRef.current) return;
      if (!response.ok || !Array.isArray(payload.opportunities)) throw new Error(payload.error || "The cross-sell plan could not be generated.");
      crossSellRef.current = payload;
      setCrossSell({ status: "ready", plan: payload, error: "" });
      try { localStorage.setItem(CROSS_SELL_HISTORY_KEY, JSON.stringify(rememberOfferings(history, payload))); } catch { /* storage unavailable */ }
      shareCrossSellWithJordan();
    } catch (error) {
      if (version !== crossSellVersionRef.current) return;
      setCrossSell({ status: "error", plan: null, error: error instanceof Error && error.name !== "TimeoutError" ? error.message : "The cross-sell plan timed out." });
    }
  }

  /** Give Jordan the plan as private context once both the plan and the call are ready. */
  function shareCrossSellWithJordan() {
    const plan = crossSellRef.current;
    if (!plan || crossSellSentRef.current === plan.id || channelRef.current?.readyState !== "open") return;
    const itemId = ("xsell_" + plan.id.replace(/-/g, "")).slice(0, 32);
    if (send({ event_id: "xsell-" + itemId, ...crossSellSystemItem(plan, itemId) })) crossSellSentRef.current = plan.id;
  }

  async function startCall(activeScenarioId: string) {
    if (isInCall) return;
    resetCallState();
    setStage("servicing");
    setStatus("connecting");

    try {
      const tokenResponse = await fetch("/api/realtime/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarioId: activeScenarioId, completedActions: trainingActionsRef.current.map(({ offeringName, summary, accountName }) => ({ offeringName, summary, accountName })) }),
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

      {
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
        sendPrimaryReply();
        shareCrossSellWithJordan();
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
          <Image className="schwab-logo" src="/schwab-logo.svg" width={64} height={64} alt="Charles Schwab" priority unoptimized />
          <div className="brand-title"><span className="brand-eyebrow">CLIENT SERVICES</span><h1>Service Assistant</h1></div>
        </div>
        <div className="topbar-right">
          <span className="training-chip"><i /> Simulation · Local account data</span>
          <span className={"status-chip " + status}><i />{statusLabel}</span>
        </div>
      </header>

      <section className={"callbar " + status}>
        <div className="callbar-person">
          <span className="callbar-avatar" aria-hidden="true">{<AudioLines size={20} />}</span>
          <div>
            <small>{"SERVICE CALL"}</small>
            <strong>{isInCall ? "Incoming call" : "Ready for a call"}</strong>
            <span>{"The representative introduces themself, then listens."}</span>
          </div>
        </div>
        <CallWaveform speaker={speaker} waiting={waitingForRepresentative} />
        <div className="callbar-actions">
          <time>{timeLabel(seconds)}</time>
          {status === "live" && <button type="button" className="icon-btn" onClick={toggleMute} disabled={!micAvailable || openingMic} aria-label={muted ? "Unmute" : "Mute"} title={openingMic ? "Microphone opens after Jordan's greeting" : muted ? "Unmute" : "Mute"}>{muted ? <MicOff size={17} /> : <Mic size={17} />}</button>}
          {status === "live" || status === "connecting" ? (
            <button className="btn-end" type="button" onClick={() => stopConnection("ended")}><PhoneOff size={16} /> End call</button>
          ) : (
            <button className="btn-call" type="button" onClick={prepareCall}><Phone size={16} /> Pick the call</button>
          )}
        </div>
      </section>

      <StageTrack stage={displayStage} />

      {callError && <div className="call-error" role="alert"><CircleAlert size={17} />{callError}{replyStalled && status === "live" && <button type="button" onClick={() => { cancelBackgroundCoaching(); clearCue(); void audioRef.current?.play().catch(() => {}); if (!primaryResponseActiveRef.current) sendPrimaryReply(); }}>Retry reply</button>}</div>}

      <main className={"workspace" + " with-client"}>
        <section className="panel chat" aria-label="Conversation">
          <div className="panel-head"><strong>Live conversation</strong><span className={"live-dot" + (status === "live" ? " on" : "")}><i />{status === "live" ? "Captions live" : "Ready"}</span></div>
          {analysis?.tags.length ? <div className="tag-row">{analysis.tags.map((tag) => <button type="button" key={tag.id} className={"tag kind-" + tag.kind} onClick={() => jumpToEvidence(tag.evidenceIds)}>{tag.label}</button>)}</div> : null}
          <div className="chat-feed" ref={transcriptFeedRef}>
            {turns.length === 0 && draftList.length === 0 ? (
              <div className="chat-empty">
                <span><AudioLines size={26} /></span>
                <h3>{"Pick the call"}</h3>
                <p>{"Jordan will introduce themself, then listen to you."}</p>
              </div>
            ) : (
              <>
                {transcriptEntries.map((turn) => (
                  <article id={"turn-" + turn.id} key={turn.id} className={"bubble role-" + turn.role + (turn.partial ? " draft" : "")}>
                    <span className="bubble-avatar">{turn.role === "customer" ? "You" : "JR"}</span>
                    <div>
                      <header><strong>{turn.role === "customer" ? "You" : "Jordan"}</strong><time>{turn.partial ? status === "ended" || status === "error" ? "Partial transcript" : "Transcribing" : timeLabel(turn.at)}</time>{directedTurnIds.includes(turn.id) && <span className="directed"><Zap size={10} /> coach-directed</span>}</header>
                      <p>{turn.text}{turn.partial && status === "live" && <span className="caret" />}</p>
                    </div>
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
            <CrossSellPlanCard state={crossSell} statuses={planStatus} serviceDone={relationshipReady} compact onRetry={() => selected && void loadCrossSell(selected.id)} />
            <CompletedCallSummary paths={completedPaths} turns={transcriptEntries} actions={callActions} serviceStatus={analysis?.serviceStatus} updating={reportUpdating} onEvidence={jumpToEvidence} />

          </> : <>
            <CueHero cue={cue} status={cueStatus} latencyMs={cueLatencyMs} jordanLine={cueStatus === "delivered" ? latestJordanTurn?.text ?? "" : ""} offeringName={focusName} live={status === "live"} onEvidence={jumpToEvidence} />
            <CrossSellPlanCard state={crossSell} statuses={planStatus} serviceDone={relationshipReady} onRetry={() => selected && void loadCrossSell(selected.id)} />
            <OpportunityBoard paths={offeringCards} analysis={analysis} turns={turns} assessing={analyzing} serviceDone={relationshipReady} onEvidence={jumpToEvidence} />
          </>}
          {analysisError && <div className="soft-error" role="status"><CircleAlert size={15} />{analysisError}</div>}
        </section>

        {selected?.profile && <ClientProfilePanel name="K" age={selected.age} profile={selected.profile} plan={crossSell.plan} actions={trainingActions} turns={turns} />}
        {!selected?.profile && <aside className="client-panel" aria-label="Client profile"><div className="client-section"><small>CLIENT PROFILE</small><h2>Waiting for a caller</h2><p>The client profile appears when you pick the call.</p></div></aside>}
      </main>
    </div>
  );
}
