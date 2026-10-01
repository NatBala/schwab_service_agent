# Schwab Service Assistant

A browser-based training simulation. OpenAI Realtime plays Jordan, a synthetic Schwab service representative; the human speaks or types as the client. Private coaching tracks the call reason, service progress, discovery criteria, and Schwab offerings supported by the conversation.

**Pick the call** selects one of the seven service scenarios in `data/shortlisted-relationship-scenarios.md` and starts the voice session. Jordan introduces themself, then listens. The runtime client identity is always **K**, with the male portrait. The scenario and role brief are not displayed.

## Run locally

Use Node.js 22.13 or newer. Set `OPENAI_API_KEY` in the ignored `.env` file and keep it on the server.

```sh
npm ci
npm run dev
```

Open the URL printed by the server. If the key is inherited from the shell, use `CLOUDFLARE_INCLUDE_PROCESS_ENV=true npm run dev` to expose it to the local worker. Build with `npm run build`.

## Profile and completed actions

Verification is treated as complete off-channel and skipped during the call. The profile appears when the call starts, with K's name, client ID, fictional address, service book, segment, advisor status, accounts, service context, and contact history. Account balances and initial service facts remain scenario-specific. Address, book, segment, and advisor metadata are explicitly fictional CRM fixtures.

When a client accepts an offering, Jordan guides the relevant setup, reviews the proposed change, and requests final authorization. The `complete_training_action` tool validates the latest client consent and records the action before Jordan confirms completion. It supports account opening, account updates, enrollment, and scheduling in the training workspace. Interest, a decline, or an unconfirmed proposal cannot complete an action.

Completed actions are saved in this browser's local storage under `schwab-training-actions-k-v1`. New accounts appear in the accounts table; accepted enrollments appear with the selected account and completion status in Offering enrollments. Other changes appear in the completed-changes section. Advisor-related actions also appear in advisor status. These records survive reloads and future calls in the same browser. They do not execute real Schwab transactions or create real brokerage accounts. Clearing browser storage removes them.

## Live coaching and reports

- `POST /api/realtime/session` creates a short-lived Realtime client secret. WebRTC carries audio; streaming captions and completed transcripts share one chronological feed. Partial captions survive interruptions and call end.
- Server voice detection uses a 0.65 activation threshold and 650 ms silence period. `create_response` is disabled so the app can request the private coaching cue before Jordan replies. The cue has a bounded wait budget; Jordan can reply without it if delayed.
- A stalled reply clears its waiting state after 15 seconds without generation activity and exposes **Retry reply**. Audio generation and actual playback may still be affected by network, provider, microphone, and browser behavior.
- Service progress advances after the original request is resolved; delayed cues cannot move the stage backward. All previously surfaced offerings remain visible and receive updated evidence.
- Offerings with evidence confidence of 70% or higher appear first in a separate group, followed by other offerings. Confidence measures conversation evidence, not product eligibility or suitability. Criteria and supporting details are visible without a dropdown.
- **End call** always renders a call and offering journey report, then requests a final assessment from `/api/analyze`. If that assessment fails, the transcript and discovered offerings remain in the report.
- Each offering gets its own journey: representative transition, client need and timestamp, why it became relevant, its introduction, supporting engagement, and completed actions or next steps. The report retains every surfaced or evidenced path and offerings named in the transcript, including paths outside the live shortlist. When no offering was introduced, the report shows the service journey and that outcome explicitly.

The waveform is a speaking-state indicator rather than an audio-amplitude measurement. Browser console timing logs report cue, request, and playback latency without conversation text or credentials.

## Validation

```sh
npm run test:insights
npx tsc --noEmit
npm run lint
```

Tests cover evidence validation, discovery gates, stage progression, retained offerings, multi-offering journeys, confidence groups, final authorization, simulated-action persistence, and session tool registration. Session API tests mock the provider; they do not replace a live voice smoke test.

Profile fixtures include populated account balances, Book totals of $250,000–$650,000, and A/B/C segments. The address is the publicly listed San Francisco City Hall address ([source](https://www.sfgov.org/ccsfgsa/contact-us-5)), used as fixture data rather than a private customer residence. Account snapshots are also supplied to the voice agent so its account context matches the visible profile.
