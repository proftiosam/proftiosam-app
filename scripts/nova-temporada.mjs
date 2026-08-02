/**
 * Cria (ou reagenda) uma temporada.
 *
 *   node scripts/nova-temporada.mjs 2026-08-03
 *   node scripts/nova-temporada.mjs 2026-08-03 --nome "Semana 1" --dias 7 --meta 5
 *   node scripts/nova-temporada.mjs 2026-08-03 --desafio "Ver um filme em inglês"
 *
 * Pode criar com data futura sem medo: o app só passa a usá-la no dia de
 * início. Até lá a temporada atual continua valendo.
 */
import { neonConfig, Pool } from "@neondatabase/serverless";
import ws from "ws";

if (typeof WebSocket === "undefined") neonConfig.webSocketConstructor = ws;

const args = process.argv.slice(2);
const inicio = args[0];

if (!inicio || !/^\d{4}-\d{2}-\d{2}$/.test(inicio)) {
  console.error("Uso: node scripts/nova-temporada.mjs AAAA-MM-DD [--nome X] [--dias N] [--meta N] [--desafio T]");
  process.exit(1);
}

function opcao(nome, padrao) {
  const i = args.indexOf(`--${nome}`);
  return i === -1 ? padrao : args[i + 1];
}

const nome = opcao("nome", "Semana de teste");
const dias = Number(opcao("dias", 7));
const meta = Number(opcao("meta", 5));
const escudos = Number(opcao("escudos", 1));
const desafio = opcao("desafio", "Ver um filme em inglês");
const premio = opcao("premio", "Troféu no perfil + destaque no Hall da Semana");

if (meta > dias) {
  console.error(`Meta de ${meta} dias é impossível numa temporada de ${dias}.`);
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const { rows: existentes } = await pool.query(
  `select id, name, starts_on, total_days from seasons order by starts_on`,
);
console.log("temporadas já existentes:", existentes);

const jaTem = existentes.find((s) => String(s.starts_on).slice(0, 10) === inicio);
if (jaTem) {
  console.error(`\nJá existe temporada começando em ${inicio} (id ${jaTem.id}). Nada criado.`);
  await pool.end();
  process.exit(1);
}

const { rows } = await pool.query(
  `insert into seasons (name, starts_on, total_days, goal_days, shields, prize, weekly_challenge)
   values ($1, $2, $3, $4, $5, $6, $7)
   returning id, name, starts_on, total_days, goal_days`,
  [nome, inicio, dias, meta, escudos, premio, desafio],
);

console.log("\ncriada:", rows[0]);
console.log(`Vale a partir de ${inicio}. Até lá, a temporada anterior continua no ar.`);

await pool.end();
