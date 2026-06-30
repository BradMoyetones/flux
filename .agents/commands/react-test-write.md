---
name: react-test-write
description: Generate tests for a source file
arguments:
    - name: path
      description: Path to source file (optional, detects current file if omitted)
      required: false
    - name: options
      description: Options like --dry-run, --all
      required: false
---

# /react-test-write

Generate tests for a source file using the `react-test-writer` agent.

## Usage

```
/react-test-write [path] [options]
```

## Arguments

| Argument  | Required | Description                                                    |
| --------- | -------- | -------------------------------------------------------------- |
| `path`    | No       | Path to source file. If omitted, uses current file or prompts. |
| `options` | No       | `--dry-run`, `--all`, `--interactive` (default)                |

## Behavior

### 1. Resolve target file

```
IF path argument provided:
  IF path == "." OR path == "current":
    → Use currently open/discussed file in conversation
  ELSE:
    → Use provided path
ELSE:
  → Check if a file is currently being discussed in conversation
  → If yes: use that file
  → If no: prompt user "Enter file path:"
```

### 2. Validate file

- File must exist
- File must be `.ts` or `.tsx`
- File must NOT be a test file (`.test.ts`)
- File must NOT be a stub (`.stub.ts`) or builder (`.builder.ts`)

### 3. Invoke agent

```
Load and execute agent: .claude/agents/react-test-writer.md
Pass: resolved path + options
```

## Examples

```bash
# Explicit path
/react-test-write src/modules/auth/Login.usecase.ts

# Current file shortcut
/react-test-write .

# With options
/react-test-write src/modules/auth/Login.usecase.ts --dry-run

# Test all behaviors (no interactive selection)
/react-test-write src/modules/events/CreateEvent.usecase.ts --all

# No argument — will prompt or use current file
/react-test-write
```

## Options

| Option          | Description                                   |
| --------------- | --------------------------------------------- |
| `--dry-run`     | Preview generated tests without creating file |
| `--all`         | Generate tests for all identified behaviors   |
| `--interactive` | Select which behaviors to test (default)      |

## Output

On success:

```
✅ Created: <test-file-path>
   Tests: <count>
   Run: npm test -- <test-file>
```

On dry-run:

```
📄 DRY RUN — Preview:
<test file content>
```

## Errors

| Error                     | Message                                                         |
| ------------------------- | --------------------------------------------------------------- |
| No file provided/detected | `❌ No file specified. Usage: /react-test-write <path>`         |
| File not found            | `❌ File not found: <path>`                                     |
| Already a test file       | `⚠️ This is already a test file. Did you mean /react-test-fix?` |
| Test file exists          | `⚠️ Test file already exists: <path>. Overwrite? [y/N]`         |
