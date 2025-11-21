Find and list all Git repositories in the current directory and subdirectories, then update `.localData/repos.md`.

Steps:
1. Find all directories containing `.git` folders
2. For each repository, collect the relative path from current working directory
3. Write results to `.localData/repos.md` in a table format (just repository path column)
4. Do NOT include current branch or remote URL columns

This command maintains an up-to-date list of all repositories in the workspace.
