Setup or migrate the Claude Root Launcher.

## Purpose

Guide users through launcher setup, including:
- Auto-detection of workspace root (no pre-configuration needed)
- Migration from existing launcher scripts (PowerShell/batch)
- First-time configuration
- IDE preference setup
- Troubleshooting

## Launcher Location

The launcher is a Node.js script at:
```
plugins/root/launcher/launcher.js
```

Run it with: `node launcher.js --workspace-root <path> --state-dir <path>`

## Steps

### 0. Prerequisites - Detect Workspace Root

**Goal:** Determine workspace root and plugin data location without requiring pre-configured quasi-variables.

#### If CLAUDE_PLUGINS_ROOT is available in context:
- Use it directly: `{CLAUDE_PLUGINS_ROOT}/nicoforclaude/root/`
- Skip to Step 1

#### Auto-detection mode (when quasi-var not available):

1. **Collect candidates** - Walk up directories from cwd to root

2. **Filter unreasonable paths** - Exclude:
   - Drive roots (`C:\`, `D:\`, `/`)
   - User home directory (check `$HOME`, `$USERPROFILE`, or `~`)
   - System directories (`C:\Windows`, `C:\Program Files`, `/usr`, `/etc`)
   - Paths with only 1-2 segments from root

3. **Score remaining candidates:**

   | Signal | Score | Check |
   |--------|-------|-------|
   | Has `.claude` folder | +3 | `Test-Path "<path>/.claude"` or `ls` |
   | Has `CLAUDE.md` file | +2 | `Test-Path "<path>/CLAUDE.md"` |
   | Contains multiple repos | +2 | Count `.git` folders in children (2+ levels) |
   | Has `.localData` folder | +1 | `Test-Path "<path>/.localData"` |
   | Is repo root itself | -1 | Has `.git` directly |

4. **Present top candidate to user:**
   ```
   Detected workspace root: <path>
   Signals found:
     - .claude folder ✓
     - CLAUDE.md ✓
     - Contains N repositories ✓

   Plugin data will be stored at:
     <path>/.localData/claude-plugins/nicoforclaude/root/

   Is this correct?
   ```

5. **Ask user to confirm** using AskUserQuestion:
   - Options: "Yes, use this", "Let me specify a different path"
   - If user chooses different, ask for the path

6. **Set working variables for remaining steps:**
   - `WORKSPACE_ROOT` = confirmed path
   - `STATE_DIR` = `{WORKSPACE_ROOT}/.localData/claude-plugins/nicoforclaude/root/`

### 1. Check Current State

Check if launcher config exists at:
```
{STATE_DIR}/runner-config.json
```

Report:
- If config exists: show entry count, detected IDEs
- If no config: will create during setup

### 2. Scan for Repositories

Run the scan-for-repos command to ensure repos.json is up to date:
- Read repos.json
- Report how many repos are discovered

### 3. Migration Check

Ask user: "Do you have an existing launcher script to migrate? Provide the path, or type 'no'"

If user provides a path:
1. Read the script (PowerShell .ps1 or batch .bat/.cmd)
2. Extract:
   - Repository paths and names
   - IDE preferences per repo
   - Menu structure/ordering
3. Generate runner-config.json with migrated settings
4. Report what was migrated

### 4. IDE Detection

Check these paths for IDE shortcuts:
- `C:\ProgramData\Microsoft\Windows\Start Menu\Programs\JetBrains` (WebStorm, IntelliJ)
- `C:\ProgramData\Microsoft\Windows\Start Menu\Programs\Visual Studio Code`
- `C:\ProgramData\Microsoft\Windows\Start Menu\Programs\Eclipse`

Report detected IDEs and ask user to confirm preferences.

### 5. Generate Config

If no existing config, create runner-config.json with:
- Detected IDEs
- Repos from repos.json
- Default settings

### 6. Final Report

Show:
- Workspace root: `{WORKSPACE_ROOT}`
- Config location: `{STATE_DIR}/runner-config.json`
- How to run the launcher:
  ```
  node plugins/root/launcher/launcher.js --workspace-root "{WORKSPACE_ROOT}" --state-dir "{STATE_DIR}"
  ```
- Quick reference of launcher controls

## Config Schema

**runner-config.json:**
```json
{
  "version": "1.0.0",
  "workspaceRoot": "/path/to/workspace",
  "stateDir": "/path/to/workspace/.localData/claude-plugins/nicoforclaude/root",
  "modes": ["Claude", "IDE", "Claude + IDE", "PowerShell"],
  "claudeStartupModes": ["none", "with startup check", "with /commit"],
  "ides": [
    { "name": "WebStorm", "shortcut": "path/to/shortcut.lnk" }
  ],
  "entries": [
    { "type": "workspace", "path": ".", "name": "Root", "ide": "WebStorm" },
    { "type": "repo", "path": "org/project", "name": "My Project", "ide": "IntelliJ" }
  ]
}
```

**Note:** `workspaceRoot` and `stateDir` are auto-detected during setup (Step 0) and stored for future use.

## Troubleshooting

If user reports issues:
1. Check if Node.js is installed: `node --version`
2. Check config file exists and is valid JSON
3. Check repos.json exists
4. Verify IDE shortcuts exist at detected paths
