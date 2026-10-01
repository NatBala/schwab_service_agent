"use client";

import Image from "next/image";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  Compass,
  ExternalLink,
  Flag,
  Handshake,
  Headphones,
  Lock,
  MessageCircleQuestion,
  Radar,
  ShieldCheck,
  Sparkles,
  Target,
  Wrench,
  Zap,
} from "lucide-react";
import { buildOfferingJourneys, groupOfferings } from "@/lib/offering-journey";
import type { TrainingAction } from "@/lib/training-actions";
import type { CustomerProfile } from "@/lib/customer-profiles";
import type { CueReason, CueStage, LiveCue } from "@/lib/live-cue";
import { ConfidenceRing, OfferingIcon } from "./offering-visuals";
import type { Analysis, CueStatus, JourneyEvent, Turn } from "./studio-types";

export function timeLabel(seconds: number) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const remainder = Math.floor(seconds % 60).toString().padStart(2, "0");
  return minutes + ":" + remainder;
}

function seconds(ms: number) {
  return ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(1)} s`;
}

/* ───────────────────────── Call reason ───────────────────────── */

export function CallReasonHero({ reason, latencyMs, flash, confirmed, live, clientSpeaking, onEvidence }: {
  reason: CueReason | null;
  latencyMs: number | null;
  flash: boolean;
  confirmed: boolean;
  live: boolean;
  clientSpeaking: boolean;
  onEvidence: (ids: string[]) => void;
}) {
  if (!reason) {
    return <section className={"reason-hero waiting" + (clientSpeaking ? " hearing" : "")} aria-label="Call reason" aria-live="polite">
      <span className="reason-radar" aria-hidden="true"><Radar size={22} /><i /><i /></span>
      <div className="reason-copy">
        <small>CALL REASON</small>
        <h2>{clientSpeaking ? "Listening to the client…" : live ? "Waiting for the client's request" : "Identified live by the AI coach"}</h2>
        <p>The moment the client explains why they called, it is classified against the service taxonomy and highlighted here.</p>
      </div>
    </section>;
  }
  return <section className={"reason-hero identified" + (flash ? " flash" : "")} aria-label="Call reason identified" aria-live="assertive">
    <span className="reason-sweep" aria-hidden="true" />
    <span className="reason-seal" aria-hidden="true"><BadgeCheck size={26} /></span>
    <div className="reason-copy">
      <small>CALL REASON IDENTIFIED {latencyMs !== null && <b className="reason-speed"><Zap size={11} /> {seconds(latencyMs)} after the client spoke</b>}</small>
      <h2>{reason.reason}</h2>
      <div className="reason-crumbs"><span>{reason.category}</span><ArrowRight size={12} /><span>{reason.subcategory}</span><ArrowRight size={12} /><strong>{reason.reason}</strong></div>
    </div>
    <div className="reason-side">
      <span className={"reason-confidence " + reason.confidence}>{reason.confidence} confidence</span>
      {confirmed && <span className="reason-confirmed"><Check size={11} /> Confirmed by full assessment</span>}
      <button type="button" onClick={() => onEvidence(reason.evidenceIds)}>Client evidence <ArrowRight size={12} /></button>
    </div>
  </section>;
}

/* ───────────────────────── Stage track ───────────────────────── */

const STAGES: Array<{ id: CueStage; label: string; icon: typeof Flag }> = [
  { id: "greeting", label: "Greet", icon: Handshake },
  { id: "verification", label: "Verify", icon: ShieldCheck },
  { id: "servicing", label: "Service", icon: Wrench },
  { id: "discovery", label: "Discover", icon: Compass },
  { id: "recommendation", label: "Recommend", icon: Target },
  { id: "closing", label: "Close", icon: Flag },
];

export function StageTrack({ stage }: { stage: CueStage | null }) {
  const current = stage ? STAGES.findIndex(item => item.id === stage) : -1;
  return <ol className="stage-track" aria-label="Call stage">
    {STAGES.map((item, index) => {
      const Icon = item.icon;
      const state = index < current ? "done" : index === current ? "current" : "todo";
      return <li key={item.id} className={state} aria-current={state === "current" ? "step" : undefined}>
        <span className="stage-dot">{state === "done" ? <Check size={13} /> : <Icon size={13} />}</span>
        <span className="stage-label">{item.label}</span>
      </li>;
    })}
  </ol>;
}

/* ───────────────────────── Live cue ───────────────────────── */

const CUE_STATUS_LABEL: Record<CueStatus, string> = {
  idle: "Standing by",
  thinking: "Coach is thinking",
  streaming: "Writing the cue",
  directing: "Directing Jordan",
  delivering: "Jordan is delivering the cue",
  delivered: "Cue delivered",
  late: "Jordan replied before the cue",
  error: "Cue unavailable",
};

export function CueHero({ cue, status, latencyMs, jordanLine, offeringName, live, onEvidence }: {
  cue: LiveCue | null;
  status: CueStatus;
  latencyMs: number | null;
  jordanLine: string;
  offeringName: string;
  live: boolean;
  onEvidence: (ids: string[]) => void;
}) {
  const writing = status === "thinking" || status === "streaming";
  const line = cue?.say || (writing ? "" : live ? "Waiting for the client to speak." : "Start a call to see live cues.");
  return <section className={"cue-hero status-" + status} aria-label="Live coaching cue" aria-live="polite">
    <div className="cue-hero-glow" aria-hidden="true" />
    <header>
      <span className="cue-kicker"><Sparkles size={14} /> NEXT BEST LINE</span>
      <span className="cue-status"><i />{CUE_STATUS_LABEL[status]}</span>
      {latencyMs !== null && <span className="cue-latency" title="Time from the end of the client's turn to the finished cue"><Zap size={12} /> {seconds(latencyMs)}</span>}
    </header>
    <blockquote className={cue?.say ? "" : "placeholder"}>
      {cue?.say ? <>“{cue.say}{writing ? <span className="caret" /> : null}”</> : line ? line : <span className="cue-thinking-dots" aria-label="Generating"><i /><i /><i /></span>}
    </blockquote>
    {(cue?.nextStep || cue?.rationale || offeringName) && <div className="cue-meta">
      {cue?.nextStep && <span><MessageCircleQuestion size={13} /> {cue.nextStep}</span>}
      {cue?.rationale && <span className="muted">Why: {cue.rationale}</span>}
      {offeringName && <span className="cue-offering"><Target size={13} /> Focus: {offeringName}</span>}
    </div>}
    <footer>
      <span className="cue-flow"><b className={status !== "idle" ? "on" : ""}>Client</b><ArrowRight size={12} /><b className={status !== "idle" && status !== "thinking" ? "on" : ""}>AI coach</b><ArrowRight size={12} /><b className={status === "delivering" || status === "delivered" ? "on" : ""}>Jordan</b></span>
      {jordanLine && <p className="cue-said"><span>Jordan said</span> “{jordanLine}”</p>}
      {cue?.evidenceIds.length ? <button type="button" className="cue-evidence" onClick={() => onEvidence(cue.evidenceIds)}>Evidence <ArrowRight size={12} /></button> : null}
    </footer>
  </section>;
}

/* ───────────────────────── Offerings ───────────────────────── */

const STATUS_LABEL: Record<string, string> = {
  explore: "Ready to explore",
  emerging: "Emerging need",
  hold: "Clarify first",
  possible: "Discovery candidate",
  ruled_out: "Ruled out",
  focus: "Coach focus",
};

export type OfferingCard = Analysis["relationshipPaths"][number] & { focus?: boolean };

export function OpportunityBoard({ paths, analysis, turns, assessing, serviceDone, onEvidence }: {
  paths: OfferingCard[];
  analysis: Analysis | null;
  turns: Turn[];
  assessing: boolean;
  serviceDone: boolean;
  onEvidence: (ids: string[]) => void;
}) {
  return <section className="opportunities" aria-label="Relationship opportunities">
    <div className="section-heading">
      <div><small>DEEPEN THE RELATIONSHIP</small><h3>Schwab offerings in play</h3></div>
      <span className={"assess-pill" + (assessing ? " on" : "")}><i />{assessing ? "AI assessing evidence" : `${paths.length} discovered`}</span>
    </div>
    {paths.length ? <div className="offering-groups">{groupOfferings(paths).map(group => <div key={group.label}><h4 className="offering-group-label">{group.label}</h4><div className="offer-grid">{group.paths.map((path, index) => {
      const quote = turns.findLast(turn => turn.role === "customer" && path.evidenceIds.includes(turn.id))?.text;
      const unknown = path.status === "possible" || path.signalConfidence === null || !path.assessed;
      return <article key={path.id} className={"offer-card status-" + path.status + (path.focus ? " focus" : "")} style={{ animationDelay: `${index * 70}ms` }}>
        {path.focus && <span className="offer-ribbon"><Sparkles size={11} /> COACH FOCUS</span>}
        <div className="offer-top">
          <OfferingIcon id={path.id} size={20} />
          <div className="offer-title"><h4>{path.name}</h4><span>{path.family}</span></div>
          <ConfidenceRing value={path.signalConfidence} unknown={unknown} />
        </div>
        <span className={"offer-status " + path.status}>{STATUS_LABEL[path.status] ?? path.status}</span>
        <p className="offer-why">{path.rationale}</p>
        {path.question && <div className="offer-ask"><small>ASK</small><span>{path.question}</span></div>}
        <div className="offer-details">
          {path.nextStep && <p><strong>Next step</strong> {path.nextStep}</p>}
          {quote && <q>{quote}</q>}
          <div className="offer-links">
            {path.evidenceIds.length > 0 && <button type="button" onClick={() => onEvidence(path.evidenceIds)}>Jump to evidence <ArrowRight size={12} /></button>}
            <a href={path.sourceUrl} target="_blank" rel="noreferrer">Product reference <ExternalLink size={12} /></a>
          </div>
          {path.id === "automated_investing" && analysis && <AutomatedCriteria criteria={analysis.criteria} onEvidence={onEvidence} />}
        </div>
      </article>;
    })}</div></div>)}</div> : <div className="offer-empty">
      <span><Target size={22} /></span>
      <div><strong>{serviceDone ? "Listening for a broader goal" : "Service first"}</strong><p>{serviceDone ? "Offerings appear as soon as the client's own words support one." : "Relationship offerings unlock after the original request is handled. The coach is tracking every answer."}</p></div>
    </div>}
    <small className="fine-print">Confidence reflects conversation evidence only, not eligibility or suitability. Paths are educational prompts, not recommendations.</small>
  </section>;
}

export function AutomatedCriteria({ criteria, onEvidence }: { criteria: Analysis["criteria"]; onEvidence: (ids: string[]) => void }) {
  const met = criteria.filter((item) => item.status === "met").length;
  return <div className="criteria">
    <div className="criteria-head"><strong>Intelligent Portfolios discovery</strong><span>{met} / {criteria.length} established</span></div>
    <div className="criteria-track"><i style={{ width: `${criteria.length ? met / criteria.length * 100 : 0}%` }} /></div>
    <ul>{criteria.map(criterion => <li key={criterion.id} className={criterion.status}>
      <button type="button" disabled={!criterion.evidenceIds.length} onClick={() => onEvidence(criterion.evidenceIds)}>
        <span className="criterion-mark">{criterion.status === "met" ? <Check size={11} /> : criterion.status === "not_met" ? "!" : "?"}</span>
        <span className="criterion-label">{criterion.label}<small>{criterion.rationale}</small></span>
        <b>{criterion.status === "met" ? "Established" : criterion.status === "not_met" ? "Conflict" : "Unknown"}</b>
      </button>
    </li>)}</ul>
    <p>Conversation evidence only. The formal investor questionnaire determines eligibility.</p>
  </div>;
}

/* ───────────────────────── Wrap-up ───────────────────────── */

export function CompletedCallSummary({ paths, turns, actions, serviceStatus, updating, onEvidence }: {
  paths: Analysis["relationshipPaths"]; turns: Turn[]; actions: TrainingAction[]; serviceStatus?: Analysis["serviceStatus"]; updating: boolean; onEvidence: (ids: string[]) => void;
}) {
  const journeys = buildOfferingJourneys(paths, turns);
  return <section className="wrapup" aria-label="Call and offering journey report">
    <div className="section-heading"><div><small>CALL COMPLETE</small><h3>Call &amp; offering journey</h3></div><span className="assess-pill">{updating ? "Final assessment in progress" : `${paths.length} offerings`}</span></div>
    <div className="call-report-context"><strong>Original call</strong><p>{turns.find(turn => turn.role === "customer")?.text ?? "No client statement was captured."}</p><small>{turns.length} transcript entries · {actions.length} completed {actions.length === 1 ? "action" : "actions"}</small></div>
    <div className="call-report-context"><strong>Service journey</strong><p>{serviceStatus?.summary || "The transcript remains available for review; service resolution has not been assessed."}</p><small>{serviceStatus?.state === "resolved" ? "Original service request resolved" : serviceStatus?.state === "in_progress" ? "Service was still in progress" : "Service outcome not yet established"}</small>
      {serviceStatus?.evidenceIds.map(id => turns.find(turn => turn.id === id)).filter((turn): turn is Turn => !!turn).map(turn => <button className="report-service-quote" type="button" key={turn.id} onClick={() => onEvidence([turn.id])}><small>{turn.role === "customer" ? "CLIENT" : "REPRESENTATIVE"} · {timeLabel(turn.at)}</small><q>{turn.text}</q></button>)}
    </div>
    {groupOfferings(paths).map(group => <div key={group.label} className="offering-report-group"><h4 className="offering-group-label">{group.label}</h4>{group.paths.map(path => {
      const journey = journeys.find(item => item.path.id === path.id)!;
      const completed = actions.filter(action => action.offeringId === path.id);
      return <article className={"offer-card offering-journey status-" + path.status} key={path.id}>
        <div className="offer-top"><OfferingIcon id={path.id} /><div className="offer-title"><h4>{path.name}</h4><span>{path.family}</span></div><ConfidenceRing value={path.signalConfidence} unknown={!path.assessed || path.signalConfidence === null} /></div>
        <span className={"offer-status " + path.status}>{completed.length ? "Completed" : STATUS_LABEL[path.status]}</span>
        <div className="offering-timeline">
          {journey.transition && <button type="button" onClick={() => onEvidence([journey.transition!.id])}><small>REPRESENTATIVE TRANSITION · {timeLabel(journey.transition.at)}</small><q>{journey.transition.text}</q></button>}
          {journey.client ? <button type="button" onClick={() => onEvidence([journey.client!.id])}><small>{journey.clientIsEvidence ? "CLIENT NEED / POINT OF CHANGE" : "CLIENT CONTEXT BEFORE INTRODUCTION"} · {timeLabel(journey.client.at)}</small><q>{journey.client.text}</q></button> : <p>No client evidence was captured for this offering.</p>}
          <div><small>WHY THE OFFERING BECAME RELEVANT</small><p>{path.evidenceIds.length ? path.rationale : "The offering was discussed; a supporting client need has not yet been established."}</p></div>
          {journey.introduction ? <button type="button" onClick={() => onEvidence([journey.introduction!.id])}><small>OFFERING INTRODUCED · {timeLabel(journey.introduction.at)}</small><q>{journey.introduction.text}</q></button> : <p>The coach identified this path; no named introduction was captured.</p>}
          {journey.evidence.filter(turn => turn.id !== journey.client?.id && turn.id !== journey.introduction?.id && turn.id !== journey.transition?.id).map(turn => <button type="button" key={turn.id} onClick={() => onEvidence([turn.id])}><small>{turn.role === "customer" ? "CLIENT ENGAGEMENT" : "REPRESENTATIVE FOLLOW-UP"} · {timeLabel(turn.at)}</small><q>{turn.text}</q></button>)}
          {completed.map(action => <div className="action-completed" key={action.id}><small>COMPLETED ACTION</small><p>{action.summary}</p>{turns.find(turn => turn.id === action.consentTurnId) && <q>{turns.find(turn => turn.id === action.consentTurnId)!.text}</q>}<ol>{action.steps.map((step, index) => <li key={index}>{step}</li>)}</ol></div>)}
          {!completed.length && path.nextStep && <div><small>NEXT STEP</small><p>{path.nextStep}</p></div>}
        </div>
      </article>;
    })}</div>)}
    {!paths.length && <div className="offer-empty"><Target size={22} /><div><strong>No offering introduced</strong><p>The journey remains focused on the original service request. {updating ? "The final assessment is checking the full transcript." : "No offering evidence was captured."}</p></div></div>}
    {actions.filter(action => action.offeringId === "service_request").map(action => <div className="action-completed" key={action.id}><strong>Service completed</strong><p>{action.summary}</p></div>)}
  </section>;
}

export function CallTransition({ customerTurn, representativeTurn, milestones, serviceEvent, onEvidence }: {
  customerTurn: Turn | null;
  representativeTurn: Turn | null | undefined;
  milestones: JourneyEvent[];
  serviceEvent: JourneyEvent | undefined;
  onEvidence: (ids: string[]) => void;
}) {
  return <section className="journey" aria-label="Call relationship journey">
    <div className="section-heading"><div><small>CALL JOURNEY</small><h3>The moment it changed</h3></div></div>
    {customerTurn ? <>
      <div className="journey-main">
        <div><small>TRANSITION POINT</small><strong>{timeLabel(customerTurn.at)}</strong><span>From the service request to a broader need</span></div>
        <span className="journey-spark" aria-hidden="true"><Sparkles size={18} /></span>
        <div><small>FIRST RELATIONSHIP SIGNAL</small><strong>{milestones[0]?.title ?? "A broader need"}</strong><span>Supported by the client&apos;s words</span></div>
      </div>
      <div className="journey-quotes">
        {representativeTurn && <button type="button" onClick={() => onEvidence([representativeTurn.id])}><span>JORDAN OPENED DISCOVERY · {timeLabel(representativeTurn.at)}</span><q>{representativeTurn.text}</q></button>}
        <button type="button" onClick={() => onEvidence([customerTurn.id])}><span>CLIENT REVEALED THE NEED · {timeLabel(customerTurn.at)}</span><q>{customerTurn.text}</q></button>
      </div>
      <div className="journey-steps"><span className="done"><Check size={11} />{serviceEvent ? "Service answered" : "Service discussed"}</span>{milestones.map(event => <button type="button" key={event.pathId} onClick={() => onEvidence(event.evidenceIds)}><Target size={11} />{event.title}</button>)}</div>
    </> : <p className="journey-empty">No customer statement established a relationship path in this call.</p>}
  </section>;
}

/* ───────────────────────── Client profile ───────────────────────── */

export function ClientProfilePanel({ name, age, profile, actions, turns, verified, onVerify }: {
  name: string; age: number; profile: CustomerProfile; actions: TrainingAction[]; turns: Turn[]; verified: boolean; onVerify: () => void;
}) {
  const advisorChange = actions.findLast(action => ["financial_consultant", "wealth_advisory"].includes(action.offeringId) && ["schedule", "enroll"].includes(action.kind));
  const words = turns.filter(turn => turn.role === "customer").map(turn => turn.text.toLowerCase()).join(" ");
  const learned = profile.discoverable.filter(fact => fact.phrases.some(phrase => words.includes(phrase.toLowerCase())));
  return <aside className="client-panel" aria-label="Client profile">
    <div className="client-hero">
      <div className="client-photo"><Image width={84} height={84} priority unoptimized src="/profiles/client-male.png" alt={`Fictional training portrait for ${name}`} /><span className={verified ? "ok" : ""}>{verified ? <Check size={12} /> : <Lock size={11} />}</span></div>
      <h2>{name}</h2>
      <p>{age > 0 ? `Age ${age} · ` : ""}{profile.relationship}</p>
      <span className={"verify-chip" + (verified ? " ok" : "")}>{verified ? <><ShieldCheck size={12} /> Verified</> : <><Lock size={11} /> Verification pending</>}</span>
    </div>
    {!verified ? <div className="client-locked">
      <Lock size={18} />
      <strong>Account snapshot locked</strong>
      <p>Unlocks after Jordan completes the verification.</p>
      <button type="button" onClick={onVerify}>Confirm verification <Check size={13} /></button>
    </div> : <>
      <div className="client-section"><small>CLIENT DETAILS</small><table className="profile-table"><tbody>
        {[["Name", "K"], ["Client ID", profile.clientId ?? "Not on file"], ["Address", profile.address ?? "Not on file"], ["Book", profile.book ?? "Not assigned"], ["Segment", profile.segment ?? "Not classified"], ["Advisor", advisorChange ? advisorChange.summary : profile.advisor ?? "No advisor assigned"], ["Relationship", profile.relationship], ["Prior contacts", String(profile.priorContacts)], ["Last contact", profile.lastContact]].map(([label, value]) => <tr key={label}><th scope="row">{label}</th><td>{value}</td></tr>)}
      </tbody></table></div>
      <div className="client-section"><small>ACCOUNTS HELD</small><table className="profile-table accounts-table"><thead><tr><th scope="col">Account</th><th scope="col">Details / status</th></tr></thead><tbody>
        {profile.accounts.map(account => <tr key={account.name}><td>{account.name}</td><td>{account.detail}</td></tr>)}
        {actions.filter(action => action.kind === "open_account").map(action => <tr key={action.id}><td>{action.accountName}</td><td>Open · Setup complete</td></tr>)}
        {!profile.accounts.length && !actions.some(action => action.kind === "open_account") && <tr><td colSpan={2}>No existing account on file.</td></tr>}
      </tbody></table></div>
      {actions.some(action => action.kind === "enroll") && <div className="client-section"><small>OFFERING ENROLLMENTS</small><table className="profile-table accounts-table"><thead><tr><th scope="col">Offering / account</th><th scope="col">Status</th></tr></thead><tbody>
        {actions.filter(action => action.kind === "enroll").map(action => <tr key={action.id}><td>{action.offeringName}{action.accountName && <small>{action.accountName}</small>}</td><td>Enrolled · Setup complete</td></tr>)}
      </tbody></table></div>}
      {actions.length > 0 && <div className="client-section"><small>COMPLETED CHANGES</small>{actions.map(action => <div className="client-account training-change" key={action.id}><strong>{action.offeringName}</strong><span>{action.summary}</span><small>Saved · Available on your next visit</small></div>)}</div>}
      <div className="client-section"><small>CURRENT SERVICE NEED</small><p>{profile.context}</p></div>
    </>}
    <div className="client-section"><small>LEARNED IN THIS CALL</small>{learned.length ? <div className="learned">{learned.map(fact => <span key={fact.label}><Sparkles size={10} />{fact.label}</span>)}</div> : <p>Goals and household details appear as the client shares them.</p>}</div>
    {verified && <div className="client-section muted"><small>CONTACT HISTORY</small><p>{profile.priorContacts} prior contacts · Last: {profile.lastContact}</p></div>}
    <div className="client-foot"><Headphones size={12} /> Client relationship overview</div>
  </aside>;
}

/* ───────────────────────── Waveform ───────────────────────── */

const BARS = Array.from({ length: 56 }, (_, i) => ({
  height: 6 + Math.pow(Math.sin(i * .31), 2) * (10 + 26 * Math.pow(Math.sin(i * .097), 2)),
  delay: i * -.061,
}));

export function CallWaveform({ speaker, waiting }: { speaker: "customer" | "representative" | null; waiting: boolean }) {
  const state = speaker ?? (waiting ? "thinking" : "idle");
  return <div className={"waveform " + state} aria-label={speaker === "customer" ? "Client speaking" : speaker === "representative" ? "Jordan speaking" : waiting ? "Coach preparing Jordan's reply" : "Audio ready"}>
    <div className="wave-bars" aria-hidden="true">{BARS.map((bar, i) => <i key={i} style={{ height: `${bar.height.toFixed(2)}px`, animationDelay: `${bar.delay.toFixed(3)}s` }} />)}</div>
    <span>{speaker === "customer" ? "You are speaking" : speaker === "representative" ? "Jordan is speaking" : waiting ? "Coach preparing Jordan's reply" : "Ready to listen"}</span>
  </div>;
}
