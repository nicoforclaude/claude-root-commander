Setup or migrate the Claude Root Launcher.

## Purpose

Guide users through launcher setup, including:
- Migration from existing launcher scripts (PowerShell/batch)
- First-time configuration
- IDE preference setup
- Troubleshooting

## Launcher Location

The launcher is a Node.js script at:
```
plugins/root/launcher/launcher.js
```

Run it with: `node launcher.js`

## Steps

### 1. Check Current State

First, check if launcher config exists:

```
{CLAUDE_PLUGINS_ROOT}/nicoforclaude/root/runner-config.json
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
- Config location
- How to run the launcher: `node plugins/root/launcher/launcher.js`
- Quick reference of launcher controls

## Config Schema

**runner-config.json:**
```json
{
  "version": "1.0.0",
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

## Troubleshooting

If user reports issues:
1. Check if Node.js is installed: `node --version`
2. Check config file exists and is valid JSON
3. Check repos.json exists
4. Verify IDE shortcuts exist at detected paths
