Setup or migrate the Claude Root Launcher.

## Purpose

Guide users through launcher setup with verification at each step.

## Overview

This setup involves **10 steps**. Most steps are quick checks; the full process typically completes in 2-3 minutes.

| Step | Name | What Happens |
|------|------|--------------|
| 1 | Prerequisites | Verify Node.js 18+ and git are installed |
| 2 | Locate launcher.js | Find or recover the launcher script |
| 3 | Detect Workspace Root | Auto-detect or confirm workspace location |
| 4 | Verify State Directory | Ensure config directory is writable |
| 5 | Check Configuration | Review existing config or prepare for creation |
| 6 | Scan Repositories | Discover git repos in workspace |
| 7 | IDE Detection | Find installed IDEs (WebStorm, VS Code, etc.) |
| 8 | Generate Config | Create runner-config.json with settings |
| 9 | Test Launch | Verify launcher works with `--help` |
| 10 | Final Verification | Confirm success, offer to launch |

**Each step has a success metric** - you'll know exactly when each step passes or fails.

---

## Steps

### Step 1: Prerequisites

**Goal:** Verify environment before starting.

Run these checks:

| Check | Command | Success Criteria |
|-------|---------|------------------|
| Node.js | `node --version` | Version 18+ |
| Git | `git --version` | Any version |

**Success metric:** Both commands return version numbers.

**If Node.js fails:**
- Guide user to install from https://nodejs.org/
- Recommend LTS version

---

### Step 2: Locate launcher.js

**Goal:** Find the launcher script or recover it.

**Auto-detection sequence (check in order, stop at first success):**

1. **Check installed_plugins.json:**
   ```
   ~/.claude/plugins/installed_plugins.json
   ```
   - Look for `root@claude-root-commander` entry
   - Get `installPath` field
   - Append `/launcher/launcher.js`

2. **Check CLAUDE_PLUGINS_ROOT** (if available in context):
   ```
   {CLAUDE_PLUGINS_ROOT}/nicoforclaude/root/launcher/launcher.js
   ```

3. **Check marketplace default path:**
   ```
   ~/.claude/plugins/marketplaces/claude-root-commander/plugins/root/launcher/launcher.js
   ```

4. **Check relative to current repo** (dev mode):
   ```
   ./plugins/root/launcher/launcher.js
   ```

5. **GitHub recovery** (last resort):
   ```
   https://raw.githubusercontent.com/nicoforclaude/claude-root-commander/main/plugins/root/launcher/launcher.js
   ```

**Verification:** Run `node --check "{LAUNCHER_PATH}"` to verify syntax.

**Success metric:** File exists and passes syntax check.

**Troubleshooting:**

| Situation | Action |
|-----------|--------|
| Plugin not in installed_plugins.json | Guide: `/plugin install root@claude-root-commander` |
| installPath exists but file missing | Offer to download from GitHub |
| Syntax error in file | Show error, suggest re-download |
| All paths fail | Download from GitHub to STATE_DIR |

**Set variable:** `LAUNCHER_PATH` = found path

---

### Step 3: Detect Workspace Root

**Goal:** Determine workspace root without requiring pre-configured quasi-variables.

#### If CLAUDE_PLUGINS_ROOT is available:
- Use parent directory as workspace root
- Skip to confirmation

#### Auto-detection mode:

1. **Collect candidates** - Walk up directories from cwd to root

2. **Filter unreasonable paths** - Exclude:
   - Drive roots (`C:\`, `D:\`, `/`)
   - User home directory
   - System directories (`C:\Windows`, `C:\Program Files`, `/usr`, `/etc`)
   - Paths with only 1-2 segments from root

3. **Score remaining candidates:**

   | Signal | Score | Check |
   |--------|-------|-------|
   | Has `.claude` folder | +3 | Directory exists |
   | Has `CLAUDE.md` file | +2 | File exists |
   | Contains multiple repos | +2 | Count `.git` in children |
   | Has `.localData` folder | +1 | Directory exists |
   | Is repo root itself | -1 | Has `.git` directly |

4. **Present top candidate:**
   ```
   Detected workspace root: <path>
   Signals found:
     - .claude folder
     - CLAUDE.md
     - Contains N repositories

   Is this correct?
   ```

5. **Ask user to confirm** using AskUserQuestion

**Success metric:** User confirms path OR provides custom path.

**Set variables:**
- `WORKSPACE_ROOT` = confirmed path
- `STATE_DIR` = `{WORKSPACE_ROOT}/.localData/claude-plugins/nicoforclaude/root/`

---

### Step 4: Verify State Directory

**Goal:** Ensure state directory exists and is writable.

**Actions:**
1. Check if `{STATE_DIR}` exists
2. If not, create it (including parent directories)
3. Test write permissions by creating a temp file

**Success metric:** Directory exists with write permissions.

---

### Step 5: Check/Create Configuration

**Goal:** Ensure configuration files exist.

**Check these files in STATE_DIR:**

| File | Purpose | Action if Missing |
|------|---------|-------------------|
| `repos.json` | Repository list | Will be created in Step 5 |
| `runner-config.json` | User preferences | Will be created in Step 6 |
| `cache.json` | Performance cache | Auto-created on first run |

**Report current state:**
- If config exists: show entry count, configured IDEs
- If no config: inform user it will be created

**Success metric:** STATE_DIR accessible, files will be created as needed.

---

### Step 6: Scan for Repositories

**Goal:** Discover git repositories in workspace.

**Actions:**
1. Scan WORKSPACE_ROOT for directories containing `.git`
2. Exclude: `node_modules`, hidden folders, `.localData`
3. Update `repos.json` with discovered repos

**Report:** "Found N repositories"

**Success metric:** At least 1 repository discovered.

**If zero repos found:**
- Verify WORKSPACE_ROOT is correct
- Check if repos exist but are nested too deep

---

### Step 7: IDE Detection

**Goal:** Detect installed IDEs for launcher integration.

**Check these paths (Windows):**
- `C:\ProgramData\Microsoft\Windows\Start Menu\Programs\JetBrains\` (WebStorm, IntelliJ)
- `C:\ProgramData\Microsoft\Windows\Start Menu\Programs\Visual Studio Code\`
- `C:\ProgramData\Microsoft\Windows\Start Menu\Programs\Eclipse\`

**Report detected IDEs and ask user to confirm preferences.**

**Success metric:** At least 1 IDE detected OR user acknowledges no IDE needed.

---

### Step 8: Generate/Update Config

**Goal:** Create runner-config.json with detected settings.

**If no existing config:**
1. Create runner-config.json with:
   - Detected IDEs
   - Repos from repos.json
   - Default modes

**If config exists:**
1. Report current settings
2. Ask if user wants to update

**Success metric:** Valid runner-config.json exists.

---

### Step 9: Test Launch

**Goal:** Verify launcher actually works before finishing.

**Test command:**
```bash
node "{LAUNCHER_PATH}" --workspace-root "{WORKSPACE_ROOT}" --state-dir "{STATE_DIR}" --help
```

**Expected:** Command exits successfully and shows help output.

**Success metric:** Exit code 0, help text displayed.

**If test fails:**
- Show error message
- Check Node.js version compatibility
- Verify all paths are correct
- Offer to re-download launcher.js

---

### Step 10: Final Verification

**Goal:** Confirm setup is complete and user is satisfied.

**Present success summary:**
```
Setup Complete!

Verified:
  [x] Node.js vXX.x
  [x] launcher.js found at: {LAUNCHER_PATH}
  [x] Workspace root: {WORKSPACE_ROOT}
  [x] State directory: {STATE_DIR}
  [x] Configuration created
  [x] N repositories discovered
  [x] IDE(s) detected: WebStorm, IntelliJ
  [x] Test launch successful

To run the launcher:
  node "{LAUNCHER_PATH}" --workspace-root "{WORKSPACE_ROOT}" --state-dir "{STATE_DIR}"
```

**Ask user:** "Would you like to launch it now?"

**Success metric:** User confirms satisfaction OR reports issues to address.

---

## Config Schema

**runner-config.json:**
```json
{
  "version": "1.0.0",
  "modes": ["Claude", "IDE", "Claude + IDE", "PowerShell"],
  "claudeStartupModes": ["none", "with /git:startup", "with /git:commit"],
  "ides": [
    { "name": "WebStorm", "shortcut": "path/to/shortcut.lnk" }
  ],
  "entries": [
    { "type": "workspace", "path": ".", "name": "Root", "ide": "WebStorm" },
    { "type": "repo", "path": "org/project", "name": "My Project", "ide": "IntelliJ" }
  ],
  "unmanagedPaths": []
}
```

---

## Migration from Existing Scripts

If user has an existing launcher script (PowerShell .ps1 or batch .bat/.cmd):

1. Ask for the script path
2. Parse and extract:
   - Repository paths and names
   - IDE preferences per repo
   - Menu structure/ordering
3. Generate runner-config.json with migrated settings
4. Report what was migrated

---

## Troubleshooting Reference

| Issue | Check | Solution |
|-------|-------|----------|
| "node not found" | `node --version` | Install Node.js 18+ from nodejs.org |
| launcher.js not found | Check Step 1 paths | Re-install plugin or download from GitHub |
| Config parse error | Validate JSON syntax | Delete and re-create runner-config.json |
| No repos found | Check WORKSPACE_ROOT | Verify path contains git repositories |
| IDE not detected | Check Start Menu paths | Add IDE shortcut path manually |
| Test launch fails | Check error message | Verify Node.js version, file permissions |

---

## Quick Reference

**GitHub repository:**
```
https://github.com/nicoforclaude/claude-root-commander
```

**Direct launcher.js download:**
```
https://raw.githubusercontent.com/nicoforclaude/claude-root-commander/main/plugins/root/launcher/launcher.js
```

**Plugin installation:**
```
/plugin marketplace add https://github.com/nicoforclaude/claude-root-commander
/plugin install root@claude-root-commander
```
