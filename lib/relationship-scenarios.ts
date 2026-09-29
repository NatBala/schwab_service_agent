import type { Scenario } from "./scenarios";
import { TAXONOMY } from "./taxonomy";

/** Seven synthetic calls from the latest user-supplied shortlist. */
const briefs = [
  {
    "id": "relationship-01",
    "title": "Recurring ACH becomes retirement planning and automated investing",
    "callerName": "Maya Patel",
    "age": 36,
    "openingReason": "Transfer $800 every month",
    "customerOpener": "Hi, Jordan. I’m trying to set up an automatic transfer from my checking account into my Schwab brokerage account. I tried online, but I wasn’t sure I completed it correctly.",
    "rolePlayHiddenFacts": [
      "Immediate service request: Transfer $800 every month",
      "Broader concern, to reveal naturally after the service discussion: The client saves consistently but does not know how much to save or how to invest each deposit",
      "Existing account: Self-directed taxable brokerage account",
      "Current balance: $12,000"
    ],
    "serviceResolution": "Address the original request: Transfer $800 every month. Use only actions confirmed in the live conversation.",
    "postServiceBridge": "The client saves consistently but does not know how much to save or how to invest each deposit",
    "discoveryBeats": [
      "Ask whether the monthly deposit is enough for retirement; you also have a workplace 401(k) and want a combined plan.",
      "Explain that you own three ETFs but struggle to decide how to allocate each deposit, so some contributions sit in cash.",
      "Explain your preference to have portfolio selection and rebalancing managed after your planning question is addressed."
    ],
    "opportunityCues": [
      "The client saves consistently but does not know how much to save or how to invest each deposit"
    ],
    "guardrails": [
      "Do not claim an action, enrollment, or account change occurred unless the representative confirms it. Do not offer a product before the client voices a relevant need."
    ],
    "investingApproach": "Educational exploration only after the client states an investing goal and preference.",
    "taxonomyPath": [
      "Move Money",
      "ACH",
      "Periodic Request"
    ],
    "sourceCompleteness": "full_script",
    "script": [
      {
        "speaker": "representative",
        "text": "Thank you for calling Charles Schwab. My name is Jordan. How may I help you today?"
      },
      {
        "speaker": "customer",
        "text": "Hi, Jordan. I’m trying to set up an automatic transfer from my checking account into my Schwab brokerage account. I tried online, but I wasn’t sure I completed it correctly."
      },
      {
        "speaker": "representative",
        "text": "I can review the linked bank information and help you establish the recurring instruction. Before accessing the account, I’ll need to complete our standard verification."
      },
      {
        "speaker": "representative",
        "text": "Thank you, Maya. I see the individual brokerage account ending in 2196 and the linked checking account. How much would you like transferred?"
      },
      {
        "speaker": "customer",
        "text": "Eight hundred dollars."
      },
      {
        "speaker": "representative",
        "text": "How frequently?"
      },
      {
        "speaker": "customer",
        "text": "Every month."
      },
      {
        "speaker": "representative",
        "text": "Which day would you prefer?"
      },
      {
        "speaker": "customer",
        "text": "The fifth."
      },
      {
        "speaker": "representative",
        "text": "And the transfer should begin next month?"
      },
      {
        "speaker": "customer",
        "text": "Yes."
      },
      {
        "speaker": "representative",
        "text": "Please review the details now displayed: $800 from the linked checking account into the brokerage account ending in 2196, monthly on the fifth, beginning next month."
      },
      {
        "speaker": "customer",
        "text": "That’s correct."
      },
      {
        "speaker": "representative",
        "text": "Once you approve the instruction, I’ll confirm its status."
      },
      {
        "speaker": "customer",
        "text": "I approved it."
      },
      {
        "speaker": "representative",
        "text": "The recurring instruction now shows as scheduled."
      },
      {
        "speaker": "customer",
        "text": "Once the $800 arrives, does Schwab automatically invest it in the ETFs I already own?"
      },
      {
        "speaker": "representative",
        "text": "In your current self-directed brokerage account, the recurring instruction transfers cash into the account. It does not select or purchase an investment automatically."
      },
      {
        "speaker": "customer",
        "text": "That’s what I was afraid of. I already have three ETFs, but I don’t know how much should go into each one. Some months I choose one, sometimes another, and sometimes the money just sits in cash."
      },
      {
        "speaker": "representative",
        "text": "What are these monthly contributions intended to accomplish?"
      },
      {
        "speaker": "customer",
        "text": "They’re for retirement. I already contribute to my workplace 401(k), but I want to save more outside of that."
      },
      {
        "speaker": "representative",
        "text": "Approximately how far away is retirement?"
      },
      {
        "speaker": "customer",
        "text": "More than 25 years."
      },
      {
        "speaker": "representative",
        "text": "Do you have emergency savings separately, or might you need these monthly contributions for expenses in the next few years?"
      },
      {
        "speaker": "customer",
        "text": "I have about six months of expenses in a savings account. This money is intended to stay invested."
      },
      {
        "speaker": "representative",
        "text": "There are really two questions in what you described. One is whether $800 per month is consistent with the retirement outcome you want. The second is how those contributions should be invested. Does that sound right?"
      },
      {
        "speaker": "customer",
        "text": "Yes. I don’t know the answer to either one."
      },
      {
        "speaker": "representative",
        "text": "Would you prefer to learn how to select and maintain the investments yourself, or would you rather have a portfolio built and maintained for you?"
      },
      {
        "speaker": "customer",
        "text": "I would rather have it managed. I’m comfortable saving money, but I don’t enjoy making investment decisions."
      },
      {
        "speaker": "representative",
        "text": "Based on that, two Schwab capabilities may be useful, but they serve different purposes. May I explain both?"
      },
      {
        "speaker": "customer",
        "text": "Yes."
      },
      {
        "speaker": "representative",
        "text": "Schwab Plan is a complimentary financial plan available with any Schwab account. It lets you enter your expected retirement date, expenses, income, assets, outside investments, pensions, annuities, and Social Security assumptions. It then runs simulated market projections and lets you test how changes such as saving more, retiring later, or changing spending could affect the result. Those projections are hypothetical and are not guarantees."
      },
      {
        "speaker": "customer",
        "text": "So that could help me understand whether $800 a month is enough?"
      },
      {
        "speaker": "representative",
        "text": "It can help you connect the contribution amount to the goal and test different assumptions. It does not guarantee the result or provide individualized tax or legal advice."
      },
      {
        "speaker": "customer",
        "text": "And what would manage the investments?"
      },
      {
        "speaker": "representative",
        "text": "One possible path is Schwab Intelligent Portfolios. You complete a questionnaire covering your goal, timeline, and risk tolerance. The robo-advisor builds, monitors, and automatically rebalances a diversified ETF portfolio. The current minimum is $5,000. Schwab states that there is no program advisory fee or commissions, but clients pay the ETFs’ operating expenses, and the program includes a cash allocation."
      },
      {
        "speaker": "customer",
        "text": "Would that mean the $800 gets allocated without my selecting an ETF every month?"
      },
      {
        "speaker": "representative",
        "text": "If the recurring deposit were directed into an eligible Intelligent Portfolios account, the deposits would be managed according to that account’s portfolio. Your instruction today is going into the existing self-directed brokerage account, so it does not change the investment structure by itself."
      },
      {
        "speaker": "customer",
        "text": "Can I convert my existing account?"
      },
      {
        "speaker": "representative",
        "text": "That requires review. Your current investments may need to be sold to implement a managed portfolio, which could create tax consequences in a taxable account. You would need to review your holdings, gains and losses, the recommended portfolio, the cash allocation, costs, and investment risks before authorizing anything."
      },
      {
        "speaker": "customer",
        "text": "Could I keep this account and open a separate automated account?"
      },
      {
        "speaker": "representative",
        "text": "Different account structures may be possible, but the appropriate arrangement should be reviewed rather than assumed during this call."
      },
      {
        "speaker": "customer",
        "text": "I would like to start with the financial plan and then evaluate automated investing."
      },
      {
        "speaker": "representative",
        "text": "That is a sensible sequence. I’ll connect you with the planning team and document your interest in automated management after the retirement objective has been modeled."
      },
      {
        "speaker": "customer",
        "text": "Great."
      },
      {
        "speaker": "representative",
        "text": "Let me summarize. We established the $800 monthly transfer into your current self-directed brokerage account. The transfer moves cash but does not automatically invest it. You identified retirement as the goal, a timeline of more than 25 years, separate emergency savings, and a preference for having the portfolio managed. No investment change was authorized today. I’ll now connect you with a planning specialist."
      },
      {
        "speaker": "customer",
        "text": "That’s correct. Thank you."
      }
    ]
  },
  {
    "id": "relationship-02",
    "title": "A balance inquiry becomes a comprehensive retirement and wealth conversation",
    "callerName": "Allison Reed",
    "age": 57,
    "openingReason": "Confirm current account value",
    "customerOpener": "I’m trying to confirm the total value of my Schwab accounts. The number looks lower than I remember seeing last week.",
    "rolePlayHiddenFacts": [
      "Immediate service request: Confirm current account value",
      "Broader concern, to reveal naturally after the service discussion: The client has no consolidated view of retirement readiness",
      "Schwab assets: $425,000",
      "Outside 401(k): Approximately $690,000",
      "Other household factors: Spouse’s pension, mortgage, two properties, retirement in eight years"
    ],
    "serviceResolution": "Address the original request: Confirm current account value. Use only actions confirmed in the live conversation.",
    "postServiceBridge": "The client has no consolidated view of retirement readiness",
    "discoveryBeats": [
      "Ask whether your Schwab balance puts you on track to retire in eight years; your outside 401(k) and spouse's pension matter too.",
      "Explain that your mortgage and rental property make the retirement picture hard to coordinate, and you want help interpreting a single plan.",
      "Mention the possible property sale, company stock, support for your mother, and aging estate documents; ask whether ongoing coordinated advice would help, while keeping a one-time plan an option."
    ],
    "opportunityCues": [
      "The client has no consolidated view of retirement readiness"
    ],
    "guardrails": [
      "Do not claim an action, enrollment, or account change occurred unless the representative confirms it. Do not offer a product before the client voices a relevant need."
    ],
    "investingApproach": "Educational exploration only after the client states an investing goal and preference.",
    "taxonomyPath": [
      "Client Inquiries",
      "Account Balance",
      "Account Balance"
    ],
    "sourceCompleteness": "full_script",
    "script": [
      {
        "speaker": "representative",
        "text": "Thank you for calling Charles Schwab. My name is Jordan. What can I help you with today?"
      },
      {
        "speaker": "customer",
        "text": "I’m trying to confirm the total value of my Schwab accounts. The number looks lower than I remember seeing last week."
      },
      {
        "speaker": "representative",
        "text": "I can review the current values and recent activity. I’ll first complete standard verification."
      },
      {
        "speaker": "representative",
        "text": "Thank you. I see a taxable brokerage account and a Traditional IRA. Their combined current value is approximately $425,000. The difference from last week appears to reflect market-price movements and a recent withdrawal of $2,000. I do not see any other unexplained transaction."
      },
      {
        "speaker": "customer",
        "text": "Okay, that explains the difference."
      },
      {
        "speaker": "customer",
        "text": "I have a broader question. Is $425,000 good or bad for somebody who wants to retire in eight years?"
      },
      {
        "speaker": "representative",
        "text": "The Schwab balance alone would not be enough to answer that responsibly. We would also need to consider your expected spending, outside accounts, Social Security, pension income, debt, retirement date, and how long the assets may need to support you."
      },
      {
        "speaker": "customer",
        "text": "I have about $690,000 in my current employer’s 401(k). My husband has a pension. We still owe around $280,000 on our house, and we have a rental property."
      },
      {
        "speaker": "representative",
        "text": "Have you ever put those pieces into a single financial plan?"
      },
      {
        "speaker": "customer",
        "text": "No. I look at each account separately."
      },
      {
        "speaker": "representative",
        "text": "Would you primarily like a one-time retirement assessment, or do you think you need an ongoing relationship to coordinate the investments, retirement income, real estate, tax-planning strategies, and estate considerations?"
      },
      {
        "speaker": "customer",
        "text": "I’m not sure. I thought I only needed to know whether I was on track, but when you say it that way, there are several things that need to work together."
      },
      {
        "speaker": "representative",
        "text": "What other decisions are you anticipating before retirement?"
      },
      {
        "speaker": "customer",
        "text": "We may sell the rental property. I also have company stock, and my mother may need financial support. We have an estate attorney, but the documents are several years old."
      },
      {
        "speaker": "representative",
        "text": "I would begin with a consolidated plan rather than immediately selecting an investment product."
      },
      {
        "speaker": "customer",
        "text": "What does that involve?"
      },
      {
        "speaker": "representative",
        "text": "Schwab Plan is available to clients with any Schwab account at no additional charge. It lets you include Schwab and outside investments, income, pensions, Social Security, retirement timing, and spending assumptions. It produces hypothetical simulated outcomes and lets you stress-test changes."
      },
      {
        "speaker": "customer",
        "text": "Can it include the 401(k), pension, and rental-property assumptions even though not all of those are held at Schwab?"
      },
      {
        "speaker": "representative",
        "text": "You can enter outside assets and income assumptions so the plan is not limited to the $425,000 currently at Schwab."
      },
      {
        "speaker": "customer",
        "text": "Who helps me understand what to do with the results?"
      },
      {
        "speaker": "representative",
        "text": "A Schwab Financial Consultant can coordinate the broader Schwab relationship and help connect you to the appropriate resources. If you decide you want ongoing comprehensive advice and meet the program requirements, one path the consultant may discuss is Schwab Wealth Advisory."
      },
      {
        "speaker": "customer",
        "text": "What is the difference between that and the financial plan?"
      },
      {
        "speaker": "representative",
        "text": "The plan helps organize and model your goals. Schwab Wealth Advisory is an ongoing managed relationship with a dedicated Wealth Advisor and a broader team. Schwab describes it as covering areas such as investment management, retirement, tax-smart strategies, estate planning, and multigenerational needs. The current enrollment minimum is $500,000, and the published annual fee begins at 0.80% and declines at higher asset levels. Schwab does not provide individualized legal or tax advice, so your attorney and tax professional remain important."
      },
      {
        "speaker": "customer",
        "text": "Would I have to move my 401(k) or sell the rental property to speak with them?"
      },
      {
        "speaker": "representative",
        "text": "No. A consultation does not commit you to transferring assets, selling property, or enrolling. The purpose is to understand the complete situation and compare service models."
      },
      {
        "speaker": "customer",
        "text": "What if I only want the plan and then manage everything myself?"
      },
      {
        "speaker": "representative",
        "text": "That remains an available path. Schwab Plan itself can lead to self-directed investing, automated investing, or investing with a financial professional."
      },
      {
        "speaker": "customer",
        "text": "I would like to complete the plan and speak with a consultant before deciding."
      },
      {
        "speaker": "representative",
        "text": "I’ll arrange that. No account changes or advisory enrollment will be made today."
      },
      {
        "speaker": "customer",
        "text": "Thank you."
      },
      {
        "speaker": "representative",
        "text": "To recap, we confirmed the Schwab account balance and explained the recent change. You also identified a retirement objective eight years away, an outside 401(k), your husband’s pension, two properties, company stock, possible family support, and estate considerations. The next step is a consolidated Schwab Plan followed by a Financial Consultant conversation."
      },
      {
        "speaker": "customer",
        "text": "Correct."
      }
    ]
  },
  {
    "id": "relationship-03",
    "title": "A cost-basis report reveals four distinct relationship paths",
    "callerName": "Erica Wallace",
    "age": 52,
    "openingReason": "Locate gains-and-losses report",
    "customerOpener": "I’m trying to find a report showing all of my unrealized gains and losses. I can see the cost basis for each position, but not one complete view.",
    "rolePlayHiddenFacts": [
      "Immediate service request: Locate gains-and-losses report",
      "Broader concern, to reveal naturally after the service discussion: Concentration management, liquidity for a renovation, and charitable giving",
      "Taxable portfolio: $1.6 million",
      "Employer stock: $620,000 with substantial unrealized gains"
    ],
    "serviceResolution": "Address the original request: Locate gains-and-losses report. Use only actions confirmed in the live conversation.",
    "postServiceBridge": "Concentration management, liquidity for a renovation, and charitable giving",
    "discoveryBeats": [
      "Explain the large gain and concentration in employer stock, plus overlapping exposure in your index funds.",
      "Explain the roughly $180,000 renovation and tax-payment need and your concern about selling appreciated stock to raise it.",
      "Mention your recurring donations to several charities and your CPA's suggestion to consider gifts of appreciated shares.",
      "Ask for one coordinated discussion because the investment, borrowing, charitable, and tax decisions affect one another."
    ],
    "opportunityCues": [
      "Concentration management, liquidity for a renovation, and charitable giving"
    ],
    "guardrails": [
      "Do not claim an action, enrollment, or account change occurred unless the representative confirms it. Do not offer a product before the client voices a relevant need."
    ],
    "investingApproach": "Educational exploration only after the client states an investing goal and preference.",
    "taxonomyPath": [
      "Cost Basis",
      "Cost Basis Reporting",
      "Cost Basis Report"
    ],
    "sourceCompleteness": "full_script",
    "script": [
      {
        "speaker": "representative",
        "text": "Thank you for calling Charles Schwab. My name is Jordan. How may I help you?"
      },
      {
        "speaker": "customer",
        "text": "I’m trying to find a report showing all of my unrealized gains and losses. I can see the cost basis for each position, but not one complete view."
      },
      {
        "speaker": "representative",
        "text": "I can help you locate the appropriate report. I’ll first complete standard verification."
      },
      {
        "speaker": "representative",
        "text": "Thank you. Are you currently signed in?"
      },
      {
        "speaker": "customer",
        "text": "Yes."
      },
      {
        "speaker": "representative",
        "text": "Please open the Positions area and select the taxable brokerage account ending in 7441. You should see cost-basis and unrealized-gain information by position. There is also an export option for the displayed data."
      },
      {
        "speaker": "customer",
        "text": "I see it. That’s what I needed."
      },
      {
        "speaker": "representative",
        "text": "Was there a particular position or decision that prompted you to review the report?"
      },
      {
        "speaker": "customer",
        "text": "Most of the concern is my employer stock. It’s worth about $620,000 now, and the gain is very large. I also own index funds that include more of the same company and industry."
      },
      {
        "speaker": "representative",
        "text": "Are you mainly trying to sell the employer stock now, or are you looking for a broader strategy around the concentration?"
      },
      {
        "speaker": "customer",
        "text": "I don’t want to sell all of it immediately. I want the rest of the portfolio structured so I’m not unknowingly buying even more of the same exposure."
      },
      {
        "speaker": "representative",
        "text": "Are you also looking for ongoing tax-loss management?"
      },
      {
        "speaker": "customer",
        "text": "Yes. I know I miss opportunities because I don’t monitor every holding."
      },
      {
        "speaker": "representative",
        "text": "One service that may be worth comparing is Schwab Personalized Indexing. It is a separately managed account that owns individual securities representing an index. Subject to investment-management guidance, clients can exclude individual securities or industries. It also manages gains and losses at the individual-security level and uses automated tax-loss harvesting. The current minimum is $100,000, and published fees begin at 0.40% for the first $2 million. Tax benefits are not guaranteed, and ETFs or mutual funds are generally less expensive."
      },
      {
        "speaker": "customer",
        "text": "Could I exclude my employer entirely from the indexed account?"
      },
      {
        "speaker": "representative",
        "text": "The service supports stock and industry exclusions, but the specialist would need to confirm how the requested customization fits the selected strategy."
      },
      {
        "speaker": "customer",
        "text": "That sounds relevant. But I also need around $180,000 for a home renovation and a tax payment. Selling the employer stock to raise it could create a very large gain."
      },
      {
        "speaker": "representative",
        "text": "The liquidity need creates another decision. You could explore asset sales, but Schwab Bank also offers a Pledged Asset Line that allows eligible clients to borrow against qualifying non-retirement assets without first liquidating them."
      },
      {
        "speaker": "customer",
        "text": "Would that avoid the gain?"
      },
      {
        "speaker": "representative",
        "text": "It may avoid an immediate sale, but it introduces borrowing costs and collateral risk. It is an uncommitted demand line, and Schwab states that pledging securities involves a high degree of risk. If collateral values decline or become ineligible, additional action or asset sales may be required. The proceeds also have restricted uses and cannot be used to purchase securities or cryptocurrency or be deposited into a brokerage account. A banking specialist and your tax advisor would need to help you compare it with selling."
      },
      {
        "speaker": "customer",
        "text": "I would want to compare the interest cost with the tax consequences."
      },
      {
        "speaker": "representative",
        "text": "Exactly. Neither path should be assumed to be better before that comparison."
      },
      {
        "speaker": "customer",
        "text": "There is one more thing. I normally donate around $40,000 a year to several charities. My CPA suggested that I ask about donating appreciated shares rather than cash."
      },
      {
        "speaker": "representative",
        "text": "Are you looking to make one immediate gift, or would you like a structure that can support several charities over time?"
      },
      {
        "speaker": "customer",
        "text": "Several charities. Usually the same organizations, but the amounts change."
      },
      {
        "speaker": "representative",
        "text": "DAFgiving360 offers a donor-advised fund. Contributions are irrevocable, and eligible contributions can include appreciated publicly traded securities. After contributing, you can recommend how assets are invested and recommend grants to eligible public charities over time. DAFgiving360 is an independent public charity, integrates with Schwab account views, and currently has no minimum initial contribution for its core account. Personal tax and legal consequences should be reviewed with your professional advisors."
      },
      {
        "speaker": "customer",
        "text": "So now I have three separate things to consider."
      },
      {
        "speaker": "representative",
        "text": "Yes, and that is why I would not route you independently to three products without coordinating the overall objective."
      },
      {
        "speaker": "customer",
        "text": "What do you recommend as the first conversation?"
      },
      {
        "speaker": "representative",
        "text": "The most appropriate first step is a Financial Consultant who can understand the complete picture and coordinate specialists. The potential paths include:"
      },
      {
        "speaker": "customer",
        "text": "That makes sense."
      },
      {
        "speaker": "representative",
        "text": "Schwab Wealth Advisory may be one service the consultant discusses if you want ongoing coordinated advice. It currently requires at least $500,000 for enrollment, and its published annual fee begins at 0.80%. A dedicated Wealth Advisor and Financial Consultant can help coordinate investment, retirement, tax-smart, estate, and multigenerational planning strategies, while your tax and legal professionals continue providing individualized advice."
      },
      {
        "speaker": "customer",
        "text": "I want the coordinated conversation. I don’t want to make the borrowing, charitable, and investment decisions separately."
      },
      {
        "speaker": "representative",
        "text": "I’ll arrange that. No securities will be sold, no credit application will be submitted, no managed account will be opened, and no charitable contribution will be made from this call."
      },
      {
        "speaker": "customer",
        "text": "Good."
      },
      {
        "speaker": "representative",
        "text": "To recap, we located your cost-basis report. The broader issues are employer-stock concentration, the desire to reduce overlapping exposure, a $180,000 liquidity need, and recurring charitable giving. I’ll connect you with a Financial Consultant to coordinate the appropriate specialists and compare the available paths."
      },
      {
        "speaker": "customer",
        "text": "Correct. Thank you."
      }
    ]
  },
  {
    "id": "relationship-04",
    "title": "A 401(k) rollover becomes a long-term retirement relationship",
    "callerName": "Dana Reynolds",
    "age": 49,
    "openingReason": "Obtain rollover instructions",
    "customerOpener": "I left my old employer and want to move the 401(k) to Schwab. I opened a Rollover IRA, but I don’t know what instructions to give the former plan.",
    "rolePlayHiddenFacts": [
      "Immediate service request: Obtain rollover instructions",
      "Broader concern, to reveal naturally after the service discussion: The client does not know whether retirement savings are on track or how the rollover assets should be invested",
      "Former-employer 401(k): $185,000"
    ],
    "serviceResolution": "Address the original request: Obtain rollover instructions. Use only actions confirmed in the live conversation.",
    "postServiceBridge": "The client does not know whether retirement savings are on track or how the rollover assets should be invested",
    "discoveryBeats": [
      "After direct-rollover instructions are clear, ask whether the IRA invests automatically when the former-plan money arrives.",
      "Explain that you are unsure whether you are on track for retirement and have a current employer plan and a spouse's 403(b) to consider.",
      "Explain that you do not want to choose and rebalance the rollover IRA investments yourself; ask how planning and managed investing would fit together."
    ],
    "opportunityCues": [
      "The client does not know whether retirement savings are on track or how the rollover assets should be invested"
    ],
    "guardrails": [
      "Do not claim an action, enrollment, or account change occurred unless the representative confirms it. Do not offer a product before the client voices a relevant need."
    ],
    "investingApproach": "Educational exploration only after the client states an investing goal and preference.",
    "taxonomyPath": [
      "Retirements",
      "Rollover",
      "IRA Rollover"
    ],
    "sourceCompleteness": "full_script",
    "script": [
      {
        "speaker": "representative",
        "text": "Thank you for calling Charles Schwab. My name is Jordan. How can I assist you today?"
      },
      {
        "speaker": "customer",
        "text": "I left my old employer and want to move the 401(k) to Schwab. I opened a Rollover IRA, but I don’t know what instructions to give the former plan."
      },
      {
        "speaker": "representative",
        "text": "I can help route you to the appropriate rollover process. I’ll first complete standard verification."
      },
      {
        "speaker": "representative",
        "text": "Thank you. I see the Rollover IRA ending in 6604. Has your former employer already issued a distribution?"
      },
      {
        "speaker": "customer",
        "text": "No. I wanted to make sure I did it correctly first."
      },
      {
        "speaker": "representative",
        "text": "Have you reviewed the main alternatives available for the former plan—for example, remaining in the former plan if permitted, transferring to a new employer plan if available, rolling into an IRA, or taking a distribution?"
      },
      {
        "speaker": "customer",
        "text": "Yes. The new employer plan does not accept rollovers right now. I don’t want to take the money in cash, and I’ve decided on the Schwab IRA."
      },
      {
        "speaker": "representative",
        "text": "Thank you for clarifying. Schwab’s current public guidance says clients should evaluate their options and plan rules before beginning a rollover because taxes and other considerations can vary. Schwab also provides dedicated rollover support."
      },
      {
        "speaker": "customer",
        "text": "What do I give my old plan?"
      },
      {
        "speaker": "representative",
        "text": "I’ll connect you with a rollover consultant who can provide the current approved direct-rollover instructions and review any forms required by the former plan."
      },
      {
        "speaker": "customer",
        "text": "Once it arrives, does Schwab automatically invest it?"
      },
      {
        "speaker": "representative",
        "text": "Not in a standard self-directed Rollover IRA. The assets may arrive as cash or transferred investments, depending on the process, and you would then determine how they are managed."
      },
      {
        "speaker": "customer",
        "text": "That’s the part I haven’t figured out. It’s around $185,000. I don’t know what I’m supposed to buy, and I don’t even know whether I’m on track for retirement."
      },
      {
        "speaker": "representative",
        "text": "Those are two separate questions: whether your combined retirement savings support your goal, and how you want this particular IRA invested."
      },
      {
        "speaker": "customer",
        "text": "Yes."
      },
      {
        "speaker": "representative",
        "text": "Approximately when do you expect to retire?"
      },
      {
        "speaker": "customer",
        "text": "In 17 or 18 years."
      },
      {
        "speaker": "representative",
        "text": "Do you have other retirement accounts?"
      },
      {
        "speaker": "customer",
        "text": "I have about $120,000 in my current employer’s 401(k), and my wife has a 403(b)."
      },
      {
        "speaker": "representative",
        "text": "Have you ever combined those accounts, expected contributions, Social Security, and future spending into a financial plan?"
      },
      {
        "speaker": "customer",
        "text": "No."
      },
      {
        "speaker": "representative",
        "text": "In that case, I would start with Schwab Plan. It can incorporate the retirement date, expected expenses, income, Schwab and outside assets, pensions, annuities, and Social Security assumptions. The projections are hypothetical and do not guarantee the result."
      },
      {
        "speaker": "customer",
        "text": "Then I would still have to decide how to invest the IRA?"
      },
      {
        "speaker": "representative",
        "text": "Correct. The plan clarifies the goal. The management decision comes next."
      },
      {
        "speaker": "customer",
        "text": "What are the choices?"
      },
      {
        "speaker": "representative",
        "text": "At a high level:"
      },
      {
        "speaker": "customer",
        "text": "I don’t want to select and rebalance everything myself."
      },
      {
        "speaker": "representative",
        "text": "Schwab Intelligent Portfolios can be used with a Rollover IRA. It builds and automatically rebalances a diversified ETF portfolio using the client’s goal, timeline, and risk tolerance. The current minimum is $5,000. The program has no advisory fee or commissions, but ETF operating expenses and the required cash allocation apply."
      },
      {
        "speaker": "customer",
        "text": "Would it manage my current employer 401(k) too?"
      },
      {
        "speaker": "representative",
        "text": "No. The automated account would manage the eligible Schwab account. The outside 401(k) can still be represented in your financial plan, but it is administered separately."
      },
      {
        "speaker": "customer",
        "text": "What if the plan shows that my situation is more complicated than I thought?"
      },
      {
        "speaker": "representative",
        "text": "Then a Financial Consultant can help you compare automated management with a broader advice relationship."
      },
      {
        "speaker": "customer",
        "text": "I would like the rollover instructions handled first, then the financial plan, and then the automated-investing review."
      },
      {
        "speaker": "representative",
        "text": "I’ll document that sequence. No investment decision is being made as a condition of the rollover."
      },
      {
        "speaker": "customer",
        "text": "Thank you."
      },
      {
        "speaker": "representative",
        "text": "To recap, you have considered your former-plan alternatives and decided to roll into the Rollover IRA. I’ll first connect you with a rollover consultant. You also want a consolidated retirement plan and, after that, a review of automated portfolio management. No investment changes were made today."
      },
      {
        "speaker": "customer",
        "text": "Correct."
      }
    ]
  },
  {
    "id": "relationship-05",
    "title": "A new-child account question becomes a multigenerational family relationship",
    "callerName": "Priya Shah",
    "age": null,
    "openingReason": "Determine which account to open",
    "customerOpener": "Our daughter was born last month, and both sets of grandparents want to contribute money for her future. We don’t know what kind of account to open.",
    "rolePlayHiddenFacts": [
      "Immediate service request: Determine which account to open",
      "Broader concern, to reveal naturally after the service discussion: Parents and grandparents want to contribute, while the parents also need to protect their own retirement goals",
      "Life event: Daughter born one month ago"
    ],
    "serviceResolution": "Address the original request: Determine which account to open. Use only actions confirmed in the live conversation.",
    "postServiceBridge": "Parents and grandparents want to contribute, while the parents also need to protect their own retirement goals",
    "discoveryBeats": [
      "Explain that the family expects education expenses and grandparents want to contribute, so an education-focused account is worth understanding.",
      "Ask how an education savings account compares with a 529 and what happens if your daughter does not use all the money for college.",
      "Explain that you also want flexibility for non-education purposes and need to understand who controls a custodial account.",
      "Mention the concern that saving for your daughter could crowd out your own retirement; ask to model both goals."
    ],
    "opportunityCues": [
      "Parents and grandparents want to contribute, while the parents also need to protect their own retirement goals"
    ],
    "guardrails": [
      "Do not claim an action, enrollment, or account change occurred unless the representative confirms it. Do not offer a product before the client voices a relevant need."
    ],
    "investingApproach": "Educational exploration only after the client states an investing goal and preference.",
    "taxonomyPath": [
      "New Accounts",
      "Opening Accounts",
      "Create a New Account"
    ],
    "sourceCompleteness": "full_script",
    "script": [
      {
        "speaker": "representative",
        "text": "Thank you for calling Charles Schwab. My name is Jordan. How can I help you today?"
      },
      {
        "speaker": "customer",
        "text": "Our daughter was born last month, and both sets of grandparents want to contribute money for her future. We don’t know what kind of account to open."
      },
      {
        "speaker": "representative",
        "text": "Congratulations. I can explain the main account categories and connect you with an education-savings specialist. Before reviewing your existing relationship, I’ll complete standard verification."
      },
      {
        "speaker": "representative",
        "text": "Thank you. Is the money intended specifically for education, or would you like it available for a broader range of future needs?"
      },
      {
        "speaker": "customer",
        "text": "Mostly education, but we’re nervous about locking everything into one purpose."
      },
      {
        "speaker": "representative",
        "text": "Are the grandparents planning one-time gifts, recurring contributions, or both?"
      },
      {
        "speaker": "customer",
        "text": "Probably an initial gift and then birthday contributions."
      },
      {
        "speaker": "representative",
        "text": "Do you expect the account to be used only for education, or might you want the child to use the assets for something else, such as a first home or starting a business?"
      },
      {
        "speaker": "customer",
        "text": "That’s the part we are unsure about."
      },
      {
        "speaker": "representative",
        "text": "Schwab currently presents three main account paths:"
      },
      {
        "speaker": "customer",
        "text": "Which one gives us the best deduction?"
      },
      {
        "speaker": "representative",
        "text": "That depends on your state, income, contribution, account type, and personal tax situation. I can explain the account features, but your tax professional should advise you about deductions and tax consequences."
      },
      {
        "speaker": "customer",
        "text": "Can our parents contribute directly?"
      },
      {
        "speaker": "representative",
        "text": "Contribution processes depend on the account type. The education specialist can explain gifting methods once you narrow the account structure."
      },
      {
        "speaker": "customer",
        "text": "We are also concerned about saving too much for education and not enough for our own retirement."
      },
      {
        "speaker": "representative",
        "text": "That is an important distinction. Before selecting a contribution amount, it may help to see how the child’s education goal fits alongside your retirement goal."
      },
      {
        "speaker": "customer",
        "text": "Can Schwab help us model both?"
      },
      {
        "speaker": "representative",
        "text": "Schwab’s education resources include a college-savings calculator and a state-tax calculator. For the retirement side, Schwab Plan allows Schwab clients to model retirement timing, spending, income, and assets and test how changes affect the simulated outcome."
      },
      {
        "speaker": "customer",
        "text": "Would we need two separate conversations?"
      },
      {
        "speaker": "representative",
        "text": "The first conversation can be with an education specialist to compare the account structures. A planning conversation can then help you determine a contribution level that does not ignore your own retirement objective."
      },
      {
        "speaker": "customer",
        "text": "What if we choose a 529 and later our daughter does not attend college?"
      },
      {
        "speaker": "representative",
        "text": "That is one of the account-specific questions the education specialist should address, including permitted uses, beneficiary options, taxes, and potential penalties. It would not be appropriate to assume a 529 is automatically the best account simply because education is one possible goal."
      },
      {
        "speaker": "customer",
        "text": "I appreciate that. We want to understand the tradeoffs first."
      },
      {
        "speaker": "representative",
        "text": "I’ll arrange an education-savings conversation and note that the broader household-planning question is also important."
      },
      {
        "speaker": "customer",
        "text": "Great."
      },
      {
        "speaker": "representative",
        "text": "To recap, no account has been opened. The primary intended goal is education, but you also want flexibility, grandparent contribution options, and a contribution level that does not undermine your retirement. The next step is to compare the 529, ESA, and custodial paths, followed by a planning review if useful."
      },
      {
        "speaker": "customer",
        "text": "Correct."
      }
    ]
  },
  {
    "id": "relationship-06",
    "title": "A SEP-IRA request becomes a business and personal wealth relationship",
    "callerName": "Olivia Grant",
    "age": 44,
    "openingReason": "Open a SEP-IRA",
    "customerOpener": "I’m self-employed and want to open a SEP-IRA. I found an application, but I don’t know whether I have all the required documents.",
    "rolePlayHiddenFacts": [
      "Immediate service request: Open a SEP-IRA",
      "Broader concern, to reveal naturally after the service discussion: The client needs an employee retirement plan, business cash management, and personal retirement coordination",
      "Business: Consulting firm",
      "Expected change: First employee next quarter, possibly four employees next year"
    ],
    "serviceResolution": "Address the original request: Open a SEP-IRA. Use only actions confirmed in the live conversation.",
    "postServiceBridge": "The client needs an employee retirement plan, business cash management, and personal retirement coordination",
    "discoveryBeats": [
      "Explain that you will hire employees soon and want to compare SEP, SIMPLE, and 401(k) retirement-plan choices before opening one.",
      "Explain that the business has operating cash and roughly $250,000 not needed immediately, while payroll and taxes still require ready access.",
      "Ask how to keep business assets and personal investments legally separate while making coordinated decisions.",
      "Explain that you have neglected your own retirement while building the business and want a personal plan and a person who can coordinate the two sides."
    ],
    "opportunityCues": [
      "The client needs an employee retirement plan, business cash management, and personal retirement coordination"
    ],
    "guardrails": [
      "Do not claim an action, enrollment, or account change occurred unless the representative confirms it. Do not offer a product before the client voices a relevant need."
    ],
    "investingApproach": "Educational exploration only after the client states an investing goal and preference.",
    "taxonomyPath": [
      "Retirements",
      "Small Business Plans",
      "Plan Setup"
    ],
    "sourceCompleteness": "full_script",
    "script": [
      {
        "speaker": "representative",
        "text": "Thank you for calling Charles Schwab. My name is Jordan. How may I help?"
      },
      {
        "speaker": "customer",
        "text": "I’m self-employed and want to open a SEP-IRA. I found an application, but I don’t know whether I have all the required documents."
      },
      {
        "speaker": "representative",
        "text": "I can help identify the appropriate resources. Before focusing on the application, I’ll complete standard verification."
      },
      {
        "speaker": "representative",
        "text": "Thank you. Does the business currently have employees other than you?"
      },
      {
        "speaker": "customer",
        "text": "Not yet, but I’m hiring my first full-time employee next quarter."
      },
      {
        "speaker": "representative",
        "text": "That future employee is important. Employee eligibility, contribution requirements, plan administration, and your hiring goals can affect which retirement-plan structure fits the business."
      },
      {
        "speaker": "customer",
        "text": "I thought the SEP-IRA was automatically the simplest option."
      },
      {
        "speaker": "representative",
        "text": "It may be one option, but I would not assume it is the appropriate one without comparing the available choices."
      },
      {
        "speaker": "customer",
        "text": "What else should I consider?"
      },
      {
        "speaker": "representative",
        "text": "Schwab currently offers small-business retirement plans ranging from SEP IRAs to 401(k)s and says its specialists can help businesses choose a plan based on company size, employee needs, and attraction or retention goals."
      },
      {
        "speaker": "customer",
        "text": "Would that include SIMPLE IRAs and an individual 401(k)?"
      },
      {
        "speaker": "representative",
        "text": "The specialist can compare the structures available for your circumstances, including how the expected employee affects eligibility and employer responsibilities."
      },
      {
        "speaker": "customer",
        "text": "I plan to hire one person next quarter and perhaps three more next year."
      },
      {
        "speaker": "representative",
        "text": "Apart from the retirement plan, how are you currently managing the business’s cash and investments?"
      },
      {
        "speaker": "customer",
        "text": "Most of the operating cash is in a regular business bank account. I also have around $250,000 that I don’t need immediately, but I want it available for payroll and taxes."
      },
      {
        "speaker": "representative",
        "text": "Do you have a separate brokerage or organization account for the business?"
      },
      {
        "speaker": "customer",
        "text": "No."
      },
      {
        "speaker": "representative",
        "text": "Schwab also offers a Schwab One Organization Account for business assets, along with CDs and money-market funds for business cash management. The organization account currently has no monthly service fee, although investments and cash products have different liquidity, risk, and insurance characteristics."
      },
      {
        "speaker": "customer",
        "text": "I would want to keep enough immediately available for payroll."
      },
      {
        "speaker": "representative",
        "text": "That liquidity requirement should be addressed before selecting any cash or investment product. The business-cash discussion should remain separate from the retirement-plan decision."
      },
      {
        "speaker": "customer",
        "text": "I also worry that I’ve put all of my energy into the business and neglected my personal retirement."
      },
      {
        "speaker": "representative",
        "text": "Do you currently have a personal financial plan that considers both the value of the business and your household retirement assets?"
      },
      {
        "speaker": "customer",
        "text": "No. I have personal investments, but I’ve never combined them with the business."
      },
      {
        "speaker": "representative",
        "text": "Schwab Plan could help model your personal retirement assumptions, while a Financial Consultant can help coordinate the business and personal sides of the relationship. If the overall situation becomes more complex and you want an ongoing managed relationship, the consultant can also explain the broader wealth-management choices."
      },
      {
        "speaker": "customer",
        "text": "I don’t want everything mixed together legally, but I do want the decisions coordinated."
      },
      {
        "speaker": "representative",
        "text": "Exactly. The business and personal accounts should remain correctly registered and separate, while planning can still consider how the business affects your household goals."
      },
      {
        "speaker": "customer",
        "text": "What happens next?"
      },
      {
        "speaker": "representative",
        "text": "I recommend this sequence:"
      },
      {
        "speaker": "customer",
        "text": "That’s much more useful than simply opening the SEP."
      },
      {
        "speaker": "representative",
        "text": "No plan or account will be opened during this call. I’ll document the expected hiring and route you to the appropriate team."
      },
      {
        "speaker": "customer",
        "text": "Thank you."
      },
      {
        "speaker": "representative",
        "text": "To recap, the original request was to open a SEP-IRA. Because you expect to hire employees, the retirement-plan structure needs comparison before proceeding. We also identified business cash-management and personal retirement-planning needs. I’ll begin with the small-business retirement specialist."
      },
      {
        "speaker": "customer",
        "text": "Correct."
      }
    ]
  },
  {
    "id": "relationship-07",
    "title": "A beneficiary update becomes trust, legacy, and family planning",
    "callerName": "Patricia Lee",
    "age": 67,
    "openingReason": "Update beneficiaries after an estate-plan revision",
    "customerOpener": "I need to update the beneficiaries on my brokerage account. My attorney revised my estate plan, and I want the account to match it.",
    "rolePlayHiddenFacts": [
      "Immediate service request: Update beneficiaries after an estate-plan revision",
      "Broader concern, to reveal naturally after the service discussion: Her daughter is uncomfortable serving as successor trustee, and Patricia wants to create a charitable legacy"
    ],
    "serviceResolution": "Address the original request: Update beneficiaries after an estate-plan revision. Use only actions confirmed in the live conversation.",
    "postServiceBridge": "Her daughter is uncomfortable serving as successor trustee, and Patricia wants to create a charitable legacy",
    "discoveryBeats": [
      "After the beneficiary update, explain that your daughter is uncomfortable being successor trustee and you want to understand professional trust administration.",
      "Explain that you want your children involved in a continuing charitable legacy for several charities.",
      "Ask how the trust, charitable giving, and broader estate decisions can be coordinated with your attorney and a Schwab relationship contact."
    ],
    "opportunityCues": [
      "Her daughter is uncomfortable serving as successor trustee, and Patricia wants to create a charitable legacy"
    ],
    "guardrails": [
      "Do not claim an action, enrollment, or account change occurred unless the representative confirms it. Do not offer a product before the client voices a relevant need."
    ],
    "investingApproach": "Educational exploration only after the client states an investing goal and preference.",
    "taxonomyPath": [
      "Account Maintenance",
      "Beneficiaries",
      "Update Beneficiary"
    ],
    "sourceCompleteness": "full_script",
    "script": [
      {
        "speaker": "representative",
        "text": "Thank you for calling Charles Schwab. My name is Jordan. How may I assist you?"
      },
      {
        "speaker": "customer",
        "text": "I need to update the beneficiaries on my brokerage account. My attorney revised my estate plan, and I want the account to match it."
      },
      {
        "speaker": "representative",
        "text": "I can help you access the approved beneficiary-update process. I’ll first complete standard verification."
      },
      {
        "speaker": "representative",
        "text": "Thank you. Are you changing the beneficiaries, their percentages, or both?"
      },
      {
        "speaker": "customer",
        "text": "Both. My attorney gave me written instructions."
      },
      {
        "speaker": "representative",
        "text": "Please compare each entry carefully with your attorney’s instructions. I can assist with the Schwab account process, but I cannot interpret the legal document."
      },
      {
        "speaker": "representative",
        "text": "The beneficiary-update request has been submitted. Please retain the confirmation and review the completed designation once processing is finished."
      },
      {
        "speaker": "customer",
        "text": "There is another issue. My daughter is named as successor trustee of our family trust, but she recently told me she’s uncomfortable taking on that responsibility."
      },
      {
        "speaker": "representative",
        "text": "Has your estate attorney discussed using a professional or corporate trustee?"
      },
      {
        "speaker": "customer",
        "text": "Briefly. I don’t understand what the trustee would actually handle."
      },
      {
        "speaker": "representative",
        "text": "Is the concern about having someone administer the trust now, or having a successor available in the future if you become unable to serve?"
      },
      {
        "speaker": "customer",
        "text": "Mostly the future. I’m still serving now, but I don’t want the entire burden to fall on my daughter later."
      },
      {
        "speaker": "representative",
        "text": "Schwab Personal Trust Services can provide professional trust administration and investment management through Charles Schwab Trust Company. Schwab can potentially be appointed immediately or named as a future successor trustee. Its services include distributions according to the trust document, fiduciary tax-return preparation, accounting, recordkeeping, beneficiary support, and trust investment management. An estate-planning attorney must create or amend the legal trust; Schwab administers the trust but does not draft it."
      },
      {
        "speaker": "customer",
        "text": "Could my daughter still be involved?"
      },
      {
        "speaker": "representative",
        "text": "The possible structure depends on the trust terms, your goals, Schwab’s acceptance requirements, and your attorney’s advice. The Trust Services team can explain the available roles without assuming that your daughter must be completely removed."
      },
      {
        "speaker": "customer",
        "text": "That would be helpful."
      },
      {
        "speaker": "representative",
        "text": "Are there other legacy objectives the trust is intended to address?"
      },
      {
        "speaker": "customer",
        "text": "I want my children to be supported, but I also want part of the estate to continue supporting several charities."
      },
      {
        "speaker": "representative",
        "text": "Are you thinking about fixed gifts to the charities after your death, or an ongoing charitable account that your family could continue?"
      },
      {
        "speaker": "customer",
        "text": "I would like my children to remain involved in choosing the charities over time."
      },
      {
        "speaker": "representative",
        "text": "DAFgiving360 allows donors to contribute assets to a donor-advised fund, recommend an investment allocation, recommend grants over time, and establish successors or charitable beneficiaries. Contributions are irrevocable. DAFgiving360 is an independent public charity and integrates with Schwab account views. Your attorney and tax advisor should review how any charitable account would fit with the trust and estate plan."
      },
      {
        "speaker": "customer",
        "text": "Could the donor-advised fund be coordinated with the trust?"
      },
      {
        "speaker": "representative",
        "text": "That requires legal and tax guidance regarding your specific estate documents. Schwab and DAFgiving360 specialists can explain their services, while your attorney determines how the documents should be structured."
      },
      {
        "speaker": "customer",
        "text": "There are more pieces here than I realized."
      },
      {
        "speaker": "representative",
        "text": "That is why I would recommend coordinated conversations rather than routing you to only one product."
      },
      {
        "speaker": "customer",
        "text": "Who coordinates it?"
      },
      {
        "speaker": "representative",
        "text": "A Financial Consultant can help coordinate the Schwab relationship and connect you with Trust Services, charitable-giving resources, and broader wealth-management support. If you want an ongoing comprehensive relationship and meet its requirements, Schwab Wealth Advisory may also be discussed."
      },
      {
        "speaker": "customer",
        "text": "I would like that."
      },
      {
        "speaker": "representative",
        "text": "No trust appointment, legal-document amendment, charitable contribution, or advisory enrollment will occur from this call. I’ll arrange the conversations and document the objectives you shared."
      },
      {
        "speaker": "customer",
        "text": "Thank you."
      },
      {
        "speaker": "representative",
        "text": "Let me summarize. Your beneficiary-update request has been submitted. Separately, you are concerned about burdening your daughter as successor trustee and want to explore a professional successor. You also want your children involved in a continuing charitable legacy. I’ll coordinate a Financial Consultant and Personal Trust Services follow-up, with charitable-giving resources as appropriate."
      },
      {
        "speaker": "customer",
        "text": "That’s correct."
      }
    ]
  }
] as const;

export const SCENARIOS: Scenario[] = briefs.map(({ taxonomyPath, ...brief }) => ({
  ...brief,
  script: brief.script.map((line) => ({ speaker: line.speaker, text: line.text })),
  rolePlayHiddenFacts: [...brief.rolePlayHiddenFacts],
  discoveryBeats: [...brief.discoveryBeats],
  opportunityCues: [...brief.opportunityCues],
  guardrails: [...brief.guardrails],
  expectedTaxonomy: TAXONOMY.find((item) =>
    item.category === taxonomyPath[0] && item.subcategory === taxonomyPath[1] && item.reason === taxonomyPath[2]
  ) ?? null,
}));

export function getScenario(id: string): Scenario | undefined {
  return SCENARIOS.find((scenario) => scenario.id === id);
}
