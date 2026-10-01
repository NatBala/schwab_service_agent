/** Synthetic CRM records. The address is a verified public location, not a client's residence. */
export type CustomerProfile = {
  portrait: "female" | "male";
  relationship: string;
  address: string;
  book: string;
  segment: "A" | "B" | "C";
  advisor: string;
  clientId: string;
  accounts: Array<{ name: string; detail: string }>;
  priorContacts: number;
  lastContact: string;
  context: string;
  discoverable: Array<{ label: string; phrases: string[] }>;
};

const K_CLIENT_DETAILS = {
  // Public address source: https://www.sfgov.org/ccsfgsa/contact-us-5
  address: "1 Dr. Carlton B. Goodlett Place, San Francisco, CA 94102",
  advisor: "No advisor assigned",
  clientId: "K-001",
};

export const CUSTOMER_PROFILES: Record<string, CustomerProfile> = {
  "relationship-01": {
    ...K_CLIENT_DETAILS,
    portrait: "male",
    book: "$312,000",
    segment: "C",
    relationship: "Individual brokerage",
    accounts: [{ name: "Self-directed brokerage", detail: "$12,000 · Active" }, { name: "Traditional IRA", detail: "$300,000 · Active" }],
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
    ...K_CLIENT_DETAILS,
    portrait: "male",
    book: "$425,000",
    segment: "B",
    relationship: "Brokerage + retirement",
    accounts: [
      { name: "Taxable brokerage", detail: "$175,000 · Active" },
      { name: "Traditional IRA", detail: "$250,000 · Active" },
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
    ...K_CLIENT_DETAILS,
    portrait: "male",
    book: "$625,000",
    segment: "A",
    relationship: "Taxable investing",
    accounts: [{ name: "Taxable brokerage", detail: "$625,000 · Active" }],
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
    ...K_CLIENT_DETAILS,
    portrait: "male",
    book: "$385,000",
    segment: "B",
    relationship: "Rollover IRA opened",
    accounts: [{ name: "Schwab brokerage", detail: "$385,000 · Active" }, { name: "Schwab Rollover IRA", detail: "$0 · Open; incoming rollover pending" }],
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
    ...K_CLIENT_DETAILS,
    portrait: "male",
    book: "$275,000",
    segment: "C",
    relationship: "Family account inquiry",
    accounts: [{ name: "Schwab brokerage", detail: "$125,000 · Active" }, { name: "Roth IRA", detail: "$150,000 · Active" }],
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
    ...K_CLIENT_DETAILS,
    portrait: "male",
    book: "$650,000",
    segment: "A",
    relationship: "Business owner inquiry",
    accounts: [{ name: "Schwab Organization Account", detail: "$250,000 · Active" }, { name: "Personal brokerage", detail: "$400,000 · Active" }],
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
    ...K_CLIENT_DETAILS,
    portrait: "male",
    book: "$515,000",
    segment: "B",
    relationship: "Brokerage relationship",
    accounts: [{ name: "Schwab brokerage", detail: "$315,000 · Active; beneficiary update requested" }, { name: "Traditional IRA", detail: "$200,000 · Active" }],
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
