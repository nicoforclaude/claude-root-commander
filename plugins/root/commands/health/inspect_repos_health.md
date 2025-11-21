---
description: Inspect health of Claude setup across root commander and child repositories
---

# Root Commander Setup Health Inspector

Focus area: content of `.claude` directory here, not in child repositories.
For child repositories there is another command.

Scan the `.claude` directory structure across root commander and all managed repositories to identify issues.


## What to Check

### 1. Self-Containment Violations

Read `.claude/README.md` to understand the requirement:
> "Hoisted agent should be self-contained and offload child and main Claude.md from specifics of their work"

Scan all hoisted agents and commands for violations:
- [ ] References to CLAUDE.md
- [ ] Project-specific hardcoded paths
- [ ] Framework assumptions without fallbacks

**Files to scan**:
- `.claude/agents/*.md`
- `.claude/*/commands/*.md`

**Red flags**:
- `CLAUDE.md` text in agents
- Hardcoded paths like `/services/webapp/`, `@chessarms/`
- "This project uses X" without auto-detection

### 2. Duplicate Content (Hoisted but Also in Child)

Read managed repos from `C:\KolyaRepositories\claude_root_commander.md`.

For each hoisted agent/command, check if it still exists in child repos:

**Hoisted agents** (in `.claude/agents/`):
- `git-agent.md`
- `linter-agent.md`
- `sandbox-hoisted-funny-agent.md`

**Hoisted commands** (in `.claude/git/commands/`):
- `git_prepare_commit.md`
- `git_any_pending_changes.md`
- `git_main_catchup.md`

**Check**:
```bash
# For each managed repo:
find <repo>/.claude/agents -name "git-agent.md" 2>/dev/null
find <repo>/.claude/agents -name "linter-agent.md" 2>/dev/null
find <repo>/.claude/commands -name "git_prepare_commit.md" 2>/dev/null
# etc.
```

If found → **ISSUE**: Duplicate content (should only be in root)

### 3. Broken References

Scan for references to files that don't exist:

**In hoisted agents/commands**:
- References to `.claude/git/docs/...` files
- References to other agents by name
- Task tool calls with `subagent_type`

**Check**:
- Extract references: `grep -E "\.claude/|subagent_type" <file>`
- Verify referenced files exist
- Report broken links

**Common patterns to check**:
- `.claude/git/docs/commit-conventions.md`
- `.claude/git/docs/forbidden-files.md`
- `Task(subagent_type: "git-agent")` → verify `.claude/agents/git-agent.md` exists
- `Task(subagent_type: "linter-agent")` → verify `.claude/agents/linter-agent.md` exists

## Output Format

```
═══════════════════════════════════════════════════════════
  CLAUDE ROOT COMMANDER HEALTH INSPECTION
═══════════════════════════════════════════════════════════

Scanning:
  • Root commander: C:\KolyaRepositories\.claude
  • Managed repositories: <count> repos

───────────────────────────────────────────────────────────
1. SELF-CONTAINMENT CHECK
───────────────────────────────────────────────────────────

Hoisted Agents Scanned: 3
  ✓ .claude/agents/git-agent.md
  ✓ .claude/agents/linter-agent.md
  ✓ .claude/agents/sandbox-hoisted-funny-agent.md

Hoisted Commands Scanned: 3
  ✓ .claude/git/commands/git_prepare_commit.md
  ✓ .claude/git/commands/git_any_pending_changes.md
  ✓ .claude/git/commands/git_main_catchup.md

Issues Found: 0

[If issues found:]
❌ VIOLATION: git-agent.md:19
   Contains reference to "CLAUDE.md"
   → Agents should be self-contained

❌ VIOLATION: linter-agent.md:45
   Hardcoded path: "services/webapp/src/"
   → Should auto-detect or be generic

───────────────────────────────────────────────────────────
2. DUPLICATE CONTENT CHECK
───────────────────────────────────────────────────────────

Checking child repos for hoisted content...

Duplicates Found: 0

[If duplicates found:]
❌ DUPLICATE: chessarms/tsmain/.claude/agents/git-agent.md
   → This file is hoisted to root, should be removed from child

❌ DUPLICATE: chessarms/calc/.claude/commands/git_prepare_commit.md
   → This file is hoisted to root, should be removed from child

───────────────────────────────────────────────────────────
3. BROKEN REFERENCES CHECK
───────────────────────────────────────────────────────────

Scanning references in hoisted files...

Broken References: 0

[If broken references found:]
❌ BROKEN: git_prepare_commit.md:37
   References: Task(subagent_type: "missing-agent")
   → File not found: .claude/agents/missing-agent.md

❌ BROKEN: git-agent.md:120
   References: .claude/git/docs/nonexistent.md
   → File does not exist

───────────────────────────────────────────────────────────
SUMMARY
───────────────────────────────────────────────────────────

Overall Health: ✅ HEALTHY / ⚠️ ISSUES FOUND / ❌ CRITICAL

Issues by Category:
  • Self-containment violations: <count>
  • Duplicate content: <count>
  • Broken references: <count>

Total Issues: <count>

[If all good:]
✅ All checks passed!
   - No self-containment violations
   - No duplicate content in child repos
   - No broken references
   - Setup is healthy

[If issues found:]
⚠️ Action Required:
   - Fix self-containment violations in hoisted agents
   - Remove duplicate content from child repos
   - Fix or remove broken references

───────────────────────────────────────────────────────────
```

## Detailed Scan Steps

### Step 1: Load Managed Repos

```bash
# Read managed repos
cat C:\KolyaRepositories\claude_root_commander.md
```

Extract repository paths.

### Step 2: Scan Self-Containment

For each file in `.claude/agents/*.md` and `.claude/*/commands/*.md`:

```bash
# Check for CLAUDE.md references
grep -n "CLAUDE\.md" <file>

# Check for project-specific paths
grep -n -E "services/|@chessarms|shadcn" <file>

# Check for hardcoded assumptions
grep -n "This project uses\|hardcoded\|specific to" <file>
```

### Step 3: Scan for Duplicates

For each hoisted file, check if it exists in child repos:

```bash
# List of hoisted agents
HOISTED_AGENTS=("git-agent.md" "linter-agent.md" "sandbox-hoisted-funny-agent.md")

# List of hoisted commands
HOISTED_COMMANDS=("git_prepare_commit.md" "git_any_pending_changes.md" "git_main_catchup.md")

# For each managed repo
for repo in <managed-repos>; do
  for agent in "${HOISTED_AGENTS[@]}"; do
    if [ -f "$repo/.claude/agents/$agent" ]; then
      echo "DUPLICATE: $repo/.claude/agents/$agent"
    fi
  done

  for cmd in "${HOISTED_COMMANDS[@]}"; do
    if [ -f "$repo/.claude/commands/$cmd" ]; then
      echo "DUPLICATE: $repo/.claude/commands/$cmd"
    fi
  done
done
```

### Step 4: Scan for Broken References

Extract references and verify they exist:

```bash
# Find Task tool references
grep -n "Task(subagent_type:" <file> | while read line; do
  # Extract agent name
  agent=$(echo "$line" | grep -oP 'subagent_type:\s*["'\'']?\K[^"'\'')\s,]+')

  # Check if agent file exists
  if [ ! -f ".claude/agents/$agent.md" ]; then
    echo "BROKEN: Referenced agent '$agent' not found"
  fi
done

# Find .claude/ path references
grep -n "\.claude/" <file> | while read line; do
  # Extract path
  path=$(echo "$line" | grep -oP '\.claude/[^\s"'\'']+')

  # Check if file exists
  if [ ! -f "$path" ]; then
    echo "BROKEN: Referenced file '$path' not found"
  fi
done
```

## Implementation Notes

- Use TodoWrite to track scan progress
- Be thorough but efficient
- Report clearly with file:line references
- Use color indicators (✓ ✅ ⚠️ ❌) for readability
- Group issues by category
- Provide actionable recommendations

## Success Criteria

You succeed when:
- All scans complete without errors
- Clear report of health status
- Specific file:line references for issues
- Actionable recommendations for fixes
- User understands exactly what needs attention

## Related Files

- `.claude/README.md` - Self-containment principle
- `.claude/docs/hoisting-process-guide.md` - Hoisting guidelines
- `C:\KolyaRepositories\claude_root_commander.md` - Managed repos list
