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
  const starter = "CLEAN-REBUILD";

  return {
    // Use both:
    // - HTML-injected window var (most reliable for dev + build)
    // - define() constants (handy for direct imports)
    define: {
      __ATOMIC_CODES_STARTER__: JSON.stringify(starter),
      __ATOMIC_CODES_GIT_SHA__: JSON.stringify(sha),
      __ATOMIC_CODES_BUILT_AT__: JSON.stringify(builtAt),
    },
    plugins: [
      {
        name: "atomic-codes-build-info",
        transformIndexHtml(html) {
          const payload = JSON.stringify({ starter, sha, builtAt });
          const tag = `<script>window.__ATOMIC_CODES_BUILD__=${payload};</script>`;
          return html.replace("</head>", `${tag}\n</head>`);
        },
      },
    ],
  };
});

