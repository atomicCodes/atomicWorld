import { defineConfig } from "vite";
import { execSync } from "node:child_process";

function safeGitSha() {
  try {
    return execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return "nogit";
  }
}

export default defineConfig(() => {
  const sha = safeGitSha();
  const builtAt = new Date().toISOString();

  return {
    define: {
      __ATOMIC_CODES_STARTER__: JSON.stringify("CLEAN-REBUILD"),
      __ATOMIC_CODES_GIT_SHA__: JSON.stringify(sha),
      __ATOMIC_CODES_BUILT_AT__: JSON.stringify(builtAt),
    },
  };
});

