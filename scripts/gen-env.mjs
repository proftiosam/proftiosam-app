/**
 * Cria o .env.local com os segredos já gerados.
 *
 *   node scripts/gen-env.mjs
 *
 * Não sobrescreve um arquivo existente — rodar duas vezes por engano
 * invalidaria todas as sessões e derrubaria as notificações já inscritas.
 */
import { randomBytes } from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import webpush from "web-push";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const target = resolve(root, ".env.local");

if (existsSync(target)) {
  console.log(".env.local já existe. Nada foi alterado.");
  process.exit(0);
}

const vapid = webpush.generateVAPIDKeys();
const teacherCode = "SAM-" + randomBytes(4).toString("hex").toUpperCase();

writeFileSync(
  target,
  `# Gerado por scripts/gen-env.mjs. Não vai para o git.

# ---------------------------------------------------------------------
# COLE AQUI a connection string do Neon, opção "Pooled connection".
# Sem ela, nada que toca o banco roda.
DATABASE_URL=

# ---------------------------------------------------------------------
SESSION_SECRET=${randomBytes(48).toString("base64")}

# Código que os alunos digitam. Pode trocar por algo mais bonito.
JOIN_CODE=ING-TESTE

# Código só seu. Nunca mande junto com o dos alunos.
TEACHER_CODE=${teacherCode}

NEXT_PUBLIC_VAPID_PUBLIC_KEY=${vapid.publicKey}
VAPID_PRIVATE_KEY=${vapid.privateKey}
VAPID_SUBJECT=mailto:contato@proftiosam.com

CRON_SECRET=${randomBytes(24).toString("hex")}

TZ=America/Sao_Paulo
`,
  "utf8",
);

console.log(".env.local criado.");
console.log("Seu código de professor é: " + teacherCode);
console.log("Falta colar o DATABASE_URL do Neon.");
