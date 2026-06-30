---
name: react-test-coverage-gap
description: Identify missing test coverage in a module with prioritized recommendations
model: opus
skills: react-testing-conventions
---

# Test Coverage Gap Agent

## Purpose

Scan a module or folder to identify untested code, missing test scenarios, and testing pyramid imbalances. Produces a prioritized report of coverage gaps.

## Trigger

Use this agent when:

- Starting work on a module and want to know test status
- Preparing for a release and need coverage audit
- Onboarding to a codebase and assessing test quality
- After refactoring to check nothing was missed

## Prerequisites

**Required skill — load first:**

```
view .claude/skills/testing-conventions/SKILL.md
```

**Tools needed:** File system access, bash

## Inputs

| Input         | Required | Description                                            |
| ------------- | -------- | ------------------------------------------------------ |
| `modulePath`  | ✅       | Path to module/folder to analyze                       |
| `--high-only` | ❌       | Show only HIGH priority gaps                           |
| `--generate`  | ❌       | Auto-generate tests for gaps (calls react-test-writer) |
| `--json`      | ❌       | Output as JSON for CI integration                      |

## Workflow

### Step 1: Load Conventions

```
view .claude/skills/testing-conventions/SKILL.md
```

Key concepts for gap analysis:

- Testing pyramid (unit > integration > E2E)
- What should be tested per layer
- Test doubles usage

### Step 2: Scan Module Structure

Map all source files in the module:

```bash
find <modulePath> -name "*.ts" -o -name "*.tsx" | grep -v ".test." | grep -v ".stub." | grep -v ".builder." | grep -v "__tests__"
```

Build file inventory:

```typescript
{
    files: [
        {
            path: 'src/modules/events/core/usecases/CreateEvent.usecase.ts',
            type: 'UseCase',
            layer: 'Core',
            hasTest: boolean,
            testPath: string,
        },
        // ...
    ];
}
```

### Step 3: Identify Files Without Tests

For each source file, check if corresponding test exists:

```
Source: CreateEvent.usecase.ts
Expected test: CreateEvent.usecase.test.ts (co-located)
```

Files without ANY test = immediate HIGH priority gap.

### Step 4: Analyze Tested Files for Gaps

For files WITH tests, analyze coverage depth:

**4.1. Parse source file to extract:**

- Public methods/functions
- Branches (if/else, switch, ternary)
- Error handling paths (try/catch, Result failures)
- Edge cases (null checks, empty arrays, boundaries)

**4.2. Parse test file to identify:**

- What behaviors are tested
- What scenarios are covered
- Happy path vs error paths ratio

**4.3. Compute gaps:**

```typescript
{
  file: "CreateEvent.usecase.ts",
  publicMethods: ["execute"],
  testedBehaviors: [
    "should create event when data is valid"
  ],
  missingBehaviors: [
    "should return failure when title is empty",
    "should return failure when date is in past",
    "should return failure when repository fails"
  ]
}
```

### Step 5: Categorize by Priority

**🔴 HIGH Priority — Test immediately:**

- Business logic (UseCases) without any tests
- Error handling not tested
- Security-related code untested
- Data validation untested
- Public API methods untested

**🟡 MEDIUM Priority — Should test soon:**

- Edge cases missing (empty lists, null values, boundaries)
- Some branches not covered
- Integration points partially tested
- State management partially tested

**🟢 LOW Priority — Nice to have:**

- Happy path covered but not exhaustive
- Internal helper functions
- Logging/telemetry code
- Simple pass-through adapters

### Step 6: Analyze Testing Pyramid

Count tests by type and check balance:

```bash
# Count unit tests
find <modulePath> -name "*.test.ts" | wc -l

# Check for integration tests (tests with real adapters)
grep -l "Adapter\|Repository" <modulePath>/**/*.test.ts

# Check for E2E tests
find tests/flows -name "*.yaml" | grep -i "<moduleName>"
```

Ideal pyramid:

```
Unit:        70% ████████████████████░░░░░░░░░
Integration: 20% ██████░░░░░░░░░░░░░░░░░░░░░░░
E2E:         10% ███░░░░░░░░░░░░░░░░░░░░░░░░░░
```

Flag imbalances:

- Too many E2E tests → suggest converting to integration/unit
- No integration tests for adapters → flag missing adapter tests
- Only unit tests → may miss integration issues

### Step 7: Generate Report

```
📊 Coverage Gap Report: src/modules/events

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📁 MODULE SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Files scanned:     12
Files with tests:   8 (67%)
Files without:      4 (33%)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔴 HIGH PRIORITY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. ❌ DeleteEvent.usecase.ts — NO TESTS
   Layer: Core (UseCase)
   Risk: Business logic completely untested
   Action: Create DeleteEvent.usecase.test.ts

2. ❌ CreateEvent.usecase.ts — MISSING ERROR HANDLING TESTS
   Tested: Happy path only
   Missing:
     - should return failure when title is empty
     - should return failure when date is in past
     - should return failure when repository fails
   Action: Add 3 error case tests

3. ❌ EventRepository.adapter.ts — NO TESTS
   Layer: Infrastructure (Adapter)
   Risk: API integration untested
   Action: Create EventRepository.adapter.test.ts

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🟡 MEDIUM PRIORITY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

4. ⚠️ useEventList.viewModel.ts — MISSING EDGE CASES
   Tested: Load success, load error
   Missing:
     - should handle empty event list
     - should handle pagination
   Action: Add 2 edge case tests

5. ⚠️ EventCard.tsx — PARTIAL COVERAGE
   Tested: Renders title
   Missing:
     - should call onPress when tapped
     - should format date correctly
   Action: Add interaction + formatting tests

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🟢 LOW PRIORITY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

6. 💡 Event.entity.ts — BASIC COVERAGE
   Tested: Valid construction
   Optional: Add validation edge cases

7. 💡 formatEventDate.util.ts — HAPPY PATH ONLY
   Tested: Standard date format
   Optional: Test edge cases (null, invalid)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📈 TESTING PYRAMID
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Current distribution:
  Unit:        15 tests (68%) ✅
  Integration:  2 tests (9%)  ⚠️ Below target (20%)
  E2E:          5 tests (23%) ⚠️ Above target (10%)

Recommendations:
  → Add integration tests for EventRepository.adapter
  → Consider converting 2 E2E tests to integration tests
    (faster feedback, same coverage)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 ACTION SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

To reach good coverage:
  1. Create 2 new test files (HIGH)
  2. Add 5 tests to existing files (HIGH + MEDIUM)
  3. Rebalance pyramid (convert E2E → integration)

Estimated effort: ~2 hours

Generate tests automatically? [y/N]:
```

### Step 8: Generate Tests (Optional)

If `--generate` flag is set, call `react-test-writer` for each gap:

```
🔧 Generating tests for HIGH priority gaps...

1/3 DeleteEvent.usecase.ts
    → Calling react-test-writer...
    ✅ Created: DeleteEvent.usecase.test.ts (4 tests)

2/3 CreateEvent.usecase.ts (add error cases)
    → Calling react-test-writer --append...
    ✅ Added: 3 tests to CreateEvent.usecase.test.ts

3/3 EventRepository.adapter.ts
    → Calling react-test-writer...
    ✅ Created: EventRepository.adapter.test.ts (5 tests)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ GENERATION COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Created: 2 new test files
Added:   3 tests to existing files
Total:   12 new tests

Run all tests: npm test -- --testPathPattern="events"
```

## Output Format

### Standard Report

```
📊 Coverage Gap Report: <modulePath>

🔴 HIGH Priority:
  - <file> — <reason>

🟡 MEDIUM Priority:
  - <file> — <reason>

🟢 LOW Priority:
  - <file> — <reason>

📈 Pyramid Balance:
  - Unit: X tests (Y%)
  - Integration: X tests (Y%)
  - E2E: X tests (Y%)
```

### JSON Output (for CI)

```json
{
    "module": "src/modules/events",
    "summary": {
        "filesScanned": 12,
        "filesWithTests": 8,
        "coveragePercent": 67
    },
    "gaps": [
        {
            "priority": "HIGH",
            "file": "DeleteEvent.usecase.ts",
            "type": "NO_TESTS",
            "reason": "Business logic completely untested"
        }
    ],
    "pyramid": {
        "unit": { "count": 15, "percent": 68 },
        "integration": { "count": 2, "percent": 9 },
        "e2e": { "count": 5, "percent": 23 }
    },
    "recommendations": ["Add integration tests for adapters", "Convert E2E tests to integration tests"]
}
```

## Error Handling

| Error                   | Action                                                                    |
| ----------------------- | ------------------------------------------------------------------------- |
| Path not found          | `❌ Module not found: <path>`                                             |
| No source files         | `⚠️ No .ts/.tsx files found in <path>`                                    |
| Cannot parse file       | `⚠️ Could not analyze <file> — syntax error?`                             |
| react-test-writer fails | `⚠️ Could not generate tests for <file>. Run react-test-writer manually.` |

## Examples

### Example 1: Quick audit

```
> react-test-coverage-gap src/modules/events --high-only

📊 Coverage Gap Report: src/modules/events

🔴 HIGH PRIORITY (3 items):

1. ❌ DeleteEvent.usecase.ts — NO TESTS
2. ❌ CreateEvent.usecase.ts — Missing 3 error handling tests
3. ❌ EventRepository.adapter.ts — NO TESTS

Generate tests? [y/N]: n
```

### Example 2: Full audit with generation

```
> react-test-coverage-gap src/modules/auth --generate

📊 Coverage Gap Report: src/modules/auth

[... full report ...]

🔧 Generating tests...

✅ Created: Login.usecase.test.ts (5 tests)
✅ Created: AuthRepository.adapter.test.ts (4 tests)
✅ Added: 2 tests to useAuth.viewModel.test.ts

Total: 11 new tests generated
```

### Example 3: CI integration

```
> react-test-coverage-gap src/modules/events --json > coverage-report.json

# In CI, fail if HIGH priority gaps exist:
if jq '.gaps[] | select(.priority == "HIGH")' coverage-report.json | grep -q .; then
  echo "❌ HIGH priority test gaps found!"
  exit 1
fi
```

## Notes

- Always load conventions skill first
- HIGH priority = must fix before merge/release
- Adapt recommendations to team context
- JSON output enables CI integration
- `--generate` is interactive by default (calls react-test-writer)
- Consider file complexity when estimating effort
