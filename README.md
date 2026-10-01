# Relationship Call Studio

A browser-based training simulation. OpenAI Realtime plays Jordan, a synthetic Schwab service representative; the human speaks or types as the client. The same Realtime model publishes private coaching updates alongside the call: call reason, service progress, evidence tags, robo-advisor criteria, and assessments of the full Schwab offering catalog.

The app uses only the seven complete calls in `data/shortlisted-relationship-scenarios.md`. The previous 20-call library and evaluation map have been removed from the app. Each new call chooses a random caller from this shortlist, excluding the caller from the previous call in the same browser session. The caller and backstory stay stable throughout the call. The scenario list and hidden facts are not shown in the interface. Customer names in the runtime library are female.

The call bar has a prominent waveform whose animation follows client/representative speaking state (a visual indicator, not an audio-amplitude measurement). The client portrait, name, and age appear when a role is selected. Synthetic account details unlock after explicit consent to “May I complete a quick demo verification?”, completion of ordinary off-channel verification in the transcript, or when the user selects “Confirm demo verification” for the off-channel training step. New client roles reset verification. Name, age, accounts, and balances come from the synthetic scripts. Two reusable AI-generated portraits are bundled in `public/profiles`; explicit portrait metadata selects the variant rather than guessing from a name. The current supplied callers use the female variant. Household and goal facts appear only after the client mentions them; demo contact history is labeled illustrative.

## Run locally

Use Node.js 22.13 or newer. Keep `OPENAI_API_KEY` on the server only.

    npm ci
    npm run dev

If the key is inherited from the shell rather than a project env file, expose it to the local Cloudflare worker with `CLOUDFLARE_INCLUDE_PROCESS_ENV=true npm run dev`. Keep it server-side.

Open the local URL shown by the development server. Build with `npm run build`.

## Live behavior

- `POST /api/realtime/session` creates a short-lived client secret for `gpt-realtime-2.1`. The Realtime model plays Jordan, the service representative. The human plays the selected client. Jordan receives a synthetic service record and relevant product desk references, but the client's broader facts stay in the human-facing role brief until the human says them.
- WebRTC carries voice and captions. The human client can also use **Text call**. Server voice activity detection commits the client's audio after 400 ms of silence but does not reply on its own (`create_response: false`).
- **Coach-first turns (LLM-driven cues).** When a client turn ends, the app immediately sends a small out-of-band Realtime request (`conversation: "none"`, text-only, `publish_next_cue` tool). The newest client audio is passed by `item_reference`, so the coach does not wait for speech recognition. The tool arguments stream onto the screen: the call reason first, then the call stage and Jordan's next line. The finished cue is injected into Jordan's conversation as a private system directive (the previous directive is deleted), and only then is Jordan asked to speak. Jordan therefore voices what the coach decided. If the cue misses its budget (`CUE_BUDGET_MS`, 2.2 s), Jordan replies without it so there is no dead air. If the API rejects audio references, cues fall back to waiting for the transcript. No keyword or heuristic logic produces cue content (`lib/live-cue.ts`).
- The call reason is highlighted the moment the streamed cue classifies it against the taxonomy: an animated card, a toast, and the time since the client spoke. A label must be an exact taxonomy entry citing a client turn, or it is not shown. The background assessment marks it "Confirmed" when it agrees.
- After Jordan's reply, the full offering and criteria assessment runs in the background on the same channel (`publish_relationship_insights`) and feeds the offering cards. A new client turn cancels stale private work.
- Jordan initiates discovery from the actual conversation and the service record's contextual bridge, asks one focused question at a time, and offers an appropriate educational or specialist next step once needs are known. The live Ask card streams Jordan's actual question; full offering evidence is assessed in the background. Client declines are respected.
- Up to three relevant paths appear when the model recognizes that the original service explanation or approved next step is complete. It does not require a particular customer acknowledgement phrase. The model considers the full catalog internally. The view ranks supported paths, relevant constraints, and model-selected discovery candidates with customer context; unassessed and ruled-out offerings are omitted. Unknown relevance is not treated as unsuitability. Rankings and evidence change with each client answer. Existing cards remain visible during updates and omitted assessments do not erase earlier signals. Explicit reassessments and rejections replace old evidence.
- Schwab Intelligent Portfolios shows all seven criteria, explicit established/unknown/conflict states, rationales, evidence links, and model-generated signal confidence. The latest full-transcript assessment can revise an earlier criterion when the client corrects a fact. Client evidence is required to establish criteria or offering interest; the representative's suggestions never count as customer interest.
- Insight payloads are validated for catalog IDs, confidence range, and transcript evidence IDs. An automated investing path cannot become ready to discuss without an established goal, horizon, funds and delegation preference, and a stated criterion conflict pauses the path.
- `POST /api/analyze` and its replay script remain available as legacy standalone analysis utilities; the live UI does not use them for coaching, offerings, criteria or discovery questions.
- When the call ends, the journey view connects the first supported relationship signal with the preceding representative question and paths subsequently raised. Call-reason taxonomy source references remain available.


Path confidence summarizes strength of conversation evidence; it is not a model probability, product eligibility, or suitability score. Paths are educational prompts for a representative, not enrollment instructions or individualized recommendations. The program's formal review and approved service procedures remain necessary.

## Example call

Choose a new client role and read the private brief. Call Jordan by voice or text. Explain the initial service question and answer naturally as the client. The app listens to both sides of the actual call; only the human client's statements establish relationship signals. Offering tiles appear after the original service request is addressed. The transition visual appears when the call ends.

Check the Realtime insight validation and discovery gates with `npm run test:insights`. Type-check with `npx tsc --noEmit` and lint with `npm run lint`.

For the legacy standalone REST analyzer, `node scripts/check-relationship-paths.mjs` accepts the local URL and a scenario ID. This does not test the live Realtime coaching UI.

The live UI is a compact cue board at the top of the insight pane: Ask Next, up to three offering/question cards, and optional questions in reserve. Evidence, robo criteria and service progress expand on demand. A returned `preference` tag is normalized to a client fact rather than invalidating the entire insight update.

Live reply latency: Jordan waits for the live cue for at most `CUE_BUDGET_MS`. Voice timing is measured from the speech-stopped event; typed timing is measured from submission. The cue card shows the time from the end of the client turn to the finished cue. Network and model generation still affect actual playback latency. The blue assessment state reports background evidence work, independently of the voice reply.

The browser console records `Realtime reply timing` with cue, audio-request and playback-start milliseconds, without conversation text or credentials, to distinguish application waiting from API/audio latency.

The call reason is always visible above coaching, updating from client evidence without a disclosure click. Each live offering card has a dedicated icon and an evidence-confidence bar chart; unknown discovery candidates have no percentage. Live coaching stays capped at three paths. After the call, a separate wrap-up includes all assessed paths with valid evidence (including later constraints and rejections), plus offerings named in the transcript. The profile photo is always visible for the selected fictional caller; synthetic accounts unlock after explicit consent to the quick demo verification.
