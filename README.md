# Relationship Call Studio

A browser-based training simulation. OpenAI Realtime plays Jordan, a synthetic Schwab service representative; the human speaks or types as the client. A separate analysis model updates the call reason, category, subcategory, service progress, evidence tags, and relevant Schwab relationship paths as the conversation develops.

The app uses only the seven complete calls in `data/shortlisted-relationship-scenarios.md`. The previous 20-call library and evaluation map have been removed from the app. Each new call chooses a random caller from this shortlist, excluding the caller from the previous call in the same browser session. The caller and backstory stay stable throughout the call. The scenario list and hidden facts are not shown in the interface. Customer names in the runtime library are female.

A compact customer profile appears with each call. Name, age, account context, and account amounts come from the supplied synthetic scripts. Prior-contact counts and recent-contact labels are additional simulated CRM data, marked as such in the interface. Household and goal facts appear in the expanded profile only after the customer says them in the live conversation.

## Run locally

Use Node.js 22.13 or newer. Keep `OPENAI_API_KEY` on the server only.

    npm ci
    npm run dev

Open the local URL shown by the development server. Build with `npm run build`.

## Live behavior

- `POST /api/realtime/session` creates a short-lived client secret for `gpt-realtime-2.1`. The Realtime model plays Jordan, the service representative. The human plays the selected client. Jordan receives a synthetic service record and relevant product desk references, but the client's broader facts stay in the human-facing role brief until the human says them.
- WebRTC carries voice and captions. The human client can also use **Call Jordan by text**. Semantic turn detection uses high eagerness to reduce response delay.
- `POST /api/analyze` sends finalized live turns to `gpt-5.6-luna`. A customer statement that matches the selected scenario's opening service reason displays an initial call-reason classification immediately; the model then confirms or revises it. Every finalized customer or representative turn queues a fresh analysis, and newer turns supersede older requests. The model returns a strict JSON response, including one current representative action and an optional question. The server checks taxonomy labels, relationship-path IDs, and evidence turn IDs. The example script is not sent as evidence to the analyzer.
- The transcript stays on the left. AI Insights first shows the call-reason donut and the current service recommendation. Relationship-path tiles and their references appear only after the call reason is identified and the original service request is completed. Supported paths are ranked by conversation-evidence strength; held paths need review, and candidate paths remain on the radar until the customer voices a need. Each supported tile shows evidence and a representative guideline. Intelligent Portfolios also shows which discovery requirements have been met, remain unknown, or conflict with the customer's needs. When the call ends, a visual journey highlights the first supported relationship signal, the representative's preceding discovery question when one exists, and the paths that subsequently emerged.
- Path detection checks the customer's statements against each scenario's supported paths, so a clear signal still appears when the analysis model omits it. The example script and private role-play beats never count as conversation evidence.
- The original nine call-reason labels retain their source-row references. Additional labels needed by the expanded synthetic library are marked as demo scenario mappings in the References panel.

Path confidence summarizes strength of conversation evidence; it is not a model probability, product eligibility, or suitability score. Paths are educational prompts for a representative, not enrollment instructions or individualized recommendations. The program's formal review and approved service procedures remain necessary.

## Example call

Choose a new client role and read the private brief. Call Jordan by voice or text. Explain the initial service question and answer naturally as the client. The app listens to both sides of the actual call; only the human client's statements establish relationship signals. Offering tiles appear after the original service request is addressed. The transition visual appears when the call ends.

To check the full seven-call journey against the live analysis API while the app is running, use `node scripts/check-relationship-paths.mjs`. Pass the local app URL and a scenario ID as optional arguments to check one call.
