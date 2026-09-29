import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { computeFastPacket, type FastTurn } from "../lib/fast-recommendations";
import { SCENARIOS } from "../lib/relationship-scenarios";

const finalCalls: Array<{ id: string; turns: FastTurn[] }> = [];

for (const scenario of SCENARIOS) {
  assert.ok(scenario.script?.length, `${scenario.id} needs a scripted call`);
  const turns: FastTurn[] = [];
  let openingChecked = false;

  for (const [index, line] of scenario.script.entries()) {
    turns.push({ id: `${scenario.id}-${index}`, role: line.speaker, text: line.text, at: index });
    if (line.speaker !== "customer") continue;

    const packet = computeFastPacket(scenario.id, turns);
    if (!openingChecked) {
      assert.ok(packet.callReason, `${scenario.id} should classify its opening request`);
      openingChecked = true;
    }
    if (packet.serviceState !== "resolved") {
      assert.equal(packet.paths.length, 0, `${scenario.id} suggested an offering before servicing ended`);
    }
  }

  const last = computeFastPacket(scenario.id, turns);
  assert.equal(last.serviceState, "resolved", `${scenario.id} never resolved its service request`);
  assert.ok(last.paths.length > 0, `${scenario.id} never surfaced a supported relationship path`);
  finalCalls.push({ id: scenario.id, turns });
}

const timings: number[] = [];
for (let iteration = 0; iteration < 1_000; iteration += 1) {
  const call = finalCalls[iteration % finalCalls.length];
  const start = performance.now();
  computeFastPacket(call.id, call.turns);
  timings.push(performance.now() - start);
}
timings.sort((a, b) => a - b);
const p95 = timings[Math.floor(timings.length * 0.95)];
assert.ok(p95 < 100, `Fast packet p95 was ${p95.toFixed(2)} ms`);

process.stdout.write(`Seven scenarios passed; no premature offerings; packet computation p95 ${p95.toFixed(2)} ms.\n`);
