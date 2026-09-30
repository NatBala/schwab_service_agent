/** Synthetic CRM context for the seven training callers. Contact counts are demo data. */
export type CustomerProfile = {
  portrait: "female" | "male";
  relationship: string;
  accounts: Array<{ name: string; detail: string }>;
  priorContacts: number;
  lastContact: string;
  context: string;
  discoverable: Array<{ label: string; phrases: string[] }>;
};

export const CUSTOMER_PROFILES: Record<string, CustomerProfile> = {
  "relationship-01": {
    portrait: "female",
    relationship: "Individual brokerage",
    accounts: [{ name: "Self-directed brokerage", detail: "$12,000 on file" }],
    priorContacts: 2,
    lastContact: "Bank-link support",
    context: "Recurring transfer setup is the current service need.",
    discoverable: [
      { label: "Workplace 401(k)", phrases: ["workplace 401", "employer 401"] },
      { label: "Three ETFs held", phrases: ["three etfs"] },
      { label: "Retirement planning goal", phrases: ["enough for retirement", "on track for retirement"] },
    ],
  },
  "relationship-02": {
    portrait: "female",
    relationship: "Brokerage + retirement",
    accounts: [
      { name: "Taxable brokerage", detail: "Schwab account" },
      { name: "Traditional IRA", detail: "$425,000 combined at Schwab" },
    ],
    priorContacts: 4,
    lastContact: "Account statement question",
    context: "A current account-value question brings the customer to service.",
    discoverable: [
      { label: "Outside 401(k) · ~$690,000", phrases: ["690,000", "outside 401"] },
      { label: "Spouse has pension", phrases: ["husband has a pension", "spouse has a pension"] },
      { label: "Rental property", phrases: ["rental property"] },
      { label: "Retirement in eight years", phrases: ["retire in eight years", "eight years"] },
    ],
  },
  "relationship-03": {
    portrait: "female",
    relationship: "Taxable investing",
    accounts: [{ name: "Taxable brokerage", detail: "$1.6 million on file" }],
    priorContacts: 3,
    lastContact: "Tax document request",
    context: "The customer is looking for a consolidated gains-and-losses report.",
    discoverable: [
      { label: "Employer stock concentration", phrases: ["employer stock"] },
      { label: "$180,000 liquidity need", phrases: ["180,000", "renovation"] },
      { label: "Recurring charitable giving", phrases: ["donate", "charities"] },
    ],
  },
  "relationship-04": {
    portrait: "female",
    relationship: "Rollover IRA opened",
    accounts: [{ name: "Schwab Rollover IRA", detail: "Open; rollover pending" }],
    priorContacts: 1,
    lastContact: "Rollover IRA opening",
    context: "The former-plan rollover process remains the first priority.",
    discoverable: [
      { label: "Former-employer 401(k) · ~$185,000", phrases: ["185,000", "old employer", "former plan"] },
      { label: "Current employer 401(k)", phrases: ["current employer", "current employer’s 401"] },
      { label: "Spouse has 403(b)", phrases: ["wife has a 403", "spouse has a 403"] },
    ],
  },
  "relationship-05": {
    portrait: "female",
    relationship: "Family account inquiry",
    accounts: [],
    priorContacts: 0,
    lastContact: "No prior contact recorded",
    context: "The family is comparing account structures for a child.",
    discoverable: [
      { label: "Newborn daughter", phrases: ["daughter was born", "newborn daughter"] },
      { label: "Grandparents plan to contribute", phrases: ["grandparents"] },
      { label: "Parents' retirement goal", phrases: ["our own retirement", "my own retirement"] },
    ],
  },
  "relationship-06": {
    portrait: "female",
    relationship: "Business owner inquiry",
    accounts: [],
    priorContacts: 1,
    lastContact: "Business retirement inquiry",
    context: "Plan choice requires review before an account is opened.",
    discoverable: [
      { label: "Hiring first employee", phrases: ["first full-time employee", "hiring my first", "hire one person"] },
      { label: "Business cash · ~$250,000", phrases: ["250,000", "operating cash"] },
      { label: "Personal retirement concern", phrases: ["personal retirement"] },
    ],
  },
  "relationship-07": {
    portrait: "female",
    relationship: "Brokerage relationship",
    accounts: [{ name: "Schwab brokerage", detail: "Beneficiary update requested" }],
    priorContacts: 2,
    lastContact: "Account maintenance",
    context: "The beneficiary change is the original service request.",
    discoverable: [
      { label: "Family trust", phrases: ["family trust"] },
      { label: "Daughter named successor trustee", phrases: ["daughter is named as successor trustee", "daughter later"] },
      { label: "Charitable legacy goal", phrases: ["charities", "charitable"] },
    ],
  },
};
