import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";

// Plugin: injeta preloads de fontes Inter críticas após o build (fontes vêm do CSS, não do HTML)
function preloadFontsPlugin() {
  let outDir = "dist";
  return {
    name: 'preload-critical-fonts',
    configResolved(config: { command: string; build?: { outDir: string } }) {
      if (config.command === 'build' && config.build?.outDir) {
        outDir = config.build.outDir;
      }
    },
    closeBundle() {
      const assetsDir = path.resolve(__dirname, outDir, "assets");
      if (!fs.existsSync(assetsDir)) return;
      const files = fs.readdirSync(assetsDir);
      const weights = ["400", "500", "600", "700"];
      const fontFiles = weights
        .map((w) => files.find((f) => f.match(new RegExp(`^inter-latin-${w}-normal-.+\\.woff2$`))))
        .filter(Boolean) as string[];
      if (!fontFiles.length) return;
      const preloads = fontFiles
        .map((f) => `  <link rel="preload" as="font" type="font/woff2" crossorigin href="/assets/${f}" />`)
        .join("\n");
      const indexPath = path.resolve(__dirname, outDir, "index.html");
      let html = fs.readFileSync(indexPath, "utf-8");
      html = html.replace("</head>", `${preloads}\n</head>`);
      fs.writeFileSync(indexPath, html);
    },
  };
}

export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    preloadFontsPlugin(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "@tanstack/react-query",
    ],
  },
  build: {
    chunkSizeWarningLimit: 400,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/react/") ||
              id.includes("node_modules/react-dom/") ||
              id.includes("node_modules/react-router-dom/") ||
              id.includes("node_modules/scheduler/")) {
            return "vendor-react";
          }
          if (id.includes("node_modules/@supabase/")) {
            return "vendor-supabase";
          }
          if (id.includes("node_modules/recharts") ||
              id.includes("node_modules/d3-") ||
              id.includes("node_modules/victory-")) {
            return "vendor-charts";
          }
          if (id.includes("node_modules/date-fns")) {
            return "vendor-dates";
          }
          if (id.includes("node_modules/@sentry/")) {
            return "vendor-sentry";
          }
          if (id.includes("node_modules/@radix-ui/")) {
            return "vendor-ui";
          }
          if (id.includes("node_modules/@tanstack/")) {
            return "vendor-tanstack";
          }
          if (id.includes("node_modules/posthog-js")) {
            return "vendor-analytics";
          }
        },
      },
    },
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "@tanstack/react-query",
      "react-markdown",
      "posthog-js",
    ],
  },
}));
