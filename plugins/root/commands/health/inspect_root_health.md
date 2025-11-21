---
description: Inspect health of Claude setup in root commander .claude directory
---

# Root Claude Setup Health Inspector

Focus area: content of `.claude` directory in root commander only.
For child repositories health check, user will use `/root_claude_inspect_repos_health`.

## Skills to Invoke

Before starting the inspection, invoke the following skills:

1. **senior-editor** - For reviewing command and agent documentation quality
2. **windows-shell:windows-shell** - For proper path handling (if running on Windows)

## Inspection Checklist

### 1. Root Commands Health Check

Check all commands in `.claude/commands/` directory:

**For each command file:**
- [ ] Has proper frontmatter metadata (description)
- [ ] Has skills invocation section if needed (table format per skill)
- [ ] _[More checks to be added]_

**Skills invocation table format:**
```markdown
## Skills to Invoke

| Skill | When | Why |
|-------|------|-----|
| senior-editor | Always | Review documentation quality |
| windows-shell:windows-shell | On Windows | Proper path handling |
```

### 2. Agents Health Check

Check all agents in `.claude/agents/` directory:

**For each agent file:**
- [ ] Has proper frontmatter metadata
- [ ] Has skills invocation section if applicable
- [ ] _[More checks to be added]_

### 3. Commands Health Check

Check all commands in `.claude/commands/` directory:

**For each command file:**
- [ ] Has proper frontmatter metadata
- [ ] Has skills invocation section if applicable
- [ ] _[More checks to be added]_

### 4. Reference Health Check

Markdown files reference commands, agents, files, and folders. Verify each reference exists and uses correct style.

**Create a table with:**
- File path
- Reference string
- Type (command, agent, skill, file, folder)
- Style (weak, correct)
- Status (✓ ok, ⚠️ missing, ❌ broken)
- Comment (if needed)

**Reference style rules:**
- **Correct:** Bold for **skills**, **agents**, **commands**; backticks for `files` and `folders`
- **Weak:** Plain text mentions without formatting or links

### 5. Environment-Specific Content Check

Check for hardcoded environment-specific content that should be generalized:

**Look for:**
- Hardcoded absolute paths (e.g., `C:\KolyaRepositories\`, `/home/username/`)
- Machine-specific configurations
- Personal identifiers or usernames
- Local-only references that won't work for other users

**Action:** Flag instances where generic placeholders or relative paths should be used instead.

### 6. General Health Inspection

Check for broader issues beyond specific file validations:

**Look for:**
- Duplicate or conflicting definitions
- Outdated patterns or deprecated tools
- Inconsistent terminology across files
- Missing cross-references between related commands/agents
- Incomplete implementations (placeholders, "TODO", "TBD")
- Orphaned files (referenced but not existing, or existing but never referenced)

## Output Format

```
═══════════════════════════════════════════════════════════
  ROOT CLAUDE HEALTH INSPECTION
═══════════════════════════════════════════════════════════

Scanning: C:\KolyaRepositories\.claude

───────────────────────────────────────────────────────────
1. ROOT COMMANDS HEALTH
───────────────────────────────────────────────────────────

Commands Scanned: <count>

✓ command1.md - Has metadata, has skills section
✓ command2.md - Has metadata, no skills needed
⚠ command3.md - Missing skills invocation section
❌ command4.md - Missing metadata

───────────────────────────────────────────────────────────
2. AGENTS HEALTH
───────────────────────────────────────────────────────────

Agents Scanned: <count>

✓ agent1.md - Has metadata, has skills section
⚠ agent2.md - Missing skills invocation section
❌ agent3.md - Missing metadata

───────────────────────────────────────────────────────────
3. COMMANDS HEALTH (REDUNDANT CHECK)
───────────────────────────────────────────────────────────

[To be filled in later]

───────────────────────────────────────────────────────────
SUMMARY
───────────────────────────────────────────────────────────

Overall Health: ✅ HEALTHY / ⚠️ ISSUES FOUND / ❌ CRITICAL

Issues by Category:
  • Commands missing metadata: <count>
  • Commands missing skills section: <count>
  • Agents missing metadata: <count>
  • Agents missing skills section: <count>

Total Issues: <count>

[If all good:]
✅ All checks passed!

[If issues found:]
⚠️ Action Required:
   - Add missing metadata to commands/agents
   - Add skills invocation sections where needed
```

## Implementation Notes

- Use TodoWrite to track inspection progress
- Check each file systematically
- Report clearly with file names
- Use color indicators (✓ ⚠️ ❌) for readability
- Group issues by category

## Save Report to File

After generating the inspection report, offer to save it:

1. **Ask user** using AskUserQuestion:
   ```
   Question: "Save this inspection report to .claude\.localData\output\root-health-inspection-YYYY-MM-DD.md?"
   Options:
     - "Yes, save report"
     - "No, just show in chat"
   ```

2. **If user selects "Yes, save report":**
   - Create directory if needed: `.claude/.localData/output/`
   - Generate filename with current date: `root-health-inspection-YYYY-MM-DD.md`
   - Write report to: `.claude\.localData\output\root-health-inspection-YYYY-MM-DD.md`
   - Include full report with:
     - Date and location header
     - All inspection findings
     - Detailed recommendations
     - Metadata template examples
   - Confirm to user: "✓ Report saved to `.claude\.localData\output\root-health-inspection-YYYY-MM-DD.md`"

3. **If user selects "No, just show in chat":**
   - Skip file creation
   - Report is already visible in chat

## Success Criteria

You succeed when:
- All files in `.claude/commands/` are checked
- All files in `.claude/agents/` are checked
- Clear report of health status
- Specific file references for issues
- User understands what needs attention
- User is offered option to save report to file
