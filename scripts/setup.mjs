// Setup em um comando: cria o .env, sobe o banco local, aplica as migrations e popula com dados de demo.
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { LOCAL_DB_URL, loadEnv, run, startLocalDb, usesLocalDb } from "./local-db.mjs";

if (!existsSync(".env")) {
  const env = readFileSync(".env.example", "utf8")
    .replace(/^DATABASE_URL=.*$/m, `DATABASE_URL="${LOCAL_DB_URL}"`)
    .replace(/^IP_HASH_SALT=.*$/m, `IP_HASH_SALT="${randomBytes(32).toString("hex")}"`);
  writeFileSync(".env", env);
  console.log("✔ .env criado (banco local + salt aleatório)");
} else {
  // .env já existe: só preenche o salt se estiver vazio.
  const env = readFileSync(".env", "utf8");
  if (/^IP_HASH_SALT=""?\s*$/m.test(env)) {
    writeFileSync(".env", env.replace(/^IP_HASH_SALT=.*$/m, `IP_HASH_SALT="${randomBytes(32).toString("hex")}"`));
    console.log("✔ IP_HASH_SALT gerado no .env");
  }
}

loadEnv();

if (usesLocalDb()) {
  console.log("→ Subindo o Postgres local (prisma dev)…");
  startLocalDb();
}

console.log("→ Aplicando migrations…");
run("npx prisma migrate deploy");

const { PrismaClient } = await import("@prisma/client");
const prisma = new PrismaClient();
const links = await prisma.link.count();
await prisma.$disconnect();

if (links === 0) {
  console.log("→ Banco vazio: inserindo dados de demonstração…");
  run("npm run db:seed");
}

console.log("\n✔ Tudo pronto! Rode: npm run dev");
