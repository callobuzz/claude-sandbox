import { homedir } from "node:os";
import { join, resolve, basename } from "node:path";
import { existsSync } from "node:fs";

/**
 * Detect if running in MSYS/Git Bash on Windows
 */
export function isMsys() {
  return (
    process.platform === "win32" ||
    process.env.OSTYPE === "msys" ||
    process.env.MSYSTEM != null
  );
}

/**
 * Get the host ~/.claude directory path
 */
export function getClaudeHome() {
  const home = homedir();
  const claudeDir = join(home, ".claude");
  if (existsSync(claudeDir)) return claudeDir;
  return null;
}

/**
 * Get the credentials file path
 */
export function getCredentialsPath() {
  const claudeHome = getClaudeHome();
  if (!claudeHome) return null;
  const creds = join(claudeHome, ".credentials.json");
  if (existsSync(creds)) return creds;
  return null;
}

/**
 * Get ~/.claude.json path (lives at HOME root, not inside .claude/)
 * This file stores startup config, theme, tips — without it Claude shows first-time setup
 */
export function getClaudeJsonPath() {
  const home = homedir();
  const p = join(home, ".claude.json");
  if (existsSync(p)) return p;
  return null;
}

/**
 * Convert a path to Windows format for docker sandbox commands.
 * On Windows, docker sandbox expects native Windows paths (J:\foo\bar).
 * Node's path.resolve already returns Windows paths on Windows.
 */
export function toDockerPath(p) {
  return resolve(p);
}

/**
 * Convert a Windows path to what it looks like inside the sandbox mount.
 * Docker sandbox mounts Windows paths like:
 *   C:\Users\SV\.claude -> /c/Users/SV/.claude
 *   J:\callobuzz\project -> /j/callobuzz/project
 */
export function toSandboxMountPath(windowsPath) {
  if (process.platform !== "win32") return windowsPath;
  // C:\Users\SV\.claude -> /c/Users/SV/.claude
  return windowsPath
    .replace(/^([A-Z]):\\/, (_, drive) => `/${drive.toLowerCase()}/`)
    .replace(/\\/g, "/");
}

/**
 * Get project name from path
 */
export function getProjectName(projectDir) {
  return basename(resolve(projectDir));
}

/**
 * Generate sandbox name from project name
 */
export function getSandboxName(projectDir) {
  return `claude-sandbox-${getProjectName(projectDir)}`;
}
