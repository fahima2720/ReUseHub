// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { loadEnv, type ConfigEnv } from "vite";

export default (configEnv: ConfigEnv) => {
  const { mode } = configEnv;
  const env = loadEnv(mode, process.cwd(), "");
  // Browser bundles cannot read Worker runtime bindings. Only these two public
  // values may fall back to the managed server bindings at build time.
  // Some build environments inject them later, so never fail the build here;
  // the generated client reports a clear error at runtime if they are missing.
  const url = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
  const rawKey = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_PUBLISHABLE_KEY;
  const key = rawKey && !rawKey.startsWith("sb_secret_") ? rawKey : undefined;
  const define: Record<string, string> = {};
  if (url) define["import.meta.env.VITE_SUPABASE_URL"] = JSON.stringify(url);
  if (key) define["import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY"] = JSON.stringify(key);
  return defineConfig({
    vite: { define },
    tanstackStart: {
      // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
      server: { entry: "server" },
    },
  })(configEnv);
};
