# scripts/analyze_all_visible_tests_v2.py
import os
import re
import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

chapters_dir = 'apps/web-ide/src/data/chapters'
runner_file = 'services/orchestrator/internal/bridge/erl_runner_chapters.go'
incidents_file = 'services/orchestrator/internal/bridge/erl_runner_incidents.go'

with open(runner_file, 'r', encoding='utf-8') as f:
    runner_code = f.read()

run_part = runner_code.split('func (r *Runner) buildChapterRunScript')[1].split('func (r *Runner) buildChapterVerificationScript')[0]

backend_run_cases = {}
# Find cases: case "chXX-lYY":
cases_raw = re.split(r'case\s+"([^"]+)":', run_part)
for i in range(1, len(cases_raw), 2):
    c_id = cases_raw[i]
    c_body = cases_raw[i+1]
    
    # Find AllResults = [ ... ]
    all_res_match = re.search(r'AllResults\s*=\s*\[(.*?)\]', c_body, re.DOTALL)
    if all_res_match:
        items = [x.strip() for x in all_res_match.group(1).split(',') if x.strip()]
        test_count = len(items)
    else:
        # Fallback: count T<N>_Res =
        t_res = set(re.findall(r'(T\d+_Res)\s*=', c_body))
        test_count = len(t_res)
    
    # Find unique call_str in c_body
    calls = []
    seen = set()
    for c in re.findall(r'call_str\s*=>\s*<<"([^"]+)">>', c_body):
        if c not in seen:
            seen.add(c)
            calls.append(c)
    
    backend_run_cases[c_id] = {
        'call_count': test_count,
        'unique_calls': calls,
        'raw_body': c_body
    }

# Check incidents in incidents_file
with open(incidents_file, 'r', encoding='utf-8') as f:
    inc_code = f.read()

# Does incidents_file have run scripts?
inc_run_cases = {}
if 'buildIncidentRunScript' in inc_code:
    inc_run_part = inc_code.split('buildIncidentRunScript')[1]
    inc_cases_raw = re.split(r'case\s+"([^"]+)":', inc_run_part)
    for i in range(1, len(inc_cases_raw), 2):
        inc_run_cases[inc_cases_raw[i]] = True

# Parse Frontend
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
        
        title_m = re.search(r"title:\s*['\"]([^'\"]+)['\"]", lesson_block)
        title = title_m.group(1) if title_m else lid
        
        # visibleTestCases
        vtc_pos = lesson_block.find('visibleTestCases:')
        tests = []
        if vtc_pos != -1:
            # find matching bracket for visibleTestCases: [ ... ]
            b_open = lesson_block.find('[', vtc_pos)
            if b_open != -1:
                # count braces/brackets to find closing
                depth = 1
                curr = b_open + 1
                while curr < len(lesson_block) and depth > 0:
                    if lesson_block[curr] == '[': depth += 1
                    elif lesson_block[curr] == ']': depth -= 1
                    curr += 1
                vtc_substr = lesson_block[b_open:curr]
                
                # find each test
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
print(f"Total backend run cases in erl_runner_chapters.go: {len(backend_run_cases)}")

# Categorize
exact_count_match = []
count_mismatch = []
missing_in_backend_run = []
zero_in_frontend = []

for lid, fdata in frontend_data.items():
    if fdata['test_count'] == 0:
        zero_in_frontend.append(lid)
        continue
    
    if lid not in backend_run_cases:
        missing_in_backend_run.append((lid, fdata['test_count'], fdata['title']))
        continue
    
    bdata = backend_run_cases[lid]
    if fdata['test_count'] != bdata['call_count']:
        count_mismatch.append((lid, fdata['test_count'], bdata['call_count'], fdata['title'], fdata['visible_tests'], bdata['unique_calls']))
    else:
        exact_count_match.append(lid)

print("\n" + "="*80)
print("AUDIT SUMMARY (RUN CODE SUPPORT)")
print("="*80)
print(f"1. Exact Test Count Match: {len(exact_count_match)} / {len(frontend_data)} lessons")
print(f"2. Count Mismatch between FE and BE: {len(count_mismatch)} lessons")
print(f"3. Completely MISSING in Backend Run Script: {len(missing_in_backend_run)} lessons")
print(f"4. Zero Tests Defined in Frontend: {len(zero_in_frontend)} lessons")
print("="*80)

if missing_in_backend_run:
    print("\n--- [!] COMPLETELY MISSING FROM BACKEND RUN SCRIPT ---")
    for lid, cnt, title in missing_in_backend_run:
        print(f"  {lid:<12} | FE has {cnt} tests | {title}")

if zero_in_frontend:
    print("\n--- [!] ZERO TESTS DEFINED IN FRONTEND ---")
    for lid in zero_in_frontend:
        print(f"  {lid:<12} | {frontend_data[lid]['title']}")

if count_mismatch:
    print("\n--- [!] COUNT MISMATCHES BETWEEN FRONTEND AND BACKEND ---")
    for lid, fe_cnt, be_cnt, title, fe_tests, be_calls in count_mismatch:
        print(f"\n  {lid} ({title})")
        print(f"    FE visibleTestCases ({fe_cnt}):")
        for t in fe_tests:
            print(f"      - {t['erlangCall']}")
        print(f"    BE run script tests ({be_cnt}):")
        for c in be_calls:
            print(f"      - {c}")

