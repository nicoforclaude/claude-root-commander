#!/usr/bin/env node
/**
 * Claude Root Launcher
 *
 * Interactive menu for selecting repositories/workspaces and opening them
 * with Claude and/or IDEs.
 *
 * Usage:
 *   node launcher.js --workspace-root <path> --state-dir <path> [options]
 *
 * Required:
 *   --workspace-root  Workspace root directory (where repos live)
 *   --state-dir       Plugin state directory (for config files)
 *
 * Options:
 *   --setup     Run interactive setup wizard
 *   --config    Show current configuration
 *   --help      Show help
 *
 * Note: Use the wrapper scripts (launcher.ps1 / launcher.sh) which
 * automatically provide the correct paths.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { execSync, spawn } = require('child_process');

// ============================================================================
// ANSI Escape Codes
// ============================================================================

const ANSI = {
  clear: '\x1b[2J\x1b[3J\x1b[H',  // Clear screen + scrollback + cursor home
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',

  // Foreground colors (bright versions for visibility)
  green: '\x1b[92m',    // Bright green
  yellow: '\x1b[93m',   // Bright yellow
  blue: '\x1b[94m',     // Bright blue
  magenta: '\x1b[95m',  // Bright magenta
  cyan: '\x1b[96m',     // Bright cyan
  white: '\x1b[97m',    // Bright white
  gray: '\x1b[90m',     // Gray (dim)
  red: '\x1b[91m',      // Bright red
};

// UI constants
const SEP60 = `${ANSI.dim}${'='.repeat(60)}${ANSI.reset}`;
const SEP40 = `${ANSI.cyan}${'='.repeat(40)}${ANSI.reset}`;

function printScreen(lines) {
  process.stdout.write(ANSI.clear);
  console.log(lines.join('\n'));
}

// ============================================================================
// CLI Argument Parsing
// ============================================================================

function parseArgs(argv) {
  const args = {
    workspaceRoot: null,
    pluginsRoot: null,
    stateDir: null,
    launcherScript: null, // Path to launcher.ps1 for shortcut creation
    setup: false,
    config: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case '--workspace-root':
        args.workspaceRoot = argv[++i];
        break;
      case '--plugins-root':
        args.pluginsRoot = argv[++i];
        break;
      case '--state-dir':
        args.stateDir = argv[++i];
        break;
      case '--launcher-script':
        args.launcherScript = argv[++i];
        break;
      case '--setup':
        args.setup = true;
        break;
      case '--config':
        args.config = true;
        break;
      case '--help':
      case '-h':
        args.help = true;
        break;
    }
  }

  return args;
}

// Global paths (set from CLI args)
let WORKSPACE_ROOT = null;
let STATE_DIR = null;
let LAUNCHER_SCRIPT = null;

// Config file paths
function getConfigPaths() {
  return {
    repos: path.join(STATE_DIR, 'repos.json'),
    config: path.join(STATE_DIR, 'runner-config.json'),
    cache: path.join(STATE_DIR, 'cache.json'),
    // Legacy - for migration
    diffs: path.join(STATE_DIR, 'diffs.json'),
  };
}

// ============================================================================
// Config Loading/Saving
// ============================================================================

function loadJson(filePath, defaultValue = null) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (e) {
    console.error(`Warning: Failed to load ${filePath}: ${e.message}`);
  }
  return defaultValue;
}

function saveJson(filePath, data) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

/**
 * Save cache data (diffs and remote status with timestamps)
 */
function saveCache(state) {
  const paths = getConfigPaths();
  const cacheData = {
    diffs: {
      lastScan: state.diffsLastScan,
      data: state.diffs,
    },
    remoteStatus: {
      lastFetch: state.remoteStatusLastFetch,
      data: state.remoteStatusCache,
    },
  };
  saveJson(paths.cache, cacheData);
}

function loadConfig() {
  const paths = getConfigPaths();

  // Load repos.json
  const reposData = loadJson(paths.repos, { repositories: [] });

  // Load runner-config.json
  let config = loadJson(paths.config);

  if (!config) {
    // Create default config from repos
    config = createDefaultConfig(reposData.repositories);
    saveJson(paths.config, config);
  } else {
    // Ensure unmanagedPaths exists (for existing configs)
    if (!config.unmanagedPaths) {
      config.unmanagedPaths = [];
    }
    // Normalize entries (add expanded/children if missing)
    if (config.entries) {
      config.entries = config.entries.map(normalizeEntry);
    }
  }

  // Load cache.json (or migrate from legacy diffs.json)
  let cache = loadJson(paths.cache);
  if (!cache) {
    // Try migrating from legacy diffs.json
    const legacyDiffs = loadJson(paths.diffs, null);
    if (legacyDiffs) {
      cache = {
        diffs: { lastScan: null, data: legacyDiffs },
        remoteStatus: { lastFetch: null, data: {} },
      };
      saveJson(paths.cache, cache);
      // Optionally delete legacy file (keep for now)
    } else {
      cache = {
        diffs: { lastScan: null, data: {} },
        remoteStatus: { lastFetch: null, data: {} },
      };
    }
  }

  return { config, repos: reposData, cache };
}

function createDefaultConfig(repositories) {
  return {
    version: '1.1.0',
    modes: ['Claude', 'IDE', 'Claude + IDE', 'PowerShell'],
    claudeStartupModes: ['none', 'with /git:startup', 'with /git:commit'],
    ides: detectIDEs(),
    unmanagedPaths: [], // Repos excluded from main menu
    entries: [
      { type: 'workspace', path: '.', name: 'Root (workspace)', ide: 'WebStorm', expanded: false, children: [] },
      ...repositories.map(r => ({
        type: 'repo',
        path: r.path,
        name: r.path,
        ide: 'WebStorm',
        expanded: false,
        children: [],
      })),
    ],
  };
}

/**
 * Ensure entry has required fields (for migration from older configs)
 */
function normalizeEntry(entry) {
  const normalized = {
    ...entry,
    expanded: entry.expanded ?? false,
    children: (entry.children || []).map(normalizeEntry),
  };
  // Fix old groups without path - use name as path
  if (normalized.type === 'group' && !normalized.path && normalized.name) {
    normalized.path = normalized.name;
  }
  return normalized;
}

/**
 * Flatten entries tree for display, including depth and parent info
 * Returns array of { entry, depth, parent, indexInParent }
 */
function flattenEntries(entries, depth = 0, parent = null) {
  const result = [];
  entries.forEach((entry, indexInParent) => {
    result.push({ entry, depth, parent, indexInParent });
    if (entry.expanded && entry.children && entry.children.length > 0) {
      result.push(...flattenEntries(entry.children, depth + 1, entry));
    }
  });
  return result;
}

/**
 * Find entry in tree by reference and toggle expanded state
 */
function toggleExpanded(entries, targetEntry) {
  for (const entry of entries) {
    if (entry === targetEntry) {
      entry.expanded = !entry.expanded;
      return true;
    }
    if (entry.children && entry.children.length > 0) {
      if (toggleExpanded(entry.children, targetEntry)) return true;
    }
  }
  return false;
}

/**
 * Move entry up/down within its parent array
 * direction: -1 for up, 1 for down
 */
function moveEntry(entries, targetEntry, direction, parent = null) {
  const arr = parent ? parent.children : entries;
  const idx = arr.indexOf(targetEntry);
  if (idx === -1) {
    // Search in children
    for (const entry of entries) {
      if (entry.children && entry.children.length > 0) {
        if (moveEntry(entry.children, targetEntry, direction, entry)) return true;
      }
    }
    return false;
  }
  const newIdx = idx + direction;
  if (newIdx < 0 || newIdx >= arr.length) return false;
  // Swap
  [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
  return true;
}

/**
 * Remove entry from tree
 */
function removeEntry(entries, targetEntry) {
  const idx = entries.indexOf(targetEntry);
  if (idx !== -1) {
    entries.splice(idx, 1);
    return true;
  }
  for (const entry of entries) {
    if (entry.children && removeEntry(entry.children, targetEntry)) return true;
  }
  return false;
}

/**
 * Collect all paths from entries tree (for checking duplicates)
 */
function collectEntryPaths(entries) {
  const paths = [];
  for (const entry of entries) {
    if (entry.path) paths.push(entry.path);
    if (entry.children) paths.push(...collectEntryPaths(entry.children));
  }
  return paths;
}

/**
 * Collect all entries recursively (repos only, not groups)
 */
function collectAllEntries(entries) {
  const result = [];
  for (const entry of entries) {
    if (entry.path) result.push(entry);
    if (entry.children) {
      result.push(...collectAllEntries(entry.children));
    }
  }
  return result;
}

/**
 * Compute aggregate stats for groups from their children
 */
function computeGroupStats(entries, diffs) {
  for (const entry of entries) {
    if (entry.children && entry.children.length > 0) {
      // Recurse first to compute nested group stats
      computeGroupStats(entry.children, diffs);

      // Sum children stats
      let files = 0, added = 0, removed = 0;
      for (const child of entry.children) {
        const childStats = diffs[child.path] || diffs[`__group_${child.name}`];
        if (childStats) {
          files += childStats.files;
          added += childStats.added;
          removed += childStats.removed;
        }
      }

      if (files > 0 || added > 0 || removed > 0) {
        diffs[`__group_${entry.name}`] = { files, added, removed };
      }
    }
  }
}

/**
 * Extract path prefix (first directory segment)
 * e.g., "nicoforclaude/claude-root-commander" -> "nicoforclaude"
 */
function getPathPrefix(entryPath) {
  if (!entryPath) return null;
  const parts = entryPath.replace(/\\/g, '/').split('/');
  return parts.length > 1 ? parts[0] : null;
}

/**
 * Find all entries with matching path prefix (at root level only for grouping)
 */
function findEntriesWithPrefix(entries, prefix) {
  return entries.filter(e => {
    if (!e.path) return false;
    const p = getPathPrefix(e.path);
    return p === prefix;
  });
}

/**
 * Create a group entry
 * @param {string} name - Group name (also used as path prefix)
 * @param {Array} children - Child entries
 */
function createGroupEntry(name, children = []) {
  // Use name as path (the prefix folder)
  return {
    type: 'group',
    name,
    path: name,
    ide: children[0]?.ide || null,  // inherit IDE from first child
    expanded: true,
    children,
  };
}

/**
 * Collect all groups from entries (for nest picker)
 */
function collectGroups(entries, depth = 0) {
  const groups = [];
  for (const entry of entries) {
    if (entry.type === 'group' || (entry.children && entry.children.length > 0)) {
      groups.push({ entry, depth });
      if (entry.children) {
        groups.push(...collectGroups(entry.children, depth + 1));
      }
    }
  }
  return groups;
}

/**
 * Find parent of an entry in tree
 */
function findParent(entries, targetEntry, parent = null) {
  for (const entry of entries) {
    if (entry === targetEntry) return parent;
    if (entry.children) {
      const found = findParent(entry.children, targetEntry, entry);
      if (found !== undefined) return found;
    }
  }
  return undefined;
}

/**
 * Add entry as child of target group (or root if target is null)
 */
function addEntryToParent(entries, entry, targetParent) {
  if (targetParent === null) {
    entries.push(entry);
  } else {
    if (!targetParent.children) targetParent.children = [];
    targetParent.children.push(entry);
  }
}

// ============================================================================
// Changed Files State Helpers
// ============================================================================

/**
 * Hide changed files panel
 */
function hideChangedFiles(state) {
  state.showChangedFiles = false;
  state.changedFiles = null;
  state.changedFilesPath = null;
}

/**
 * Show changed files for entry (if it has changes)
 * Returns true if files were shown, false otherwise
 */
function showChangedFilesForEntry(state, entryPath) {
  if (!entryPath || !state.diffs[entryPath]) return false;

  const files = getChangedFiles(entryPath);
  if (files && files.length > 0) {
    state.showChangedFiles = true;
    state.changedFiles = files;
    state.changedFilesPath = entryPath;
    return true;
  }
  return false;
}

/**
 * Toggle changed files display for entry
 */
function toggleChangedFiles(state, entryPath) {
  if (!entryPath) return;

  // If already showing for this entry, hide
  if (state.showChangedFiles && state.changedFilesPath === entryPath) {
    hideChangedFiles(state);
  } else {
    showChangedFilesForEntry(state, entryPath);
  }
}

/**
 * Hide remote changed files display
 */
function hideRemoteChangedFiles(state) {
  state.showRemoteChangedFiles = false;
  state.remoteChangedFiles = null;
  state.remoteChangedFilesPath = null;
}

/**
 * Show changed files for remote status entry
 * Returns true if files were shown, false otherwise
 */
function showRemoteChangedFilesForEntry(state, repoPath) {
  if (!repoPath) return false;

  const files = getChangedFiles(repoPath);
  if (files && files.length > 0) {
    state.showRemoteChangedFiles = true;
    state.remoteChangedFiles = files;
    state.remoteChangedFilesPath = repoPath;
    return true;
  }
  return false;
}

/**
 * Toggle changed files display in remote status mode
 */
function toggleRemoteChangedFiles(state, repoPath) {
  if (!repoPath) return;

  // If already showing for this repo, hide
  if (state.showRemoteChangedFiles && state.remoteChangedFilesPath === repoPath) {
    hideRemoteChangedFiles(state);
  } else {
    showRemoteChangedFilesForEntry(state, repoPath);
  }
}

// ============================================================================
// Startup Mode Parsing
// ============================================================================

/**
 * Parse startup mode string to extract command
 * 'none' → null
 * 'with /git:commit' → '/git:commit'
 */
function parseStartupMode(mode) {
  if (mode === 'none') return null;
  const match = mode.match(/^with\s+(.+)$/);
  return match ? match[1] : null;
}

// ============================================================================
// IDE Detection
// ============================================================================

function detectIDEs() {
  const ides = [];
  const jetBrainsPath = 'C:\\ProgramData\\Microsoft\\Windows\\Start Menu\\Programs\\JetBrains';

  if (fs.existsSync(jetBrainsPath)) {
    try {
      const files = fs.readdirSync(jetBrainsPath);

      // WebStorm
      const webStorm = files.find(f => f.toLowerCase().includes('webstorm') && f.endsWith('.lnk'));
      if (webStorm) {
        ides.push({ name: 'WebStorm', shortcut: path.join(jetBrainsPath, webStorm) });
      }

      // IntelliJ
      const intellij = files.find(f => f.toLowerCase().includes('intellij') && f.endsWith('.lnk'));
      if (intellij) {
        ides.push({ name: 'IntelliJ', shortcut: path.join(jetBrainsPath, intellij) });
      }
    } catch (e) {
      // Ignore errors
    }
  }

  // VS Code
  const vsCodePath = 'C:\\ProgramData\\Microsoft\\Windows\\Start Menu\\Programs\\Visual Studio Code';
  if (fs.existsSync(vsCodePath)) {
    try {
      const files = fs.readdirSync(vsCodePath);
      const vscode = files.find(f => f.toLowerCase().includes('visual studio code') && f.endsWith('.lnk'));
      if (vscode) {
        ides.push({ name: 'VSCode', shortcut: path.join(vsCodePath, vscode) });
      }
    } catch (e) {
      // Ignore errors
    }
  }

  return ides;
}

// ============================================================================
// Git Operations
// ============================================================================

/**
 * Execute git command in repo directory
 * Returns trimmed output or null on error/missing .git
 */
function gitExec(repoPath, cmd, timeout = 5000) {
  try {
    const fullPath = path.join(WORKSPACE_ROOT, repoPath);
    if (!fs.existsSync(path.join(fullPath, '.git'))) return null;
    return execSync(cmd, { cwd: fullPath, encoding: 'utf8', timeout, stdio: 'pipe' }).trim();
  } catch (e) {
    return null;
  }
}

function getGitStats(repoPath) {
  try {
    const fullPath = path.join(WORKSPACE_ROOT, repoPath);
    if (!fs.existsSync(path.join(fullPath, '.git'))) {
      return null;
    }

    const result = execSync('git diff --shortstat', {
      cwd: fullPath,
      encoding: 'utf8',
      timeout: 5000,
    }).trim();

    if (!result) {
      // Check for staged changes
      const staged = execSync('git diff --cached --shortstat', {
        cwd: fullPath,
        encoding: 'utf8',
        timeout: 5000,
      }).trim();

      if (!staged) return null;
      return parseGitStats(staged);
    }

    return parseGitStats(result);
  } catch (e) {
    return null;
  }
}

function parseGitStats(output) {
  // Example: "3 files changed, 15 insertions(+), 7 deletions(-)"
  const filesMatch = output.match(/(\d+) files? changed/);
  const addedMatch = output.match(/(\d+) insertions?\(\+\)/);
  const removedMatch = output.match(/(\d+) deletions?\(-\)/);

  return {
    files: filesMatch ? parseInt(filesMatch[1]) : 0,
    added: addedMatch ? parseInt(addedMatch[1]) : 0,
    removed: removedMatch ? parseInt(removedMatch[1]) : 0,
  };
}

async function scanAllDiffs(entries) {
  const diffs = {};
  for (const entry of entries) {
    const stats = getGitStats(entry.path);
    if (stats) {
      diffs[entry.path] = stats;
    }
  }
  return diffs;
}

/**
 * Get list of changed files for a repo
 * Returns array of { file, status } or null
 */
function getChangedFiles(repoPath) {
  try {
    const fullPath = path.join(WORKSPACE_ROOT, repoPath);
    if (!fs.existsSync(path.join(fullPath, '.git'))) {
      return null;
    }

    // Get both staged and unstaged changes
    const result = execSync('git status --porcelain', {
      cwd: fullPath,
      encoding: 'utf8',
      timeout: 5000,
    });

    if (!result || !result.trim()) return null;

    return result.split('\n')
      .filter(line => line.length >= 3) // Skip empty lines
      .map(line => {
        // Git porcelain format: "XY filename"
        // X = index status, Y = worktree status, then space, then filename
        // Examples: " M file.txt", "?? file.txt", "MM file.txt", "A  file.txt"
        line = line.replace(/\r$/, '');
        // Status is first 2 chars, filename starts after space at index 2
        const status = line.slice(0, 2);
        const file = line.slice(3); // Skip "XY "
        return { status, file };
      });
  } catch (e) {
    return null;
  }
}

/**
 * Fetch from remote for a repo
 * Returns true on success, false on error
 */
function gitFetch(repoPath) {
  try {
    const fullPath = path.join(WORKSPACE_ROOT, repoPath);
    execSync('git fetch', {
      cwd: fullPath,
      encoding: 'utf8',
      timeout: 30000,
      stdio: 'pipe',
    });
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Get remote status for a repo
 * Returns { branch, ahead, behind } or null
 */
function getRemoteStatus(repoPath) {
  const branch = gitExec(repoPath, 'git rev-parse --abbrev-ref HEAD');
  if (!branch) return null;

  // Get ahead/behind counts
  let ahead = 0, behind = 0;
  const result = gitExec(repoPath, 'git rev-list --left-right --count HEAD...@{upstream}');
  if (result) {
    const parts = result.split(/\s+/);
    ahead = parseInt(parts[0]) || 0;
    behind = parseInt(parts[1]) || 0;
  }

  return { branch, ahead, behind };
}

/**
 * Detect the default branch for a repo (main, master, etc.)
 * Returns branch name string, defaults to 'main'
 */
function detectDefaultBranch(repoPath) {
  // Try symbolic-ref first (most reliable - gets origin's default)
  const ref = gitExec(repoPath, 'git symbolic-ref refs/remotes/origin/HEAD');
  if (ref) return ref.replace('refs/remotes/origin/', '');

  // Fallback: check if 'main' or 'master' branch exists
  if (gitExec(repoPath, 'git rev-parse --verify main')) return 'main';
  if (gitExec(repoPath, 'git rev-parse --verify master')) return 'master';

  return 'main'; // default assumption
}

/**
 * Get ahead/behind status compared to the default branch
 * Returns { ahead, behind, onMain, error }
 */
function getStatusVsMain(repoPath, currentBranch, defaultBranch) {
  if (currentBranch === defaultBranch) {
    return { ahead: 0, behind: 0, onMain: true, error: false };
  }

  const result = gitExec(repoPath, `git rev-list --left-right --count ${currentBranch}...${defaultBranch}`);
  if (!result) return { ahead: 0, behind: 0, onMain: false, error: true };

  const parts = result.split(/\s+/);
  return {
    ahead: parseInt(parts[0]) || 0,
    behind: parseInt(parts[1]) || 0,
    onMain: false,
    error: false,
  };
}

/**
 * Push a repo to remote
 * Returns { success, message }
 */
function gitPush(repoPath) {
  try {
    const fullPath = path.join(WORKSPACE_ROOT, repoPath);
    execSync('git push', {
      cwd: fullPath,
      encoding: 'utf8',
      timeout: 60000,
      stdio: 'pipe',
    });
    return { success: true, message: 'Pushed successfully' };
  } catch (e) {
    return { success: false, message: e.message || 'Push failed' };
  }
}

/**
 * Scan workspace for git repositories
 * Returns array of { path: string } objects
 */
function scanForRepos() {
  const repos = [];

  function scanDir(dir, relativePath = '') {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        if (entry.name.startsWith('.') && entry.name !== '.git') continue;
        if (entry.name === 'node_modules') continue;

        const fullPath = path.join(dir, entry.name);
        const relPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;

        if (entry.name === '.git') {
          // Found a repo - add the parent path
          repos.push({ path: relativePath || '.' });
          return; // Don't scan inside .git
        }

        // Recurse into subdirectory
        scanDir(fullPath, relPath);
      }
    } catch (e) {
      // Ignore permission errors etc
    }
  }

  scanDir(WORKSPACE_ROOT);
  return repos;
}

/**
 * Save repos.json
 */
function saveRepos(repositories) {
  const paths = getConfigPaths();
  const data = {
    version: '1.0.0',
    updatedAt: new Date().toISOString().split('T')[0],
    repositories,
  };
  saveJson(paths.repos, data);
  return paths.repos;
}

/**
 * Get desktop path for current user
 */
function getDesktopPath() {
  const home = process.env.USERPROFILE || process.env.HOME;
  return path.join(home, 'Desktop');
}

/**
 * Create desktop shortcut as a .cmd file
 * Returns true on success, error message on failure
 */
function createDesktopShortcut(launcherScriptPath) {
  const desktop = getDesktopPath();
  const shortcutPath = path.join(desktop, 'Claude Launcher.cmd');
  const workDir = path.dirname(launcherScriptPath);

  // Simple batch file - font size must be configured in Windows Terminal settings
  const cmdContent = `@echo off
cd /d "${workDir}"
powershell -ExecutionPolicy Bypass -File "${launcherScriptPath}"
`;

  try {
    fs.writeFileSync(shortcutPath, cmdContent, 'utf8');
    return true;
  } catch (e) {
    return `Failed to create shortcut: ${e.message}`;
  }
}

/**
 * Check if desktop shortcut exists
 */
function desktopShortcutExists() {
  const desktop = getDesktopPath();
  const shortcutPath = path.join(desktop, 'Claude Launcher.cmd');
  return fs.existsSync(shortcutPath);
}

// ============================================================================
// Managed Repos Logic
// ============================================================================

/**
 * Get all managed repos (all repos minus unmanaged)
 */
function getManagedRepos(allRepos, unmanagedPaths) {
  return allRepos.filter(r => !unmanagedPaths.includes(r.path));
}

/**
 * Get managed repos that are NOT in entries (shown as "Other managed")
 */
function getOtherManagedRepos(managedRepos, entries) {
  const entryPaths = collectEntryPaths(entries);
  return managedRepos.filter(r => !entryPaths.includes(r.path));
}

/**
 * Create a virtual entry for "Other managed" repos submenu
 */
function createOtherManagedEntry(otherCount) {
  return {
    type: 'other-managed',
    path: '__other_managed__',
    name: `(Other managed - ${otherCount} repos)`,
    ide: null,
  };
}

// ============================================================================
// Launcher Logic
// ============================================================================

const DETACHED_SPAWN = { detached: true, stdio: 'ignore' };

/**
 * Launch entry
 * @param {boolean} detached - If true, spawn in new window and return {success, message}
 *                            If false, run Claude in current terminal and return boolean
 */
function launch(entry, mode, claudeStartupMode, ides, detached = false) {
  const fullPath = path.join(WORKSPACE_ROOT, entry.path);

  if (!fs.existsSync(fullPath)) {
    if (detached) return { success: false, message: `Path not found: ${fullPath}` };
    console.log(`\n${ANSI.red}Error: Path not found: ${fullPath}${ANSI.reset}`);
    return false;
  }

  const ide = ides.find(i => i.name === entry.ide) || ides[0];

  // IDE modes
  if (mode === 'IDE' || mode === 'Claude + IDE') {
    if (!ide) {
      if (detached) return { success: false, message: 'No IDE configured' };
      console.log(`\n${ANSI.red}Error: No IDE configured${ANSI.reset}`);
      return false;
    }

    if (!detached) console.log(`\n${ANSI.magenta}Opening ${entry.name} in ${ide.name}...${ANSI.reset}`);
    spawn('cmd', ['/c', 'start', '', ide.shortcut, fullPath], DETACHED_SPAWN);

    if (mode === 'IDE') {
      return detached ? { success: true, message: `Opened in ${ide.name}` } : true;
    }
  }

  // PowerShell mode
  if (mode === 'PowerShell') {
    if (!detached) console.log(`\n${ANSI.blue}Opening PowerShell in ${entry.name}...${ANSI.reset}`);
    spawn('cmd', ['/c', 'start', 'powershell', '-NoExit', '-Command', `Set-Location '${fullPath}'`], DETACHED_SPAWN);
    return detached ? { success: true, message: 'Opened PowerShell' } : true;
  }

  // Claude modes
  const command = parseStartupMode(claudeStartupMode);

  if (detached) {
    // Spawn Claude in new PowerShell window
    const claudeCmd = command ? `claude ${command}` : 'claude';
    spawn('cmd', ['/c', 'start', 'powershell', '-NoExit', '-Command',
      `Set-Location '${fullPath}'; ${claudeCmd}`], DETACHED_SPAWN);
    const modeDesc = mode === 'Claude + IDE' ? `${ide?.name || 'IDE'} + Claude` : 'Claude';
    return { success: true, message: `Opened ${modeDesc}` };
  }

  // Run Claude in current terminal (takes over)
  const claudeArgs = command ? [command] : [];
  console.log(`\n${ANSI.green}Running Claude${command ? ` with ${command}` : ''}...${ANSI.reset}`);
  process.chdir(fullPath);
  process.stdin.removeAllListeners('keypress');
  process.stdin.pause();
  const claude = spawn('claude', claudeArgs, { stdio: 'inherit', shell: true });
  claude.on('exit', code => process.exit(code));
  return true;
}

// ============================================================================
// UI Rendering
// ============================================================================

function formatStats(stats) {
  if (!stats) return '';
  return `${ANSI.green}+${stats.added}${ANSI.reset}/${ANSI.yellow}-${stats.removed}${ANSI.reset} (${stats.files})`;
}

function render(state) {
  // Dispatch to appropriate render based on mode
  if (state.firstRunPrompt) {
    renderFirstRunPrompt(state);
  } else if (state.configMode) {
    renderConfigMenu(state);
  } else if (state.groupConfirmMode) {
    renderGroupConfirm(state);
  } else if (state.addEntryMode) {
    renderAddEntry(state);
  } else if (state.nestPickerMode) {
    renderNestPicker(state);
  } else if (state.editNameMode) {
    renderEditName(state);
  } else if (state.entriesEditMode) {
    renderEntriesEditMode(state);
  } else if (state.startupModesEditMode) {
    renderStartupModesEdit(state);
  } else if (state.remoteStatusMode) {
    renderRemoteStatus(state);
  } else if (state.managementMode) {
    renderManagementMode(state);
  } else if (state.otherManagedMode) {
    renderOtherManagedMode(state);
  } else {
    renderMainMenu(state);
  }
}

function renderFirstRunPrompt(state) {
  const lines = [];

  lines.push(`${ANSI.bold}${ANSI.cyan}Welcome to Claude Launcher!${ANSI.reset}`);
  lines.push(SEP60);
  lines.push('');
  lines.push('Would you like to create a desktop shortcut?');
  lines.push('');
  lines.push(`${ANSI.dim}This lets you launch directly from your desktop.${ANSI.reset}`);
  lines.push('');
  lines.push(SEP60);
  lines.push('');
  lines.push(`${ANSI.green}y${ANSI.reset} - Yes, create shortcut`);
  lines.push(`${ANSI.yellow}n${ANSI.reset} - No, skip (can create later in config)`);

  printScreen(lines);
}

function formatTimeAgo(timestamp) {
  if (!timestamp) return null;
  const ago = Math.floor((Date.now() - timestamp) / 1000);
  if (ago < 60) return `${ago}s ago`;
  if (ago < 3600) return `${Math.floor(ago / 60)}m ago`;
  if (ago < 86400) return `${Math.floor(ago / 3600)}h ago`;
  return `${Math.floor(ago / 86400)}d ago`;
}

function renderMainMenu(state) {
  const { flattenedEntries, selectedIndex, mode, claudeStartupMode, diffs, diffsLastScan, scanning } = state;

  const lines = [];

  // Header (Cyan like original)
  lines.push(`\n${ANSI.cyan}Select a repository to run:${ANSI.reset}`);
  lines.push(SEP40);

  // Entry list
  flattenedEntries.forEach((item, i) => {
    const { entry, depth, parent } = item;
    const isSelected = i === selectedIndex;
    const prefix = isSelected ? '> ' : '  ';
    const indent = '  '.repeat(depth);
    const num = `${i + 1}.`;

    // Expand/collapse indicator for entries with children
    let expandIndicator = '';
    if (entry.children && entry.children.length > 0) {
      expandIndicator = entry.expanded ? '- ' : '+ ';
    }

    // Display name - strip parent prefix for nested entries
    let displayName = entry.name;
    if (parent && parent.name && entry.path) {
      const parentPrefix = parent.name + '/';
      if (displayName.startsWith(parentPrefix)) {
        displayName = displayName.slice(parentPrefix.length);
      }
    }

    // Color: selected = white, unselected = yellow, other-managed = dim yellow
    const isOtherManaged = entry.type === 'other-managed';
    let nameColor;
    if (isSelected) {
      nameColor = ANSI.white;
    } else if (isOtherManaged) {
      nameColor = ANSI.dim + ANSI.yellow;
    } else {
      nameColor = ANSI.yellow;
    }

    // Stats - check repo path or group key
    let stats = '';
    if (!isOtherManaged) {
      const diffKey = entry.path || `__group_${entry.name}`;
      if (diffs[diffKey]) {
        stats = ' ' + formatStats(diffs[diffKey]);
      }
    }

    // IDE suffix - show on selected item when in IDE modes
    let ideSuffix = '';
    if (isSelected && !isOtherManaged && (mode === 'IDE' || mode === 'Claude + IDE')) {
      ideSuffix = ` ${ANSI.gray}(${entry.ide || 'WebStorm'})${ANSI.reset}`;
    }

    lines.push(`${prefix}${num} ${expandIndicator}${indent}${nameColor}${displayName}${ANSI.reset}${ideSuffix}${stats}`);
  });

  lines.push(SEP40);

  // Compact mode display: [Claude][none]
  const modeColors = {
    'Claude': ANSI.green,
    'IDE': ANSI.magenta,
    'Claude + IDE': ANSI.cyan,
    'PowerShell': ANSI.blue,
  };
  const modeColor = modeColors[mode] || ANSI.white;
  let modeDisplay = `${modeColor}[${mode}]${ANSI.reset}`;
  if (mode === 'Claude' || mode === 'Claude + IDE') {
    modeDisplay += `${ANSI.yellow}[${claudeStartupMode}]${ANSI.reset}`;
  }

  lines.push(`\n${modeColor}Current Mode: ${modeDisplay}${ANSI.reset}`);

  // Help line (Gray like original)
  lines.push(`${ANSI.gray}Tab/w: mode | c: startup | Up/Down: nav | Enter: select | n: new window | q: quit${ANSI.reset}`);
  lines.push(`${ANSI.gray}Left/Right: expand/collapse | d: git diff | Space: files | r: remote | f: config${ANSI.reset}`);

  // Git diffs timestamp
  const hasDiffs = diffs && Object.keys(diffs).length > 0;
  if (scanning) {
    lines.push(`\n${ANSI.yellow}Scanning for changes...${ANSI.reset}`);
  } else if (diffsLastScan) {
    lines.push('');
    lines.push(`${ANSI.dim}Git diffs scanned ${formatTimeAgo(diffsLastScan)}${ANSI.reset}`);
  } else if (hasDiffs) {
    lines.push('');
    lines.push(`${ANSI.dim}Git diffs: scan time unknown${ANSI.reset}`);
  }

  // Changed files display
  if (state.showChangedFiles && state.changedFiles && state.changedFiles.length > 0) {
    lines.push('');
    lines.push(`${ANSI.cyan}Changed files in ${state.changedFilesPath}:${ANSI.reset}`);
    state.changedFiles.forEach(({ status, file }) => {
      const statusColor = status.includes('?') ? ANSI.green :
                          status.includes('D') ? ANSI.red :
                          status.includes('A') ? ANSI.green :
                          ANSI.yellow;
      // Status is 2 chars from git, pad to ensure alignment
      const paddedStatus = status.padEnd(2);
      lines.push(`  ${statusColor}${paddedStatus}${ANSI.reset} ${file}`);
    });
  }

  // Launch message (from Shift+Enter multi-select)
  if (state.lastLaunchMessage) {
    lines.push('');
    lines.push(`${ANSI.green}${state.lastLaunchMessage}${ANSI.reset}`);
  }

  // Clear and print
  printScreen(lines);
}

function renderOtherManagedMode(state) {
  const { otherManagedRepos, otherManagedSelectedIndex, mode, diffs, ides } = state;

  const lines = [];

  lines.push(`${ANSI.bold}${ANSI.yellow}Other Managed Repositories:${ANSI.reset}`);
  lines.push(SEP60);

  otherManagedRepos.forEach((repo, i) => {
    const isSelected = i === otherManagedSelectedIndex;
    const prefix = isSelected ? `${ANSI.cyan}>${ANSI.reset}` : ' ';
    const num = `${i + 1}.`;
    const name = isSelected
      ? `${ANSI.bold}${ANSI.white}${repo.path}${ANSI.reset}`
      : repo.path;

    // Stats
    const stats = diffs[repo.path] ? formatStats(diffs[repo.path]) : '';
    const padding = ' '.repeat(Math.max(0, 40 - repo.path.length));

    lines.push(`${prefix} ${num} ${name}${padding}${stats}`);
  });

  lines.push(SEP60);
  lines.push('');
  lines.push(`${ANSI.dim}Enter: select | Up/Down: navigate | Esc/q: back${ANSI.reset}`);

  printScreen(lines);
}

function renderManagementMode(state) {
  const { allRepos, unmanagedPaths, managementSelectedIndex } = state;

  const lines = [];

  lines.push(`${ANSI.bold}${ANSI.magenta}Manage Repositories:${ANSI.reset}`);
  lines.push(SEP60);

  allRepos.forEach((repo, i) => {
    const isSelected = i === managementSelectedIndex;
    const isManaged = !unmanagedPaths.includes(repo.path);
    const checkbox = isManaged ? `${ANSI.green}[x]${ANSI.reset}` : `${ANSI.gray}[ ]${ANSI.reset}`;
    const prefix = isSelected ? `${ANSI.cyan}>${ANSI.reset}` : ' ';
    const num = `${i + 1}.`;

    let name = repo.path;
    if (isSelected) {
      name = `${ANSI.bold}${ANSI.white}${repo.path}${ANSI.reset}`;
    } else if (!isManaged) {
      name = `${ANSI.gray}${repo.path}${ANSI.reset}`;
    }

    const hiddenLabel = !isManaged ? `${ANSI.dim} (hidden)${ANSI.reset}` : '';

    lines.push(`${prefix} ${checkbox} ${num} ${name}${hiddenLabel}`);
  });

  lines.push(SEP60);
  lines.push('');
  lines.push(`${ANSI.dim}Space: toggle | Enter: save & exit | Esc/q: cancel${ANSI.reset}`);

  printScreen(lines);
}

function renderConfigMenu(state) {
  const { configSelectedIndex, configStatus } = state;

  const configOptions = [
    { key: '1', name: 'Edit entries', description: 'Add, edit, remove, reorder entries' },
    { key: '2', name: 'Manage repositories', description: 'Show/hide repos from main menu' },
    { key: '3', name: 'Scan for repositories', description: 'Find all git repos in workspace' },
    { key: '4', name: 'Create desktop shortcut', description: 'Add launcher to desktop' },
    { key: '5', name: 'Edit startup modes', description: 'Configure Claude startup commands' },
  ];

  const lines = [];

  lines.push(`${ANSI.bold}${ANSI.blue}Configuration:${ANSI.reset}`);
  lines.push(SEP60);

  configOptions.forEach((opt, i) => {
    const isSelected = i === configSelectedIndex;
    const prefix = isSelected ? `${ANSI.cyan}>${ANSI.reset}` : ' ';
    const name = isSelected
      ? `${ANSI.bold}${ANSI.white}${opt.name}${ANSI.reset}`
      : opt.name;
    const desc = `${ANSI.dim}${opt.description}${ANSI.reset}`;

    lines.push(`${prefix} ${opt.key}. ${name}`);
    lines.push(`     ${desc}`);
  });

  lines.push(SEP60);

  // Status message
  if (configStatus) {
    lines.push('');
    lines.push(`${ANSI.yellow}${configStatus}${ANSI.reset}`);
  }

  lines.push('');
  lines.push(`${ANSI.dim}Enter: select | Up/Down: navigate | Esc/q: back${ANSI.reset}`);

  printScreen(lines);
}

function renderGroupConfirm(state) {
  const { groupConfirmPrefix, groupConfirmMatches } = state;
  const lines = [];

  lines.push(`${ANSI.bold}${ANSI.yellow}Create Group:${ANSI.reset}`);
  lines.push(SEP60);
  lines.push('');
  lines.push(`Create group "${ANSI.cyan}${groupConfirmPrefix}${ANSI.reset}" with these entries?`);
  lines.push('');

  groupConfirmMatches.forEach(entry => {
    lines.push(`  ${ANSI.dim}-${ANSI.reset} ${entry.name} ${ANSI.dim}(${entry.path})${ANSI.reset}`);
  });

  lines.push('');
  lines.push(SEP60);
  lines.push('');
  lines.push(`${ANSI.green}y${ANSI.reset}: create group | ${ANSI.red}n${ANSI.reset}/Esc: cancel`);

  printScreen(lines);
}

function renderAddEntry(state) {
  const { addEntryOptions, addEntrySelectedIndex } = state;
  const lines = [];

  lines.push(`${ANSI.bold}${ANSI.green}Add Entry:${ANSI.reset}`);
  lines.push(SEP60);

  if (addEntryOptions.length === 0) {
    lines.push(`${ANSI.dim}  No managed repos available to add${ANSI.reset}`);
  } else {
    addEntryOptions.forEach((repo, i) => {
      const isSelected = i === addEntrySelectedIndex;
      const prefix = isSelected ? `${ANSI.cyan}>${ANSI.reset}` : ' ';
      const name = isSelected
        ? `${ANSI.bold}${ANSI.white}${repo.path}${ANSI.reset}`
        : repo.path;
      lines.push(`${prefix} ${i + 1}. ${name}`);
    });
  }

  lines.push(SEP60);
  lines.push('');
  lines.push(`${ANSI.dim}Enter: add | Up/Down: navigate | Esc/q: cancel${ANSI.reset}`);

  printScreen(lines);
}

function renderNestPicker(state) {
  const { nestPickerOptions, nestPickerSelectedIndex, nestPickerEntry } = state;
  const lines = [];

  lines.push(`${ANSI.bold}${ANSI.magenta}Move Entry:${ANSI.reset}`);
  lines.push(SEP60);
  lines.push(`Moving: ${ANSI.cyan}${nestPickerEntry.name}${ANSI.reset}`);
  lines.push('');
  lines.push('Select destination:');
  lines.push('');

  nestPickerOptions.forEach((opt, i) => {
    const isSelected = i === nestPickerSelectedIndex;
    const prefix = isSelected ? `${ANSI.cyan}>${ANSI.reset}` : ' ';
    const indent = '  '.repeat(opt.depth || 0);
    const name = isSelected
      ? `${ANSI.bold}${ANSI.white}${opt.name}${ANSI.reset}`
      : opt.name;
    lines.push(`${prefix} ${i + 1}. ${indent}${name}`);
  });

  lines.push(SEP60);
  lines.push('');
  lines.push(`${ANSI.dim}Enter: move here | Up/Down: navigate | Esc/q: cancel${ANSI.reset}`);

  printScreen(lines);
}

function renderEditName(state) {
  const { editNameEntry, editNameBuffer } = state;
  const lines = [];

  lines.push(`${ANSI.bold}${ANSI.blue}Edit Name:${ANSI.reset}`);
  lines.push(SEP60);
  lines.push('');
  lines.push(`Entry: ${ANSI.dim}${editNameEntry.path || '(group)'}${ANSI.reset}`);
  lines.push('');
  lines.push(`Name: ${ANSI.cyan}${editNameBuffer}${ANSI.reset}${ANSI.bold}_${ANSI.reset}`);
  lines.push('');
  lines.push(SEP60);
  lines.push('');
  lines.push(`${ANSI.dim}Type to edit | Enter: save | Esc: cancel${ANSI.reset}`);

  printScreen(lines);
}

function renderEntriesEditMode(state) {
  const { entries, entriesEditSelectedIndex, ides } = state;

  // Flatten entries for editing display
  const flatEdit = flattenEntries(entries);

  const lines = [];

  lines.push(`${ANSI.bold}${ANSI.green}Edit Entries:${ANSI.reset}`);
  lines.push(SEP60);

  if (flatEdit.length === 0) {
    lines.push(`${ANSI.dim}  No entries configured${ANSI.reset}`);
  } else {
    const numWidth = String(flatEdit.length).length;
    flatEdit.forEach((item, i) => {
      const { entry, depth, parent } = item;
      const isSelected = i === entriesEditSelectedIndex;
      const prefix = isSelected ? `${ANSI.cyan}>${ANSI.reset}` : ' ';
      const indent = '  '.repeat(depth);
      const num = `${String(i + 1).padStart(numWidth)}.`;

      // Expand indicator
      let expandIndicator = '  ';
      if (entry.children && entry.children.length > 0) {
        expandIndicator = entry.expanded
          ? `${ANSI.dim}- ${ANSI.reset}`
          : `${ANSI.dim}+ ${ANSI.reset}`;
      }

      // Display name - strip parent prefix for nested entries
      let displayName = entry.name;
      if (parent && parent.name && entry.path) {
        const parentPrefix = parent.name + '/';
        if (displayName.startsWith(parentPrefix)) {
          displayName = displayName.slice(parentPrefix.length);
        }
      }

      const name = isSelected
        ? `${ANSI.bold}${ANSI.white}${displayName}${ANSI.reset}`
        : displayName;

      const ideSuffix = `${ANSI.dim} [${entry.ide || 'WebStorm'}]${ANSI.reset}`;

      lines.push(`${prefix} ${num} ${expandIndicator}${indent}${name}${ideSuffix}`);
    });
  }

  lines.push(SEP60);

  // Selected entry card
  const selectedItem = flatEdit[entriesEditSelectedIndex];
  if (selectedItem) {
    const entry = selectedItem.entry;
    const isGroup = entry.type === 'group' || !entry.path;
    lines.push('');
    if (isGroup) {
      const childCount = entry.children ? entry.children.length : 0;
      lines.push(`  ${ANSI.cyan}${entry.name}${ANSI.reset} ${ANSI.dim}(group, ${childCount} items)${ANSI.reset}`);
    } else {
      lines.push(`  ${ANSI.cyan}${entry.name}${ANSI.reset}`);
      lines.push(`  ${ANSI.dim}path:${ANSI.reset} ${entry.path}`);
      lines.push(`  ${ANSI.dim}IDE:${ANSI.reset}  ${entry.ide || 'WebStorm'}`);
    }
    lines.push('');
  }

  lines.push(SEP60);
  lines.push(`${ANSI.dim}u/d: move | a: add | x: remove | g: group | n: nest | f: flatten | e: rename | i: IDE${ANSI.reset}`);
  lines.push(`${ANSI.dim}Left/Right: collapse/expand | Enter: save | Esc/q: cancel${ANSI.reset}`);

  printScreen(lines);
}

function renderStartupModesEdit(state) {
  const { claudeStartupModes, startupModesEditSelectedIndex, startupModesEditBuffer, startupModesEditMode: editingName } = state;
  const lines = [];

  lines.push(`${ANSI.bold}${ANSI.green}Edit Startup Modes:${ANSI.reset}`);
  lines.push(SEP60);

  if (editingName) {
    // Inline editing mode
    lines.push('');
    lines.push(`Editing mode name:`);
    lines.push(`${ANSI.cyan}${startupModesEditBuffer}${ANSI.reset}${ANSI.bold}_${ANSI.reset}`);
    lines.push('');
    lines.push(`${ANSI.dim}Type to edit | Enter: save | Esc: cancel${ANSI.reset}`);
  } else {
    // List view
    if (claudeStartupModes.length === 0) {
      lines.push(`${ANSI.dim}  No startup modes configured${ANSI.reset}`);
    } else {
      claudeStartupModes.forEach((mode, i) => {
        const isSelected = i === startupModesEditSelectedIndex;
        const prefix = isSelected ? `${ANSI.cyan}>${ANSI.reset}` : ' ';
        const name = isSelected
          ? `${ANSI.bold}${ANSI.white}${mode}${ANSI.reset}`
          : mode;
        const command = parseStartupMode(mode);
        const cmdDisplay = command ? `${ANSI.dim} → ${command}${ANSI.reset}` : `${ANSI.dim} → (no command)${ANSI.reset}`;
        lines.push(`${prefix} ${i + 1}. ${name}${cmdDisplay}`);
      });
    }

    lines.push(SEP60);
    lines.push('');
    lines.push(`${ANSI.dim}a: add | x: remove | e: edit | u/d: move${ANSI.reset}`);
    lines.push(`${ANSI.dim}Enter: save | Esc/q: cancel${ANSI.reset}`);
  }

  printScreen(lines);
}

function renderRemoteStatus(state) {
  const { remoteStatusRepos, remoteStatusSelectedIndex, remoteStatusFetching, remoteStatusPushing, remoteStatusMessage, remoteStatusLastFetch } = state;
  const lines = [];

  // Header with last fetch time
  let headerSuffix = '';
  const timeAgo = formatTimeAgo(remoteStatusLastFetch);
  if (timeAgo) {
    headerSuffix = ` ${ANSI.dim}(fetched ${timeAgo})${ANSI.reset}`;
  }
  lines.push(`${ANSI.bold}${ANSI.blue}Remote Status:${ANSI.reset}${headerSuffix}`);
  lines.push(`${ANSI.dim}${'='.repeat(85)}${ANSI.reset}`);

  if (remoteStatusRepos.length === 0) {
    lines.push('');
    lines.push(`${ANSI.dim}No repositories to display${ANSI.reset}`);
    lines.push('');
  } else {
    // Render table (even during fetch/push, show current data)
    renderRemoteTable(lines, state);
  }

  // Show changed files for selected repo (if toggled)
  if (state.showRemoteChangedFiles && state.remoteChangedFiles && state.remoteChangedFiles.length > 0) {
    lines.push('');
    lines.push(`${ANSI.cyan}Changed files in ${state.remoteChangedFilesPath}:${ANSI.reset}`);
    state.remoteChangedFiles.forEach(({ status, file }) => {
      // Color based on status type
      const statusColor = status.includes('?') ? ANSI.green :        // untracked
                          status.includes('D') ? ANSI.red :          // deleted
                          status.includes('A') ? ANSI.green :        // added
                          ANSI.yellow;                               // modified
      const paddedStatus = status.padEnd(2);
      lines.push(`  ${statusColor}${paddedStatus}${ANSI.reset} ${file}`);
    });
  }

  lines.push(`${ANSI.dim}${'='.repeat(85)}${ANSI.reset}`);

  // Status message (includes fetching/pushing indicators)
  if (remoteStatusFetching) {
    lines.push('');
    lines.push(`${ANSI.yellow}Fetching from remotes...${ANSI.reset}`);
  } else if (remoteStatusPushing) {
    lines.push('');
    lines.push(`${ANSI.yellow}Pushing to remotes...${ANSI.reset}`);
  } else if (remoteStatusMessage) {
    lines.push('');
    lines.push(`${ANSI.yellow}${remoteStatusMessage}${ANSI.reset}`);
  }

  // Count repos that can be pushed
  const pushableCount = remoteStatusRepos.filter(r => r.ahead > 0).length;

  lines.push('');
  if (pushableCount > 0) {
    lines.push(`${ANSI.dim}Space: files | p: push all (${pushableCount}) | f: fetch | Esc/q: back${ANSI.reset}`);
  } else {
    lines.push(`${ANSI.dim}Space: show files | f: fetch all | Esc/q: back${ANSI.reset}`);
  }

  printScreen(lines);
}

function renderRemoteTable(lines, state) {
  const { remoteStatusRepos, remoteStatusSelectedIndex } = state;

  // Calculate column widths for alignment
  const maxNameLen = Math.min(35, Math.max(...remoteStatusRepos.map(r => r.name.length), 4));
  const maxBranchLen = Math.min(15, Math.max(...remoteStatusRepos.map(r => (r.branch || '').length), 6));

  // Column headers
  const repoHeader = 'REPO'.padEnd(maxNameLen);
  const branchHeader = 'BRANCH'.padEnd(maxBranchLen);
  lines.push(`  ${ANSI.dim}${repoHeader}  ${branchHeader}  SYNC      VS MAIN   CHANGES${ANSI.reset}`);

  remoteStatusRepos.forEach((repo, i) => {
    const isSelected = i === remoteStatusSelectedIndex;
    const prefix = isSelected ? `${ANSI.cyan}>${ANSI.reset}` : ' ';

    // Name column
    let displayName = repo.name.length > 35 ? repo.name.slice(-35) : repo.name;
    displayName = displayName.padEnd(maxNameLen);

    const nameColor = isSelected
      ? `${ANSI.bold}${ANSI.white}`
      : ANSI.yellow;

    // Branch column
    const branch = (repo.branch || 'unknown').padEnd(maxBranchLen);

    // Ahead/behind indicators vs upstream - show = for in sync
    let syncStatus = '';
    let syncRawLen = 1; // length without ANSI codes
    if (repo.ahead > 0 || repo.behind > 0) {
      if (repo.ahead > 0) {
        syncStatus += `${ANSI.green}↑${repo.ahead}${ANSI.reset}`;
        syncRawLen += 1 + String(repo.ahead).length;
      }
      if (repo.behind > 0) {
        syncStatus += `${ANSI.red}↓${repo.behind}${ANSI.reset}`;
        syncRawLen += 1 + String(repo.behind).length;
      }
    } else {
      syncStatus = `${ANSI.dim}=${ANSI.reset}`;  // = means in sync
    }
    const syncPadding = ' '.repeat(Math.max(0, 10 - syncRawLen));

    // VS MAIN column - show ahead/behind compared to default branch
    let vsMainStatus = '';
    let vsMainRawLen = 1;
    if (repo.vsMain) {
      if (repo.vsMain.onMain) {
        vsMainStatus = `${ANSI.dim}-${ANSI.reset}`;  // on main branch
      } else if (repo.vsMain.error) {
        vsMainStatus = `${ANSI.dim}?${ANSI.reset}`;  // error getting status
      } else if (repo.vsMain.ahead > 0 || repo.vsMain.behind > 0) {
        if (repo.vsMain.ahead > 0) {
          vsMainStatus += `${ANSI.cyan}↑${repo.vsMain.ahead}${ANSI.reset}`;
          vsMainRawLen += 1 + String(repo.vsMain.ahead).length;
        }
        if (repo.vsMain.behind > 0) {
          vsMainStatus += `${ANSI.magenta}↓${repo.vsMain.behind}${ANSI.reset}`;
          vsMainRawLen += 1 + String(repo.vsMain.behind).length;
        }
      } else {
        vsMainStatus = `${ANSI.dim}=${ANSI.reset}`;  // in sync with main
      }
    } else {
      vsMainStatus = `${ANSI.dim}-${ANSI.reset}`;
    }
    const vsMainPadding = ' '.repeat(Math.max(0, 10 - vsMainRawLen));

    // Local changes
    let changesDisplay = '';
    if (repo.changes) {
      changesDisplay = `${ANSI.green}+${repo.changes.added}${ANSI.reset}/${ANSI.yellow}-${repo.changes.removed}${ANSI.reset}`;
    }

    lines.push(`${prefix} ${nameColor}${displayName}${ANSI.reset}  ${ANSI.dim}${branch}${ANSI.reset}  ${syncStatus}${syncPadding}${vsMainStatus}${vsMainPadding}${changesDisplay}`);
  });
}

// ============================================================================
// Main Application
// ============================================================================

async function main() {
  const args = parseArgs(process.argv.slice(2));

  // Handle help
  if (args.help) {
    console.log(`
Claude Root Launcher

Usage: node launcher.js --workspace-root <path> --state-dir <path> [options]

Required:
  --workspace-root  Workspace root directory (where repos live)
  --state-dir       Plugin state directory (for config files)

Options:
  --setup     Run interactive setup wizard
  --config    Show current configuration
  --help      Show this help message

Note: Use the wrapper scripts (launcher.ps1 / launcher.sh) which
automatically provide the correct paths from your workspace root.
`);
    return;
  }

  // Validate required args
  if (!args.workspaceRoot || !args.stateDir) {
    console.error(`${ANSI.red}Error: --workspace-root and --state-dir are required.${ANSI.reset}`);
    console.error(`${ANSI.yellow}Use the wrapper script: ./launcher.ps1 (Windows) or ./launcher.sh (Unix)${ANSI.reset}`);
    console.error(`Or run with --help for usage information.`);
    process.exit(1);
  }

  // Set global paths
  WORKSPACE_ROOT = args.workspaceRoot;
  STATE_DIR = args.stateDir;
  LAUNCHER_SCRIPT = args.launcherScript;

  // Ensure state directory exists
  if (!fs.existsSync(STATE_DIR)) {
    fs.mkdirSync(STATE_DIR, { recursive: true });
  }

  if (args.config) {
    const { config } = loadConfig();
    console.log(JSON.stringify(config, null, 2));
    return;
  }

  if (args.setup) {
    await runSetup();
    return;
  }

  // Load config
  const { config, repos: reposData, cache } = loadConfig();

  if (!config.entries || config.entries.length === 0) {
    console.log(`${ANSI.yellow}No entries configured. Run with --setup to configure.${ANSI.reset}`);
    return;
  }

  // Compute managed/other repos
  const allRepos = reposData.repositories || [];
  const managedRepos = getManagedRepos(allRepos, config.unmanagedPaths || []);
  const otherManagedRepos = getOtherManagedRepos(managedRepos, config.entries);

  // Flatten entries for display (with depth info)
  const flattenedEntries = flattenEntries(config.entries);
  // Add "Other managed" virtual entry at the end if any
  if (otherManagedRepos.length > 0) {
    flattenedEntries.push({
      entry: createOtherManagedEntry(otherManagedRepos.length),
      depth: 0,
      parent: null,
      indexInParent: -1,
    });
  }

  // App state
  const state = {
    entries: config.entries,           // Curated entries from config (tree structure)
    flattenedEntries: flattenedEntries, // Flattened for display
    allRepos: allRepos,                // All repos from repos.json
    unmanagedPaths: config.unmanagedPaths || [],
    otherManagedRepos: otherManagedRepos,
    selectedIndex: 0,
    mode: config.modes[0],
    claudeStartupMode: config.claudeStartupModes[0],
    modes: config.modes,
    claudeStartupModes: config.claudeStartupModes,
    ides: config.ides || [],
    // Cache-backed state
    diffs: cache.diffs.data || {},
    diffsLastScan: cache.diffs.lastScan,
    scanning: false,
    // Changed files display state
    showChangedFiles: false,       // toggle with 'l' key
    changedFilesPath: null,        // path of entry showing files
    changedFiles: null,            // array of { status, file }
    // Config menu state
    configMode: false,
    configSelectedIndex: 0,
    configStatus: null, // Status message to display
    // Entries editing mode state
    entriesEditMode: false,
    entriesEditSelectedIndex: 0,
    // Sub-modes within entries edit
    groupConfirmMode: false,      // 'g' key - confirm group creation
    groupConfirmPrefix: null,     // prefix to group by
    groupConfirmMatches: [],      // entries that would be grouped
    addEntryMode: false,          // 'a' key - pick repo to add
    addEntrySelectedIndex: 0,
    addEntryOptions: [],          // managed repos not in entries
    nestPickerMode: false,        // 'n' key - pick parent for entry
    nestPickerSelectedIndex: 0,
    nestPickerEntry: null,        // entry being moved
    nestPickerOptions: [],        // available parents
    editNameMode: false,          // 'e' key - inline name edit
    editNameBuffer: '',           // current text input
    editNameEntry: null,          // entry being renamed
    // Management mode state (repos visibility)
    managementMode: false,
    managementSelectedIndex: 0,
    // Other managed submenu state
    otherManagedMode: false,
    otherManagedSelectedIndex: 0,
    // Startup modes edit state
    startupModesEditMode: false,         // false = not editing, 'list' = list view, 'edit' = editing name
    startupModesEditSelectedIndex: 0,
    startupModesEditBuffer: '',          // current text input for new/edit mode
    // Remote status mode state (cache-backed)
    remoteStatusMode: false,
    remoteStatusSelectedIndex: 0,
    remoteStatusRepos: [],               // flat list of { path, name, branch, ahead, behind, changes }
    remoteStatusFetching: false,
    remoteStatusPushing: false,
    remoteStatusMessage: null,           // status message to display
    remoteStatusLastFetch: cache.remoteStatus.lastFetch,  // timestamp from cache
    remoteStatusCache: cache.remoteStatus.data || {},     // cached remote status by path
    // Remote changed files state (for R screen)
    remoteChangedFiles: null,           // array of { status, file }
    remoteChangedFilesPath: null,       // path of repo showing changed files
    showRemoteChangedFiles: false,      // toggle state
    // First-run prompt state
    firstRunPrompt: false,
  };

  // Set up input
  readline.emitKeypressEvents(process.stdin);
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }

  // Check for first-run shortcut prompt
  const showShortcutPrompt = LAUNCHER_SCRIPT && !desktopShortcutExists() && !config.shortcutPromptShown;

  // Initial render
  render(state);

  // First-run shortcut prompt
  if (showShortcutPrompt) {
    state.firstRunPrompt = true;
    renderFirstRunPrompt(state);
  }

  // Helper to refresh flattened entries and other managed repos
  function refreshFlattenedEntries() {
    const managedRepos = getManagedRepos(state.allRepos, state.unmanagedPaths);
    state.otherManagedRepos = getOtherManagedRepos(managedRepos, state.entries);

    // Rebuild flattened entries
    state.flattenedEntries = flattenEntries(state.entries);
    if (state.otherManagedRepos.length > 0) {
      state.flattenedEntries.push({
        entry: createOtherManagedEntry(state.otherManagedRepos.length),
        depth: 0,
        parent: null,
        indexInParent: -1,
      });
    }

    // Clamp selection index
    if (state.selectedIndex >= state.flattenedEntries.length) {
      state.selectedIndex = Math.max(0, state.flattenedEntries.length - 1);
    }
  }

  // Helper to save config
  function saveConfig() {
    const configPaths = getConfigPaths();
    const existingConfig = loadJson(configPaths.config, {});
    existingConfig.unmanagedPaths = state.unmanagedPaths;
    existingConfig.entries = state.entries;
    saveJson(configPaths.config, existingConfig);
  }

  // Handle keypresses
  process.stdin.on('keypress', async (str, key) => {
    if (!key) return;

    // Ctrl+C - always exit
    if (key.ctrl && key.name === 'c') {
      console.log('\nBye!');
      process.exit(0);
    }

    // First-run prompt keys
    if (state.firstRunPrompt) {
      if (str === 'y' || str === 'Y') {
        // Create shortcut
        const result = createDesktopShortcut(LAUNCHER_SCRIPT);
        state.firstRunPrompt = false;
        if (result === true) {
          // Show success briefly then main menu
          process.stdout.write(ANSI.clear);
          console.log(`${ANSI.green}Desktop shortcut created!${ANSI.reset}`);
          setTimeout(() => render(state), 1500);
        } else {
          process.stdout.write(ANSI.clear);
          console.log(`${ANSI.red}${result}${ANSI.reset}`);
          setTimeout(() => render(state), 2000);
        }
        // Mark as shown
        const configPaths = getConfigPaths();
        const existingConfig = loadJson(configPaths.config, {});
        existingConfig.shortcutPromptShown = true;
        saveJson(configPaths.config, existingConfig);
      } else if (str === 'n' || str === 'N' || key.name === 'escape') {
        // Skip shortcut
        state.firstRunPrompt = false;
        // Mark as shown
        const configPaths = getConfigPaths();
        const existingConfig = loadJson(configPaths.config, {});
        existingConfig.shortcutPromptShown = true;
        saveJson(configPaths.config, existingConfig);
        render(state);
      }
      return;
    }

    // Management mode keys
    if (state.managementMode) {
      switch (key.name) {
        case 'up':
          state.managementSelectedIndex = Math.max(0, state.managementSelectedIndex - 1);
          render(state);
          break;

        case 'down':
          state.managementSelectedIndex = Math.min(state.allRepos.length - 1, state.managementSelectedIndex + 1);
          render(state);
          break;

        case 'space':
          // Toggle managed/unmanaged for selected repo
          const repo = state.allRepos[state.managementSelectedIndex];
          if (repo) {
            const idx = state.unmanagedPaths.indexOf(repo.path);
            if (idx === -1) {
              // Currently managed -> make unmanaged
              state.unmanagedPaths.push(repo.path);
              // Also remove from entries if present
              state.entries = state.entries.filter(e => e.path !== repo.path);
            } else {
              // Currently unmanaged -> make managed
              state.unmanagedPaths.splice(idx, 1);
            }
            refreshFlattenedEntries();
          }
          render(state);
          break;

        case 'return':
          // Save and exit management mode
          saveConfig();
          state.managementMode = false;
          state.managementSelectedIndex = 0;
          refreshFlattenedEntries();
          render(state);
          break;

        case 'escape':
        case 'q':
          // Exit without saving (revert changes)
          // Reload config to discard changes
          const { config: reloadedConfig } = loadConfig();
          state.unmanagedPaths = reloadedConfig.unmanagedPaths || [];
          state.entries = reloadedConfig.entries || [];
          refreshFlattenedEntries();
          state.managementMode = false;
          state.managementSelectedIndex = 0;
          render(state);
          break;

        default:
          // Number keys
          const num = parseInt(str, 10);
          if (num >= 1 && num <= state.allRepos.length) {
            state.managementSelectedIndex = num - 1;
            render(state);
          }
      }
      return;
    }

    // Other managed submenu keys
    if (state.otherManagedMode) {
      switch (key.name) {
        case 'up':
          state.otherManagedSelectedIndex = Math.max(0, state.otherManagedSelectedIndex - 1);
          render(state);
          break;

        case 'down':
          state.otherManagedSelectedIndex = Math.min(state.otherManagedRepos.length - 1, state.otherManagedSelectedIndex + 1);
          render(state);
          break;

        case 'return':
          // Launch selected repo with default IDE
          const selectedRepo = state.otherManagedRepos[state.otherManagedSelectedIndex];
          if (selectedRepo) {
            const entry = {
              type: 'repo',
              path: selectedRepo.path,
              name: selectedRepo.path,
              ide: state.ides[0]?.name || 'WebStorm',
            };
            if (process.stdin.isTTY) process.stdin.setRawMode(false);
            launch(entry, state.mode, state.claudeStartupMode, state.ides);
          }
          break;

        case 'escape':
        case 'q':
          state.otherManagedMode = false;
          state.otherManagedSelectedIndex = 0;
          render(state);
          break;

        default:
          // Number keys
          const num = parseInt(str, 10);
          if (num >= 1 && num <= state.otherManagedRepos.length) {
            state.otherManagedSelectedIndex = num - 1;
            render(state);
          }
      }
      return;
    }

    // Group confirm mode keys (y/n)
    if (state.groupConfirmMode) {
      if (str === 'y' || str === 'Y') {
        // Create the group
        const group = createGroupEntry(state.groupConfirmPrefix, state.groupConfirmMatches);
        // Remove matched entries from root
        state.groupConfirmMatches.forEach(entry => {
          const idx = state.entries.indexOf(entry);
          if (idx !== -1) state.entries.splice(idx, 1);
        });
        // Add group to root
        state.entries.push(group);
        // Exit confirm mode
        state.groupConfirmMode = false;
        state.groupConfirmPrefix = null;
        state.groupConfirmMatches = [];
        render(state);
      } else if (str === 'n' || str === 'N' || key.name === 'escape') {
        // Cancel
        state.groupConfirmMode = false;
        state.groupConfirmPrefix = null;
        state.groupConfirmMatches = [];
        render(state);
      }
      return;
    }

    // Add entry picker mode keys
    if (state.addEntryMode) {
      switch (key.name) {
        case 'up':
          state.addEntrySelectedIndex = Math.max(0, state.addEntrySelectedIndex - 1);
          render(state);
          break;

        case 'down':
          state.addEntrySelectedIndex = Math.min(state.addEntryOptions.length - 1, state.addEntrySelectedIndex + 1);
          render(state);
          break;

        case 'return':
          if (state.addEntryOptions.length > 0) {
            const repo = state.addEntryOptions[state.addEntrySelectedIndex];
            // Create new entry from repo - use full path as name
            const newEntry = {
              type: 'repo',
              path: repo.path,
              name: repo.path,
              ide: state.ides[0]?.name || 'WebStorm',
              expanded: false,
              children: [],
            };
            state.entries.push(newEntry);
          }
          state.addEntryMode = false;
          state.addEntrySelectedIndex = 0;
          state.addEntryOptions = [];
          render(state);
          break;

        case 'escape':
        case 'q':
          state.addEntryMode = false;
          state.addEntrySelectedIndex = 0;
          state.addEntryOptions = [];
          render(state);
          break;
      }
      return;
    }

    // Nest picker mode keys
    if (state.nestPickerMode) {
      switch (key.name) {
        case 'up':
          state.nestPickerSelectedIndex = Math.max(0, state.nestPickerSelectedIndex - 1);
          render(state);
          break;

        case 'down':
          state.nestPickerSelectedIndex = Math.min(state.nestPickerOptions.length - 1, state.nestPickerSelectedIndex + 1);
          render(state);
          break;

        case 'return':
          const opt = state.nestPickerOptions[state.nestPickerSelectedIndex];
          const entryToMove = state.nestPickerEntry;
          // Remove from current location
          removeEntry(state.entries, entryToMove);
          // Add to new parent
          if (opt.entry === null) {
            // Root level
            state.entries.push(entryToMove);
          } else {
            if (!opt.entry.children) opt.entry.children = [];
            opt.entry.children.push(entryToMove);
          }
          state.nestPickerMode = false;
          state.nestPickerSelectedIndex = 0;
          state.nestPickerEntry = null;
          state.nestPickerOptions = [];
          render(state);
          break;

        case 'escape':
        case 'q':
          state.nestPickerMode = false;
          state.nestPickerSelectedIndex = 0;
          state.nestPickerEntry = null;
          state.nestPickerOptions = [];
          render(state);
          break;
      }
      return;
    }

    // Edit name mode keys
    if (state.editNameMode) {
      if (key.name === 'return') {
        // Save name
        if (state.editNameBuffer.trim()) {
          state.editNameEntry.name = state.editNameBuffer.trim();
        }
        state.editNameMode = false;
        state.editNameBuffer = '';
        state.editNameEntry = null;
        render(state);
      } else if (key.name === 'escape') {
        // Cancel
        state.editNameMode = false;
        state.editNameBuffer = '';
        state.editNameEntry = null;
        render(state);
      } else if (key.name === 'backspace') {
        state.editNameBuffer = state.editNameBuffer.slice(0, -1);
        render(state);
      } else if (str && str.length === 1 && !key.ctrl && !key.meta) {
        // Add character
        state.editNameBuffer += str;
        render(state);
      }
      return;
    }

    // Config menu keys
    if (state.configMode) {
      switch (key.name) {
        case 'up':
          state.configSelectedIndex = Math.max(0, state.configSelectedIndex - 1);
          render(state);
          break;

        case 'down':
          state.configSelectedIndex = Math.min(4, state.configSelectedIndex + 1);
          render(state);
          break;

        case 'return':
          if (state.configSelectedIndex === 0) {
            // Edit entries
            state.configMode = false;
            state.entriesEditMode = true;
            state.entriesEditSelectedIndex = 0;
            render(state);
          } else if (state.configSelectedIndex === 1) {
            // Manage repositories
            state.configMode = false;
            if (state.allRepos.length > 0) {
              state.managementMode = true;
              state.managementSelectedIndex = 0;
            }
            render(state);
          } else if (state.configSelectedIndex === 2) {
            // Scan for repositories
            state.configStatus = 'Scanning...';
            render(state);
            const repos = scanForRepos();
            saveRepos(repos);
            state.allRepos = repos;
            refreshFlattenedEntries();
            state.configStatus = `Found ${repos.length} repositories`;
            render(state);
            setTimeout(() => {
              state.configStatus = null;
              render(state);
            }, 2000);
          } else if (state.configSelectedIndex === 3) {
            // Create desktop shortcut
            if (!LAUNCHER_SCRIPT) {
              state.configStatus = 'Launcher script path not provided';
              render(state);
              setTimeout(() => {
                state.configStatus = null;
                render(state);
              }, 2000);
            } else {
              const result = createDesktopShortcut(LAUNCHER_SCRIPT);
              if (result === true) {
                state.configStatus = 'Desktop shortcut created!';
              } else {
                state.configStatus = result;
              }
              render(state);
              setTimeout(() => {
                state.configStatus = null;
                render(state);
              }, 2000);
            }
          } else if (state.configSelectedIndex === 4) {
            // Edit startup modes
            state.configMode = false;
            state.startupModesEditMode = 'list';
            state.startupModesEditSelectedIndex = 0;
            render(state);
          }
          break;

        case 'escape':
        case 'q':
          state.configMode = false;
          state.configSelectedIndex = 0;
          state.configStatus = null;
          render(state);
          break;

        default:
          if (str === '1') {
            state.configSelectedIndex = 0;
            render(state);
          } else if (str === '2') {
            state.configSelectedIndex = 1;
            render(state);
          } else if (str === '3') {
            state.configSelectedIndex = 2;
            render(state);
          } else if (str === '4') {
            state.configSelectedIndex = 3;
            render(state);
          } else if (str === '5') {
            state.configSelectedIndex = 4;
            render(state);
          }
      }
      return;
    }

    // Startup modes edit mode keys
    if (state.startupModesEditMode) {
      if (state.startupModesEditMode === 'edit') {
        // Editing mode name inline
        if (key.name === 'return') {
          // Save edited mode
          const trimmed = state.startupModesEditBuffer.trim();
          if (trimmed) {
            state.claudeStartupModes[state.startupModesEditSelectedIndex] = trimmed;
          }
          state.startupModesEditMode = 'list';
          state.startupModesEditBuffer = '';
          render(state);
        } else if (key.name === 'escape') {
          // Cancel editing
          state.startupModesEditMode = 'list';
          state.startupModesEditBuffer = '';
          render(state);
        } else if (key.name === 'backspace') {
          state.startupModesEditBuffer = state.startupModesEditBuffer.slice(0, -1);
          render(state);
        } else if (str && str.length === 1 && !key.ctrl && !key.meta) {
          state.startupModesEditBuffer += str;
          render(state);
        }
      } else {
        // List view mode
        switch (key.name) {
          case 'up':
            state.startupModesEditSelectedIndex = Math.max(0, state.startupModesEditSelectedIndex - 1);
            render(state);
            break;

          case 'down':
            state.startupModesEditSelectedIndex = Math.min(state.claudeStartupModes.length - 1, state.startupModesEditSelectedIndex + 1);
            render(state);
            break;

          case 'return':
            // Save and exit
            config.claudeStartupModes = state.claudeStartupModes;
            saveConfig(config);
            // Reset current mode if it's no longer valid
            if (!state.claudeStartupModes.includes(state.claudeStartupMode)) {
              state.claudeStartupMode = state.claudeStartupModes[0] || 'none';
            }
            state.startupModesEditMode = false;
            state.startupModesEditSelectedIndex = 0;
            render(state);
            break;

          case 'escape':
          case 'q':
            // Cancel - reload from config
            state.claudeStartupModes = [...config.claudeStartupModes];
            state.startupModesEditMode = false;
            state.startupModesEditSelectedIndex = 0;
            render(state);
            break;

          default:
            if (str === 'a') {
              // Add new mode
              state.claudeStartupModes.push('with /new-command');
              state.startupModesEditSelectedIndex = state.claudeStartupModes.length - 1;
              state.startupModesEditBuffer = 'with /new-command';
              state.startupModesEditMode = 'edit';
              render(state);
            } else if (str === 'x') {
              // Remove current mode
              if (state.claudeStartupModes.length > 1) {
                state.claudeStartupModes.splice(state.startupModesEditSelectedIndex, 1);
                state.startupModesEditSelectedIndex = Math.min(state.startupModesEditSelectedIndex, state.claudeStartupModes.length - 1);
                render(state);
              }
            } else if (str === 'e') {
              // Edit current mode
              state.startupModesEditBuffer = state.claudeStartupModes[state.startupModesEditSelectedIndex];
              state.startupModesEditMode = 'edit';
              render(state);
            } else if (str === 'u') {
              // Move up
              const idx = state.startupModesEditSelectedIndex;
              if (idx > 0) {
                [state.claudeStartupModes[idx], state.claudeStartupModes[idx - 1]] =
                  [state.claudeStartupModes[idx - 1], state.claudeStartupModes[idx]];
                state.startupModesEditSelectedIndex = idx - 1;
                render(state);
              }
            } else if (str === 'd') {
              // Move down
              const idx = state.startupModesEditSelectedIndex;
              if (idx < state.claudeStartupModes.length - 1) {
                [state.claudeStartupModes[idx], state.claudeStartupModes[idx + 1]] =
                  [state.claudeStartupModes[idx + 1], state.claudeStartupModes[idx]];
                state.startupModesEditSelectedIndex = idx + 1;
                render(state);
              }
            }
        }
      }
      return;
    }

    // Remote status mode keys
    if (state.remoteStatusMode) {
      switch (key.name) {
        case 'up':
          state.remoteStatusSelectedIndex = Math.max(0, state.remoteStatusSelectedIndex - 1);
          render(state);
          break;

        case 'down':
          state.remoteStatusSelectedIndex = Math.min(state.remoteStatusRepos.length - 1, state.remoteStatusSelectedIndex + 1);
          render(state);
          break;

        case 'escape':
        case 'q':
          // Exit remote status mode
          state.remoteStatusMode = false;
          state.remoteStatusSelectedIndex = 0;
          state.remoteStatusRepos = [];
          state.remoteStatusMessage = null;
          hideRemoteChangedFiles(state);
          render(state);
          break;

        case 'space':
          // Toggle changed files display for selected repo
          const selectedRepo = state.remoteStatusRepos[state.remoteStatusSelectedIndex];
          if (selectedRepo) {
            toggleRemoteChangedFiles(state, selectedRepo.path);
            render(state);
          }
          break;

        default:
          if (str === 'f') {
            // Fetch all repos
            state.remoteStatusFetching = true;
            state.remoteStatusMessage = null;
            render(state);

            // Fetch each repo sequentially
            let fetchedCount = 0;
            for (const repo of state.remoteStatusRepos) {
              const success = gitFetch(repo.path);
              if (success) fetchedCount++;
            }

            // Refresh status after fetch and update cache
            for (const repo of state.remoteStatusRepos) {
              const status = getRemoteStatus(repo.path);
              if (status) {
                repo.branch = status.branch;
                repo.ahead = status.ahead;
                repo.behind = status.behind;
              }
              // Refresh changes too
              const stats = getGitStats(repo.path);
              repo.changes = stats;
              // Refresh vsMain status
              repo.vsMain = getStatusVsMain(repo.path, repo.branch, repo.defaultBranch);
              // Update cache
              state.remoteStatusCache[repo.path] = {
                branch: repo.branch,
                ahead: repo.ahead,
                behind: repo.behind,
              };
            }

            state.remoteStatusFetching = false;
            state.remoteStatusLastFetch = Date.now();
            saveCache(state);
            state.remoteStatusMessage = `Fetched ${fetchedCount}/${state.remoteStatusRepos.length} repos`;
            render(state);

            // Clear message after delay
            setTimeout(() => {
              state.remoteStatusMessage = null;
              if (state.remoteStatusMode) render(state);
            }, 2000);
          } else if (str === 'p') {
            // Push all repos that have commits ahead
            const reposToPush = state.remoteStatusRepos.filter(r => r.ahead > 0);
            if (reposToPush.length === 0) {
              state.remoteStatusMessage = 'No repos with commits to push';
              render(state);
              setTimeout(() => {
                state.remoteStatusMessage = null;
                if (state.remoteStatusMode) render(state);
              }, 2000);
              return;
            }

            state.remoteStatusPushing = true;
            state.remoteStatusMessage = null;
            render(state);

            let pushedCount = 0;
            const errors = [];
            for (const repo of reposToPush) {
              const result = gitPush(repo.path);
              if (result.success) {
                pushedCount++;
                repo.ahead = 0; // Assume push succeeded
              } else {
                errors.push(`${repo.name}: ${result.message}`);
              }
            }

            state.remoteStatusPushing = false;
            if (errors.length > 0) {
              state.remoteStatusMessage = `Pushed ${pushedCount}/${reposToPush.length}. Errors: ${errors.length}`;
            } else {
              state.remoteStatusMessage = `Pushed ${pushedCount} repos successfully`;
            }
            render(state);

            // Clear message after delay
            setTimeout(() => {
              state.remoteStatusMessage = null;
              if (state.remoteStatusMode) render(state);
            }, 3000);
          }
      }
      return;
    }

    // Entries edit mode keys
    if (state.entriesEditMode) {
      const flatEdit = flattenEntries(state.entries);
      const currentItem = flatEdit[state.entriesEditSelectedIndex];

      switch (key.name) {
        case 'up':
          state.entriesEditSelectedIndex = Math.max(0, state.entriesEditSelectedIndex - 1);
          render(state);
          break;

        case 'down':
          state.entriesEditSelectedIndex = Math.min(flatEdit.length - 1, state.entriesEditSelectedIndex + 1);
          render(state);
          break;

        case 'right':
          // Expand
          if (currentItem && currentItem.entry.children && currentItem.entry.children.length > 0) {
            currentItem.entry.expanded = true;
            render(state);
          }
          break;

        case 'left':
          // Collapse or go to parent
          if (currentItem) {
            if (currentItem.entry.expanded && currentItem.entry.children && currentItem.entry.children.length > 0) {
              currentItem.entry.expanded = false;
              render(state);
            } else if (currentItem.parent) {
              // Find parent index and navigate to it
              const parentIdx = flatEdit.findIndex(item => item.entry === currentItem.parent);
              if (parentIdx !== -1) {
                state.entriesEditSelectedIndex = parentIdx;
                render(state);
              }
            }
          }
          break;

        case 'return':
          // Save and exit entries edit mode
          saveConfig();
          state.entriesEditMode = false;
          state.entriesEditSelectedIndex = 0;
          refreshFlattenedEntries();
          render(state);
          break;

        case 'escape':
        case 'q':
          // Cancel - reload config
          const { config: reloadedConfig2 } = loadConfig();
          state.entries = reloadedConfig2.entries || [];
          state.entriesEditMode = false;
          state.entriesEditSelectedIndex = 0;
          refreshFlattenedEntries();
          render(state);
          break;

        default:
          // u: move up, d: move down
          if (str === 'u' && currentItem) {
            moveEntry(state.entries, currentItem.entry, -1);
            // Adjust selection to follow the moved entry
            const newFlat = flattenEntries(state.entries);
            const newIdx = newFlat.findIndex(item => item.entry === currentItem.entry);
            if (newIdx !== -1) state.entriesEditSelectedIndex = newIdx;
            render(state);
          } else if (str === 'd' && currentItem) {
            moveEntry(state.entries, currentItem.entry, 1);
            const newFlat = flattenEntries(state.entries);
            const newIdx = newFlat.findIndex(item => item.entry === currentItem.entry);
            if (newIdx !== -1) state.entriesEditSelectedIndex = newIdx;
            render(state);
          } else if (str === 'x' && currentItem) {
            // Remove entry
            removeEntry(state.entries, currentItem.entry);
            const newFlat = flattenEntries(state.entries);
            if (state.entriesEditSelectedIndex >= newFlat.length) {
              state.entriesEditSelectedIndex = Math.max(0, newFlat.length - 1);
            }
            render(state);
          } else if (str === 'g' && currentItem && currentItem.entry.path) {
            // Group by prefix - only for entries at root level with a path
            const prefix = getPathPrefix(currentItem.entry.path);
            if (prefix && currentItem.depth === 0) {
              const matches = findEntriesWithPrefix(state.entries, prefix);
              if (matches.length > 1) {
                state.groupConfirmMode = true;
                state.groupConfirmPrefix = prefix;
                state.groupConfirmMatches = matches;
                render(state);
              }
            }
          } else if (str === 'a') {
            // Add entry from managed repos not in entries
            const entryPaths = collectEntryPaths(state.entries);
            const managedRepos = getManagedRepos(state.allRepos, state.unmanagedPaths);
            const available = managedRepos.filter(r => !entryPaths.includes(r.path));
            if (available.length > 0) {
              state.addEntryMode = true;
              state.addEntrySelectedIndex = 0;
              state.addEntryOptions = available;
              render(state);
            }
          } else if (str === 'n' && currentItem) {
            // Nest entry under another parent
            // Build options: (root level) + all other entries (any entry can become a parent)
            const flatAll = flattenEntries(state.entries);
            const options = [{ name: '(root level)', entry: null, depth: 0 }];
            flatAll.forEach(item => {
              // Skip current entry and its descendants
              if (item.entry !== currentItem.entry) {
                // Check if this item is a descendant of current entry
                let isDescendant = false;
                let parent = item.parent;
                while (parent) {
                  if (parent === currentItem.entry) {
                    isDescendant = true;
                    break;
                  }
                  const parentItem = flatAll.find(f => f.entry === parent);
                  parent = parentItem ? parentItem.parent : null;
                }
                if (!isDescendant) {
                  options.push({ name: item.entry.name, entry: item.entry, depth: item.depth + 1 });
                }
              }
            });
            state.nestPickerMode = true;
            state.nestPickerSelectedIndex = 0;
            state.nestPickerEntry = currentItem.entry;
            state.nestPickerOptions = options;
            render(state);
          } else if (str === 'e' && currentItem) {
            // Edit name inline
            state.editNameMode = true;
            state.editNameEntry = currentItem.entry;
            state.editNameBuffer = currentItem.entry.name || '';
            render(state);
          } else if (str === 'i' && currentItem) {
            // Cycle IDE
            if (state.ides.length > 0) {
              const currentIde = currentItem.entry.ide || state.ides[0]?.name;
              const currentIdx = state.ides.findIndex(i => i.name === currentIde);
              const nextIdx = (currentIdx + 1) % state.ides.length;
              currentItem.entry.ide = state.ides[nextIdx].name;
              render(state);
            }
          } else if (str === 'f' && currentItem && currentItem.entry.children && currentItem.entry.children.length > 0) {
            // Flatten group - move children to parent level, remove group
            const entry = currentItem.entry;
            const parent = currentItem.parent;
            const targetArray = parent ? parent.children : state.entries;
            const idx = targetArray.indexOf(entry);
            if (idx !== -1) {
              // Insert children at group's position, then remove group
              targetArray.splice(idx, 1, ...entry.children);
              render(state);
            }
          }
          // Number keys for direct selection
          const num = parseInt(str, 10);
          if (num >= 1 && num <= flatEdit.length) {
            state.entriesEditSelectedIndex = num - 1;
            render(state);
          }
      }
      return;
    }

    // Main menu keys
    switch (key.name) {
      case 'up':
        state.selectedIndex = Math.max(0, state.selectedIndex - 1);
        hideChangedFiles(state);
        render(state);
        break;

      case 'down':
        state.selectedIndex = Math.min(state.flattenedEntries.length - 1, state.selectedIndex + 1);
        hideChangedFiles(state);
        render(state);
        break;

      case 'right':
        // Expand children, or show changed files if leaf
        const itemToExpand = state.flattenedEntries[state.selectedIndex];
        if (!itemToExpand) break;
        if (itemToExpand.entry.children && itemToExpand.entry.children.length > 0) {
          itemToExpand.entry.expanded = true;
          refreshFlattenedEntries();
        } else if (itemToExpand.entry.path) {
          // Leaf entry - show changed files
          toggleChangedFiles(state, itemToExpand.entry.path);
        }
        render(state);
        break;

      case 'left':
        // Hide files, collapse group, or go to parent
        if (state.showChangedFiles) {
          // First: hide changed files if showing
          hideChangedFiles(state);
          render(state);
          break;
        }
        const itemToCollapse = state.flattenedEntries[state.selectedIndex];
        if (!itemToCollapse) break;
        if (itemToCollapse.entry.expanded && itemToCollapse.entry.children?.length > 0) {
          // Collapse expanded group
          itemToCollapse.entry.expanded = false;
          refreshFlattenedEntries();
          render(state);
        } else if (itemToCollapse.parent) {
          // Navigate to parent
          const parentIdx = state.flattenedEntries.findIndex(item => item.entry === itemToCollapse.parent);
          if (parentIdx !== -1) {
            state.selectedIndex = parentIdx;
            render(state);
          }
        }
        break;

      case 'return':
        const selectedItem = state.flattenedEntries[state.selectedIndex];
        if (selectedItem.entry.type === 'other-managed') {
          // Enter other managed submenu
          state.otherManagedMode = true;
          state.otherManagedSelectedIndex = 0;
          render(state);
        } else if (selectedItem.entry.path) {
          // Has path - launch and exit (use 'n' for new window)
          if (process.stdin.isTTY) process.stdin.setRawMode(false);
          launch(selectedItem.entry, state.mode, state.claudeStartupMode, state.ides);
        } else if (selectedItem.entry.children && selectedItem.entry.children.length > 0) {
          // No path but has children - toggle expand/collapse
          selectedItem.entry.expanded = !selectedItem.entry.expanded;
          refreshFlattenedEntries();
          render(state);
        }
        break;

      case 'tab':
      case 'w':
        const modeIdx = state.modes.indexOf(state.mode);
        state.mode = state.modes[(modeIdx + 1) % state.modes.length];
        render(state);
        break;

      case 'c':
        const startupIdx = state.claudeStartupModes.indexOf(state.claudeStartupMode);
        state.claudeStartupMode = state.claudeStartupModes[(startupIdx + 1) % state.claudeStartupModes.length];
        render(state);
        break;

      case 'q':
        console.log('\nBye!');
        process.exit(0);
        break;

      case 'd':
        state.scanning = true;
        render(state);
        // Collect ALL entries recursively (not just visible)
        const allEntries = collectAllEntries(state.entries);
        state.diffs = await scanAllDiffs(allEntries);
        // Compute aggregate stats for groups
        computeGroupStats(state.entries, state.diffs);
        // Save to cache with timestamp
        state.diffsLastScan = Date.now();
        saveCache(state);
        state.scanning = false;
        render(state);
        break;

      case 'f':
        // Open config menu
        state.configMode = true;
        state.configSelectedIndex = 0;
        render(state);
        break;

      case 'r':
        // Enter remote status mode - show local status immediately (no fetch)
        state.remoteStatusMode = true;
        state.remoteStatusSelectedIndex = 0;
        state.remoteStatusFetching = false;
        state.remoteStatusMessage = null;
        // Clear remote changed files state
        hideRemoteChangedFiles(state);

        // Build list of all managed repos (flat, no nesting) with LOCAL status only
        const managedReposForRemote = getManagedRepos(state.allRepos, state.unmanagedPaths);
        const remoteRepos = [];

        for (const repo of managedReposForRemote) {
          // Get local status only (no fetch) - ahead/behind will be stale until 'f' pressed
          const status = getRemoteStatus(repo.path);
          const stats = getGitStats(repo.path);
          const defaultBranch = detectDefaultBranch(repo.path);
          const currentBranch = status?.branch || 'unknown';
          const vsMain = getStatusVsMain(repo.path, currentBranch, defaultBranch);

          remoteRepos.push({
            path: repo.path,
            name: repo.path,
            branch: currentBranch,
            defaultBranch: defaultBranch,
            ahead: status?.ahead || 0,
            behind: status?.behind || 0,
            vsMain: vsMain,
            changes: stats,
          });
        }

        state.remoteStatusRepos = remoteRepos;
        state.remoteStatusMessage = `${remoteRepos.length} repos (press f to fetch)`;
        render(state);

        // Clear message after delay
        setTimeout(() => {
          state.remoteStatusMessage = null;
          if (state.remoteStatusMode) render(state);
        }, 2000);
        break;

      case 'space':
        // Toggle changed files display
        const currentEntry = state.flattenedEntries[state.selectedIndex];
        if (currentEntry?.entry.path) {
          toggleChangedFiles(state, currentEntry.entry.path);
          render(state);
        }
        break;

      default:
        // 'n' key - launch in new window (same as Shift+Enter)
        if (str === 'n') {
          const nSelectedItem = state.flattenedEntries[state.selectedIndex];
          if (nSelectedItem?.entry.path) {
            const result = launch(nSelectedItem.entry, state.mode, state.claudeStartupMode, state.ides, true);
            state.lastLaunchMessage = result.success
              ? `${result.message}: ${nSelectedItem.entry.name}`
              : `Error: ${result.message}`;
            render(state);
            setTimeout(() => {
              state.lastLaunchMessage = null;
              render(state);
            }, 2500);
          }
          break;
        }
        // Number keys
        const num = parseInt(str, 10);
        if (num >= 1 && num <= state.flattenedEntries.length) {
          state.selectedIndex = num - 1;
          render(state);
        }
    }
  });

  // Handle resize
  process.stdout.on('resize', () => render(state));
}

// ============================================================================
// Setup Wizard
// ============================================================================

async function runSetup() {
  console.log(`${ANSI.bold}${ANSI.cyan}Claude Root Launcher Setup${ANSI.reset}\n`);

  // Detect IDEs
  console.log('Detecting IDEs...');
  const ides = detectIDEs();
  if (ides.length > 0) {
    console.log(`${ANSI.green}Found:${ANSI.reset}`);
    ides.forEach(ide => console.log(`  - ${ide.name}`));
  } else {
    console.log(`${ANSI.yellow}No IDEs detected${ANSI.reset}`);
  }

  // Load or create config
  const paths = getConfigPaths();
  let config = loadJson(paths.config);

  if (config) {
    console.log(`\n${ANSI.yellow}Existing config found at:${ANSI.reset}`);
    console.log(`  ${paths.config}`);
    console.log(`  ${config.entries?.length || 0} entries configured`);
  } else {
    console.log(`\n${ANSI.cyan}Creating new config...${ANSI.reset}`);

    // Load repos from scan
    const reposData = loadJson(paths.repos, { repositories: [] });

    config = createDefaultConfig(reposData.repositories);
    config.ides = ides;

    saveJson(paths.config, config);
    console.log(`${ANSI.green}Config saved to:${ANSI.reset} ${paths.config}`);
  }

  console.log(`\n${ANSI.green}Setup complete!${ANSI.reset}`);
  console.log(`Run ${ANSI.cyan}node launcher.js${ANSI.reset} to start.`);
}

// Run
main().catch(err => {
  console.error(`${ANSI.red}Error: ${err.message}${ANSI.reset}`);
  process.exit(1);
});
