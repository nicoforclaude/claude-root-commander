# Plugin State Management

This document describes how the root plugin stores and manages persistent state.

## State Location

Plugin state is stored globally in the Claude plugins data directory:

```
{CLAUDE_PLUGINS_ROOT}/{marketplace}/{plugin-name}/
```

Example for this plugin:
```
C:\SomeUsersRepositories\.localData\claude-plugins\nicoforclaude\root\
```

This pattern follows the convention established by `claude-pdf-printing` plugin.

## State Files

### repos.json

**Location:** `{plugin-state-dir}/repos.json`

**Updated by:** `/root:git:scan-for-repos` command

**Purpose:** Maintains list of Git repositories discovered in the workspace.

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

### runner-config.json

**Location:** `{plugin-state-dir}/runner-config.json`

**Updated by:** User configuration / runner commands

**Purpose:** Repository selector configuration with IDE mappings and workspace hierarchy.

**Structure:**
```json
{
  "version": "1.0.0",
  "modes": [],
  "ides": [
    { "name": "WebStorm", "path": "/path/to/webstorm" },
    { "name": "IntelliJ", "path": "/path/to/intellij" }
  ],
  "entries": [
    {
      "type": "workspace",
      "path": ".",
      "name": "Root",
      "behaviour": "open",
      "children": []
    },
    {
      "type": "workspace",
      "path": "org/projects",
      "behaviour": "hoist",
      "openableAsRoot": false,
      "children": [
        { "type": "repo", "path": "org/projects/app", "ide": "WebStorm" }
      ]
    }
  ],
  "unmentioned": []
}
```

**Entry types:**
- `workspace` - Container that may have children
- `repo` - Git repository, openable in IDE

**Behaviours:**
- `open` - Show in main list, openable directly
- `hoist` - Show children in main list, not the entry itself
- `hidden` - User excluded from main list

**Relationship with repos.json:** `repos.json` contains scan results (all discovered repos). `runner-config.json` contains user-curated configuration for how repos appear in the selector.