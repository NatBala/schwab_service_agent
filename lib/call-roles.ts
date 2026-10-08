/** Training-only client briefs and account records. The representative sees only serviceRecord. */
import type { RelationshipPathId } from "./relationship-paths";
export type ClientRoleBrief = {
  situation: string;
  ifAsked: string[];
};

export type RepresentativeServiceRecord = {
  knownRecord: string[];
  serviceApproach: string;
  discoveryBridge: string;
  deskReferences: RelationshipPathId[];
};

export const CLIENT_ROLE_BRIEFS: Record<string, ClientRoleBrief> = {
  "relationship-01": {
    situation: "You want to move $800 from checking into your Schwab brokerage account every month, starting next month on the fifth.",
    ifAsked: ["You have about $12,000 in the brokerage account and a workplace 401(k).", "You own three ETFs, but deciding how to invest each new deposit has been difficult.", "You want to know whether your saving is enough for retirement and may prefer help maintaining investments."],
  },
  "relationship-02": {
    situation: "The combined value of your Schwab accounts looks lower than it did last week. You want to understand the difference.",
    ifAsked: ["Your Schwab taxable brokerage and Traditional IRA total about $425,000.", "You hope to retire in about eight years; you also have an outside 401(k) of about $690,000 and your spouse has a pension.", "A mortgage and rental property make it hard to see one complete retirement picture."],
  },
  "relationship-03": {
    situation: "You need a complete unrealized gains-and-losses view for your taxable brokerage account.",
    ifAsked: ["The taxable portfolio is about $625,000, including roughly $250,000 in appreciated employer stock.", "You worry about overlapping stock exposure and may need about $180,000 for a renovation and taxes.", "You make recurring charitable gifts and wonder how appreciated shares could fit."],
  },
  "relationship-04": {
    situation: "You opened a Schwab Rollover IRA and need the right instructions to move an old employer 401(k).",
    ifAsked: ["The former employer plan has about $185,000; the rollover has not yet been requested.", "You also have a current employer plan and your spouse has a 403(b).", "Once the process is clear, you want to understand whether retirement savings are on track and how the rollover money could be managed."],
  },
  "relationship-05": {
    situation: "Your daughter was born last month. You and both sets of grandparents want to save for her future, but you do not know which account type fits.",
    ifAsked: ["Education is important, but you want to understand what happens if she uses less than expected for school.", "You also care about flexibility and who controls the money.", "You do not want contributions for your daughter to crowd out your own retirement savings."],
  },
  "relationship-06": {
    situation: "You own a consulting firm and were looking at a SEP-IRA application, but are unsure whether it is the right retirement plan.",
    ifAsked: ["Your first employee starts next quarter, and you might have four employees next year.", "The business has roughly $250,000 beyond immediate operating needs, but payroll and taxes still require liquidity.", "You also want to coordinate your personal retirement with the business plan."],
  },
  "relationship-07": {
    situation: "Your attorney revised your estate plan. You want the beneficiaries on your Schwab brokerage account to match the written instructions.",
    ifAsked: ["Your daughter is named successor trustee but is uneasy about that responsibility.", "You want to understand whether professional trust administration could help later.", "You also hope to build a charitable legacy involving your children."],
  },
};

export const REPRESENTATIVE_SERVICE_RECORDS: Record<string, RepresentativeServiceRecord> = {
  "relationship-01": {
    knownRecord: ["K has a self-directed taxable brokerage account with approximately $12,000.", "A linked checking account is part of the scripted relationship. The status of any new recurring instruction is not known."],
    serviceApproach: "Clarify the transfer amount, cadence, date, source, and destination. Once the details are known, save it with complete_training_action (their request is their yes) and confirm it is scheduled.",
    discoveryBridge: "After the client understands the transfer setup, ask what the monthly deposit is helping them work toward.",
    deskReferences: ["schwab_plan", "automated_investing", "fractional_shares"],
  },
  "relationship-02": {
    knownRecord: ["K has a taxable brokerage account and Traditional IRA with a combined practice value of about $425,000.", "The scripted difference from the prior week reflects market-price movement and a $2,000 withdrawal; no other unexplained transaction is in the practice record."],
    serviceApproach: "Explain the combined value and the known reasons for the change. Ask whether that addresses the balance question before exploring other goals.",
    discoveryBridge: "After the balance question is answered, ask whether they are tracking a broader goal with these accounts.",
    deskReferences: ["schwab_plan", "financial_consultant", "wealth_advisory"],
  },
  "relationship-03": {
    knownRecord: ["K has a taxable brokerage account with a practice value around $625,000.", "The Positions area contains unrealized gain-and-loss columns; available report or export controls depend on the account view."],
    serviceApproach: "Help the client locate the complete unrealized gains-and-losses view. Confirm they found it before discussing what decision prompted them to look.",
    discoveryBridge: "Ask what decision prompted the review of gains and losses.",
    deskReferences: ["personalized_indexing", "pledged_asset_line", "charitable_giving", "financial_consultant", "wealth_advisory"],
  },
  "relationship-04": {
    knownRecord: ["K has an open Rollover IRA with no completed former-plan transfer in the practice record.", "The former employer 401(k) is approximately $185,000. Collect the client's distribution preferences and record the rollover setup the client asks for; do not invent payee details or claim funds have arrived."],
    serviceApproach: "Clarify whether a distribution was requested and explain the direct-rollover process. Guide the training rollover setup; complete it once the client's choices are known and they have said yes. Do not imply the IRA rollover itself is a recommendation.",
    discoveryBridge: "After the rollover process is clear, ask what K wants these retirement assets to support.",
    deskReferences: ["schwab_plan", "automated_investing", "financial_consultant"],
  },
  "relationship-05": {
    knownRecord: ["K is asking about an account for a newborn daughter; no child account has been opened in this practice record."],
    serviceApproach: "Compare the purpose and control of education-focused and custodial account structures at a high level. Clarify intended use before suggesting an account type. After the client selects an account type, guide setup and complete the training action after their yes.",
    discoveryBridge: "Once the account choices are clear, ask how the family wants to balance child savings with other goals.",
    deskReferences: ["college_529", "education_savings_account", "custodial_account", "schwab_plan"],
  },
  "relationship-06": {
    knownRecord: ["K owns a consulting firm and is asking about a SEP-IRA; no plan has been opened in this practice record."],
    serviceApproach: "Ask about current and expected employees, then compare relevant plan structures and guide the training application steps and complete the action only after the client chooses a plan and says yes.",
    discoveryBridge: "After plan requirements are clarified, ask whether other business or personal finances need coordination.",
    deskReferences: ["small_business_retirement", "organization_account", "cash_options", "financial_consultant", "schwab_plan"],
  },
  "relationship-07": {
    knownRecord: ["K has a Schwab brokerage account and wants the beneficiary designation to follow their attorney's revised written instructions.", "No beneficiary update has been submitted in this practice record."],
    serviceApproach: "Help them review the approved update process and compare names and percentages with the attorney's instructions. Do not interpret legal documents or claim submission without a confirmed action.",
    discoveryBridge: "After the beneficiary process is clear, ask whether the update is part of a broader family or estate plan.",
    deskReferences: ["trust_services", "wealth_advisory", "charitable_giving", "financial_consultant"],
  },
};
