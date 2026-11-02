# scripts/full_curriculum_visible_tests_audit.py
import os
import re
import sys
import json

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

chapters_dir = 'apps/web-ide/src/data/chapters'
runner_chapters_file = 'services/orchestrator/internal/bridge/erl_runner_chapters.go'
runner_incidents_file = 'services/orchestrator/internal/bridge/erl_runner_incidents.go'
runner_core_file = 'services/orchestrator/internal/bridge/erl_runner.go'

# 1. Parse Backend Run Scripts
with open(runner_chapters_file, 'r', encoding='utf-8') as f:
    r_chapters = f.read()

with open(runner_incidents_file, 'r', encoding='utf-8') as f:
    r_incidents = f.read()

with open(runner_core_file, 'r', encoding='utf-8') as f:
    r_core = f.read()

backend_scripts = {}

# Parse chapters
run_part = r_chapters.split('func (r *Runner) buildChapterRunScript')[1].split('func (r *Runner) buildChapterVerificationScript')[0]
ch_cases = re.split(r'case\s+([^:]+):', run_part)
for i in range(1, len(ch_cases), 2):
    raw_keys = ch_cases[i]
    keys = [k.strip().replace('"', '') for k in raw_keys.split(',') if k.strip()]
    body = ch_cases[i+1]
    for k in keys:
        backend_scripts[k] = body

# Parse incidents
if 'func (r *Runner) buildIncidentRunScript' in r_incidents:
    inc_part = r_incidents.split('func (r *Runner) buildIncidentRunScript')[1].split('func (r *Runner) buildIncidentVerificationScript')[0]
    inc_cases = re.split(r'case\s+([^:]+):', inc_part)
    for i in range(1, len(inc_cases), 2):
        raw_keys = inc_cases[i]
        keys = [k.strip().replace('"', '') for k in raw_keys.split(',') if k.strip()]
        body = inc_cases[i+1]
        for k in keys:
            backend_scripts[k] = body

# Analyze each backend script
backend_test_results = {}
for lid, body in backend_scripts.items():
    # If it delegates (e.g. return r.buildInventoryRunScript())
    if 'buildInventoryRunScript' in body:
        inv_idx = r_chapters.find('func (r *Runner) buildInventoryRunScript()')
        if inv_idx != -1:
            body = r_chapters[inv_idx:inv_idx+2000]

    all_res_m = re.search(r'AllResults\s*=\s*\[(.*?)\]', body, re.DOTALL)
    if all_res_m:
        res_vars = [v.strip() for v in all_res_m.group(1).split(',') if v.strip()]
    else:
        res_vars = list(dict.fromkeys(re.findall(r'(T\d+_Res)\s*=', body)))

    # For each result var, find its call_str and expected
    tests = []
    for var in res_vars:
        # find the block defining var
        var_pos = body.find(var + ' =')
        if var_pos != -1:
            # slice next 1200 chars
            slice_code = body[var_pos:var_pos+1200]
            call_m = re.search(r'call_str\s*=>\s*<<"([^"]+)">>', slice_code)
            exp_m = re.search(r'expected\s*=>\s*<<"([^"]+)">>', slice_code)
            call_val = call_m.group(1) if call_m else "(dynamic call)"
            exp_val = exp_m.group(1) if exp_m else "(dynamic exp)"
            tests.append({
                'var': var,
                'call_str': call_val,
                'expected': exp_val
            })
        else:
            tests.append({
                'var': var,
                'call_str': "(unknown)",
                'expected': "(unknown)"
            })
    backend_test_results[lid] = tests

# 2. Parse Frontend Lessons
frontend_lessons = []

for ch_idx in range(1, 13):
    ch_file = f"ch{ch_idx:02d}.ts"
    ch_path = os.path.join(chapters_dir, ch_file)
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
        l_text = content[start:end]

        title_m = re.search(r"title:\s*['\"]([^'\"]+)['\"]", l_text)
        title = title_m.group(1) if title_m else lid

        # extract visibleTestCases
        vtc_pos = l_text.find('visibleTestCases:')
        vtests = []
        if vtc_pos != -1:
            b_open = l_text.find('[', vtc_pos)
            if b_open != -1:
                depth = 1
                curr = b_open + 1
                while curr < len(l_text) and depth > 0:
                    if l_text[curr] == '[': depth += 1
                    elif l_text[curr] == ']': depth -= 1
                    curr += 1
                vtc_slice = l_text[b_open:curr]

                # Match each test object: { id, title/name, erlangCall, expectedOutput }
                # Regex for object inside array
                objs = re.split(r'\{\s*id:', vtc_slice)
                for obj in objs[1:]:
                    call_m = re.search(r"erlangCall:\s*['\"`]([\s\S]*?)['\"`]\s*,", obj)
                    exp_m = re.search(r"expectedOutput:\s*['\"`]([\s\S]*?)['\"`]", obj)
                    id_m = re.search(r"^\s*['\"]([^'\"]+)['\"]", obj)
                    
                    if call_m and exp_m:
                        vtests.append({
                            'id': id_m.group(1) if id_m else f"tc_{len(vtests)+1}",
                            'call': call_m.group(1).strip(),
                            'expected': exp_m.group(1).strip()
                        })

        frontend_lessons.append({
            'chapter': f"Chapter {ch_idx}",
            'ch_file': ch_file,
            'id': lid,
            'title': title,
            'visible_tests': vtests,
            'count': len(vtests)
        })

print(f"Total Frontend Lessons: {len(frontend_lessons)}")
print(f"Total Backend Script Entries: {len(backend_test_results)}")

# 3. Simulate Frontend Matching Logic from LessonSplitView.tsx:
# matchedTest = runResult?.visibleTests?.find(
#   (t) => t.callStr.trim() === tc.erlangCall.trim() || t.expected.trim() === tc.expectedOutput.trim()
# ) || (runResult?.visibleTests ? runResult.visibleTests[idx] : undefined);

results = []

for fl in frontend_lessons:
    lid = fl['id']
    be_tests = backend_test_results.get(lid, None)
    
    fe_tests = fl['visible_tests']
    fe_count = len(fe_tests)
    
    if be_tests is None:
        # Check if it's in core fallback (erl_runner.go)
        if lid in ["ch02-l08", "ch02-l06", "inventory"]:
            be_tests = backend_test_results.get("ch02-l08", [])
        else:
            status = "NO_BACKEND_RUN_SCRIPT"
            results.append({
                'lesson': fl,
                'status': status,
                'be_count': 0,
                'matched': 0,
                'orphaned_fe_tests': fe_tests,
                'extra_be_tests': []
            })
            continue

    be_count = len(be_tests)
    
    matched_count = 0
    orphaned = []
    
    for idx, tc in enumerate(fe_tests):
        # find matching in be_tests
        match = None
        for b in be_tests:
            if b['call_str'].strip() == tc['call'].strip() or b['expected'].strip() == tc['expected'].strip():
                match = b
                break
        if not match and idx < len(be_tests):
            # fallback index match
            match = be_tests[idx]
        
        if match:
            matched_count += 1
        else:
            orphaned.append(tc)
            
    extra_be = []
    if be_count > fe_count:
        extra_be = be_tests[fe_count:]

    if fe_count == 0:
        status = "ZERO_FE_TESTS"
    elif len(orphaned) > 0:
        status = "HAS_ORPHANED_TESTS"
    elif fe_count == be_count:
        status = "PERFECT_MATCH"
    else:
        status = "COUNT_MISMATCH_EXTRA_BE"
        
    results.append({
        'lesson': fl,
        'status': status,
        'be_count': be_count,
        'matched': matched_count,
        'orphaned_fe_tests': orphaned,
        'extra_be_tests': extra_be
    })

# Summary
by_status = {}
for r in results:
    s = r['status']
    by_status[s] = by_status.get(s, 0) + 1

print("\n" + "="*80)
print("COMPREHENSIVE RUN TEST STATUS BREAKDOWN")
print("="*80)
for s, c in sorted(by_status.items()):
    print(f"  {s:<30}: {c} lessons")

print("\n" + "="*80)
print("DETAILED REPORT BY LESSON")
print("="*80)

for r in results:
    fl = r['lesson']
    s = r['status']
    lid = fl['id']
    title = fl['title']
    fe_c = fl['count']
    be_c = r['be_count']
    
    if s == "PERFECT_MATCH":
        print(f"✓ [OK]   {lid:<12} | FE:{fe_c} == BE:{be_c} | {title}")
    elif s == "ZERO_FE_TESTS":
        print(f"? [ZERO] {lid:<12} | FE:0 (No tests in TypeScript) | {title}")
    elif s == "NO_BACKEND_RUN_SCRIPT":
        print(f"✗ [MISS] {lid:<12} | FE:{fe_c} tests, BE has NO RUN CASE (Returns empty []) | {title}")
    elif s == "HAS_ORPHANED_TESTS":
        print(f"⚠ [ORPH] {lid:<12} | FE:{fe_c} tests vs BE:{be_c} tests! ({len(r['orphaned_fe_tests'])} cards NEVER evaluated) | {title}")
        for ot in r['orphaned_fe_tests']:
            print(f"         Orphaned: {ot['call']}")
    elif s == "COUNT_MISMATCH_EXTRA_BE":
        print(f"+ [XTRA] {lid:<12} | FE:{fe_c} vs BE:{be_c} (BE returns {len(r['extra_be_tests'])} extra unmapped tests) | {title}")

