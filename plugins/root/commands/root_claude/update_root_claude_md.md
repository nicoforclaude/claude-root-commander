---
name: root_update_root_claude_md
description: Update CLAUDE.md from template with diff preview
---

You are updating the CLAUDE.md file in the workspace root from the template.

## Path Configuration

The template and script are located in the plugin directory:
- **Plugin location**: `CLAUDE_PLUGINS_ROOT/root/templates/`
- **CLAUDE_PLUGINS_ROOT** is defined in workspace root CLAUDE.md (e.g., `C:\KolyaRepositories\.localData\claude-plugins`)

## Your Task

1. **Determine the plugin templates path**:
   - Read workspace root CLAUDE.md to find CLAUDE_PLUGINS_ROOT value
   - Template path: `<CLAUDE_PLUGINS_ROOT>/root/templates/root_claude.md`
   - Script path: `<CLAUDE_PLUGINS_ROOT>/root/templates/copy_root_claude_md_from_template.ps1`

2. **Check what changes would occur**:
   - Source: `<CLAUDE_PLUGINS_ROOT>/root/templates/root_claude.md`
   - Destination: `CLAUDE.md` (in workspace root)
   - Use git diff or compare the files to show what would change
   - Example: `git diff --no-index CLAUDE.md "<CLAUDE_PLUGINS_ROOT>\root\templates\root_claude.md"`

3. **Show changes to user and ask for confirmation**:
   - Display the diff/changes that would be made
   - If no changes, inform user that files are identical
   - Ask user to confirm if they want to proceed with the update using AskUserQuestion tool

4. **Run the script if confirmed**:
   - Execute: `powershell -ExecutionPolicy Bypass -File "<CLAUDE_PLUGINS_ROOT>\root\templates\copy_root_claude_md_from_template.ps1" "<workspace-root>"`
   - The script will:
     - Remove all `///INSTRUCTION LINE` comments from the template
     - Prompt for quasi-variable values (like `CLAUDE_MAIN_WORKSPACE_ROOT`)
     - Copy the processed template to `CLAUDE.md`
     - Display all quasi-variables that were set

5. **Verify success**:
   - Confirm file was updated
   - Show the quasi-variables that were configured
   - Show success message

## Example Interaction

```
Checking for changes between CLAUDE.md and template...

Changes found:
[diff output showing additions/deletions]

Do you want to update CLAUDE.md with these changes? [yes/no]

Running update script...

Quasi-variable needs to be filled:
CLAUDE_MAIN_WORKSPACE_ROOT = current workspace root path

Enter value for CLAUDE_MAIN_WORKSPACE_ROOT (default: <detected-workspace-root>):
[User presses Enter to accept default]

✓ CLAUDE.md updated successfully!

Quasi-variables set:
  CLAUDE_MAIN_WORKSPACE_ROOT = '<workspace-root>'

Derived quasi-variables (automatically calculated):
  CLAUDE_PLUGINS_ROOT = '<workspace-root>\.localData\claude-plugins'
```

## Important Notes

- The template (in plugin's templates folder) is the source of truth
- The user edits this template, then runs this command to deploy updates
- Template location: `<CLAUDE_PLUGINS_ROOT>/root/templates/root_claude.md`
