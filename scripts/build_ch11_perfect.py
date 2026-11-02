# scripts/build_ch11_perfect.py
import os
import json

def to_ts_string(s: str) -> str:
    """Format single-line or multi-line string safely as a JS string."""
    return json.dumps(s)

def to_ts_template(s: str) -> str:
    """Format string inside backticks `...` with backticks and ${ escaped."""
    escaped = s.replace('\\', '\\\\').replace('`', '\\`').replace('${', '\\${')
    return f"`{escaped}`"

def render_mental_model_check(mmc):
    if not mmc:
        return ""
    code_part = f"\n    codeSnippet: {to_ts_string(mmc.get('codeSnippet', ''))}," if 'codeSnippet' in mmc else ""
    opts = []
    for opt in mmc['options']:
        opts.append(f"""      {{
        id: {to_ts_string(opt['id'])},
        label: {to_ts_string(opt['label'])},
        isCorrect: {'true' if opt['isCorrect'] else 'false'},
        explanation: {to_ts_string(opt['explanation'])},
      }}""")
    opts_str = ",\n".join(opts)
    return f"""  mentalModelCheck: {{
    question: {to_ts_string(mmc['question'])},{code_part}
    options: [
{opts_str}
    ],
  }},"""

def render_incident_alert(alert):
    if not alert:
        return ""
    return f"""  incidentAlert: {{
    severity: {to_ts_string(alert['severity'])},
    incidentTitle: {to_ts_string(alert['incidentTitle'])},
    service: {to_ts_string(alert['service'])},
    symptom: {to_ts_string(alert['symptom'])},
    impact: {to_ts_string(alert['impact'])},
    diagnosticClue: {to_ts_string(alert['diagnosticClue'])},
  }},"""

def render_otp_card(card):
    types_str = ",\n".join([f"        {to_ts_string(t)}" for t in card['typesSpec']])
    return f"""      {{
        functionName: {to_ts_string(card['functionName'])},
        module: {to_ts_string(card['module'])},
        signature: {to_ts_string(card['signature'])},
        typesSpec: [
{types_str}
        ],
        description: {to_ts_string(card['description'])},
        complexityNote: {to_ts_string(card['complexityNote'])},
        officialUrl: {to_ts_string(card['officialUrl'])},
        githubSourceUrl: {to_ts_string(card.get('githubSourceUrl', ''))},
      }}"""

def render_test_case(tc):
    return f"""      {{
        id: {to_ts_string(tc['id'])},
        title: {to_ts_string(tc['title'])},
        erlangCall: {to_ts_string(tc['erlangCall'])},
        expectedOutput: {to_ts_string(tc['expectedOutput'])},
        explanation: {to_ts_string(tc['explanation'])},
      }}"""

def render_lesson(l):
    mmc_str = render_mental_model_check(l.get('mentalModelCheck'))
    alert_str = render_incident_alert(l.get('incidentAlert'))
    cards_str = ",\n".join([render_otp_card(c) for c in l['otpDocCards']])
    tc_str = ",\n".join([render_test_case(tc) for tc in l['visibleTestCases']])
    
    parts = [
        "  {",
        f"    id: {to_ts_string(l['id'])},",
        f"    chapterNumber: {l['chapterNumber']},",
        f"    lessonNumber: {l['lessonNumber']},",
        f"    lessonType: {to_ts_string(l['lessonType'])},",
        f"    title: {to_ts_string(l['title'])},",
        f"    difficulty: {to_ts_string(l['difficulty'])},",
        f"    visualScene: {to_ts_string(l['visualScene'])}," if 'visualScene' in l else "",
        f"  {mmc_str}" if mmc_str else "",
        f"  {alert_str}" if alert_str else "",
        f"    conceptMarkdown: {to_ts_template(l['conceptMarkdown'])},",
        "    otpDocCards: [",
        cards_str,
        "    ],",
        "    visibleTestCases: [",
        tc_str,
        "    ],",
        f"    solutionExplanation: {to_ts_string(l['solutionExplanation'])},",
        f"    starterCode: {to_ts_template(l['starterCode'])},",
        f"    solutionCode: {to_ts_template(l['solutionCode'])},",
        "  }",
    ]
    return "\n".join([p for p in parts if p])

print("Helper functions ready.")
