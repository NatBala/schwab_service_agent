# Shortlisted scenarios for the live relationship-intelligence demo

These are the **seven scenarios I would prioritize** because each begins as an ordinary service request but can naturally develop into a broader Schwab relationship.

The scripts are synthetic and intended for demonstration. Authentication, transaction processing, eligibility checks, disclosures, licensed-representative boundaries, and specialist-routing language should be replaced with Schwab-approved procedures before production.

Product information below was verified against current public Schwab and DAFgiving360 pages on **September 25, 2026**.

## Shortlist at a glance

| Scenario | Original service reason | Paths that emerge | Relationship outcome |
|---|---|---|---|
| 1. Monthly ACH | Set up an $800 recurring transfer | Schwab Plan, Intelligent Portfolios, self-directed investing | Retirement planning plus ongoing investing |
| 2. Balance inquiry | Confirm account value | Schwab Plan, Financial Consultant, Wealth Advisory | Household retirement and wealth relationship |
| 3. Cost basis | Locate gains-and-losses information | Personalized Indexing, Wealth Advisory, DAFgiving360, Pledged Asset Line | Tax, concentration, liquidity, and philanthropy |
| 4. 401(k) rollover | Obtain rollover instructions | Rollover support, Schwab Plan, Intelligent Portfolios, human advice | Retirement relationship across planning and investing |
| 5. New child | Open an account for a newborn | 529, ESA, custodial account, household planning | Multigenerational family relationship |
| 6. Business owner | Open a SEP-IRA | SEP/SIMPLE/401(k), organization account, business cash, personal advice | Business plus owner’s personal wealth |
| 7. Beneficiary update | Change beneficiaries | Personal Trust Services, Wealth Advisory, charitable legacy | Estate, family, and multigenerational relationship |

---

# Scenario 1: Recurring ACH becomes retirement planning and automated investing

**Call-reason taxonomy:** `Move Money → ACH → Periodic Request`. Your source includes one-time, on-demand, and periodic ACH requests as distinct call reasons. :chatgpt-content-reference{index="0"}

**Client:** Maya Patel, age 36  
**Existing account:** Self-directed taxable brokerage account  
**Current balance:** $12,000  
**Immediate request:** Transfer $800 every month  
**Deeper issue:** The client saves consistently but does not know how much to save or how to invest each deposit

## How the path changes

```text
Call begins
Periodic ACH servicing only
        ↓
Client asks whether deposits invest automatically
        ↓
Investment-selection difficulty detected
        ↓
Client identifies long-term retirement goal
        ↓
Two separate needs identified
1. How much should I save?
2. How should the money be invested?
        ↓
Primary path: Schwab Plan
Secondary path: Schwab Intelligent Portfolios
Alternative: Self-directed education
```

## Complete transcript

**Representative:** Thank you for calling Charles Schwab. My name is Jordan. How may I help you today?

**Client:** Hi, Jordan. I’m trying to set up an automatic transfer from my checking account into my Schwab brokerage account. I tried online, but I wasn’t sure I completed it correctly.

**Representative:** I can review the linked bank information and help you establish the recurring instruction. Before accessing the account, I’ll need to complete our standard verification.

*[Standard authentication is completed.]*

**Representative:** Thank you, Maya. I see the individual brokerage account ending in 2196 and the linked checking account. How much would you like transferred?

**Client:** Eight hundred dollars.

**Representative:** How frequently?

**Client:** Every month.

**Representative:** Which day would you prefer?

**Client:** The fifth.

**Representative:** And the transfer should begin next month?

**Client:** Yes.

**Representative:** Please review the details now displayed: $800 from the linked checking account into the brokerage account ending in 2196, monthly on the fifth, beginning next month.

**Client:** That’s correct.

**Representative:** Once you approve the instruction, I’ll confirm its status.

**Client:** I approved it.

**Representative:** The recurring instruction now shows as scheduled.

### Copilot—screen only

```text
PRIMARY CALL REASON

Move Money › ACH › Periodic Request
Confirmed

SERVICE STATUS

Recurring instruction established
Completed

RELATIONSHIP OPPORTUNITY

Listening
No broader client need confirmed yet
```

**Client:** Once the $800 arrives, does Schwab automatically invest it in the ETFs I already own?

**Representative:** In your current self-directed brokerage account, the recurring instruction transfers cash into the account. It does not select or purchase an investment automatically.

**Client:** That’s what I was afraid of. I already have three ETFs, but I don’t know how much should go into each one. Some months I choose one, sometimes another, and sometimes the money just sits in cash.

### Copilot—screen only

```text
NEW NEED DETECTED

Investment-selection uncertainty

Evidence
“I don’t know how much should go into each one.”
“Sometimes the money just sits in cash.”

OPPORTUNITY STATE

Possible

NEXT QUESTION

Determine the purpose of the contribution.
```

**Representative:** What are these monthly contributions intended to accomplish?

**Client:** They’re for retirement. I already contribute to my workplace 401(k), but I want to save more outside of that.

**Representative:** Approximately how far away is retirement?

**Client:** More than 25 years.

**Representative:** Do you have emergency savings separately, or might you need these monthly contributions for expenses in the next few years?

**Client:** I have about six months of expenses in a savings account. This money is intended to stay invested.

### Copilot—screen only

```text
CUSTOMER FACTS

Goal                         Retirement
Time horizon                 25+ years
Near-term liquidity          Separate reserve reported
Recurring contribution       $800 monthly

OPPORTUNITY STATE

Qualifying

POTENTIAL PATHS

1. Schwab Plan
   Determine whether $800 supports the retirement goal

2. Automated investing
   Address portfolio selection and rebalancing

3. Self-directed education
   Retain client control
```

**Representative:** There are really two questions in what you described. One is whether $800 per month is consistent with the retirement outcome you want. The second is how those contributions should be invested. Does that sound right?

**Client:** Yes. I don’t know the answer to either one.

**Representative:** Would you prefer to learn how to select and maintain the investments yourself, or would you rather have a portfolio built and maintained for you?

**Client:** I would rather have it managed. I’m comfortable saving money, but I don’t enjoy making investment decisions.

### Copilot—screen only

```text
DELEGATION PREFERENCE

Confirmed

AUTOMATED-INVESTING FIT

Strong potential fit

Still needed
• Review current holdings
• Discuss investment risk
• Consider possible tax consequences
• Explain program cash allocation

RECOMMENDED SEQUENCE

Schwab Plan first
Automated-investing review second
```

**Representative:** Based on that, two Schwab capabilities may be useful, but they serve different purposes. May I explain both?

**Client:** Yes.

**Representative:** Schwab Plan is a complimentary financial plan available with any Schwab account. It lets you enter your expected retirement date, expenses, income, assets, outside investments, pensions, annuities, and Social Security assumptions. It then runs simulated market projections and lets you test how changes such as saving more, retiring later, or changing spending could affect the result. Those projections are hypothetical and are not guarantees. :chatgpt-content-reference{index="1"}

**Client:** So that could help me understand whether $800 a month is enough?

**Representative:** It can help you connect the contribution amount to the goal and test different assumptions. It does not guarantee the result or provide individualized tax or legal advice.

**Client:** And what would manage the investments?

**Representative:** One possible path is Schwab Intelligent Portfolios. You complete a questionnaire covering your goal, timeline, and risk tolerance. The robo-advisor builds, monitors, and automatically rebalances a diversified ETF portfolio. The current minimum is $5,000. Schwab states that there is no program advisory fee or commissions, but clients pay the ETFs’ operating expenses, and the program includes a cash allocation. :chatgpt-content-reference{index="2"}

**Client:** Would that mean the $800 gets allocated without my selecting an ETF every month?

**Representative:** If the recurring deposit were directed into an eligible Intelligent Portfolios account, the deposits would be managed according to that account’s portfolio. Your instruction today is going into the existing self-directed brokerage account, so it does not change the investment structure by itself.

**Client:** Can I convert my existing account?

**Representative:** That requires review. Your current investments may need to be sold to implement a managed portfolio, which could create tax consequences in a taxable account. You would need to review your holdings, gains and losses, the recommended portfolio, the cash allocation, costs, and investment risks before authorizing anything.

**Client:** Could I keep this account and open a separate automated account?

**Representative:** Different account structures may be possible, but the appropriate arrangement should be reviewed rather than assumed during this call.

**Client:** I would like to start with the financial plan and then evaluate automated investing.

**Representative:** That is a sensible sequence. I’ll connect you with the planning team and document your interest in automated management after the retirement objective has been modeled.

**Client:** Great.

**Representative:** Let me summarize. We established the $800 monthly transfer into your current self-directed brokerage account. The transfer moves cash but does not automatically invest it. You identified retirement as the goal, a timeline of more than 25 years, separate emergency savings, and a preference for having the portfolio managed. No investment change was authorized today. I’ll now connect you with a planning specialist.

**Client:** That’s correct. Thank you.

## Final path

```text
Immediate action
Recurring ACH completed

Primary relationship path
Schwab Plan

Secondary path
Schwab Intelligent Portfolios review

Not selected
Self-directed education, because the client prefers delegation
```

---

# Scenario 2: A balance inquiry becomes a comprehensive retirement and wealth conversation

**Call-reason taxonomy:** Account-balance inquiries and requests for an advisor appear as recognized call reasons. :chatgpt-content-reference{index="3"}

**Client:** Allison Reed, age 57  
**Schwab assets:** $425,000  
**Outside 401(k):** Approximately $690,000  
**Other household factors:** Spouse’s pension, mortgage, two properties, retirement in eight years  
**Immediate request:** Confirm current account value  
**Deeper issue:** The client has no consolidated view of retirement readiness

## How the path changes

```text
Balance inquiry
        ↓
“What does this balance mean for retirement?”
        ↓
Outside accounts and pension emerge
        ↓
Schwab Plan becomes first path
        ↓
Additional complexity emerges:
property, taxes, spouse, estate, retirement income
        ↓
Financial Consultant becomes relationship coordinator
        ↓
Potential Schwab Wealth Advisory evaluation
```

## Complete transcript

**Representative:** Thank you for calling Charles Schwab. My name is Jordan. What can I help you with today?

**Client:** I’m trying to confirm the total value of my Schwab accounts. The number looks lower than I remember seeing last week.

**Representative:** I can review the current values and recent activity. I’ll first complete standard verification.

*[Authentication is completed.]*

**Representative:** Thank you. I see a taxable brokerage account and a Traditional IRA. Their combined current value is approximately $425,000. The difference from last week appears to reflect market-price movements and a recent withdrawal of $2,000. I do not see any other unexplained transaction.

**Client:** Okay, that explains the difference.

### Copilot—screen only

```text
PRIMARY CALL REASON

Client Inquiries › Account Balance
Confirmed

SERVICE STATUS

Balance and change explained
Resolved
```

**Client:** I have a broader question. Is $425,000 good or bad for somebody who wants to retire in eight years?

**Representative:** The Schwab balance alone would not be enough to answer that responsibly. We would also need to consider your expected spending, outside accounts, Social Security, pension income, debt, retirement date, and how long the assets may need to support you.

**Client:** I have about $690,000 in my current employer’s 401(k). My husband has a pension. We still owe around $280,000 on our house, and we have a rental property.

### Copilot—screen only

```text
RETIREMENT-READINESS NEED

Confirmed

Outside assets                Detected
Spousal pension               Detected
Real estate                   Detected
Debt                          Detected
Retirement horizon            8 years

PRIMARY PATH

Schwab Plan

NEXT QUESTION

Determine whether the client wants a one-time plan
or an ongoing coordinated advisory relationship.
```

**Representative:** Have you ever put those pieces into a single financial plan?

**Client:** No. I look at each account separately.

**Representative:** Would you primarily like a one-time retirement assessment, or do you think you need an ongoing relationship to coordinate the investments, retirement income, real estate, tax-planning strategies, and estate considerations?

**Client:** I’m not sure. I thought I only needed to know whether I was on track, but when you say it that way, there are several things that need to work together.

**Representative:** What other decisions are you anticipating before retirement?

**Client:** We may sell the rental property. I also have company stock, and my mother may need financial support. We have an estate attorney, but the documents are several years old.

### Copilot—screen only

```text
PATH CHANGE

From:
Retirement projection only

To:
Potential comprehensive relationship

MULTIPLE NEEDS CONFIRMED

• Retirement readiness
• Retirement-income planning
• Real-estate decision
• Concentrated company stock
• Aging-parent support
• Estate coordination

POTENTIAL PATHS

1. Schwab Plan
2. Financial Consultant
3. Schwab Wealth Advisory
4. Investment-management-only solution
```

**Representative:** I would begin with a consolidated plan rather than immediately selecting an investment product.

**Client:** What does that involve?

**Representative:** Schwab Plan is available to clients with any Schwab account at no additional charge. It lets you include Schwab and outside investments, income, pensions, Social Security, retirement timing, and spending assumptions. It produces hypothetical simulated outcomes and lets you stress-test changes. :chatgpt-content-reference{index="4"}

**Client:** Can it include the 401(k), pension, and rental-property assumptions even though not all of those are held at Schwab?

**Representative:** You can enter outside assets and income assumptions so the plan is not limited to the $425,000 currently at Schwab.

**Client:** Who helps me understand what to do with the results?

**Representative:** A Schwab Financial Consultant can coordinate the broader Schwab relationship and help connect you to the appropriate resources. If you decide you want ongoing comprehensive advice and meet the program requirements, one path the consultant may discuss is Schwab Wealth Advisory.

**Client:** What is the difference between that and the financial plan?

**Representative:** The plan helps organize and model your goals. Schwab Wealth Advisory is an ongoing managed relationship with a dedicated Wealth Advisor and a broader team. Schwab describes it as covering areas such as investment management, retirement, tax-smart strategies, estate planning, and multigenerational needs. The current enrollment minimum is $500,000, and the published annual fee begins at 0.80% and declines at higher asset levels. Schwab does not provide individualized legal or tax advice, so your attorney and tax professional remain important. :chatgpt-content-reference{index="5"}

**Client:** Would I have to move my 401(k) or sell the rental property to speak with them?

**Representative:** No. A consultation does not commit you to transferring assets, selling property, or enrolling. The purpose is to understand the complete situation and compare service models.

**Client:** What if I only want the plan and then manage everything myself?

**Representative:** That remains an available path. Schwab Plan itself can lead to self-directed investing, automated investing, or investing with a financial professional. :chatgpt-content-reference{index="6"}

**Client:** I would like to complete the plan and speak with a consultant before deciding.

**Representative:** I’ll arrange that. No account changes or advisory enrollment will be made today.

**Client:** Thank you.

**Representative:** To recap, we confirmed the Schwab account balance and explained the recent change. You also identified a retirement objective eight years away, an outside 401(k), your husband’s pension, two properties, company stock, possible family support, and estate considerations. The next step is a consolidated Schwab Plan followed by a Financial Consultant conversation.

**Client:** Correct.

## Final path

```text
Immediate action
Balance inquiry resolved

Primary relationship path
Schwab Plan

Relationship coordinator
Financial Consultant

Potential long-term path
Schwab Wealth Advisory

Still available
Self-directed or automated investing after planning
```

---

# Scenario 3: A cost-basis report reveals four distinct relationship paths

**Call-reason taxonomy:** Your taxonomy contains general cost-basis questions, unrealized-gain reports, gains-and-losses reports, corrections, and tax-lot questions. :chatgpt-content-reference{index="7"}

**Client:** Eric Wallace, age 52  
**Taxable portfolio:** $1.6 million  
**Employer stock:** $620,000 with substantial unrealized gains  
**Immediate request:** Locate gains-and-losses report  
**Deeper needs:** Concentration management, liquidity for a renovation, and charitable giving

## How the path changes

```text
Cost-basis report
        ↓
Concentrated employer stock identified
        ↓
Path 1 appears:
Personalized Indexing
        ↓
Liquidity need appears
        ↓
Path 2 appears:
Pledged Asset Line specialist
        ↓
Charitable giving intent appears
        ↓
Path 3 appears:
DAFgiving360
        ↓
Multiple interacting needs
        ↓
Primary relationship path becomes:
Financial Consultant / comprehensive wealth conversation
```

This is the strongest scenario for showing that the AI does **not** merely match one keyword to one product.

## Complete transcript

**Representative:** Thank you for calling Charles Schwab. My name is Jordan. How may I help you?

**Client:** I’m trying to find a report showing all of my unrealized gains and losses. I can see the cost basis for each position, but not one complete view.

**Representative:** I can help you locate the appropriate report. I’ll first complete standard verification.

*[Authentication is completed.]*

**Representative:** Thank you. Are you currently signed in?

**Client:** Yes.

**Representative:** Please open the Positions area and select the taxable brokerage account ending in 7441. You should see cost-basis and unrealized-gain information by position. There is also an export option for the displayed data.

**Client:** I see it. That’s what I needed.

### Copilot—screen only

```text
PRIMARY CALL REASON

Cost Basis › Cost Basis Reporting › Cost Basis Report
Confirmed

SERVICE STATUS

Report located
Resolved
```

**Representative:** Was there a particular position or decision that prompted you to review the report?

**Client:** Most of the concern is my employer stock. It’s worth about $620,000 now, and the gain is very large. I also own index funds that include more of the same company and industry.

### Copilot—screen only

```text
NEW NEED DETECTED

Concentrated employer-stock exposure

POTENTIAL PATHS

1. Personalized Indexing
   Exclude company or industry exposure elsewhere

2. Wealth-management review
   Coordinate concentration, taxes, and goals

NEXT QUESTION

Determine whether the client wants portfolio customization,
liquidity, charitable giving, or an immediate sale.
```

**Representative:** Are you mainly trying to sell the employer stock now, or are you looking for a broader strategy around the concentration?

**Client:** I don’t want to sell all of it immediately. I want the rest of the portfolio structured so I’m not unknowingly buying even more of the same exposure.

**Representative:** Are you also looking for ongoing tax-loss management?

**Client:** Yes. I know I miss opportunities because I don’t monitor every holding.

**Representative:** One service that may be worth comparing is Schwab Personalized Indexing. It is a separately managed account that owns individual securities representing an index. Subject to investment-management guidance, clients can exclude individual securities or industries. It also manages gains and losses at the individual-security level and uses automated tax-loss harvesting. The current minimum is $100,000, and published fees begin at 0.40% for the first $2 million. Tax benefits are not guaranteed, and ETFs or mutual funds are generally less expensive. :chatgpt-content-reference{index="8"}

**Client:** Could I exclude my employer entirely from the indexed account?

**Representative:** The service supports stock and industry exclusions, but the specialist would need to confirm how the requested customization fits the selected strategy.

**Client:** That sounds relevant. But I also need around $180,000 for a home renovation and a tax payment. Selling the employer stock to raise it could create a very large gain.

### Copilot—screen only

```text
PATH CHANGE

New liquidity need detected

Potential paths now:

1. Personalized Indexing
   Future portfolio customization and tax management

2. Pledged Asset Line
   Potential liquidity without immediate liquidation

3. Wealth Advisory
   Coordinate concentration, borrowing, taxes, and goals

STATUS

Specialist review required
Do not recommend borrowing or securities sales directly.
```

**Representative:** The liquidity need creates another decision. You could explore asset sales, but Schwab Bank also offers a Pledged Asset Line that allows eligible clients to borrow against qualifying non-retirement assets without first liquidating them.

**Client:** Would that avoid the gain?

**Representative:** It may avoid an immediate sale, but it introduces borrowing costs and collateral risk. It is an uncommitted demand line, and Schwab states that pledging securities involves a high degree of risk. If collateral values decline or become ineligible, additional action or asset sales may be required. The proceeds also have restricted uses and cannot be used to purchase securities or cryptocurrency or be deposited into a brokerage account. A banking specialist and your tax advisor would need to help you compare it with selling. :chatgpt-content-reference{index="9"}

**Client:** I would want to compare the interest cost with the tax consequences.

**Representative:** Exactly. Neither path should be assumed to be better before that comparison.

**Client:** There is one more thing. I normally donate around $40,000 a year to several charities. My CPA suggested that I ask about donating appreciated shares rather than cash.

### Copilot—screen only

```text
PATH CHANGE

Charitable intent detected

Potential paths now:

1. Personalized Indexing
2. Pledged Asset Line
3. DAFgiving360
4. Comprehensive wealth coordination

PRIMARY RECOMMENDATION

Financial Consultant as relationship coordinator

Reason
Four needs interact:
• Concentration
• Tax management
• Liquidity
• Philanthropy
```

**Representative:** Are you looking to make one immediate gift, or would you like a structure that can support several charities over time?

**Client:** Several charities. Usually the same organizations, but the amounts change.

**Representative:** DAFgiving360 offers a donor-advised fund. Contributions are irrevocable, and eligible contributions can include appreciated publicly traded securities. After contributing, you can recommend how assets are invested and recommend grants to eligible public charities over time. DAFgiving360 is an independent public charity, integrates with Schwab account views, and currently has no minimum initial contribution for its core account. Personal tax and legal consequences should be reviewed with your professional advisors. :chatgpt-content-reference{index="10"}

**Client:** So now I have three separate things to consider.

**Representative:** Yes, and that is why I would not route you independently to three products without coordinating the overall objective.

**Client:** What do you recommend as the first conversation?

**Representative:** The most appropriate first step is a Financial Consultant who can understand the complete picture and coordinate specialists. The potential paths include:

- Personalized Indexing for future taxable-portfolio customization.
- A banking specialist for the Pledged Asset Line comparison.
- DAFgiving360 for charitable giving.
- A broader wealth-management discussion if you want continuing coordination.

**Client:** That makes sense.

**Representative:** Schwab Wealth Advisory may be one service the consultant discusses if you want ongoing coordinated advice. It currently requires at least $500,000 for enrollment, and its published annual fee begins at 0.80%. A dedicated Wealth Advisor and Financial Consultant can help coordinate investment, retirement, tax-smart, estate, and multigenerational planning strategies, while your tax and legal professionals continue providing individualized advice. :chatgpt-content-reference{index="11"}

**Client:** I want the coordinated conversation. I don’t want to make the borrowing, charitable, and investment decisions separately.

**Representative:** I’ll arrange that. No securities will be sold, no credit application will be submitted, no managed account will be opened, and no charitable contribution will be made from this call.

**Client:** Good.

**Representative:** To recap, we located your cost-basis report. The broader issues are employer-stock concentration, the desire to reduce overlapping exposure, a $180,000 liquidity need, and recurring charitable giving. I’ll connect you with a Financial Consultant to coordinate the appropriate specialists and compare the available paths.

**Client:** Correct. Thank you.

## Final path

```text
Immediate action
Cost-basis report located

Primary relationship path
Financial Consultant

Potential subpaths
• Schwab Personalized Indexing
• Schwab Wealth Advisory
• Schwab Bank Pledged Asset Line
• DAFgiving360

Why this is genuine relationship deepening
The client is connecting investments, taxes, liquidity,
borrowing, and philanthropy in one relationship.
```

---

# Scenario 4: A 401(k) rollover becomes a long-term retirement relationship

**Call-reason taxonomy:** The source includes direct and indirect rollovers, 60-day rollovers, fees, corrections, IRA rollovers, and mailing questions. :chatgpt-content-reference{index="12"}

**Client:** David Reynolds, age 49  
**Former-employer 401(k):** $185,000  
**Immediate request:** Obtain rollover instructions  
**Deeper issue:** The client does not know whether retirement savings are on track or how the rollover assets should be invested

## How the path changes

```text
Rollover servicing
        ↓
Confirm client has considered rollover alternatives
        ↓
Client asks what happens after assets arrive
        ↓
Retirement-readiness concern detected
        ↓
Schwab Plan becomes primary path
        ↓
Investment preference determines secondary path:
self-directed, Intelligent Portfolios, or human advice
```

## Complete transcript

**Representative:** Thank you for calling Charles Schwab. My name is Jordan. How can I assist you today?

**Client:** I left my old employer and want to move the 401(k) to Schwab. I opened a Rollover IRA, but I don’t know what instructions to give the former plan.

**Representative:** I can help route you to the appropriate rollover process. I’ll first complete standard verification.

*[Authentication is completed.]*

**Representative:** Thank you. I see the Rollover IRA ending in 6604. Has your former employer already issued a distribution?

**Client:** No. I wanted to make sure I did it correctly first.

**Representative:** Have you reviewed the main alternatives available for the former plan—for example, remaining in the former plan if permitted, transferring to a new employer plan if available, rolling into an IRA, or taking a distribution?

**Client:** Yes. The new employer plan does not accept rollovers right now. I don’t want to take the money in cash, and I’ve decided on the Schwab IRA.

### Copilot—screen only

```text
ROLLOVER DECISION

Client states alternatives have been considered
Client states IRA decision is already made

GUARDRAIL CLEARED

Downstream Schwab offerings may now be discussed,
but must not be used to influence the rollover choice.
```

**Representative:** Thank you for clarifying. Schwab’s current public guidance says clients should evaluate their options and plan rules before beginning a rollover because taxes and other considerations can vary. Schwab also provides dedicated rollover support. :chatgpt-content-reference{index="13"}

**Client:** What do I give my old plan?

**Representative:** I’ll connect you with a rollover consultant who can provide the current approved direct-rollover instructions and review any forms required by the former plan.

**Client:** Once it arrives, does Schwab automatically invest it?

**Representative:** Not in a standard self-directed Rollover IRA. The assets may arrive as cash or transferred investments, depending on the process, and you would then determine how they are managed.

**Client:** That’s the part I haven’t figured out. It’s around $185,000. I don’t know what I’m supposed to buy, and I don’t even know whether I’m on track for retirement.

### Copilot—screen only

```text
SECONDARY NEEDS

Retirement readiness              Confirmed
Investment-selection uncertainty  Confirmed

POTENTIAL PATHS

1. Schwab Plan
2. Self-directed IRA
3. Intelligent Portfolios IRA
4. Financial Consultant

RECOMMENDED SEQUENCE

1. Complete rollover servicing
2. Model retirement goal
3. Select management approach
```

**Representative:** Those are two separate questions: whether your combined retirement savings support your goal, and how you want this particular IRA invested.

**Client:** Yes.

**Representative:** Approximately when do you expect to retire?

**Client:** In 17 or 18 years.

**Representative:** Do you have other retirement accounts?

**Client:** I have about $120,000 in my current employer’s 401(k), and my wife has a 403(b).

**Representative:** Have you ever combined those accounts, expected contributions, Social Security, and future spending into a financial plan?

**Client:** No.

**Representative:** In that case, I would start with Schwab Plan. It can incorporate the retirement date, expected expenses, income, Schwab and outside assets, pensions, annuities, and Social Security assumptions. The projections are hypothetical and do not guarantee the result. :chatgpt-content-reference{index="14"}

**Client:** Then I would still have to decide how to invest the IRA?

**Representative:** Correct. The plan clarifies the goal. The management decision comes next.

**Client:** What are the choices?

**Representative:** At a high level:

- You can remain self-directed and choose the investments.
- You can consider automated investing.
- You can speak with a Financial Consultant or investment professional if the situation requires human advice.

**Client:** I don’t want to select and rebalance everything myself.

### Copilot—screen only

```text
PATH CHANGE

Self-directed path deprioritized

AUTOMATED-INVESTING PATH

Potential fit

Evidence
• 17–18 year retirement horizon
• Client wants delegated management
• Balance exceeds $5,000 minimum

Still needed
• Risk questionnaire
• Liquidity assessment
• Portfolio and disclosure review
```

**Representative:** Schwab Intelligent Portfolios can be used with a Rollover IRA. It builds and automatically rebalances a diversified ETF portfolio using the client’s goal, timeline, and risk tolerance. The current minimum is $5,000. The program has no advisory fee or commissions, but ETF operating expenses and the required cash allocation apply. :chatgpt-content-reference{index="15"}

**Client:** Would it manage my current employer 401(k) too?

**Representative:** No. The automated account would manage the eligible Schwab account. The outside 401(k) can still be represented in your financial plan, but it is administered separately.

**Client:** What if the plan shows that my situation is more complicated than I thought?

**Representative:** Then a Financial Consultant can help you compare automated management with a broader advice relationship.

**Client:** I would like the rollover instructions handled first, then the financial plan, and then the automated-investing review.

**Representative:** I’ll document that sequence. No investment decision is being made as a condition of the rollover.

**Client:** Thank you.

**Representative:** To recap, you have considered your former-plan alternatives and decided to roll into the Rollover IRA. I’ll first connect you with a rollover consultant. You also want a consolidated retirement plan and, after that, a review of automated portfolio management. No investment changes were made today.

**Client:** Correct.

## Final path

```text
Immediate action
Rollover consultant

Primary relationship path
Schwab Plan

Secondary investment path
Schwab Intelligent Portfolios IRA

Escalation path
Financial Consultant if broader needs emerge
```

---

# Scenario 5: A new-child account question becomes a multigenerational family relationship

**Call-reason taxonomy:** Account creation, account-registration questions, and new-account walkthroughs are heavily represented in the source. :chatgpt-content-reference{index="16"}

**Clients:** Priya and Arun Shah  
**Life event:** Daughter born one month ago  
**Immediate request:** Determine which account to open  
**Deeper issue:** Parents and grandparents want to contribute, while the parents also need to protect their own retirement goals

## How the path changes

```text
Generic new-account request
        ↓
Education goal identified
        ↓
529 and ESA paths appear
        ↓
Parents request broader flexibility
        ↓
Custodial path appears
        ↓
Grandparent contributions and retirement tradeoffs emerge
        ↓
Education specialist + Schwab Plan
        ↓
Potential long-term family relationship
```

## Complete transcript

**Representative:** Thank you for calling Charles Schwab. My name is Jordan. How can I help you today?

**Client:** Our daughter was born last month, and both sets of grandparents want to contribute money for her future. We don’t know what kind of account to open.

**Representative:** Congratulations. I can explain the main account categories and connect you with an education-savings specialist. Before reviewing your existing relationship, I’ll complete standard verification.

*[Authentication is completed.]*

**Representative:** Thank you. Is the money intended specifically for education, or would you like it available for a broader range of future needs?

**Client:** Mostly education, but we’re nervous about locking everything into one purpose.

### Copilot—screen only

```text
PRIMARY CALL REASON

New Accounts › Opening Accounts › Create a New Account
Confirmed

GOAL DETECTED

Saving for a newborn

POTENTIAL PATHS

1. 529 Education Savings Plan
2. Education Savings Account
3. Custodial Account

NEXT QUESTION

Clarify education-specific purpose versus broader gifting flexibility.
```

**Representative:** Are the grandparents planning one-time gifts, recurring contributions, or both?

**Client:** Probably an initial gift and then birthday contributions.

**Representative:** Do you expect the account to be used only for education, or might you want the child to use the assets for something else, such as a first home or starting a business?

**Client:** That’s the part we are unsure about.

**Representative:** Schwab currently presents three main account paths:

- A 529 plan for tax-advantaged education saving with relatively high contribution limits.
- An Education Savings Account as a supplemental option for qualified K–12 and higher-education expenses.
- A custodial account for broader gifting to a minor and teaching money-management skills.

They differ in purpose, eligibility, contribution limits, tax treatment, control, and how the child ultimately receives the assets. :chatgpt-content-reference{index="17"}

**Client:** Which one gives us the best deduction?

**Representative:** That depends on your state, income, contribution, account type, and personal tax situation. I can explain the account features, but your tax professional should advise you about deductions and tax consequences.

**Client:** Can our parents contribute directly?

**Representative:** Contribution processes depend on the account type. The education specialist can explain gifting methods once you narrow the account structure.

**Client:** We are also concerned about saving too much for education and not enough for our own retirement.

### Copilot—screen only

```text
PATH CHANGE

From:
Child account selection

To:
Household goal coordination

NEW NEED

Balance education savings with parents’ retirement

PRIMARY PATHS

1. Education-savings specialist
2. Schwab Plan for household retirement assumptions

RELATIONSHIP DEPTH

Parents + grandparents + child
Multigenerational opportunity
```

**Representative:** That is an important distinction. Before selecting a contribution amount, it may help to see how the child’s education goal fits alongside your retirement goal.

**Client:** Can Schwab help us model both?

**Representative:** Schwab’s education resources include a college-savings calculator and a state-tax calculator. For the retirement side, Schwab Plan allows Schwab clients to model retirement timing, spending, income, and assets and test how changes affect the simulated outcome. :chatgpt-content-reference{index="18"}

**Client:** Would we need two separate conversations?

**Representative:** The first conversation can be with an education specialist to compare the account structures. A planning conversation can then help you determine a contribution level that does not ignore your own retirement objective.

**Client:** What if we choose a 529 and later our daughter does not attend college?

**Representative:** That is one of the account-specific questions the education specialist should address, including permitted uses, beneficiary options, taxes, and potential penalties. It would not be appropriate to assume a 529 is automatically the best account simply because education is one possible goal.

**Client:** I appreciate that. We want to understand the tradeoffs first.

**Representative:** I’ll arrange an education-savings conversation and note that the broader household-planning question is also important.

**Client:** Great.

**Representative:** To recap, no account has been opened. The primary intended goal is education, but you also want flexibility, grandparent contribution options, and a contribution level that does not undermine your retirement. The next step is to compare the 529, ESA, and custodial paths, followed by a planning review if useful.

**Client:** Correct.

## Final path

```text
Immediate action
Education-savings specialist

Account paths under consideration
• 529 plan
• Education Savings Account
• Custodial account

Broader relationship path
Schwab Plan for parental retirement readiness

Long-term relationship
Parents, grandparents, and eventually the child
```

---

# Scenario 6: A SEP-IRA request becomes a business and personal wealth relationship

**Call-reason taxonomy:** The source includes employer-plan setup, SEP-IRA, SIMPLE IRA, 401(k), profit-sharing, contribution, and recordkeeping calls. :chatgpt-content-reference{index="19"}

**Client:** Olivia Grant, age 44  
**Business:** Consulting firm  
**Current staff:** Owner only  
**Expected change:** First employee next quarter, possibly four employees next year  
**Immediate request:** Open a SEP-IRA  
**Deeper issue:** The client needs an employee retirement plan, business cash management, and personal retirement coordination

## How the path changes

```text
SEP-IRA application
        ↓
First employee expected
        ↓
Do not proceed with assumed SEP path
        ↓
Compare SEP, SIMPLE, and 401(k)
        ↓
Business reserve and organization account emerge
        ↓
Owner’s personal retirement concern emerges
        ↓
Three relationship paths:
1. Small-business retirement specialist
2. Organization account / business cash
3. Financial Consultant / Schwab Plan
```

## Complete transcript

**Representative:** Thank you for calling Charles Schwab. My name is Jordan. How may I help?

**Client:** I’m self-employed and want to open a SEP-IRA. I found an application, but I don’t know whether I have all the required documents.

**Representative:** I can help identify the appropriate resources. Before focusing on the application, I’ll complete standard verification.

*[Authentication is completed.]*

**Representative:** Thank you. Does the business currently have employees other than you?

**Client:** Not yet, but I’m hiring my first full-time employee next quarter.

### Copilot—screen only

```text
PRIMARY CALL REASON

Retirements › EPS › Account Setup
Possible SEP-IRA setup

MATERIAL FACT DETECTED

First employee expected next quarter

GUARDRAIL

Do not continue product-specific SEP routing
until other employer-plan structures are compared.
```

**Representative:** That future employee is important. Employee eligibility, contribution requirements, plan administration, and your hiring goals can affect which retirement-plan structure fits the business.

**Client:** I thought the SEP-IRA was automatically the simplest option.

**Representative:** It may be one option, but I would not assume it is the appropriate one without comparing the available choices.

**Client:** What else should I consider?

**Representative:** Schwab currently offers small-business retirement plans ranging from SEP IRAs to 401(k)s and says its specialists can help businesses choose a plan based on company size, employee needs, and attraction or retention goals. :chatgpt-content-reference{index="20"}

**Client:** Would that include SIMPLE IRAs and an individual 401(k)?

**Representative:** The specialist can compare the structures available for your circumstances, including how the expected employee affects eligibility and employer responsibilities.

**Client:** I plan to hire one person next quarter and perhaps three more next year.

### Copilot—screen only

```text
PATH CHANGE

From:
Owner-only retirement account

To:
Employer retirement-plan decision

PRIMARY PATH

Small-business retirement specialist

Potential paths
• SEP-IRA
• SIMPLE IRA
• 401(k)
• Profit-sharing arrangement

NEXT QUESTION

Explore broader business financial needs.
```

**Representative:** Apart from the retirement plan, how are you currently managing the business’s cash and investments?

**Client:** Most of the operating cash is in a regular business bank account. I also have around $250,000 that I don’t need immediately, but I want it available for payroll and taxes.

**Representative:** Do you have a separate brokerage or organization account for the business?

**Client:** No.

**Representative:** Schwab also offers a Schwab One Organization Account for business assets, along with CDs and money-market funds for business cash management. The organization account currently has no monthly service fee, although investments and cash products have different liquidity, risk, and insurance characteristics. :chatgpt-content-reference{index="21"}

**Client:** I would want to keep enough immediately available for payroll.

**Representative:** That liquidity requirement should be addressed before selecting any cash or investment product. The business-cash discussion should remain separate from the retirement-plan decision.

**Client:** I also worry that I’ve put all of my energy into the business and neglected my personal retirement.

### Copilot—screen only

```text
PATH CHANGE

New personal-planning need detected

RELATIONSHIP PATHS

Business
1. Retirement plan specialist
2. Organization account / cash management

Personal
3. Schwab Plan
4. Financial Consultant
5. Wealth Advisory if complexity and eligibility support it

RELATIONSHIP DEPTH

Business entity + owner household
High long-term value
```

**Representative:** Do you currently have a personal financial plan that considers both the value of the business and your household retirement assets?

**Client:** No. I have personal investments, but I’ve never combined them with the business.

**Representative:** Schwab Plan could help model your personal retirement assumptions, while a Financial Consultant can help coordinate the business and personal sides of the relationship. If the overall situation becomes more complex and you want an ongoing managed relationship, the consultant can also explain the broader wealth-management choices. :chatgpt-content-reference{index="22"}

**Client:** I don’t want everything mixed together legally, but I do want the decisions coordinated.

**Representative:** Exactly. The business and personal accounts should remain correctly registered and separate, while planning can still consider how the business affects your household goals.

**Client:** What happens next?

**Representative:** I recommend this sequence:

1. Speak with the small-business retirement team before submitting the SEP application.
2. Separately review organization-account and business-cash options.
3. Create or update your personal Schwab Plan.
4. Speak with a Financial Consultant if you want ongoing coordination.

**Client:** That’s much more useful than simply opening the SEP.

**Representative:** No plan or account will be opened during this call. I’ll document the expected hiring and route you to the appropriate team.

**Client:** Thank you.

**Representative:** To recap, the original request was to open a SEP-IRA. Because you expect to hire employees, the retirement-plan structure needs comparison before proceeding. We also identified business cash-management and personal retirement-planning needs. I’ll begin with the small-business retirement specialist.

**Client:** Correct.

## Final path

```text
Immediate action
Small-business retirement-plan specialist

Business relationship paths
• SEP/SIMPLE/401(k) comparison
• Organization account
• Business cash management

Owner relationship paths
• Schwab Plan
• Financial Consultant
• Possible Wealth Advisory evaluation

Why this is true deepening
Schwab can support both the business and the owner’s household.
```

---

# Scenario 7: A beneficiary update becomes trust, legacy, and family planning

**Call-reason taxonomy:** Beneficiary additions, changes, removals, and updates appear in the source, along with successor-trustee and trustee-update calls. :chatgpt-content-reference{index="23"} :chatgpt-content-reference{index="24"}

**Client:** Patricia Lee, age 67  
**Immediate request:** Update beneficiaries after an estate-plan revision  
**Deeper issue:** Her daughter is uncomfortable serving as successor trustee, and Patricia wants to create a charitable legacy

## How the path changes

```text
Beneficiary update
        ↓
Service request completed
        ↓
Successor-trustee concern emerges
        ↓
Personal Trust Services path appears
        ↓
Broader estate and family coordination emerges
        ↓
Financial Consultant / Wealth Advisory path appears
        ↓
Charitable legacy emerges
        ↓
DAFgiving360 becomes an additional path
```

## Complete transcript

**Representative:** Thank you for calling Charles Schwab. My name is Jordan. How may I assist you?

**Client:** I need to update the beneficiaries on my brokerage account. My attorney revised my estate plan, and I want the account to match it.

**Representative:** I can help you access the approved beneficiary-update process. I’ll first complete standard verification.

*[Authentication is completed.]*

**Representative:** Thank you. Are you changing the beneficiaries, their percentages, or both?

**Client:** Both. My attorney gave me written instructions.

**Representative:** Please compare each entry carefully with your attorney’s instructions. I can assist with the Schwab account process, but I cannot interpret the legal document.

*[The representative guides the client through the approved update process.]*

**Representative:** The beneficiary-update request has been submitted. Please retain the confirmation and review the completed designation once processing is finished.

### Copilot—screen only

```text
PRIMARY CALL REASON

New Accounts › Account Feature—TOD › Update Beneficiary
Confirmed

SERVICE STATUS

Beneficiary update submitted

RELATIONSHIP OPPORTUNITY

Listening
```

**Client:** There is another issue. My daughter is named as successor trustee of our family trust, but she recently told me she’s uncomfortable taking on that responsibility.

**Representative:** Has your estate attorney discussed using a professional or corporate trustee?

**Client:** Briefly. I don’t understand what the trustee would actually handle.

### Copilot—screen only

```text
NEW LEGACY NEED

Family successor trustee may be unwilling or unable to serve

POTENTIAL PATH

Schwab Personal Trust Services

NEXT QUESTION

Determine whether the need is immediate administration,
future succession, investment management, or all three.
```

**Representative:** Is the concern about having someone administer the trust now, or having a successor available in the future if you become unable to serve?

**Client:** Mostly the future. I’m still serving now, but I don’t want the entire burden to fall on my daughter later.

**Representative:** Schwab Personal Trust Services can provide professional trust administration and investment management through Charles Schwab Trust Company. Schwab can potentially be appointed immediately or named as a future successor trustee. Its services include distributions according to the trust document, fiduciary tax-return preparation, accounting, recordkeeping, beneficiary support, and trust investment management. An estate-planning attorney must create or amend the legal trust; Schwab administers the trust but does not draft it. :chatgpt-content-reference{index="25"}

**Client:** Could my daughter still be involved?

**Representative:** The possible structure depends on the trust terms, your goals, Schwab’s acceptance requirements, and your attorney’s advice. The Trust Services team can explain the available roles without assuming that your daughter must be completely removed.

**Client:** That would be helpful.

**Representative:** Are there other legacy objectives the trust is intended to address?

**Client:** I want my children to be supported, but I also want part of the estate to continue supporting several charities.

### Copilot—screen only

```text
PATH CHANGE

From:
Trust administration only

To:
Family + charitable legacy

POTENTIAL PATHS

1. Personal Trust Services
2. Financial Consultant / Wealth Advisory
3. DAFgiving360 for charitable legacy

PRIMARY RECOMMENDATION

Coordinate through Financial Consultant
plus Trust Services specialist
```

**Representative:** Are you thinking about fixed gifts to the charities after your death, or an ongoing charitable account that your family could continue?

**Client:** I would like my children to remain involved in choosing the charities over time.

**Representative:** DAFgiving360 allows donors to contribute assets to a donor-advised fund, recommend an investment allocation, recommend grants over time, and establish successors or charitable beneficiaries. Contributions are irrevocable. DAFgiving360 is an independent public charity and integrates with Schwab account views. Your attorney and tax advisor should review how any charitable account would fit with the trust and estate plan. :chatgpt-content-reference{index="26"}

**Client:** Could the donor-advised fund be coordinated with the trust?

**Representative:** That requires legal and tax guidance regarding your specific estate documents. Schwab and DAFgiving360 specialists can explain their services, while your attorney determines how the documents should be structured.

**Client:** There are more pieces here than I realized.

**Representative:** That is why I would recommend coordinated conversations rather than routing you to only one product.

**Client:** Who coordinates it?

**Representative:** A Financial Consultant can help coordinate the Schwab relationship and connect you with Trust Services, charitable-giving resources, and broader wealth-management support. If you want an ongoing comprehensive relationship and meet its requirements, Schwab Wealth Advisory may also be discussed. :chatgpt-content-reference{index="27"}

**Client:** I would like that.

**Representative:** No trust appointment, legal-document amendment, charitable contribution, or advisory enrollment will occur from this call. I’ll arrange the conversations and document the objectives you shared.

**Client:** Thank you.

**Representative:** Let me summarize. Your beneficiary-update request has been submitted. Separately, you are concerned about burdening your daughter as successor trustee and want to explore a professional successor. You also want your children involved in a continuing charitable legacy. I’ll coordinate a Financial Consultant and Personal Trust Services follow-up, with charitable-giving resources as appropriate.

**Client:** That’s correct.

## Final path

```text
Immediate action
Beneficiary update submitted

Primary legacy path
Schwab Personal Trust Services

Relationship coordinator
Financial Consultant

Potential additional paths
• Schwab Wealth Advisory
• DAFgiving360
• Estate-attorney coordination

Why this is true deepening
The relationship expands from one account designation
to family governance, trust administration, and philanthropy.
```

---

# How the app should show the path changing

For every scenario, the UI should show the progression—not merely the final product.

## Example from the cost-basis scenario

### Stage 1: Service only

```text
CALL REASON
Cost Basis › Cost Basis Report

SERVICE STATUS
Locating report
```

### Stage 2: First opportunity

```text
CLIENT NEED
Concentrated employer stock

POTENTIAL CONNECTION
Schwab Personalized Indexing
```

### Stage 3: Multiple paths

```text
NEW NEED
$180,000 liquidity requirement

ADDITIONAL CONNECTION
Pledged Asset Line specialist
```

### Stage 4: Relationship deepening

```text
NEW NEED
Recurring charitable giving

ADDITIONAL CONNECTION
DAFgiving360
```

### Stage 5: Final route

```text
RELATIONSHIP OPPORTUNITY

Multiple interacting needs detected

✓ Concentrated stock
✓ Tax-management need
✓ Liquidity requirement
✓ Charitable intent

PRIMARY NEXT STEP
Financial Consultant

SPECIALIST PATHS
Personalized Indexing
Pledged Asset Line
DAFgiving360
```

The AI should not display all offerings at the beginning. Each path should appear only after the client says something that supports it.

# Recommended demo order

For a leadership presentation, I would demonstrate these in this sequence:

1. **Recurring ACH** — simple and easy to understand; leads to Schwab Plan and robo-advice.
2. **Cost basis** — shows the full power of multi-path relationship intelligence.
3. **New child** — shows family and multigenerational value.
4. **Business owner** — shows business and personal relationship expansion.
5. **Beneficiary update** — shows legacy and trust capabilities.
6. **Rollover** — demonstrates correct guardrails and retirement sequencing.
7. **Balance inquiry** — demonstrates the move from a simple question to comprehensive advice.

The strongest three for a shorter live demo are:

> **Recurring ACH → Schwab Plan and Intelligent Portfolios**

> **Cost basis → Personalized Indexing, lending, charitable giving, and wealth coordination**

> **Business owner → retirement plan, business assets, and personal wealth planning**