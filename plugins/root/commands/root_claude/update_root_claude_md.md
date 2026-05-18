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

2. **Check what changes would occur**:
   - Write fetched template to a temp file, then: `git diff --no-index CLAUDE.md "<temp-file>"`
   - If no changes, inform user that files are identical

3. **Show changes and ask for confirmation**:
   - Display the diff/changes that would be made
   - Ask user to confirm using AskUserQuestion tool

4. **Process and write if confirmed**:
   - Remove all `///INSTRUCTION LINE` lines from the fetched template content
   - Ask user for quasi-variable values (e.g. `CLAUDE_MAIN_WORKSPACE_ROOT`), suggesting the current workspace root as default
   - Replace quasi-variable placeholders in the content with provided values
   - Write the processed content to `CLAUDE.md` in the workspace root using the Write tool

5. **Verify success**:
   - Confirm file was updated
   - Show the quasi-variables that were configured

## Example Interaction

```
Fetching template from GitHub...

Changes found:
[diff output showing additions/deletions]

Proceed with updating CLAUDE.md? [yes/no]

What is the workspace root path?
(default: <detected-workspace-root>) [User presses Enter]

✓ CLAUDE.md updated successfully!

Quasi-variables set:
  CLAUDE_MAIN_WORKSPACE_ROOT = '<workspace-root>'
```

## Important Notes

- The template on GitHub is the source of truth — always fetched fresh
- Workflow: edit template in `nicoforclaude` repo → push to GitHub → run this command to deploy
