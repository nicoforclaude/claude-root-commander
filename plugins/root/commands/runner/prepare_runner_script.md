Create an interactive PowerShell script for running Claude in managed repositories.

Steps:
1. Read managed repository paths from `C:\KolyaRepositories\claude_root_commander.md`
2. Use the template from `.claude/_resources/run_claude_for_repo.ps1` as the base
3. If `C:\KolyaRepositories\run_claude_for_repo.ps1` exists, perform a two-part comparison:
   a. **Repos comparison**: Extract repos array from existing script and compare with what would be generated from `claude_root_commander.md`
   b. **Functional code comparison**: Compare the rest of the script (excluding repos array section) with template functional code
4. Report the comparison results:
   - If both match: "✓ Script is up to date" and STOP (don't write file)
   - If repos differ: "Updated repos: added [X], removed [Y], reordered [Z]"
   - If functional code differs: "Updated functionality:" followed by specific changes detected:
     * New modes added/removed (e.g., "Added PowerShell mode")
     * Key binding changes (e.g., "Changed mode toggle from Tab to w")
     * UI/label changes (e.g., "Updated menu colors", "Changed help text")
     * Error handling improvements
     * Any other functional changes
5. Generate a PowerShell script `run_claude_for_repo.ps1` that:
   - Builds repos array with root option as first item: `@{ Name = "Root (KolyaRepositories)"; Path = "."; IDE = "WebStorm" }`
   - Then adds chessarms repos in order: chessarms/tsmain, chessarms/calc, chessarms/fishwrap
   - Then adds other repos: nomadsync-io/tsmain, personal/nicola-solutions, etc.
   - Each repo includes preferred IDE: `@{ Name = "..."; Path = "..."; IDE = "WebStorm" or "IntelliJ" }`
   - Displays an interactive menu with mode switching (Tab/w key):
     * "Claude" mode: Run Claude only (default)
     * "IDE" mode: Open in preferred IDE only
     * "Claude + IDE" mode: Open IDE in background, then run Claude in foreground
   - Navigation: Up/Down arrow keys or direct number selection (1-9)
   - Confirms selection with Enter key
   - Changes to the selected repository directory
   - Runs `claude` with all passed arguments in that directory
   - Includes error handling and user-friendly messages

The script requirements:
- Use `Split-Path` to handle directory navigation
- Pass through all arguments using `@args`
- Handle paths correctly on Windows
- Detect JetBrains IDE shortcuts from `C:\ProgramData\Microsoft\Windows\Start Menu\Programs\JetBrains`
- Show visual feedback for selected repo (highlighting)
- Allow quitting with 'q' key
- Include try/catch error handling

Output location: `C:\KolyaRepositories\run_claude_for_repo.ps1`
