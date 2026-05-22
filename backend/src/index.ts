import "dotenv/config";
import express from "express";
import cors from "cors";
import type { HealthResponse } from "./types.js";
import { getConfig } from "./config/env.js";

const config = getConfig();
const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.get("/health", (_req, res) => {
  const payload: HealthResponse = {
    ok: true,
    app: "blindsweeper",
    version: config.APP_VERSION,
  };

  res.json(payload);
});

app.listen(config.PORT, () => {
  console.log(`[BlindSweeper] Backend listening on port ${config.PORT}`);
});
