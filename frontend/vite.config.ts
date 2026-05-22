import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const DEPLOY_BASE = process.env.VITE_BASE_PATH ?? "/";

export default defineConfig(({ command }) => {
  const base = command === "serve" ? "/" : DEPLOY_BASE;
  const apiProxyTarget = process.env.VITE_API_PROXY_TARGET ?? "http://localhost:3001";

  return {
    base,
    plugins: [
      react(),
      tailwindcss(),
    ],
    server: {
      proxy: {
        [`${base}api`]: {
          target: apiProxyTarget,
          changeOrigin: true,
          rewrite: (path) => path.slice(`${base}api`.length),
        },
      },
    },
  };
});
