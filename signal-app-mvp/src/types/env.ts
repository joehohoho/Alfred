import { z } from 'zod';

const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  COINGECKO_BASE_URL: z.string().default('https://api.coingecko.com/api/v3'),
  BINANCE_BASE_URL: z.string().default('https://api.binance.com'),
  ALPHA_VANTAGE_API_KEY: z.string().optional(),
  ALPHA_VANTAGE_BASE_URL: z.string().default('https://www.alphavantage.co/query')
});

export type AppEnv = z.infer<typeof EnvSchema>;

export function getEnv(): AppEnv {
  return EnvSchema.parse(process.env);
}
