import { SCENARIOS } from "@/lib/relationship-scenarios";
import { CUSTOMER_PROFILES } from "@/lib/customer-profiles";
import { CLIENT_ROLE_BRIEFS } from "@/lib/call-roles";
import Copilot from "./copilot";

export default function Home() {
  const scenarios = SCENARIOS.map(({ id, title, callerName, age, openingReason, customerOpener, serviceResolution, sourceCompleteness }) => ({
    id,
    title,
    callerName: callerName ?? "Customer",
    age: age ?? 0,
    openingReason,
    customerOpener,
    serviceResolution,
    sourceCompleteness,
    profile: CUSTOMER_PROFILES[id] ?? null,
    clientBrief: CLIENT_ROLE_BRIEFS[id] ?? null,
  }));

  return <Copilot scenarios={scenarios} />;
}
