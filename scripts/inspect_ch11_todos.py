# scripts/inspect_ch11_todos.py
import re

with open('apps/web-ide/src/data/chapters/ch11.ts', 'r', encoding='utf-8') as f:
    text = f.read()

# Pattern matching lessons
pattern = r'id:\s*"([^"]+)"[\s\S]*?starterCode:\s*`([\s\S]*?)`,\s*\n\s*solutionCode:'
matches = re.findall(pattern, text)
print(f"Total starterCode blocks found: {len(matches)}")

for lid, sc in matches:
    print(f"\n==========================================")
    print(f"LESSON: {lid}")
    print(f"==========================================")
    lines = sc.split('\n')
    for line in lines:
        if '%' in line or 'TODO' in line:
            print("  ", line.strip())

