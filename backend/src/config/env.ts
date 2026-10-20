import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/stellarcampus?schema=public'),
  JWT_SECRET: z.string().default('super-secret-jwt-key-stellarcampus-testnet-2026'),
  STELLAR_NETWORK_PASSPHRASE: z.string().default('Test SDF Network ; September 2015'),
  STELLAR_HORIZON_URL: z.string().default('https://horizon-testnet.stellar.org'),
  STELLAR_SOROBAN_RPC_URL: z.string().default('https://soroban-testnet.stellar.org'),
  SOROBAN_CONTRACT_ID: z.string().optional().default(''),
  CAMPUS_VAULT_ADDRESS: z.string().optional().default('GBBD47IF6LWK7P7MDEVTESTNETDESTINATIONDEFAULT'),
  CAMPUS_ASSET_ISSUER: z.string().optional().default('GA3D5JTESTNETISSUERFORCAMPUSDEFAULTTOKEN12345'),
});

export const env = envSchema.parse(process.env);
