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

### Main Menu

| Key | Action |
|-----|--------|
| Up/Down | Navigate menu |
| Left/Right | Collapse/expand nested entries |
| 1-9 | Direct selection |
| Enter | Select and launch |
| Tab / w | Cycle mode (Claude → IDE → Claude+IDE → PowerShell) |
| c | Cycle Claude startup mode (none → startup check → /commit) |
| d | Scan git diff for all repos (shows +/- stats inline) |
| Space | Toggle changed files list for selected entry |
| f | Open config menu |
| q | Quit |

### Config Menu (press 'f')

Options:
1. **Edit entries** - Add, edit, remove, reorder entries
2. **Manage repositories** - Show/hide repos from main menu
3. **Scan for repositories** - Find all git repos in workspace
4. **Create desktop shortcut** - Add launcher shortcut to desktop
5. **Edit startup modes** - Configure Claude startup commands

### Edit Entries Mode

| Key | Action |
|-----|--------|
| Up/Down | Navigate |
| Left/Right | Collapse/expand |
| u/d | Move entry up/down in list |
| a | Add entry from managed repos |
| x | Remove entry |
| g | Group entries by path prefix |
| n | Nest entry under another parent |
| e | Edit entry name |
| i | Cycle IDE for entry |
| Enter | Save changes and exit |
| Esc/q | Cancel (discard changes) |

### Manage Repositories Mode

| Key | Action |
|-----|--------|
| Up/Down | Navigate |
| Space | Toggle managed/unmanaged |
| Enter | Save changes and exit |
| Esc/q | Cancel (discard changes) |

### Edit Startup Modes

| Key | Action |
|-----|--------|
| Up/Down | Navigate |
| a | Add new startup mode |
| x | Remove mode (cannot remove last) |
| e | Edit mode name inline |
| u/d | Move mode up/down |
| Enter | Save changes and exit |
| Esc/q | Cancel (discard changes) |

## Modes

- **Claude** - Run Claude in the selected repo
- **IDE** - Open repo in preferred IDE (WebStorm/IntelliJ)
- **Claude + IDE** - Open IDE then run Claude
- **PowerShell** - Open PowerShell in repo directory

## Claude Startup Modes

Default modes (can be customized via Config → Edit startup modes):

- **none** - Just run `claude`
- **with /git:startup** - Run `claude /git:startup`
- **with /git:commit** - Run `claude /git:commit`

Mode format: `with <command>` extracts `<command>` as Claude argument.

## Configuration

Config stored in: `{CLAUDE_PLUGINS_ROOT}/nicoforclaude/root/`

- `repos.json` - List of discovered repositories (from scan-for-repos)
- `runner-config.json` - User configuration (entries, IDEs, preferences, unmanagedPaths)
- `diffs.json` - Cached git diff stats

## Managed vs Unmanaged Repos

The launcher supports a managed/unmanaged workflow for repositories:

- **All repos** come from `repos.json` (populated by scan-for-repos)
- **Unmanaged repos** are listed in `unmanagedPaths` in config (hidden from menus)
- **Managed repos** = all repos minus unmanaged
- **Entries** = curated repos with custom settings (IDE preference, display name)

**Main menu shows:**
1. All entries (repos with custom settings), with nested children if expanded
2. "(Other managed - N repos)" item if there are managed repos not in entries

**Press 'f' then select "Manage repositories" to:**
- See all repos with checkboxes
- Toggle repos between managed/unmanaged
- Unmanaged repos are hidden from all menus

## First-Run Setup

On first launch, the launcher will prompt to create a desktop shortcut for quick access. This can be skipped and created later via Config → Create desktop shortcut.

The shortcut is created as `Claude Launcher.cmd` on your desktop - a simple batch file that launches the PowerShell wrapper script.

## Nested Entries

Entries can contain nested children for organizing related repos:

```
> nicoforclaude
    claude-root-commander
    claude-pdf-printing
    claude-linting
```

- **Right arrow** expands children
- **Left arrow** collapses (or navigates to parent)
- Nested entries are edited via Config → Edit entries

## IDE Detection

Automatically detects JetBrains IDEs from:
- `C:\ProgramData\Microsoft\Windows\Start Menu\Programs\JetBrains`
- `C:\ProgramData\Microsoft\Windows\Start Menu\Programs\Visual Studio Code`
