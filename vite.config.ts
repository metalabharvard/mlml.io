import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [svelte()],
  build: {
    outDir: "assets",
    emptyOutDir: false,
    rollupOptions: {
      output: {
        entryFileNames: `js/svelte.js`,
        chunkFileNames: `js/svelte.js`,
        assetFileNames: `js/[name].[ext]`,
      },
    },
  },
});
