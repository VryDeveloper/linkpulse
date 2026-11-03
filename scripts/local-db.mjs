// Utilitários do banco local (Postgres embutido do Prisma via `prisma dev`).
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

export const LOCAL_DB_NAME = "linkpulse";
export const LOCAL_DB_URL =
  "postgres://postgres:postgres@localhost:51214/template1?sslmode=disable&connection_limit=1&pgbouncer=true";

export function loadEnv() {
  if (existsSync(".env")) process.loadEnvFile(".env");
}

export function usesLocalDb() {
  return (process.env.DATABASE_URL ?? "").includes("localhost:51214");
}

export function run(command) {
  const result = spawnSync(command, { stdio: "inherit", shell: true });
  if (result.status !== 0) {
    console.error(`\n✖ Falhou: ${command}`);
    process.exit(result.status ?? 1);
  }
}

/** Sobe o Postgres local em segundo plano. Se já estiver rodando, não faz nada. */
export function startLocalDb() {
  run(`npx prisma dev --name ${LOCAL_DB_NAME} --detach`);
}
