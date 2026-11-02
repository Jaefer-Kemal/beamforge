import os
import re
import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

chapters_dir = 'apps/web-ide/src/data/chapters'

for f in sorted(os.listdir(chapters_dir)):
    if f.startswith('ch') and f.endswith('.ts') and f != 'index.ts':
        content = open(os.path.join(chapters_dir, f), encoding='utf-8').read()
        calls = re.findall(r"erlangCall:\s*['\"`]([\s\S]*?)['\"`]\s*,", content)
        for c in calls:
            c = c.strip()
            # replace binaries and strings
            no_str = re.sub(r'"[^"]*"', '', c)
            no_str = re.sub(r'<<[^>]*>>', '', no_str)
            # find uppercase words (variables)
            vars_found = re.findall(r'\b[A-Z][a-zA-Z0-9_]*\b', no_str)
            vars_found = [v for v in vars_found if v not in ['XMPP', 'TCP', 'IP', 'CDR', 'FSM', 'REST', 'GET', 'POST', 'HTTP', 'ASCII', 'UTF8', 'BIF', 'OTP', 'ETS']]
            if vars_found and not c.startswith('begin'):
                print(f"[{f}] {c} (Vars: {vars_found})")

