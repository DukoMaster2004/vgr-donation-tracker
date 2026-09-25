// @lovable.dev/vite-tanstack-config already includes tanstackStart, react, tailwind, nitro, etc.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  // On Vercel builds (VERCEL env is set automatically), target Vercel's runtime.
  // Elsewhere (Lovable publish), keep the default target.
  ...(process.env["VERCEL"] ? { nitro: { preset: "vercel" } } : {}),
});
