List managed Git repositories (defined in `claude_root_commander.md` at workspace root).

## Step 1: Load Windows Filesystem Skill (Windows Only)

**If running on Windows (check platform in env):**
- Use the Skill tool to load the `windows-shell:windows-shell` skill
- This ensures proper path quoting and command handling for all git operations
- Skip this step on non-Windows platforms

## Step 2: Check Repository Status

For each managed repository:
1. Read the repository paths from `C:\KolyaRepositories\claude_root_commander.md`
2. Display as columns:
   - Repository path
   - Current branch name
   - Git changes stats (format: "+A ~M -D" for added/modified/deleted files)
   - "Lines" column - Git line changes stats (format: "+A ~M -D" for added/modified/deleted lines)
   - Number of uncommitted files total (staged + unstaged) with 1-2 file extensions shown in parentheses, e.g., "4 (.ts, .md)"
   - "Topics" column - Filenames changed - related to which topic, judge by content or path and filename. May be list of topics. Should be shrinked down to below 15 characters, so superconcise.

Present the results in a plain text table format with proper column alignment. Use NO EMOJIS - use text format like "+2 ~3 -5" for changes.

**Sorting**: Sort repositories by total number of changed lines (descending). Repos with changes appear first, clean repos appear last in their original order.

Example table format:
```
Repository           Branch        Changes      Lines         Files          Topics
-------------------------------------------------------------------------------------
chessarms/tsmain     main          +1 ~2 -5     +4 ~9 -569    8 (.md, .json) git,startup
chessarms/calc       dev-preview   -2           -23           2 (.md)        git cmds
.claude              main          ~1           +2 -1         1 (.md)        repo status
chessarms/fishwrap   main          -            -             0              -
nomadsync-io/tsmain  main          -            -             0              -
```
Example table format:
```
Repository           Branch        Changes      Lines         Files          Topics
-------------------------------------------------------------------------------------
chessarms/calc       dev-preview   -2           -23           2 (.md)        git cmds
chessarms/fishwrap   main          -            -             0              -
```
