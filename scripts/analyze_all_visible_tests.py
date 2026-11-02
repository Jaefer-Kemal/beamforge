# scripts/analyze_all_visible_tests.py
import os
import re
import sys

# Ensure UTF-8 output on Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

chapters_dir = 'apps/web-ide/src/data/chapters'
runner_file = 'services/orchestrator/internal/bridge/erl_runner_chapters.go'
incidents_file = 'services/orchestrator/internal/bridge/erl_runner_incidents.go'

# 1. Parse Backend Run Cases
with open(runner_file, 'r', encoding='utf-8') as f:
    runner_code = f.read()

run_part = runner_code.split('func (r *Runner) buildChapterRunScript')[1].split('func (r *Runner) buildChapterVerificationScript')[0]

backend_run_cases = {}
# Find cases: case "chXX-lYY":
cases_raw = re.split(r'case\s+"([^"]+)":', run_part)
for i in range(1, len(cases_raw), 2):
    c_id = cases_raw[i]
    c_body = cases_raw[i+1]
    calls = re.findall(r'call_str\s*=>\s*<<"([^"]+)">>', c_body)
    expecteds = re.findall(r'expected\s*=>\s*(?:<<"([^"]+)">>|list_to_binary\([^)]+\))', c_body)
    backend_run_cases[c_id] = {
        'call_count': len(calls),
        'calls': calls,
        'expecteds': expecteds
    }

# Also incidents
with open(incidents_file, 'r', encoding='utf-8') as f:
    inc_code = f.read()
inc_run_part = ""
if 'buildIncidentRunScript' in inc_code:
    inc_run_part = inc_code.split('buildIncidentRunScript')[1]
else:
    # incidents are usually verified or run
    pass

# 2. Parse Frontend Lessons
frontend_data = {}

for ch_idx in range(1, 13):
    ch_name = f"ch{ch_idx:02d}.ts"
    ch_path = os.path.join(chapters_dir, ch_name)
    if not os.path.exists(ch_path):
        continue
    
    with open(ch_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    pattern = re.compile(r"\{\s*id:\s*['\"](ch\d+-[a-zA-Z0-9_-]+)['\"]", re.MULTILINE)
    matches = list(pattern.finditer(content))
    
    for i, m in enumerate(matches):
        lid = m.group(1)
        start = m.start()
        end = matches[i+1].start() if i+1 < len(matches) else len(content)
        lesson_block = content[start:end]
        
        # Extract title
        title_m = re.search(r"title:\s*['\"]([^'\"]+)['\"]", lesson_block)
        title = title_m.group(1) if title_m else lid
        
        # Extract visibleTestCases block
        vtc_pos = lesson_block.find('visibleTestCases:')
        tests = []
        if vtc_pos != -1:
            # find where visibleTestCases ends: before the next major property like astRules, starterCode, etc.
            vtc_substr = lesson_block[vtc_pos:vtc_pos+4000]
            # Find each test object
            # Matches erlangCall: '...' or `...` and expectedOutput: '...' or `...`
            tc_items = re.findall(r"erlangCall:\s*['\"`]([\s\S]*?)['\"`]\s*,\s*expectedOutput:\s*['\"`]([\s\S]*?)['\"`]", vtc_substr)
            for call_str, exp_str in tc_items:
                tests.append({
                    'erlangCall': call_str.strip(),
                    'expectedOutput': exp_str.strip()
                })
        
        frontend_data[lid] = {
            'chapter': f"ch{ch_idx:02d}",
            'lid': lid,
            'title': title,
            'visible_tests': tests,
            'test_count': len(tests)
        }

print(f"Total frontend lessons parsed: {len(frontend_data)}")
print(f"Total backend run cases parsed: {len(backend_run_cases)}")

# 3. Compare and categorize
perfect_matches = []
mismatched_counts = []
missing_in_backend = []
zero_frontend_tests = []

for lid, fdata in frontend_data.items():
    if fdata['test_count'] == 0:
        zero_frontend_tests.append(lid)
        continue
    
    if lid not in backend_run_cases:
        missing_in_backend.append((lid, fdata['test_count'], fdata['title']))
        continue
    
    bdata = backend_run_cases[lid]
    if fdata['test_count'] != bdata['call_count']:
        mismatched_counts.append((lid, fdata['test_count'], bdata['call_count'], fdata['title'], fdata['visible_tests'], bdata['calls']))
    else:
        perfect_matches.append(lid)

print("\n" + "="*80)
print("AUDIT BREAKDOWN:")
print(f"1. Lessons with exact test count match in backend: {len(perfect_matches)}")
print(f"2. Lessons with test count mismatch between FE and BE: {len(mismatched_counts)}")
print(f"3. Lessons with visibleTestCases in FE, but COMPLETELY MISSING in Backend Run: {len(missing_in_backend)}")
print(f"4. Lessons with ZERO visibleTestCases defined in FE: {len(zero_frontend_tests)}")
print("="*80)

if mismatched_counts:
    print("\n--- MISMATCHED TEST COUNTS ---")
    for lid, fe_count, be_count, title, fe_tests, be_calls in mismatched_counts:
        print(f"\n[!] {lid} ({title})")
        print(f"    FE visibleTestCases ({fe_count}):")
        for t in fe_tests:
            print(f"      - {t['erlangCall']} -> {t['expectedOutput']}")
        print(f"    BE runScript calls ({be_count}):")
        for c in be_calls:
            print(f"      - {c}")

if missing_in_backend:
    print("\n--- COMPLETELY MISSING FROM BACKEND RUN SCRIPT ---")
    for lid, fe_count, title in missing_in_backend:
        print(f"  {lid:<12} | FE has {fe_count} tests | {title}")

if zero_frontend_tests:
    print("\n--- ZERO TESTS IN FRONTEND ---")
    for lid in zero_frontend_tests:
        print(f"  {lid:<12} | {frontend_data[lid]['title']}")
