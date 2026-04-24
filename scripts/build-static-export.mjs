import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

// Next.js static export build for Capacitor.

const root = process.cwd();
const appDir = path.join(root, "src", "app");
const apiDir = path.join(appDir, "api");
const disabledApiDir = path.join(appDir, "__api_disabled__");
const nextDir = path.join(root, ".next");

function moveIfExists(from, to) {
  if (!fs.existsSync(from)) return false;
  if (fs.existsSync(to)) fs.rmSync(to, { recursive: true });
  fs.renameSync(from, to);
  return true;
}

let moved = false;

try {
  console.log("🚀 Starting static export build...");
  
  // 1. Disable API routes temporarily (Next.js export fails with them)
  moved = moveIfExists(apiDir, disabledApiDir);

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
      fs.renameSync(disabledApiDir, apiDir);
    }
  } catch (restoreErr) {
    console.error("Failed to restore src/app/api folder:", restoreErr);
    process.exitCode = 1;
  }
}
