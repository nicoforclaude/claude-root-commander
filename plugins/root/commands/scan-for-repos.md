Scan for Git repositories in the workspace and update `repos.json`.

## Steps

1. Find all directories containing `.git` folders
2. Collect relative paths from workspace root
3. Write results to plugin state directory (see State Location below)
4. Report: show full path to `repos.json` written

## Output

Updates `repos.json` with discovered repositories.

---

<!-- inlined from docs/plugin-state.md#state-location -->
## State Location

Plugin state is stored globally in the Claude plugins data directory:

```
{CLAUDE_PLUGINS_ROOT}/nicoforclaude/root/
```

<!-- inlined from nicoforclaude/claude-pdf-printing/.../installation.md#prerequisites -->
**Required:** `CLAUDE_PLUGINS_ROOT` quasi-variable defined in workspace root CLAUDE.md

**Important:** These are **quasi-variables** (defined in CLAUDE.md text), NOT environment variables. Read them from the workspace root CLAUDE.md file.

Expected definition:
```
CLAUDE_MAIN_WORKSPACE_ROOT = 'C:\SomeUserRepositories'
CLAUDE_PLUGINS_ROOT = CLAUDE_MAIN_WORKSPACE_ROOT + '\.localData\claude-plugins'
```

**If undefined:** Escalate to user and STOP - cannot proceed.
<!-- end inlined -->
<!-- end inlined -->

<!-- inlined from docs/plugin-state.md#repos.json -->
## repos.json Schema

**Location:** `{plugin-state-dir}/repos.json`

**Structure:**
```json
{
  "version": "1.0.0",
  "updatedAt": "2025-11-27",
  "repositories": [
    { "path": "nicoforclaude/claude-root-commander" },
    { "path": "nicoforclaude/claude-pdf-printing" }
  ]
}
```
<!-- end inlined -->
