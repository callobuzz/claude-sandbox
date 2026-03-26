import { execFileSync, spawnSync } from "node:child_process";

/**
 * Check if docker sandbox plugin is available
 */
export function checkSandboxAvailable() {
  try {
    execFileSync("docker", ["sandbox", "version"], { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get docker sandbox version
 */
export function getSandboxVersion() {
  try {
    return execFileSync("docker", ["sandbox", "version"], {
      encoding: "utf-8",
    }).trim();
  } catch {
    return null;
  }
}

/**
 * List all sandboxes
 */
export function listSandboxes() {
  const output = execFileSync("docker", ["sandbox", "ls"], {
    encoding: "utf-8",
  });
  return output;
}

/**
 * Check if a sandbox exists by name
 */
export function sandboxExists(name) {
  try {
    const output = execFileSync("docker", ["sandbox", "ls"], {
      encoding: "utf-8",
    });
    return output.includes(name);
  } catch {
    return false;
  }
}

/**
 * Create a sandbox with optional extra workspaces
 */
export function createSandbox(name, projectDir, extraWorkspaces = []) {
  const args = ["sandbox", "create", "--name", name, "claude", projectDir];
  for (const ws of extraWorkspaces) {
    args.push(ws);
  }
  const result = spawnSync("docker", args, {
    encoding: "utf-8",
    stdio: ["inherit", "pipe", "pipe"],
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "Failed to create sandbox");
  }
  return result.stdout;
}

/**
 * Execute a command inside a sandbox
 */
export function execInSandbox(name, command, { stdin } = {}) {
  const result = spawnSync(
    "docker",
    ["sandbox", "exec", ...(stdin ? ["-i"] : []), name, "/bin/bash", "-c", command],
    {
      encoding: "utf-8",
      stdio: [stdin ? "pipe" : "inherit", "pipe", "pipe"],
      ...(stdin ? { input: stdin } : {}),
    }
  );
  return {
    stdout: result.stdout || "",
    stderr: result.stderr || "",
    exitCode: result.status,
  };
}

/**
 * Run a sandbox (starts claude agent)
 */
export function runSandbox(name, args = []) {
  const cmdArgs = ["sandbox", "run", name];
  if (args.length > 0) {
    cmdArgs.push("--");
    cmdArgs.push(...args);
  }
  const result = spawnSync("docker", cmdArgs, {
    stdio: "inherit",
    encoding: "utf-8",
  });
  return result.status;
}

/**
 * Stop a sandbox
 */
export function stopSandbox(name) {
  const result = spawnSync("docker", ["sandbox", "stop", name], {
    encoding: "utf-8",
    stdio: ["inherit", "pipe", "pipe"],
  });
  return result.status === 0;
}

/**
 * Remove a sandbox
 */
export function removeSandbox(name) {
  const result = spawnSync("docker", ["sandbox", "rm", name], {
    encoding: "utf-8",
    stdio: ["inherit", "pipe", "pipe"],
  });
  return result.status === 0;
}
