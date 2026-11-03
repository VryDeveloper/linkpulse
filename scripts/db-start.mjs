// Roda antes do `npm run dev`: garante que o banco local está de pé (se o .env usar o banco local).
import { loadEnv, startLocalDb, usesLocalDb } from "./local-db.mjs";

loadEnv();
if (usesLocalDb()) startLocalDb();
