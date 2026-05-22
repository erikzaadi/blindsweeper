export type AppConfig = {
  PORT: number;
  SQLITE_DB_PATH: string;
  APP_VERSION: string;
};

let cachedConfig: AppConfig | null = null;

export function getConfig(): AppConfig {
  if (!cachedConfig) {
    cachedConfig = parseConfig();
  }

  return cachedConfig;
}

function parseConfig(): AppConfig {
  const port = Number.parseInt(process.env.PORT ?? "3001", 10);
  if (!Number.isFinite(port)) {
    throw new Error(`[Config] Invalid PORT: ${process.env.PORT}`);
  }

  return {
    PORT: port,
    SQLITE_DB_PATH: process.env.SQLITE_DB_PATH ?? "./data/blindsweeper.sqlite",
    APP_VERSION: process.env.APP_VERSION ?? "dev",
  };
}
