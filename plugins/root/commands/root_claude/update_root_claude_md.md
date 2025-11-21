---
name: root_update_root_claude_md
description: Update CLAUDE.md from template with diff preview
---

You are updating the CLAUDE.md file in the workspace root from the template.

## Your Task

1. **Check what changes would occur**:
   - Source: `.claude/templates/root_claude.md`
   - Destination: `CLAUDE.md` (in workspace root, typically `C:\KolyaRepositories\CLAUDE.md`)
   - Use git diff or compare the files to show what would change
   - Use powershell command like: `git diff --no-index CLAUDE.md .claude\templates\root_claude.md` or similar comparison

2. **Show changes to user and ask for confirmation**:
   - Display the diff/changes that would be made
   - If no changes, inform user that files are identical
   - Ask user to confirm if they want to proceed with the update using AskUserQuestion tool

3. **Run the script if confirmed**:
   - Execute: `powershell -ExecutionPolicy Bypass -File ".claude\scripts\copy_root_claude_md_from_template.ps1"`
   - The script will:
     - Remove all `///INSTRUCTION LINE` comments from the template
     - Prompt for quasi-variable values (like `CLAUDE_MAIN_WORKSPACE_ROOT`)
     - Copy the processed template to `CLAUDE.md`
     - Display all quasi-variables that were set

4. **Verify success**:
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

Enter value for CLAUDE_MAIN_WORKSPACE_ROOT (default: C:\KolyaRepositories):
[User presses Enter to accept default]

✓ CLAUDE.md updated successfully!

Quasi-variables set:
  CLAUDE_MAIN_WORKSPACE_ROOT = 'C:\KolyaRepositories'

Derived quasi-variables (automatically calculated):
  CLAUDE_PLUGINS_ROOT = 'C:\KolyaRepositories\.localData\claudePlugins'
```

## Important Notes

- The template (.claude/templates/root_claude.md) is the source of truth
- The user edits this template, then runs this command to deploy updates
