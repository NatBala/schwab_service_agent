"""Embed only the seven user-supplied shortlisted synthetic calls."""

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "data" / "shortlisted-relationship-scenarios.md"
OUTPUT = ROOT / "lib" / "relationship-scenarios.ts"

TAXONOMY = {
    1: ["Move Money", "ACH", "Periodic Request"],
    2: ["Client Inquiries", "Account Balance", "Account Balance"],
    3: ["Cost Basis", "Cost Basis Reporting", "Cost Basis Report"],
    4: ["Retirements", "Rollover", "IRA Rollover"],
    5: ["New Accounts", "Opening Accounts", "Create a New Account"],
    6: ["Retirements", "Small Business Plans", "Plan Setup"],
    7: ["Account Maintenance", "Beneficiaries", "Update Beneficiary"],
}

RENAMES = {
    "Eric Wallace": "Erica Wallace",
    "David Reynolds": "Dana Reynolds",
    "Arun Shah": "Anika Shah",
    "Eric": "Erica",
    "David": "Dana",
    "Arun": "Anika",
}

# These are the customer's own concerns in the seven supplied transcripts, not
# products to pitch. A caller reveals them gradually after the service issue.
DISCOVERY_BEATS = {
    1: [
        "Ask whether the monthly deposit is enough for retirement; you also have a workplace 401(k) and want a combined plan.",
        "Explain that you own three ETFs but struggle to decide how to allocate each deposit, so some contributions sit in cash.",
        "Explain your preference to have portfolio selection and rebalancing managed after your planning question is addressed.",
    ],
    2: [
        "Ask whether your Schwab balance puts you on track to retire in eight years; your outside 401(k) and spouse's pension matter too.",
        "Explain that your mortgage and rental property make the retirement picture hard to coordinate, and you want help interpreting a single plan.",
        "Mention the possible property sale, company stock, support for your mother, and aging estate documents; ask whether ongoing coordinated advice would help, while keeping a one-time plan an option.",
    ],
    3: [
        "Explain the large gain and concentration in employer stock, plus overlapping exposure in your index funds.",
        "Explain the roughly $180,000 renovation and tax-payment need and your concern about selling appreciated stock to raise it.",
        "Mention your recurring donations to several charities and your CPA's suggestion to consider gifts of appreciated shares.",
        "Ask for one coordinated discussion because the investment, borrowing, charitable, and tax decisions affect one another.",
    ],
    4: [
        "After direct-rollover instructions are clear, ask whether the IRA invests automatically when the former-plan money arrives.",
        "Explain that you are unsure whether you are on track for retirement and have a current employer plan and a spouse's 403(b) to consider.",
        "Explain that you do not want to choose and rebalance the rollover IRA investments yourself; ask how planning and managed investing would fit together.",
    ],
    5: [
        "Explain that the family expects education expenses and grandparents want to contribute, so an education-focused account is worth understanding.",
        "Ask how an education savings account compares with a 529 and what happens if your daughter does not use all the money for college.",
        "Explain that you also want flexibility for non-education purposes and need to understand who controls a custodial account.",
        "Mention the concern that saving for your daughter could crowd out your own retirement; ask to model both goals.",
    ],
    6: [
        "Explain that you will hire employees soon and want to compare SEP, SIMPLE, and 401(k) retirement-plan choices before opening one.",
        "Explain that the business has operating cash and roughly $250,000 not needed immediately, while payroll and taxes still require ready access.",
        "Ask how to keep business assets and personal investments legally separate while making coordinated decisions.",
        "Explain that you have neglected your own retirement while building the business and want a personal plan and a person who can coordinate the two sides.",
    ],
    7: [
        "After the beneficiary update, explain that your daughter is uncomfortable being successor trustee and you want to understand professional trust administration.",
        "Explain that you want your children involved in a continuing charitable legacy for several charities.",
        "Ask how the trust, charitable giving, and broader estate decisions can be coordinated with your attorney and a Schwab relationship contact.",
    ],
}


def clean(text: str) -> str:
    text = re.sub(r":chatgpt-content-reference\{[^}]+\}", "", text)
    for original, replacement in RENAMES.items():
        text = re.sub(rf"\b{re.escape(original)}\b", replacement, text)
    return re.sub(r"\s+", " ", text).strip()


def field(section: str, label: str) -> str:
    match = re.search(rf"(?m)^\*\*{re.escape(label)}:\*\*\s*(.+)$", section)
    return clean(match.group(1)) if match else ""


def extract() -> list[dict]:
    raw = SOURCE.read_text(encoding="utf-8")
    sections = re.split(r"(?m)(?=^# Scenario [1-7]: )", raw)
    results = []
    for section in sections:
        heading = re.search(r"(?m)^# Scenario ([1-7]): (.+)$", section)
        if not heading:
            continue
        number = int(heading.group(1))
        header, _, transcript = section.partition("## Complete transcript")
        dialogue = [
            {"speaker": "customer" if who == "Client" else "representative", "text": clean(line)}
            for who, line in re.findall(r"(?m)^\*\*(Representative|Client):\*\*\s*(.+)$", transcript)
        ]
        if len(dialogue) < 12:
            raise ValueError(f"Scenario {number} has only {len(dialogue)} spoken lines")
        client = field(header, "Client") or field(header, "Clients")
        caller = re.split(r",|\s+and\s+", client, 1)[0].strip()
        if number == 5:
            caller = "Priya Shah"
        age = re.search(r"\bage (\d{2})\b", client)
        opening = field(header, "Immediate request")
        deeper = field(header, "Deeper issue") or field(header, "Deeper needs")
        if not caller or not opening:
            raise ValueError(f"Scenario {number} lacks caller or opening")
        facts = [f"Immediate service request: {opening}"]
        if deeper:
            facts.append(f"Broader concern, to reveal naturally after the service discussion: {deeper}")
        for label in (
            "Existing account", "Current balance", "Schwab assets", "Outside 401(k)",
            "Taxable portfolio", "Employer stock", "Former-employer 401(k)",
            "Life event", "Business", "Expected change", "Other household factors",
        ):
            value = field(header, label)
            if value:
                facts.append(f"{label}: {value}")
        results.append({
            "id": f"relationship-{number:02d}",
            "title": clean(heading.group(2)),
            "callerName": caller,
            "age": int(age.group(1)) if age else None,
            "openingReason": opening,
            "customerOpener": next(line["text"] for line in dialogue if line["speaker"] == "customer"),
            "rolePlayHiddenFacts": facts,
            "serviceResolution": f"Address the original request: {opening}. Use only actions confirmed in the live conversation.",
            "postServiceBridge": deeper,
            "discoveryBeats": DISCOVERY_BEATS[number],
            "opportunityCues": [deeper] if deeper else [],
            "guardrails": ["Do not claim an action, enrollment, or account change occurred unless the representative confirms it. Do not offer a product before the client voices a relevant need."],
            "investingApproach": "Educational exploration only after the client states an investing goal and preference.",
            "taxonomyPath": TAXONOMY[number],
            "sourceCompleteness": "full_script",
            "script": dialogue,
        })
    if len(results) != 7:
        raise ValueError(f"Expected seven shortlisted calls; found {len(results)}")
    return results


def main() -> None:
    payload = json.dumps(extract(), ensure_ascii=False, indent=2)
    OUTPUT.write_text(
        'import type { Scenario } from "./scenarios";\n'
        'import { TAXONOMY } from "./taxonomy";\n\n'
        '/** Seven synthetic calls from the latest user-supplied shortlist. */\n'
        f'const briefs = {payload} as const;\n\n'
        'export const SCENARIOS: Scenario[] = briefs.map(({ taxonomyPath, ...brief }) => ({\n'
        '  ...brief,\n'
        '  script: brief.script.map((line) => ({ speaker: line.speaker, text: line.text })),\n'
        '  rolePlayHiddenFacts: [...brief.rolePlayHiddenFacts],\n'
        '  discoveryBeats: [...brief.discoveryBeats],\n'
        '  opportunityCues: [...brief.opportunityCues],\n'
        '  guardrails: [...brief.guardrails],\n'
        '  expectedTaxonomy: TAXONOMY.find((item) =>\n'
        '    item.category === taxonomyPath[0] && item.subcategory === taxonomyPath[1] && item.reason === taxonomyPath[2]\n'
        '  ) ?? null,\n'
        '}));\n\n'
        'export function getScenario(id: string): Scenario | undefined {\n'
        '  return SCENARIOS.find((scenario) => scenario.id === id);\n'
        '}\n', encoding="utf-8")
    print("Embedded seven shortlisted relationship calls")


if __name__ == "__main__":
    main()
