# Claude Root Launcher

Interactive menu for selecting repositories/workspaces and opening them with Claude and/or IDEs.

## Usage

**From workspace root (recommended):**
```bash
# Windows
.\launcher.ps1

# Unix/Mac
./launcher.sh

# With options
.\launcher.ps1 --setup
./launcher.sh --config
```

**Direct invocation (requires paths):**
```bash
node launcher.js --workspace-root <path> --state-dir <path> [options]
```

The wrapper scripts (`launcher.ps1` / `launcher.sh`) automatically compute paths based on the quasi-variables in `CLAUDE.md`.

## Controls

| Key | Action |
|-----|--------|
| Up/Down | Navigate menu |
| 1-9 | Direct selection |
| Enter | Select and launch |
| Tab / w | Cycle mode (Claude → IDE → Claude+IDE → PowerShell) |
| c | Cycle Claude startup mode (none → startup check → /commit) |
| d | Scan git diff for all repos (shows +/- stats inline) |
| a | Add repo to managed list |
| r | Remove repo from managed list |
| q | Quit |

## Modes

- **Claude** - Run Claude in the selected repo
- **IDE** - Open repo in preferred IDE (WebStorm/IntelliJ)
- **Claude + IDE** - Open IDE then run Claude
- **PowerShell** - Open PowerShell in repo directory

## Claude Startup Modes

- **none** - Just run `claude`
- **with startup check** - Run `claude /startup_check`
- **with /commit** - Run `claude /commit`

## Configuration

Config stored in: `{CLAUDE_PLUGINS_ROOT}/nicoforclaude/root/`

- `repos.json` - List of discovered repositories (from scan-for-repos)
- `runner-config.json` - User configuration (entries, IDEs, preferences)
- `diffs.json` - Cached git diff stats

## IDE Detection

Automatically detects JetBrains IDEs from:
- `C:\ProgramData\Microsoft\Windows\Start Menu\Programs\JetBrains`
- `C:\ProgramData\Microsoft\Windows\Start Menu\Programs\Visual Studio Code`
