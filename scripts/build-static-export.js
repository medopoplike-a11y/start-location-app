/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

/**
 * Next.js static export build for Capacitor.
 *
 * This repo also contains App Router route handlers under src/app/api/**.
 * Next.js "output: export" does not support API routes and will fail the build.
 *
 * Strategy:
 * - Temporarily move src/app/api -> src/app/__api_disabled__ (local build only)
 * - Run `next build` with BUILD_TYPE=static (next.config.ts sets output: "export")
 * - Restore folder back (even if build fails)
 */

const root = process.cwd();
const appDir = path.join(root, "src", "app");
const apiDir = path.join(appDir, "api");
const disabledApiDir = path.join(appDir, "__api_disabled__");
const nextDir = path.join(root, ".next");

function moveIfExists(from, to) {
  if (!fs.existsSync(from)) return false;
  if (fs.existsSync(to)) {
    throw new Error(`Target already exists: ${to}`);
  }
  fs.renameSync(from, to);
  return true;
}

let moved = false;

try {
  moved = moveIfExists(apiDir, disabledApiDir);

  // Remove previous Next build artifacts that may reference route handlers.
  if (fs.existsSync(nextDir)) {
    fs.rmSync(nextDir, { recursive: true, force: true });
  }

  const command = process.platform === "win32" ? "npx next build" : "npx next build";
  const result = spawnSync(command, {
    stdio: "inherit",
    shell: true,
    env: { ...process.env, BUILD_TYPE: "static" },
  });

  if (result.error) {
    console.error("Failed to execute next build:", result.error);
    process.exitCode = 1;
  } else {
    process.exitCode = result.status ?? 1;
  }
} catch (err) {
  console.error("Static export build failed:", err);
  process.exitCode = 1;
} finally {
  try {
    if (moved) {
      // Restore
      fs.renameSync(disabledApiDir, apiDir);
    }
  } catch (restoreErr) {
    console.error("Failed to restore src/app/api folder:", restoreErr);
    process.exitCode = 1;
  }
}
