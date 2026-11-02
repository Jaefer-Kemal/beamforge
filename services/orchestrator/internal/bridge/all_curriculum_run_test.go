package bridge_test

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"testing"
	"time"

	"github.com/beamforge/orchestrator/internal/bridge"
)

type ParsedLesson struct {
	ID           string
	Title        string
	ChapterNum   int
	SolutionCode string
	Files        map[string]string
	VisibleTests []bridge.VisibleTestCaseInput
}

func extractQuotedField(sub, field string) string {
	idx := strings.Index(sub, field)
	if idx == -1 {
		return ""
	}
	rest := strings.TrimSpace(sub[idx+len(field):])
	if len(rest) == 0 {
		return ""
	}
	var delim byte
	startIdx := 0
	for i := 0; i < len(rest); i++ {
		if rest[i] == '\'' || rest[i] == '"' || rest[i] == '`' {
			delim = rest[i]
			startIdx = i + 1
			break
		}
	}
	if delim == 0 {
		return ""
	}
	var b strings.Builder
	for i := startIdx; i < len(rest); i++ {
		if rest[i] == '\\' && i+1 < len(rest) {
			next := rest[i+1]
			if delim == '`' {
				if next == '`' {
					b.WriteByte('`')
					i++
					continue
				}
				b.WriteByte('\\')
				continue
			}
			if next == delim {
				b.WriteByte(delim)
				i++
				continue
			}
			if next == '\\' {
				b.WriteByte('\\')
				i++
				continue
			}
			if next == 'n' {
				b.WriteByte('\n')
				i++
				continue
			}
			if next == 'r' {
				b.WriteByte('\r')
				i++
				continue
			}
			if next == 't' {
				b.WriteByte('\t')
				i++
				continue
			}
			if next == '"' {
				b.WriteByte('"')
				i++
				continue
			}
			if next == '\'' {
				b.WriteByte('\'')
				i++
				continue
			}
			b.WriteByte('\\')
			continue
		}
		if rest[i] == delim {
			return b.String()
		}
		b.WriteByte(rest[i])
	}
	return ""
}

func parseLessonsFromTypeScript(chFilePath string) ([]ParsedLesson, error) {
	contentBytes, err := os.ReadFile(chFilePath)
	if err != nil {
		return nil, err
	}
	content := string(contentBytes)

	// Regex to find each lesson block: { id: "chXX-..." or id: 'chXX-...'
	idRe := regexp.MustCompile(`\{\s*id:\s*['"](ch\d+-[a-zA-Z0-9_-]+)['"]`)
	matches := idRe.FindAllStringIndex(content, -1)
	if len(matches) == 0 {
		return nil, nil
	}

	var lessons []ParsedLesson
	for i := 0; i < len(matches); i++ {
		start := matches[i][0]
		end := len(content)
		if i+1 < len(matches) {
			end = matches[i+1][0]
		}
		block := content[start:end]

		// Extract ID
		idMatch := idRe.FindStringSubmatch(block)
		if len(idMatch) < 2 {
			continue
		}
		lid := idMatch[1]

		// Extract Title
		title := lid
		titleRe := regexp.MustCompile(`title:\s*['"]([^'"]+)['"]`)
		if tm := titleRe.FindStringSubmatch(block); len(tm) > 1 {
			title = tm[1]
		}

		// Extract files from files: [...] if present
		files := make(map[string]string)
		filesBlockIdx := strings.Index(block, "files:")
		if filesBlockIdx != -1 {
			fSlice := block[filesBlockIdx:]
			if endArr := strings.Index(fSlice, "],"); endArr != -1 {
				fSlice = fSlice[:endArr]
			}
			filePathRe := regexp.MustCompile(`path:\s*['"]([^'"]+)['"]`)
			fileContentRe := regexp.MustCompile(`content:\s*` + "`" + `([\s\S]*?)` + "`")

			pMatches := filePathRe.FindAllStringSubmatchIndex(fSlice, -1)
			cMatches := fileContentRe.FindAllStringSubmatchIndex(fSlice, -1)
			if len(pMatches) == len(cMatches) {
				for k := 0; k < len(pMatches); k++ {
					p := fSlice[pMatches[k][2]:pMatches[k][3]]
					c := fSlice[cMatches[k][2]:cMatches[k][3]]
					files[p] = c
				}
			}
		}

		// Extract solutionFiles if present: { 'src/foo.erl': `...` }
		solFilesIdx := strings.Index(block, "solutionFiles:")
		if solFilesIdx != -1 {
			sfSlice := block[solFilesIdx:]
			if strings.Contains(sfSlice, "CH12_SOLUTION_FILES") {
				if solStart := strings.Index(content, "export const CH12_SOLUTION_FILES"); solStart != -1 {
					sfSlice = content[solStart:]
					if solEnd := strings.Index(sfSlice, "export const CH12_STARTER_FILES"); solEnd != -1 {
						sfSlice = sfSlice[:solEnd]
					}
				}
			}
			sfKeyValRe := regexp.MustCompile(`['"]([^'"]+\.erl)['"]\s*:\s*` + "`" + `([\s\S]*?)` + "`")
			sfMatches := sfKeyValRe.FindAllStringSubmatch(sfSlice, -1)
			for _, match := range sfMatches {
				if len(match) > 2 {
					files[match[1]] = match[2]
				}
			}
		}

		// Extract Solution Code
		solCode := ""
		solRe := regexp.MustCompile(`solutionCode:\s*` + "`" + `([\s\S]*?)` + "`")
		if sm := solRe.FindStringSubmatch(block); len(sm) > 1 {
			solCode = sm[1]
		}

		if solCode != "" {
			// Find module name
			modRe := regexp.MustCompile(`-module\s*\(\s*([a-zA-Z0-9_]+)\s*\)`)
			modName := lid
			if mm := modRe.FindStringSubmatch(solCode); len(mm) > 1 {
				modName = mm[1]
			}
			files[fmt.Sprintf("src/%s.erl", modName)] = solCode
		}

		// Extract visibleTestCases
		var vtests []bridge.VisibleTestCaseInput
		vtcIdx := strings.Index(block, "visibleTestCases:")
		if vtcIdx != -1 {
			vtcSlice := block[vtcIdx:]
			idFieldRe := regexp.MustCompile(`id:\s*['"]([^'"]+)['"]`)
			tcSplitRe := regexp.MustCompile(`(?:^|[\r\n])\s*id:\s*['"]`)
			tcMatches := tcSplitRe.FindAllStringIndex(vtcSlice, -1)
			for j := 0; j < len(tcMatches); j++ {
				start := tcMatches[j][0]
				end := len(vtcSlice)
				if j+1 < len(tcMatches) {
					end = tcMatches[j+1][0]
				}
				sub := vtcSlice[start:end]
				callStr := extractQuotedField(sub, "erlangCall:")
				expStr := extractQuotedField(sub, "expectedOutput:")
				im := idFieldRe.FindStringSubmatch(sub)
				if callStr != "" && expStr != "" {
					tId := fmt.Sprintf("tc-%d", j+1)
					if len(im) > 1 {
						tId = im[1]
					}
					vtests = append(vtests, bridge.VisibleTestCaseInput{
						ID:       tId,
						CallStr:  strings.TrimSpace(callStr),
						Expected: strings.TrimSpace(expStr),
					})
				}
			}
		}

		lessons = append(lessons, ParsedLesson{
			ID:           lid,
			Title:        title,
			SolutionCode: solCode,
			Files:        files,
			VisibleTests: vtests,
		})
	}
	return lessons, nil
}

func TestDynamicVisibleTestsCurriculum(t *testing.T) {
	runner, poolMgr := setupTestRunner(t)

	cwd, _ := os.Getwd()
	// Locate project root
	dir := cwd
	for {
		if _, err := os.Stat(filepath.Join(dir, "apps", "web-ide", "src", "data", "chapters")); err == nil {
			break
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			t.Fatalf("Failed to locate chapters dir from %s", cwd)
		}
		dir = parent
	}
	chaptersDir := filepath.Join(dir, "apps", "web-ide", "src", "data", "chapters")

	// Test Chapters 1 through 12 (or TEST_CHAPTER env)
	targetCh := os.Getenv("TEST_CHAPTER")
	for ch := 1; ch <= 12; ch++ {
		chFileName := fmt.Sprintf("ch%02d.ts", ch)
		if targetCh != "" && targetCh != fmt.Sprintf("%d", ch) && targetCh != fmt.Sprintf("%02d", ch) {
			continue
		}
		chPath := filepath.Join(chaptersDir, chFileName)
		if _, err := os.Stat(chPath); os.IsNotExist(err) {
			continue
		}

		lessons, err := parseLessonsFromTypeScript(chPath)
		if err != nil {
			t.Fatalf("Failed to parse %s: %v", chFileName, err)
		}

		t.Logf("=== CHAPTER %02d (%d lessons) ===", ch, len(lessons))

		for _, lesson := range lessons {
			t.Logf("Lesson %s has %d visible tests, %d files", lesson.ID, len(lesson.VisibleTests), len(lesson.Files))
			if len(lesson.VisibleTests) == 0 {
				continue
			}

			// Test 1: Run with Solution Code (MUST PASS 100%)
			if len(lesson.Files) == 0 {
				continue
			}

			sessID := fmt.Sprintf("test-dyn-%s", lesson.ID)
			session, errClaim := poolMgr.ClaimSession(sessID)
			if errClaim != nil {
				t.Fatalf("[%s] Failed to claim session: %v", lesson.ID, errClaim)
			}

			ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
			runRes, errRun := runner.RunCode(ctx, session, lesson.ID, lesson.Files, nil, lesson.VisibleTests...)
			cancel()
			poolMgr.ReleaseSession(sessID)

			if errRun != nil {
				t.Errorf("[%s] RunCode returned unexpected error: %v", lesson.ID, errRun)
				continue
			}

			if !runRes.CompileOk {
				t.Errorf("[%s] Solution failed to compile:\n%s", lesson.ID, runRes.Stdout)
				continue
			}

			if len(runRes.VisibleTests) != len(lesson.VisibleTests) {
				t.Errorf("[%s] Expected %d test results, got %d", lesson.ID, len(lesson.VisibleTests), len(runRes.VisibleTests))
				continue
			}

			allPassed := true
			for idx, tc := range runRes.VisibleTests {
				if !tc.Passed {
					allPassed = false
					t.Errorf("[%s] Test #%d failed:\n  Call:     %s\n  Expected: %s\n  Actual:   %s",
						lesson.ID, idx+1, tc.CallStr, tc.Expected, tc.Actual)
				}
			}

			if allPassed {
				t.Logf("✓ [PASS] %-12s | %d/%d tests passed | %s",
					lesson.ID, len(runRes.VisibleTests), len(lesson.VisibleTests), lesson.Title)
			}

			// Test 2: Run with Empty Code (MUST FAIL cleanly)
			sessEmptyID := fmt.Sprintf("test-dyn-empty-%s", lesson.ID)
			sessEmpty, errClaimEmpty := poolMgr.ClaimSession(sessEmptyID)
			if errClaimEmpty == nil {
				emptyFiles := make(map[string]string)
				for k := range lesson.Files {
					emptyFiles[k] = "" // empty file
				}
				ctxEmpty, cancelEmpty := context.WithTimeout(context.Background(), 10*time.Second)
				emptyRes, _ := runner.RunCode(ctxEmpty, sessEmpty, lesson.ID, emptyFiles, nil, lesson.VisibleTests...)
				cancelEmpty()
				poolMgr.ReleaseSession(sessEmptyID)

				if emptyRes != nil && emptyRes.CompileOk {
					// If empty file somehow compiled, all tests must fail
					for _, tc := range emptyRes.VisibleTests {
						if tc.Passed {
							t.Errorf("[%s] Empty file unexpectedly PASSED test: %s", lesson.ID, tc.CallStr)
						}
					}
				}
			}
		}
	}
}
