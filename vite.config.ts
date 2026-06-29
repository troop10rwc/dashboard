import { defineConfig } from "vite";

// The dashboard is mounted at troop10rwc.org/dashboard, so the Worker only owns
// the /dashboard* route. Emit the React island into ./public/dashboard/assets
// with base=/dashboard/assets/ so the SSR shell + CSS url() font refs resolve
// there; the Worker's assets binding (directory ./public) serves them, and
// /dashboard falls through to the Worker for SSR.
//   - dashboard.js / dashboard.css kept stable (the SSR shell links them);
//     fonts/chunks are content-hashed.
export default defineConfig({
  base: "/dashboard/assets/",
  esbuild: { jsx: "automatic" },
  build: {
    outDir: "public/dashboard/assets",
    emptyOutDir: true,
    target: "es2022",
    rollupOptions: {
      input: { dashboard: "src/client/dashboard.tsx" },
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "[name]-[hash].js",
        assetFileNames: (info) =>
          info.name?.endsWith(".css") ? "[name][extname]" : "[name]-[hash][extname]",
      },
    },
  },
});
