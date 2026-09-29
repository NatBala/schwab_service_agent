/** Original taxonomy labels plus clearly identified mappings for the expanded synthetic scripts. */
export type TaxonomyEntry = {
  category: string;
  subcategory: string;
  reason: string;
  /** One-based original source line, or null for a synthetic scenario mapping. */
  sourceLine: number | null;
};

export const TAXONOMY: TaxonomyEntry[] = [
  { category: "New Accounts", subcategory: "Opening Accounts", reason: "Create a New Account", sourceLine: 861 },
  { category: "Retirements", subcategory: "Rollover", reason: "IRA Rollover", sourceLine: 1024 },
  { category: "Move Money", subcategory: "ACH", reason: "Periodic Request", sourceLine: 524 },
  { category: "Client Inquiries", subcategory: "Account Balance", reason: "Account Balance", sourceLine: 303 },
  { category: "Cost Basis", subcategory: "Cost Basis Reporting", reason: "Cost Basis Report", sourceLine: 393 },
  { category: "Investment Products", subcategory: "Money Market Fund", reason: "Cash Sweeps", sourceLine: 443 },
  { category: "New Accounts", subcategory: "Advisory", reason: "Advisory Fees", sourceLine: 796 },
  { category: "Death & Divorce", subcategory: "Death Claim Process", reason: "Beneficiary Claim", sourceLine: 405 },
  { category: "Move Money", subcategory: "RMD Service", reason: "RMD", sourceLine: 693 },
  // These additional labels map the 20 synthetic scenarios; they are not claimed as exact source-taxonomy rows.
  { category: "Client Inquiries", subcategory: "Advisor Issues", reason: "Request New Advisor", sourceLine: null },
  { category: "Move Money", subcategory: "ACH", reason: "Transfer Status", sourceLine: null },
  { category: "Move Money", subcategory: "Wires", reason: "Outgoing Wire", sourceLine: null },
  { category: "Move Money", subcategory: "Transfers", reason: "Rejected Transfer", sourceLine: null },
  { category: "Client Inquiries", subcategory: "Account Services", reason: "Checking and Debit Card", sourceLine: null },
  { category: "Client Inquiries", subcategory: "Cash Availability", reason: "Cash Withdrawal", sourceLine: null },
  { category: "New Accounts", subcategory: "Account Types", reason: "Education Savings Account", sourceLine: null },
  { category: "New Accounts", subcategory: "Account Types", reason: "Teen Investor Account", sourceLine: null },
  { category: "Account Maintenance", subcategory: "Beneficiaries", reason: "Update Beneficiary", sourceLine: null },
  { category: "Death & Divorce", subcategory: "Inherited IRA", reason: "Inherited IRA Distribution", sourceLine: null },
  { category: "Move Money", subcategory: "Gifts", reason: "Gift Appreciated Securities", sourceLine: null },
  { category: "Retirements", subcategory: "Small Business Plans", reason: "Plan Setup", sourceLine: null },
  { category: "New Accounts", subcategory: "Opening Accounts", reason: "Brokerage Account Opening", sourceLine: null },
  { category: "Trading", subcategory: "Trade Desk", reason: "Trading Tools", sourceLine: null },
  { category: "Account Maintenance", subcategory: "Account Closure", reason: "Close Account", sourceLine: null },
];
