# Root Plugin

Commands for managing multiple repositories from a root workspace.

## Commands

### Git Operations

**`/root:git:update_repos_list`**
Update the list of managed repositories in the root configuration.

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

### Runner Scripts

**`/root:runner:prepare_runner_script`**
Prepare PowerShell runner scripts for opening projects in IDEs (WebStorm/IntelliJ).

## Usage

All commands are prefixed with `/root:` followed by the namespace and command name.

Example:
```
/root:health:inspect_repos_health
```

## Requirements

- Claude Code
- PowerShell (for runner scripts)
- Git (for git operations)
