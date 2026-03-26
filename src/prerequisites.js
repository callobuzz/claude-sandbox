import { execFileSync, spawnSync } from "node:child_process";
import { platform, arch } from "node:os";

const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const CYAN = "\x1b[36m";
const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

const os = platform();

/**
 * Check if a command exists
 */
function commandExists(cmd) {
  try {
    const flag = os === "win32" ? "where" : "which";
    execFileSync(flag, [cmd], { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get Docker version if installed
 */
function getDockerVersion() {
  try {
    const out = execFileSync("docker", ["version", "--format", "{{.Client.Version}}"], {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return out.trim();
  } catch {
    return null;
  }
}

/**
 * Check if Docker daemon is running
 */
function isDockerRunning() {
  try {
    execFileSync("docker", ["info"], { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if docker sandbox plugin is available
 */
function hasSandboxPlugin() {
  try {
    execFileSync("docker", ["sandbox", "version"], { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if Claude Code CLI is installed on host
 */
function hasClaudeCli() {
  return commandExists("claude");
}

/**
 * Platform-specific install instructions
 */
function getDockerInstallGuide() {
  switch (os) {
    case "win32":
      return {
        name: "Windows",
        steps: [
          `${BOLD}Option A: Docker Desktop (recommended)${RESET}`,
          `  1. Download from: https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe`,
          `  2. Run the installer`,
          `  3. Enable WSL 2 backend when prompted`,
          `  4. Restart your computer`,
          `  5. Open Docker Desktop and wait for it to start`,
          ``,
          `${BOLD}Option B: Using winget${RESET}`,
          `  winget install Docker.DockerDesktop`,
          ``,
          `${BOLD}Option C: Using Chocolatey${RESET}`,
          `  choco install docker-desktop`,
          ``,
          `${DIM}Note: Docker Desktop on Windows requires either WSL 2 or Hyper-V.${RESET}`,
          `${DIM}WSL 2 is recommended. To install WSL: wsl --install${RESET}`,
        ],
      };
    case "darwin":
      return {
        name: "macOS",
        steps: [
          `${BOLD}Option A: Docker Desktop${RESET}`,
          `  brew install --cask docker`,
          `  ${DIM}# Then open Docker.app from Applications${RESET}`,
          ``,
          `${BOLD}Option B: Direct download${RESET}`,
          arch() === "arm64"
            ? `  Download from: https://desktop.docker.com/mac/main/arm64/Docker.dmg`
            : `  Download from: https://desktop.docker.com/mac/main/amd64/Docker.dmg`,
        ],
      };
    case "linux":
      return {
        name: "Linux",
        steps: [
          `${BOLD}Option A: Docker Engine (recommended for Linux)${RESET}`,
          `  curl -fsSL https://get.docker.com | sh`,
          `  sudo usermod -aG docker $USER`,
          `  ${DIM}# Log out and back in for group changes to take effect${RESET}`,
          ``,
          `${BOLD}Option B: Docker Desktop${RESET}`,
          `  See: https://docs.docker.com/desktop/install/linux/`,
          ``,
          `${BOLD}After installing Docker, install the sandbox plugin:${RESET}`,
          `  See: https://docs.docker.com/sandbox/`,
        ],
      };
    default:
      return {
        name: os,
        steps: [`Visit https://docs.docker.com/get-docker/ for install instructions.`],
      };
  }
}

function getSandboxInstallGuide() {
  return [
    `${BOLD}Docker Sandbox plugin is required but not found.${RESET}`,
    ``,
    `Docker Sandbox comes with Docker Desktop 4.40+.`,
    `If you have Docker Desktop, update it to the latest version.`,
    ``,
    `More info: https://docs.docker.com/sandbox/`,
  ];
}

/**
 * Run full prerequisite check. Returns { ok, issues[] }
 * If interactive, prints a guided setup flow.
 */
export function checkPrerequisites({ interactive = true } = {}) {
  const issues = [];
  const checks = [];

  // 1. Docker installed?
  const dockerVersion = getDockerVersion();
  if (dockerVersion) {
    checks.push({ name: "Docker", status: "ok", detail: `v${dockerVersion}` });
  } else {
    checks.push({ name: "Docker", status: "missing" });
    issues.push("docker-missing");
  }

  // 2. Docker running?
  if (dockerVersion) {
    const running = isDockerRunning();
    if (running) {
      checks.push({ name: "Docker daemon", status: "ok" });
    } else {
      checks.push({ name: "Docker daemon", status: "stopped" });
      issues.push("docker-stopped");
    }
  }

  // 3. Sandbox plugin?
  if (dockerVersion && isDockerRunning()) {
    if (hasSandboxPlugin()) {
      checks.push({ name: "Docker Sandbox", status: "ok" });
    } else {
      checks.push({ name: "Docker Sandbox", status: "missing" });
      issues.push("sandbox-missing");
    }
  }

  // 4. Claude CLI on host?
  if (hasClaudeCli()) {
    checks.push({ name: "Claude Code CLI", status: "ok" });
  } else {
    checks.push({
      name: "Claude Code CLI",
      status: "optional",
      detail: "not found (not required, but credentials may be missing)",
    });
  }

  if (interactive) {
    console.log();
    console.log(`${BOLD}Prerequisite Check${RESET}`);
    console.log();

    for (const check of checks) {
      const icon =
        check.status === "ok"
          ? `${GREEN}✓${RESET}`
          : check.status === "optional"
            ? `${YELLOW}~${RESET}`
            : `${RED}✗${RESET}`;
      const detail = check.detail ? ` ${DIM}(${check.detail})${RESET}` : "";
      console.log(`  ${icon} ${check.name}${detail}`);
    }
    console.log();

    // Print guides for issues
    if (issues.includes("docker-missing")) {
      const guide = getDockerInstallGuide();
      console.log(`${RED}Docker is not installed.${RESET} Install it for ${guide.name}:\n`);
      for (const step of guide.steps) {
        console.log(`  ${step}`);
      }
      console.log();
    }

    if (issues.includes("docker-stopped")) {
      console.log(`${YELLOW}Docker is installed but not running.${RESET}\n`);
      if (os === "win32") {
        console.log(`  Start Docker Desktop from the Start menu, or run:`);
        console.log(`  start "" "Docker Desktop"`);
      } else if (os === "darwin") {
        console.log(`  Open Docker.app, or run:`);
        console.log(`  open -a Docker`);
      } else {
        console.log(`  Start the Docker service:`);
        console.log(`  sudo systemctl start docker`);
      }
      console.log();
    }

    if (issues.includes("sandbox-missing")) {
      const guide = getSandboxInstallGuide();
      for (const line of guide) {
        console.log(`  ${line}`);
      }
      console.log();
    }

    if (issues.length === 0) {
      console.log(`${GREEN}All prerequisites met. Ready to go.${RESET}`);
      console.log();
    }
  }

  return { ok: issues.length === 0, issues, checks };
}
