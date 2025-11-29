# Templates Directory

This directory contains **copy-paste template files** for creating new configuration files. These are actual files you instantiate, not specifications.

## Available Templates

### project-claude.md

Template for creating a new project-level CLAUDE.md file.

**Purpose**: Starting point for project-specific Claude Code configuration with PROJECT_META block.

**Installation**:
```bash
# Use the update command from workspace root:
/root:root_claude:update_project_level_claude_md
```

**What to fill in**:
- Linting configuration (yes/no/planned)
- Package manager (yarn/npm/pnpm)
- Framework and build system
- Project-specific sections

### root_claude.md

Common Claude Code instructions for all managed repositories.

**Purpose**: Provides shared instructions, conventions, and guidelines that apply across all projects managed by the root commander.

**Installation**:
```bash
# Use the update command from workspace root:
/root:root_claude:update_root_claude_md
```

**How it works**:
- Claude Code searches parent directories for CLAUDE.md files
- All managed repos will automatically read this file
- Each repo can still have its own local CLAUDE.md for project-specific rules

**Maintenance**:
1. Edit `root_claude.md` here (source of truth, version controlled)
2. Run `/root:root_claude:update_root_claude_md` to deploy updates
3. The deployed `CLAUDE.md` at workspace root is a processed copy

## Template vs Specification

**Template** (this directory):
- Actual file to copy and fill in
- Contains placeholders like `[FILL: ...]` or `///INSTRUCTION LINE`
- Ready to instantiate
- Example: `project-claude.md` → copy to `<project>/CLAUDE.md`

## Template Guidelines

- Templates are the **source of truth** - keep them in version control
- Actual deployed files (like workspace root `CLAUDE.md`) are copies
- Use update commands to deploy templates
- Keep templates clean and ready to copy without modification
- Use `[FILL: ...]` placeholders for user-provided values
- Use `///INSTRUCTION LINE` for lines that should be removed during processing
