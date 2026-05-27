import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const DEPLOY_BASE = process.env.VITE_BASE_PATH ?? "/";

export default defineConfig(({ command }) => {
  const base = command === "serve" ? "/" : DEPLOY_BASE;

  return {
    base,
    server: { port: 3333 },
    plugins: [
      react(),
      tailwindcss(),
    ],
  };
});
