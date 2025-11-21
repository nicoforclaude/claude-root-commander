---
name: root_print_managed_repos_claude_health
description: Check Claude Code setup health across all managed repositories
---

Hello World! This command will check the health of Claude Code setup across all managed repositories.

## What this command will do:

For each managed repository (from `claude_root_commander.md`):
1. Check if `.claude/` directory exists
2. Check if `CLAUDE.md` exists (local and/or hoisted from root)
3. List available agents (local + hoisted)
4. List available commands (local + hoisted)
5. Check for any configuration issues

## Output format:

```
Repository           .claude/  CLAUDE.md  Agents  Commands  Status
------------------------------------------------------------------------
chessarms/tsmain     ✓         Local+Root 5       8         OK
chessarms/calc       ✓         Root only  3       6         OK
.claude (root)       ✓         ✓          8       12        OK
```

---

TODO: Implement the health check logic
