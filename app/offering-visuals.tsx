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
export function OfferingIcon({ id }: { id: string }) {
  const Icon = icons[id] ?? ChartPie;
  return <span className={"offering-icon icon-" + id} aria-hidden="true"><Icon size={19} strokeWidth={1.8} /></span>;
}
export function ConfidenceChart({ value, unknown = false }: { value: number | null; unknown?: boolean }) {
  const score = Math.max(0, Math.min(100, value ?? 0));
  return <div className={"offering-confidence-chart" + (unknown ? " unknown" : "")}>
    <div><span>Evidence confidence</span><strong>{unknown ? "Not established" : `${score}%`}</strong></div>
    <svg viewBox="0 0 200 17" role="img" aria-label={unknown ? "Confidence not established; discovery candidate" : `Conversation evidence confidence ${score} percent`}>
      <rect x="0" y="2" width="200" height="6" rx="3" fill="currentColor" opacity=".12" />
      {!unknown && <rect x="0" y="2" width={score * 2} height="6" rx="3" fill="currentColor" />}
      {[0, 50, 100].map(tick => <line key={tick} x1={tick * 1.98 + 1} x2={tick * 1.98 + 1} y1="11" y2="15" stroke="currentColor" opacity=".3" />)}
    </svg>
    <div className="confidence-axis" aria-hidden="true"><span>0</span><span>50</span><span>100</span></div>
  </div>;
}
