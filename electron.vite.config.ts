import { resolve } from "node:path";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: resolve("src/main/main.ts")
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: { settings: resolve("src/preload/settings.ts") },
        output: { format: "cjs", entryFileNames: "[name].cjs" }
      }
    }
  },
  renderer: {
    root: resolve("src/renderer"),
    publicDir: resolve("assets"),
    build: {
      rollupOptions: {
        input: {
          settings: resolve("src/renderer/settings.html"),
          error: resolve("src/renderer/error.html")
        }
      }
    }
  }
});
