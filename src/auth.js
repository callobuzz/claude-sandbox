import { readFileSync } from "node:fs";
import { getClaudeHome, getCredentialsPath, getClaudeJsonPath } from "./paths.js";
import { execInSandbox } from "./docker.js";

/**
 * Items to symlink from host .claude into sandbox (read-only, config stuff).
 * Everything else stays as sandbox's own writable directory.
 */
const SYMLINK_ITEMS = [
  ".credentials.json",  // auth token
  "settings.json",      // user settings
  "skills",             // custom skills
  "plugins",            // installed plugins
  "CLAUDE.md",          // global instructions
  "agents",             // custom agents
  "statsig",            // feature flags cache
];

/**
 * Set up the sandbox to use host's Claude config.
 *
 * Strategy: keep sandbox's own writable ~/.claude/ directory, but symlink
 * specific read-only items from the host mount. This way Claude can write
 * session-env, history, cache etc. while reading credentials and config from host.
 *
 * Also copies ~/.claude.json (startup config) to prevent first-time setup wizard.
 *
 * Returns true if credentials are accessible.
 */
export function setupAuth(sandboxName, mountedClaudePath) {
  // 1. Ensure sandbox has its own writable .claude dir (don't rm -rf it)
  //    Remove only if it's a symlink from a previous run
  execInSandbox(
    sandboxName,
    [
      "if [ -L /home/agent/.claude ]; then rm -f /home/agent/.claude; fi",
      "mkdir -p /home/agent/.claude",
    ].join(" && ")
  );

  // 2. Symlink individual read-only items from the RO mount
  for (const item of SYMLINK_ITEMS) {
    execInSandbox(
      sandboxName,
      `[ -e '${mountedClaudePath}/${item}' ] && ln -sf '${mountedClaudePath}/${item}' '/home/agent/.claude/${item}' 2>/dev/null || true`
    );
  }

  // 3. Create writable dirs that Claude needs
  execInSandbox(
    sandboxName,
    "mkdir -p /home/agent/.claude/session-env /home/agent/.claude/sessions /home/agent/.claude/backups /home/agent/.claude/cache /home/agent/.claude/file-history /home/agent/.claude/shell-snapshots /home/agent/.claude/plans /home/agent/.claude/tasks /home/agent/.claude/todos /home/agent/.claude/debug /home/agent/.claude/downloads /home/agent/.claude/paste-cache /home/agent/.claude/telemetry /home/agent/.claude/projects /home/agent/.claude/ide"
  );

  // 4. Copy ~/.claude.json into sandbox (prevents first-time setup wizard)
  //    Piped via stdin because the file can be 50KB+
  const claudeJsonPath = getClaudeJsonPath();
  if (claudeJsonPath) {
    try {
      const content = readFileSync(claudeJsonPath);
      const b64 = content.toString("base64");
      execInSandbox(
        sandboxName,
        "base64 -d > /home/agent/.claude.json",
        { stdin: b64 }
      );
    } catch {
      // Not critical — Claude will just show first-time setup
    }
  }

  // 5. Verify
  const verify = execInSandbox(
    sandboxName,
    `[ -f /home/agent/.claude/.credentials.json ] && [ -f /home/agent/.claude.json ] && grep -q numStartups /home/agent/.claude.json && echo ok || echo fail`
  );
  return verify.stdout.trim() === "ok";
}

/**
 * Check if host has valid Claude credentials
 */
export function hasCredentials() {
  const credsPath = getCredentialsPath();
  if (!credsPath) return false;
  try {
    const data = JSON.parse(readFileSync(credsPath, "utf-8"));
    return !!(data.claudeAiOauth?.accessToken || data.apiKey);
  } catch {
    return false;
  }
}

/**
 * Get subscription info from host credentials
 */
export function getSubscriptionInfo() {
  const credsPath = getCredentialsPath();
  if (!credsPath) return null;
  try {
    const data = JSON.parse(readFileSync(credsPath, "utf-8"));
    return {
      type: data.claudeAiOauth?.subscriptionType || "unknown",
      tier: data.claudeAiOauth?.rateLimitTier || "unknown",
    };
  } catch {
    return null;
  }
}
