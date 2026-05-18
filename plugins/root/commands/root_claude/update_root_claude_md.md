---
name: root_update_root_claude_md
description: Update CLAUDE.md from template with diff preview
---

You are updating the CLAUDE.md file in the workspace root from the template.

## Path Configuration

The template is always fetched from the public GitHub repository:
- **Template URL**: `https://raw.githubusercontent.com/nicoforclaude/claude-root-commander/main/plugins/root/templates/root_claude.md`

This ensures the template is always up-to-date regardless of local installation state.

## Your Task

1. **Fetch template**:
   - Use WebFetch to retrieve template from the URL above

2. **Process template**:
   - Remove all lines that are exactly `///INSTRUCTION LINE` (or start with `///INSTRUCTION LINE`)
   - Ask user for the `CLAUDE_MAIN_WORKSPACE_ROOT` value, suggesting the detected workspace root as default
   - In the processed content, replace `CLAUDE_MAIN_WORKSPACE_ROOT = ''` with `CLAUDE_MAIN_WORKSPACE_ROOT = '<user-provided-value>'`

3. **Show what would change**:
   - Write the processed content to `%TEMP%\root-claude-preview.md`
   - Run: `git diff --no-index CLAUDE.md "%TEMP%\root-claude-preview.md"`
   - If no changes, inform user that files are identical and stop

4. **Ask for confirmation**:
   - Display the diff
   - Ask user to confirm using AskUserQuestion tool

5. **Write if confirmed**:
   - Write the processed content to `CLAUDE.md` in the workspace root using the Write tool
   - Delete the temp file

6. **Verify success**:
   - Confirm file was updated
   - Show the quasi-variables that were configured

## Example Interaction

```
Fetching template from GitHub...

What is the workspace root path?
(default: <detected-workspace-root>) [User presses Enter]

Processing template — stripping instruction lines, filling quasi-variables...

Changes found:
[diff output showing additions/deletions]

Proceed with updating CLAUDE.md? [yes/no]

✓ CLAUDE.md updated successfully!

Quasi-variables set:
  CLAUDE_MAIN_WORKSPACE_ROOT = '<workspace-root>'
```

## Important Notes

- The template on GitHub is the source of truth — always fetched fresh
- Workflow: edit template in `nicoforclaude` repo → push to GitHub → run this command to deploy
- The diff shows the exact processed content that will be written — no surprises
