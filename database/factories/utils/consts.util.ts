const env = (key: string, fallback: number): number =>
  parseInt(process.env[key] || String(fallback), 10);

export const USERS_QTD = env('SEED_USERS_QTD', 5);
