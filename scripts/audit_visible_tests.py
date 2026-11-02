# scripts/audit_visible_tests.py
import os
import re

chapters_dir = 'apps/web-ide/src/data/chapters'
frontend_lessons = {}

# 1. Parse all chapter files in apps/web-ide/src/data/chapters/
for f in sorted(os.listdir(chapters_dir)):
    if f.startswith('ch') and f.endswith('.ts') and f != 'index.ts':
        p = os.path.join(chapters_dir, f)
        with open(p, 'r', encoding='utf-8') as fh:
            content = fh.read()
        
        # Extract each lesson id
        # Look for id: 'chXX-...' or id: "chXX-..."
        matches = re.findall(r"id:\s*['\"](ch\d+-[a-zA-Z0-9_-]+)['\"]", content)
        for lid in matches:
            if not lid.startswith('tc-') and not lid.startswith('tc1') and not lid.startswith('tc2'):
                frontend_lessons[lid] = {
                    'file': f,
                    'test_count': 0,
                    'tests': []
                }

# Also parse visibleTestCases for each lesson
for lid, info in frontend_lessons.items():
    ch_file = info['file']
    p = os.path.join(chapters_dir, ch_file)
    with open(p, 'r', encoding='utf-8') as fh:
        content = fh.read()
    
    # Locate this lesson block
    pos = content.find(f"'{lid}'")
    if pos == -1:
        pos = content.find(f'"{lid}"')
    if pos != -1:
        # find visibleTestCases: [ ... ]
        vtc_pos = content.find('visibleTestCases:', pos)
        if vtc_pos != -1:
            # find the closing bracket of visibleTestCases
            bracket_open = content.find('[', vtc_pos)
            # simple scan for calls
            next_lesson = content.find("id: 'ch", pos + 10)
            if next_lesson == -1:
                next_lesson = content.find('id: "ch', pos + 10)
            if next_lesson == -1:
                next_lesson = len(content)
            
            block = content[vtc_pos:next_lesson]
            calls = re.findall(r"erlangCall:\s*['\"`]|callStr:\s*['\"`]", block)
            info['test_count'] = len(calls)
            
            # extract call strings
            call_matches = re.findall(r"(?:erlangCall|callStr):\s*['\"`]([\s\S]*?)['\"`]\s*,", block)
            info['tests'] = [c.strip() for c in call_matches]

print(f"Total frontend lessons parsed: {len(frontend_lessons)}")

# 2. Check backend runner in erl_runner_chapters.go and erl_runner_incidents.go and erl_runner.go
runner_chapters_path = 'services/orchestrator/internal/bridge/erl_runner_chapters.go'
with open(runner_chapters_path, 'r', encoding='utf-8') as fh:
    runner_text = fh.read()

incidents_path = 'services/orchestrator/internal/bridge/erl_runner_incidents.go'
incidents_text = ''
if os.path.exists(incidents_path):
    with open(incidents_path, 'r', encoding='utf-8') as fh:
        incidents_text = fh.read()

erl_runner_path = 'services/orchestrator/internal/bridge/erl_runner.go'
with open(erl_runner_path, 'r', encoding='utf-8') as fh:
    erl_runner_text = fh.read()

# Extract run cases from buildChapterRunScript
run_script_split = runner_text.split('func (r *Runner) buildChapterRunScript')
run_cases = set()
if len(run_script_split) > 1:
    body = run_script_split[1].split('func (r *Runner) buildChapterVerificationScript')[0]
    cases = re.findall(r'case\s+["\']([^"\']+)["\']', body)
    for c in cases:
        run_cases.add(c)

# Add incidents
if incidents_text:
    inc_cases = re.findall(r'case\s+["\']([^"\']+)["\']', incidents_text)
    for c in inc_cases:
        run_cases.add(c)

# Add fallback cases in erl_runner.go buildRunScript
runner_build_split = erl_runner_text.split('func (r *Runner) buildRunScript')
if len(runner_build_split) > 1:
    body = runner_build_split[1]
    cases = re.findall(r'case\s+["\']([^"\']+)["\']', body)
    for c in cases:
        run_cases.add(c)

# 3. Extract verification cases from buildChapterVerificationScript
verif_cases = set()
verif_split = runner_text.split('func (r *Runner) buildChapterVerificationScript')
if len(verif_split) > 1:
    cases = re.findall(r'case\s+["\']([^"\']+)["\']', verif_split[1])
    for c in cases:
        verif_cases.add(c)

print(f"Total backend RUN cases found: {len(run_cases)}")
print(f"Total backend VERIFICATION cases found: {len(verif_cases)}")

# 4. Compare chapter by chapter
by_chapter = {}
for lid, info in sorted(frontend_lessons.items()):
    ch_num = lid.split('-')[0]
    if ch_num not in by_chapter:
        by_chapter[ch_num] = []
    
    has_run = lid in run_cases
    has_verif = lid in verif_cases
    by_chapter[ch_num].append({
        'lid': lid,
        'file': info['file'],
        'test_count': info['test_count'],
        'has_run': has_run,
        'has_verif': has_verif,
    })

print("\n" + "="*80)
print("CHAPTER BY CHAPTER AUDIT REPORT (RUN & VERIFICATION SUPPORT)")
print("="*80)

total_lessons = 0
total_run_supported = 0
total_verif_supported = 0

for ch, items in sorted(by_chapter.items()):
    print(f"\n--- {ch.upper()} ({len(items)} lessons in {items[0]['file']}) ---")
    for it in items:
        total_lessons += 1
        run_status = "RUN: OK" if it['has_run'] else "RUN: MISSING [X]"
        verif_status = "VERIF: OK" if it['has_verif'] else "VERIF: MISSING [X]"
        if it['has_run']:
            total_run_supported += 1
        if it['has_verif']:
            total_verif_supported += 1
        
        flag = " [!] ATTENTION NEEDED" if (not it['has_run'] or not it['has_verif']) else ""
        print(f"  {it['lid']:<12} | {it['test_count']} visible tests | {run_status:<16} | {verif_status:<18}{flag}")

print("\n" + "="*80)
print(f"SUMMARY:")
print(f"Total Lessons: {total_lessons}")
print(f"Run Supported: {total_run_supported}/{total_lessons} ({total_run_supported/total_lessons*100:.1f}%)")
print(f"Verification Supported: {total_verif_supported}/{total_lessons} ({total_verif_supported/total_lessons*100:.1f}%)")
print("="*80)
