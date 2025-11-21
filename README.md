# Claude Root Commander

Root workspace management commands for Claude Code.

## Overview

This plugin provides commands for managing multiple repositories from a root workspace, including git operations, health checks, and CLAUDE.md template management.

## Installation

### Prerequisites
- Claude Code CLI with plugin support
- **Windows users:** [windows-shell](https://github.com/nicoforclaude/claude-windows-shell) plugin for proper shell command handling

### Quick Installation

Install this plugin in your Claude Code environment:

```bash
# From the plugin marketplace (when available)
# Or manually copy to your plugins directory
```

## Commands

### Git Operations (`/root:git:*`)

- `/root:git:update_repos_list` - Update the list of managed repositories
- `/root:git:print_repos_status` - Print git status for all managed repositories

### Health Checks (`/root:health:*`)

- `/root:health:inspect_repos_health` - Inspect Claude Code setup health across all repositories
- `/root:health:inspect_root_health` - Inspect health of root Claude setup
- `/root:health:print_repos_health` - Print health status summary for all repositories

### CLAUDE.md Management (`/root:root_claude:*`)

- `/root:root_claude:update_project_level_claude_md` - Update project-level CLAUDE.md from template
- `/root:root_claude:update_root_claude_md` - Update root CLAUDE.md from template

### Runner Scripts (`/root:runner:*`)

- `/root:runner:prepare_runner_script` - Prepare runner scripts for opening projects in IDEs

## Plugin Structure

```
plugins/root/
├── commands/
│   ├── git/              # Git operations
│   ├── health/           # Health checks
│   ├── root_claude/      # CLAUDE.md management
│   └── runner/           # Runner scripts
└── .claude-plugin/
    └── plugin.json
```

## License

MIT

## Author

Nico
