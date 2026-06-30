---
name: react-test-fix
description: Diagnose and fix failing or flaky tests
arguments:
    - name: path
      description: Path to test file (optional, detects current file if omitted)
      required: false
    - name: options
      description: Options like --from-ci, --explain-only, --flaky
      required: false
---

# /react-test-fix

Diagnose and fix failing or flaky tests using the `react-test-fixer` agent.

## Usage

```
/react-test-fix [path] [options]
```

## Arguments

| Argument  | Required | Description                                             |
| --------- | -------- | ------------------------------------------------------- |
| `path`    | No*      | Path to test file. Required unless `--from-ci` is used. |
| `options` | No       | `--from-ci`, `--explain-only`, `--flaky`                |

## Behavior

### 1. Resolve target file

```
IF --from-ci option provided:
  → Prompt: "Paste CI output (end with empty line):"
  → Parse CI output to find failing test files
ELSE IF path argument provided:
  IF path == "." OR path == "current":
    → Use currently open/discussed file in conversation
  ELSE:
    → Use provided path
ELSE:
  → Check if a test file is currently being discussed
  → If yes: use that file
  → If no: prompt user "Enter test file path:"
```

### 2. Validate file

- File must exist (unless `--from-ci`)
- File must be a test file (`.test.ts` or `.test.tsx`)

### 3. Invoke agent

```
Load and execute agent: .claude/agents/react-test-fixer.md
Pass: resolved path + options
```

## Examples

```bash
# Fix specific test file
/react-test-fix src/modules/auth/Login.usecase.test.ts

# Current file shortcut
/react-test-fix .

# From CI output
/react-test-fix --from-ci

# Explain problem without fixing
/react-test-fix src/modules/auth/useAuth.test.ts --explain-only

# Detect and fix flaky test
/react-test-fix src/modules/events/useEventList.test.ts --flaky

# No argument — will prompt or use current file
/react-test-fix
```

## Options

| Option           | Description                                 |
| ---------------- | ------------------------------------------- |
| `--from-ci`      | Parse CI output to find failing tests       |
| `--explain-only` | Diagnose without applying fix               |
| `--flaky`        | Run test multiple times to detect flakiness |

## Output

On successful fix:

```
✅ Test fixed: <path>

Problem: <category> — <description>
Fix: <what was changed>
Verification: ✅ Passed
```

On explain-only:

```
🔍 Diagnosis: <path>

Category: <ASSERTION_FAIL|TIMEOUT|MOCK_ERROR|FLAKY|...>
Root cause: <explanation>

Proposed fix:
  ❌ <before>
  ✅ <after>

Run without --explain-only to apply.
```

## Errors

| Error            | Message                                                       |
| ---------------- | ------------------------------------------------------------- |
| No file provided | `❌ No test file specified. Usage: /react-test-fix <path>`    |
| File not found   | `❌ File not found: <path>`                                   |
| Not a test file  | `⚠️ This is not a test file. Did you mean /react-test-write?` |
| All tests pass   | `✅ All tests pass! Nothing to fix.`                          |
| Cannot parse CI  | `⚠️ Could not parse CI output. Provide test path directly.`   |
