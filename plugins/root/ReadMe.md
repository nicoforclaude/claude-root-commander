# Root Plugin

Commands for managing multiple repositories from a root workspace.

## Commands

### Git Operations

**`/root:git:scan-for-repos`**
Scan workspace for Git repositories and update `repos.json`.

**`/root:git:print_repos_status`**
Print git status for all managed repositories.

### Health Checks

**`/root:health:inspect_repos_health`**
Inspect Claude Code setup health across all managed repositories.

**`/root:health:inspect_root_health`**
Inspect health of the root Claude setup in the `.claude` directory.

**`/root:health:print_repos_health`**
Print a summary health status report for all repositories.

### CLAUDE.md Management

**`/root:root_claude:update_project_level_claude_md`**
Update project-level CLAUDE.md files from the template with interactive selection.

**`/root:root_claude:update_root_claude_md`**
Update root CLAUDE.md from the template with diff preview.

### Launcher

**`/root:launcher`**
Setup or migrate the Claude Root Launcher. Guides through first-time setup, migration from existing scripts, and IDE configuration.

**Node.js Launcher** (standalone tool)
Interactive menu for selecting repos and opening with Claude/IDEs:
```bash
node plugins/root/launcher/launcher.js
```

Controls: Up/Down to navigate, Tab to switch mode (Claude/IDE/Claude+IDE/PowerShell), `d` to scan git diffs, Enter to select.

## Usage

All commands are prefixed with `/root:` followed by the namespace and command name.

Example:
```
/root:health:inspect_repos_health
```

## Requirements

- Claude Code
- Node.js (for launcher)
- Git (for git operations)

## Known Issues / Future Work

- **Launcher tight coupling**: `launcher.js` is a monolithic 92KB file. Future refactoring opportunity to modularize into smaller components (UI, config, git operations, etc.)
