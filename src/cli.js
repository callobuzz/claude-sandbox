#!/usr/bin/env node

import { resolve, dirname, join } from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, "..", "package.json"), "utf-8"));
import {
  checkSandboxAvailable,
  listSandboxes,
  sandboxExists,
  createSandbox,
  runSandbox,
  stopSandbox,
  removeSandbox,
  execInSandbox,
} from "./docker.js";
import {
  getClaudeHome,
  toDockerPath,
  toSandboxMountPath,
  getSandboxName,
} from "./paths.js";
import { setupAuth, hasCredentials, getSubscriptionInfo } from "./auth.js";
import { checkPrerequisites } from "./prerequisites.js";

const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const CYAN = "\x1b[36m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";

const log = (msg) => console.log(`${GREEN}[claude-sandbox]${RESET} ${msg}`);
const warn = (msg) => console.log(`${YELLOW}[claude-sandbox]${RESET} ${msg}`);
const error = (msg) => console.error(`${RED}[claude-sandbox]${RESET} ${msg}`);
const info = (msg) => console.log(`${CYAN}[claude-sandbox]${RESET} ${msg}`);

function printHelp() {
  console.log(`
${GREEN}claude-sandbox${RESET} — Run Claude Code in Docker sandboxes with zero re-auth.

${CYAN}Usage:${RESET}
  claude-sandbox [project-dir] [options]
  claude-sandbox <command> [options]

${CYAN}Commands:${RESET}
  run [dir] [options]    Create and run a sandbox (default command)
  list                   List all sandboxes
  stop [name]            Stop a sandbox
  rm [name]              Remove a sandbox
  resume [name]          Resume an existing sandbox
  status                 Show auth and Docker status

${CYAN}Options:${RESET}
  -p, --prompt <text>    Initial prompt for Claude
  -n, --name <name>      Custom sandbox name
  --no-auth              Skip credential injection
  -v, --version          Show version
  -h, --help             Show this help

${CYAN}Examples:${RESET}
  claude-sandbox                              ${DIM}# current dir, interactive${RESET}
  claude-sandbox /path/to/project             ${DIM}# any project${RESET}
  claude-sandbox . -p "improve test coverage" ${DIM}# with prompt${RESET}
  claude-sandbox list                         ${DIM}# show sandboxes${RESET}
  claude-sandbox resume my-sandbox            ${DIM}# resume existing${RESET}

${CYAN}How it works:${RESET}
  1. Creates a Docker sandbox (microVM) for the project
  2. Mounts your host ~/.claude as read-only inside the sandbox
  3. Claude sees your existing credentials, settings, skills, plugins, history
  4. Runs with --dangerously-skip-permissions (safe inside sandbox)
  5. No browser login. No re-auth. Ever.

${CYAN}About history and data:${RESET}
  Your host ~/.claude (history, settings, skills) is available read-only
  inside the sandbox — Claude can read your full conversation history
  from outside the sandbox. However, anything Claude writes inside the
  sandbox (new history, sessions, files) stays inside the sandbox only.
  It will NOT appear on your host. Sandbox data persists until you run
  'claude-sandbox rm <name>' to remove it.
`);
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const parsed = {
    command: "run",
    projectDir: ".",
    prompt: null,
    name: null,
    noAuth: false,
    help: false,
    extra: [],
  };

  // Check if first arg is a command
  const commands = ["run", "list", "stop", "rm", "remove", "resume", "status"];
  if (args[0] && commands.includes(args[0])) {
    parsed.command = args[0] === "remove" ? "rm" : args[0];
    args.shift();
  }

  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    if (arg === "-v" || arg === "--version") {
      parsed.command = "version";
    } else if (arg === "-h" || arg === "--help") {
      parsed.help = true;
    } else if (arg === "-p" || arg === "--prompt") {
      parsed.prompt = args[++i];
    } else if (arg === "-n" || arg === "--name") {
      parsed.name = args[++i];
    } else if (arg === "--no-auth") {
      parsed.noAuth = true;
    } else if (!arg.startsWith("-")) {
      // First non-flag arg is project dir or sandbox name
      if (parsed.command === "run" && parsed.projectDir === ".") {
        parsed.projectDir = arg;
      } else {
        parsed.extra.push(arg);
      }
    }
    i++;
  }

  return parsed;
}

async function cmdRun(opts) {
  const projectDir = toDockerPath(resolve(opts.projectDir));
  const sandboxName = opts.name || getSandboxName(opts.projectDir);

  console.log();
  log(`Project:  ${projectDir}`);
  log(`Sandbox:  ${sandboxName}`);

  // Check if sandbox already exists
  if (sandboxExists(sandboxName)) {
    info("Sandbox exists. Resuming...");
    console.log();
    const agentArgs = ["--dangerously-skip-permissions"];
    if (opts.prompt) {
      agentArgs.unshift("-p", opts.prompt);
    } else {
      agentArgs.unshift("--continue");
    }
    return runSandbox(sandboxName, agentArgs);
  }

  // Detect host .claude
  const claudeHome = getClaudeHome();
  const extraWorkspaces = [];

  if (claudeHome && !opts.noAuth) {
    const dockerClaudePath = toDockerPath(claudeHome);
    extraWorkspaces.push(`${dockerClaudePath}:ro`);

    const sub = getSubscriptionInfo();
    if (sub) {
      log(`Auth:     ${sub.type} (${sub.tier})`);
    }
  } else if (!opts.noAuth) {
    warn("No ~/.claude found. Claude will need browser login.");
  }

  console.log();

  // Step 1: Create sandbox (shows Docker pull progress via inherited stdio)
  log(`${CYAN}[1/4]${RESET} Creating sandbox microVM...`);
  try {
    createSandbox(sandboxName, projectDir, extraWorkspaces);
  } catch (err) {
    error(`Failed to create sandbox: ${err.message}`);
    process.exit(1);
  }
  log(`${GREEN}[1/4]${RESET} Sandbox created.`);

  // Step 2: Set up auth and config
  log(`${CYAN}[2/4]${RESET} Linking credentials, settings, skills, plugins...`);
  if (claudeHome && !opts.noAuth) {
    const mountedPath = toSandboxMountPath(toDockerPath(claudeHome));
    const ok = setupAuth(sandboxName, mountedPath);
    if (ok) {
      log(`${GREEN}[2/4]${RESET} Auth configured. No browser login needed.`);
    } else {
      warn(`[2/4] Could not set up auth. Claude may ask for browser login.`);
    }
  } else {
    log(`${DIM}[2/4] Skipped (no host config found).${RESET}`);
  }

  // Step 3: Verify
  log(`${CYAN}[3/4]${RESET} Verifying sandbox state...`);
  const verifyResult = execInSandbox(
    sandboxName,
    [
      '[ -f /home/agent/.claude/.credentials.json ] && c="OK" || c="MISSING"',
      '[ -f /home/agent/.claude.json ] && j="OK" || j="MISSING"',
      '[ -f /home/agent/.claude/settings.json ] && s="OK" || s="MISSING"',
      'touch /home/agent/.claude/session-env/.test 2>/dev/null && rm -f /home/agent/.claude/session-env/.test && w="WRITABLE" || w="READ-ONLY"',
      'echo "$c|$j|$s|$w"',
    ].join(" && ")
  );
  const parts = verifyResult.stdout.trim().split("|");
  const allOk = parts.every((p) => p === "OK" || p === "WRITABLE");
  if (allOk) {
    log(`${GREEN}[3/4]${RESET} All checks passed: credentials, config, settings, writable dirs.`);
  } else {
    warn(`[3/4] Checks: credentials=${parts[0]} config=${parts[1]} settings=${parts[2]} session-env=${parts[3]}`);
  }

  // Step 4: Launch
  log(`${CYAN}[4/4]${RESET} Launching Claude...`);
  console.log();
  const agentArgs = ["--dangerously-skip-permissions"];
  if (opts.prompt) {
    agentArgs.unshift("-p", opts.prompt);
  }
  return runSandbox(sandboxName, agentArgs);
}

function cmdList() {
  console.log(listSandboxes());
}

function cmdStop(opts) {
  const name = opts.extra[0] || getSandboxName(".");
  log(`Stopping: ${name}`);
  if (stopSandbox(name)) {
    log("Stopped.");
  } else {
    error("Failed to stop sandbox.");
  }
}

function cmdRm(opts) {
  const name = opts.extra[0] || getSandboxName(".");
  log(`Removing: ${name}`);
  if (removeSandbox(name)) {
    log("Removed.");
  } else {
    error("Failed to remove sandbox.");
  }
}

function cmdResume(opts) {
  const name = opts.extra[0];
  if (!name) {
    error("Specify sandbox name. Use 'claude-sandbox list' to see available.");
    process.exit(1);
  }
  log(`Resuming: ${name}`);
  return runSandbox(name, ["--continue", "--dangerously-skip-permissions"]);
}

function cmdStatus() {
  const { ok } = checkPrerequisites({ interactive: true });

  // Also show credentials info
  const hasCreds = hasCredentials();
  console.log(
    `  Credentials:     ${hasCreds ? `${GREEN}found${RESET}` : `${RED}not found${RESET}`}`
  );
  if (hasCreds) {
    const sub = getSubscriptionInfo();
    if (sub) {
      console.log(`  Subscription:    ${GREEN}${sub.type}${RESET} (${sub.tier})`);
    }
  }
  const claudeHome = getClaudeHome();
  console.log(`  Claude home:     ${claudeHome || `${RED}not found${RESET}`}`);
  console.log();
}

// --- Main ---
const opts = parseArgs(process.argv);

if (opts.command === "version") {
  console.log(`claude-sandbox v${pkg.version}`);
  process.exit(0);
}

if (opts.help) {
  printHelp();
  process.exit(0);
}

// For commands that need Docker sandbox, run prerequisite check
if (["run", "stop", "rm", "resume", "list"].includes(opts.command)) {
  const { ok } = checkPrerequisites({ interactive: !checkSandboxAvailable() });
  if (!ok) {
    process.exit(1);
  }
}

switch (opts.command) {
  case "run":
    cmdRun(opts);
    break;
  case "list":
    cmdList();
    break;
  case "stop":
    cmdStop(opts);
    break;
  case "rm":
    cmdRm(opts);
    break;
  case "resume":
    cmdResume(opts);
    break;
  case "status":
    cmdStatus();
    break;
  default:
    printHelp();
}
