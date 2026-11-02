import os
import re
import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

chapters_dir = 'apps/web-ide/src/data/chapters'
special_exps = []

for f in sorted(os.listdir(chapters_dir)):
    if f.startswith('ch') and f.endswith('.ts') and f != 'index.ts':
        content = open(os.path.join(chapters_dir, f), encoding='utf-8').read()
        exps = re.findall(r"expectedOutput:\s*['\"`]([\s\S]*?)['\"`]\s*,", content)
        for e in exps:
            e_str = e.strip()
            if '...' in e_str or '<0.' in e_str or 'Schedulers' in e_str or '_' in e_str:
                special_exps.append((f, e_str))

print(f"Total special expected outputs: {len(special_exps)}")
for f, e in special_exps:
    print(f"[{f}] {e}")

