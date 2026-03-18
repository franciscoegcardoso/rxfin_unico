import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// Plugin local: injeta <link rel="preload"> para as fontes Inter críticas
// Roda em build time, depois que o Vite resolve os hashes reais
function preloadFontsPlugin() {
  return {
    name: 'preload-fonts',
    transformIndexHtml: {
      order: 'post' as const,
      handler(html: string) {
        // Extrair os nomes reais das fontes do HTML gerado pelo Vite
        const fontMatches = [...html.matchAll(/href="(\/assets\/inter-latin-[^"]+\.woff2)"/g)];
        if (!fontMatches.length) return html;

        const preloadTags = fontMatches
          .slice(0, 4) // máximo 4 fontes — as mais críticas
          .map(m => `  <link rel="preload" as="font" type="font/woff2" crossorigin href="${m[1]}" />`)
          .join('\n');

        return html.replace('</head>', `${preloadTags}\n</head>`);
      }
    }
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
