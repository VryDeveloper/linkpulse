// Build usado pela Vercel (ela roda o script "vercel-build" automaticamente, se existir).
// Aplica as migrations antes do build, usando a conexão direta (sem pooler) quando disponível,
// porque migrations não funcionam bem através do pooler de conexões.
import { spawnSync } from "node:child_process";

function run(command, env = process.env) {
  const result = spawnSync(command, { stdio: "inherit", shell: true, env });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const directUrl = process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL;
if (!directUrl) {
  console.error("✖ DATABASE_URL não definido. Conecte um banco Postgres ao projeto na Vercel (Storage → Neon).");
  process.exit(1);
}

run("npx prisma generate");
run("npx prisma migrate deploy", { ...process.env, DATABASE_URL: directUrl });
run("npx next build");
