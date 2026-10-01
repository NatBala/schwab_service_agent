import { Banknote, ArrowRightLeft, Bot, ChartPie, Users, Network, Receipt, CalendarClock, ListChecks, ChartNoAxesCombined, Landmark, House, HandCoins, GraduationCap, Baby, Building2, HeartHandshake, ShieldCheck, Sprout, BriefcaseBusiness, Coins, Monitor, Headphones, type LucideIcon } from "lucide-react";

const icons: Record<string, LucideIcon> = {
  cash_options: Banknote, rollover_support: ArrowRightLeft, automated_investing: Bot,
  managed_portfolios: ChartPie, wealth_advisory: Users, financial_consultant: Users,
  advisor_network: Network, tax_aware_review: Receipt, retirement_income: CalendarClock,
  schwab_plan: ListChecks, personalized_indexing: ChartNoAxesCombined, investor_checking: Landmark,
  home_lending: House, pledged_asset_line: HandCoins, education_savings: GraduationCap,
  college_529: GraduationCap, education_savings_account: GraduationCap, custodial_account: Baby,
  organization_account: Building2, teen_investor: Sprout, trust_services: ShieldCheck,
  charitable_giving: HeartHandshake, small_business_retirement: BriefcaseBusiness,
  fractional_shares: Coins, trading_tools: Monitor, service_recovery: Headphones,
  inherited_ira_support: CalendarClock,
};
export function OfferingIcon({ id, size = 19 }: { id: string; size?: number }) {
  const Icon = icons[id] ?? ChartPie;
  return <span className={"offering-icon icon-" + id} aria-hidden="true"><Icon size={size} strokeWidth={1.8} /></span>;
}

/** Radial evidence meter. Unknown relevance is drawn without a percentage. */
export function ConfidenceRing({ value, unknown = false, size = 54 }: { value: number | null; unknown?: boolean; size?: number }) {
  const score = Math.max(0, Math.min(100, value ?? 0));
  const radius = 21;
  const circumference = 2 * Math.PI * radius;
  return <div className={"confidence-ring" + (unknown ? " unknown" : "")} style={{ width: size, height: size }}
    role="img" aria-label={unknown ? "Evidence not yet established" : `Conversation evidence ${score} percent`}>
    <svg viewBox="0 0 50 50">
      <circle cx="25" cy="25" r={radius} className="ring-track" />
      {!unknown && <circle cx="25" cy="25" r={radius} className="ring-value" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - score / 100)} />}
    </svg>
    <span>{unknown ? "?" : score}<small>{unknown ? "" : "%"}</small></span>
  </div>;
}
