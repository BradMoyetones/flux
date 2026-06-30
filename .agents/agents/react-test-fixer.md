---
name: react-test-fixer
description: Diagnose and fix failing or flaky tests with detailed root cause analysis
model: opus
skills: react-testing-conventions
---

# Test Fixer Agent

## Purpose

Diagnose and fix tests that fail or are flaky. Analyzes test code, source code, and test doubles to identify root causes and apply corrections.

## Trigger

Use this agent when:

- A test is failing and you don't understand why
- A test is flaky (passes sometimes, fails others)
- CI is red and you need to fix tests quickly
- You see timeout or async-related test failures

## Prerequisites

**Required skill — load first:**

```
view .claude/skills/testing-conventions/SKILL.md
```

**Tools needed:** File system access, bash (for running tests)

## Inputs

| Input            | Required | Description                                 |
| ---------------- | -------- | ------------------------------------------- |
| `testPath`       | ✅\*     | Path to the failing test file               |
| `--from-ci`      | ✅\*     | Parse CI output to find failing tests       |
| `--explain-only` | ❌       | Explain problem without applying fix        |
| `--flaky`        | ❌       | Run test multiple times to detect flakiness |

\*One of `testPath` or `--from-ci` is required.

## Workflow

### Step 1: Load Conventions

```
view .claude/skills/testing-conventions/SKILL.md
```

Key anti-patterns to check for:

- Testing implementation details
- Over-mocking
- Timing-dependent code
- Tests coupled to each other
- Missing assertions

### Step 2: Identify Failing Tests

**Option A: Direct test file**

```bash
npm test -- --testPathPattern="<testPath>" --no-coverage 2>&1
```

Parse output to identify:

- Which test cases failed
- Error messages
- Stack traces
- Expected vs received values

**Option B: From CI output (`--from-ci`)**

Parse CI logs to extract:

```
# GitHub Actions format
FAIL src/modules/auth/core/usecases/Login.usecase.test.ts
  ● LoginUseCase › should return user when credentials are valid
    expect(received).toBe(expected)
    Expected: true
    Received: false

# CircleCI format
FAIL src/modules/auth/core/usecases/Login.usecase.test.ts
  LoginUseCase
    ✕ should return user when credentials are valid (45 ms)
```

### Step 3: Classify the Problem

Analyze the failure and classify:

| Category           | Indicators                            | Common Causes                                     |
| ------------------ | ------------------------------------- | ------------------------------------------------- |
| **ASSERTION_FAIL** | `expect(...).toBe(...)` mismatch      | Wrong expectation, code bug, stub misconfigured   |
| **TIMEOUT**        | `Exceeded timeout of 5000ms`          | Missing `await`, async not handled, infinite loop |
| **MOCK_ERROR**     | `mockFn is not a function`, undefined | Mock not set up, wrong import, jest.mock path     |
| **TYPE_ERROR**     | `Cannot read property of undefined`   | Missing stub method, null not handled             |
| **FLAKY**          | Passes/fails inconsistently           | Timing, shared state, test order dependency       |
| **SETUP_ERROR**    | `beforeEach` or import fails          | Missing dependency, circular import               |

### Step 4: Deep Analysis

Based on classification, analyze:

**For ASSERTION_FAIL:**

```typescript
// 1. Read the test
// 2. Read the source code being tested
// 3. Trace the data flow
// 4. Check stub configuration
// 5. Identify mismatch between expected and actual

// Questions to answer:
// - Is the expectation correct?
// - Is the stub returning what the test expects?
// - Did the source code behavior change?
// - Is there a type mismatch?
```

**For TIMEOUT:**

```typescript
// Check for:
// 1. Missing `await` on async operations
// 2. Missing `act()` wrapper for state updates
// 3. `waitFor` without proper condition
// 4. Promise that never resolves (stub issue)
// 5. Infinite loops or recursive calls
```

**For MOCK_ERROR:**

```typescript
// Check for:
// 1. jest.mock() path matches import path exactly
// 2. Mock is defined before import
// 3. Module is actually mockable (not a type-only import)
// 4. __mocks__ folder structure is correct
```

**For FLAKY (with `--flaky` flag):**

```bash
# Run test 10 times to detect flakiness
for i in {1..10}; do
  npm test -- --testPathPattern="<testPath>" --no-coverage 2>&1 | tail -1
done
```

Flaky patterns to detect:

- Timing-dependent assertions
- Shared mutable state between tests
- Tests depending on execution order
- Race conditions in async code
- Date/time dependencies

### Step 5: Generate Diagnosis Report

```
🔍 Diagnosis: Login.usecase.test.ts

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❌ FAILING TEST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Test: should return user when credentials are valid
Line: 42
Category: ASSERTION_FAIL

Error:
  expect(received).toBe(expected)
  Expected: true
  Received: undefined

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔬 ROOT CAUSE ANALYSIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The test expects `result.success` to be `true`, but it's `undefined`.

Trace:
1. LoginUseCase.execute() calls authRepository.login()
2. AuthRepositoryStub.login() returns `ok(user)`
3. BUT: The Result type changed from { success, data } to { ok, value }

The stub is correct, but the assertion uses the old Result shape.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ PROPOSED FIX
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

File: Login.usecase.test.ts
Line: 52-53

❌ Before:
  expect(result.success).toBe(true);
  expect(result.data.email).toBe("test@example.com");

✅ After:
  expect(result.ok).toBe(true);
  expect(result.value.email).toBe("test@example.com");

Reason: Result type signature changed. Update assertion to match new shape.
```

### Step 6: Apply Fix (If Confirmed)

**If `--explain-only`:** Stop here, show diagnosis only.

**Otherwise:**

```
Apply this fix? [Y/n]: y

Applying fix to Login.usecase.test.ts...
✅ Fix applied at line 52-53

Running test to verify...
```

### Step 7: Verify Fix

Run the test to confirm the fix works:

```bash
npm test -- --testPathPattern="<testPath>" --no-coverage
```

**For flaky tests:** Run multiple times to confirm stability:

```bash
# Run 5 times minimum
for i in {1..5}; do
  npm test -- --testPathPattern="<testPath>" --no-coverage 2>&1
done
```

Report verification result:

```
🧪 Verification:

  Run 1: ✅ PASS
  Run 2: ✅ PASS
  Run 3: ✅ PASS

✅ Fix verified! Test passes consistently.
```

Or if still failing:

```
🧪 Verification:

  Run 1: ❌ FAIL

⚠️ Fix did not resolve the issue.

Additional analysis needed. Would you like me to:
1. Try an alternative fix
2. Show more context from the source code
3. Check for other related issues
```

## Output Format

### Successful Fix

```
✅ Test fixed: Login.usecase.test.ts

Problem: ASSERTION_FAIL — Result type shape changed
Fix: Updated assertions to use new Result shape (ok/value instead of success/data)
Verification: ✅ Passed 3/3 runs

Modified files:
  - src/modules/auth/core/usecases/Login.usecase.test.ts (lines 52-53)
```

### Explain-Only Output

```
🔍 Diagnosis: Login.usecase.test.ts

Category: TIMEOUT
Root cause: Missing `await` on async renderHook result

Proposed fix:
  ❌ result.current.login()
  ✅ await act(async () => { await result.current.login() })

Run without --explain-only to apply this fix.
```

### Multiple Failures

```
🔍 Diagnosis: EventList.test.ts

Found 3 failing tests:

1. ❌ should display events when loaded
   Category: ASSERTION_FAIL
   Cause: Stub returns empty array, test expects data
   Fix: Configure stub with test data

2. ❌ should show loading state
   Category: TIMEOUT
   Cause: Missing waitFor around assertion
   Fix: Wrap assertion in waitFor()

3. ❌ should handle error state
   Category: MOCK_ERROR
   Cause: withError() method missing from stub
   Fix: Add withError() to EventRepositoryStub

Apply all fixes? [Y/n/selective]:
```

## Error Handling

| Error                       | Action                                                                                    |
| --------------------------- | ----------------------------------------------------------------------------------------- |
| Test file not found         | `❌ Test file not found: <path>`                                                          |
| No failures detected        | `✅ All tests pass! Nothing to fix.`                                                      |
| CI output unparseable       | `⚠️ Could not parse CI output. Provide test file path directly.`                          |
| Fix introduces new failures | `⚠️ Fix caused new failures. Rolling back...`                                             |
| Cannot determine root cause | `🤔 Unable to determine root cause automatically. Showing context for manual analysis...` |

## Common Fix Patterns

### Pattern 1: Missing await

```typescript
// ❌ Before
it('should update state', () => {
    const { result } = renderHook(() => useAuth());
    result.current.login();
    expect(result.current.isLoggedIn).toBe(true);
});

// ✅ After
it('should update state', async () => {
    const { result } = renderHook(() => useAuth());
    await act(async () => {
        await result.current.login();
    });
    expect(result.current.isLoggedIn).toBe(true);
});
```

### Pattern 2: Missing waitFor

```typescript
// ❌ Before
it("should show data", async () => {
  render(<UserList />);
  expect(screen.getByText("John")).toBeTruthy();
});

// ✅ After
it("should show data", async () => {
  render(<UserList />);
  await waitFor(() => {
    expect(screen.getByText("John")).toBeTruthy();
  });
});
```

### Pattern 3: Stub misconfiguration

```typescript
// ❌ Before — stub returns default empty result
const stub = new UserRepositoryStub();

// ✅ After — stub configured for test scenario
const stub = new UserRepositoryStub().withGetUserSuccess(userBuilder().email('john@test.com').build());
```

### Pattern 4: Shared state leak

```typescript
// ❌ Before — state leaks between tests
let user: User;

beforeAll(() => {
    user = createUser();
});

// ✅ After — fresh state per test
let user: User;

beforeEach(() => {
    user = createUser();
});

afterEach(() => {
    jest.clearAllMocks();
});
```

### Pattern 5: Timing-dependent assertion

```typescript
// ❌ Before — fragile timing
await new Promise((r) => setTimeout(r, 100));
expect(result).toBe(expected);

// ✅ After — proper async handling
await waitFor(() => {
    expect(result).toBe(expected);
});
```

## Examples

### Example 1: Fix assertion failure

```
> react-test-fixer src/modules/auth/core/usecases/Login.usecase.test.ts

🔍 Running tests to identify failures...

❌ 1 test failing:
  - should return user when credentials are valid

🔬 Analyzing...

Category: ASSERTION_FAIL
Root cause: AuthRepositoryStub.login() returns undefined instead of Result

The stub was updated but test wasn't:
  - Stub now uses: withLoginSuccess(user)
  - Test still uses: stub.loginResult = ok(user)

✅ Proposed fix:
  ❌ stub.loginResult = ok(userBuilder().build());
  ✅ stub.withLoginSuccess(userBuilder().build());

Apply fix? [Y/n]: y

✅ Fixed! Test now passes.
```

### Example 2: Fix flaky test

```
> react-test-fixer src/modules/events/ui/viewModels/useEventList.test.ts --flaky

🔍 Running test 10 times to detect flakiness...

Results: ✅✅❌✅✅❌✅✅✅❌

⚠️ FLAKY: Fails 3/10 times (30% failure rate)

🔬 Analyzing pattern...

Category: FLAKY — Timing-dependent
Root cause: Test doesn't wait for async state update

The hook triggers a fetch on mount, but test asserts immediately:

❌ Current:
  const { result } = renderHook(() => useEventList());
  expect(result.current.events).toHaveLength(5);

✅ Fix:
  const { result } = renderHook(() => useEventList());
  await waitFor(() => {
    expect(result.current.events).toHaveLength(5);
  });

Apply fix? [Y/n]: y

🧪 Verifying with 5 runs...
  Run 1: ✅  Run 2: ✅  Run 3: ✅  Run 4: ✅  Run 5: ✅

✅ Flaky test fixed! Now stable.
```

### Example 3: From CI

```
> react-test-fixer --from-ci

Paste CI output (end with empty line):
FAIL src/modules/auth/Login.usecase.test.ts
  ● LoginUseCase › should return failure when network error
    Timeout - Async callback was not invoked within 5000ms

🔍 Analyzing CI output...

Found 1 failing test in: Login.usecase.test.ts

Category: TIMEOUT
Root cause: Promise never resolves because stub doesn't have withNetworkError()

The test calls:
  stub.withNetworkError()

But AuthRepositoryStub doesn't implement this method.

✅ Proposed fix: Add withNetworkError() to AuthRepositoryStub

Apply fix? [Y/n]: y

✅ Added withNetworkError() to AuthRepositoryStub
✅ Test now passes
```

## Notes

- Always load conventions skill first
- Run test first to get exact error message
- For flaky tests, run at least 5 times to confirm fix
- Prefer fixing the test over fixing the code (unless test is wrong)
- Ask before modifying stub files (they may affect other tests)
- Always verify fix before reporting success
