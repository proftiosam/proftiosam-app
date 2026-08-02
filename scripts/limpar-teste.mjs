/**
 * Remove alunos de teste pelo apelido, com os check-ins e reações deles.
 *
 *   node scripts/limpar-teste.mjs teste provisorio
 *   node scripts/limpar-teste.mjs --prof     (apaga só os check-ins do professor)
 *
 * Sem argumentos, apenas lista o que existe e não apaga nada. É de propósito:
 * apagar por engano o aluno errado custa o histórico inteiro dele.
 */
import { neonConfig, Pool } from "@neondatabase/serverless";
import ws from "ws";

if (typeof WebSocket === "undefined") neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const args = process.argv.slice(2);
const limparProf = args.includes("--prof");
const apelidos = args.filter((a) => !a.startsWith("--"));

const { rows: inventario } = await pool.query(
  `select s.nickname, count(c.id)::int as checkins
     from students s left join checkins c on c.student_id = s.id
    group by s.nickname order by s.nickname`,
);
console.log("alunos no banco:", inventario);

if (apelidos.length === 0 && !limparProf) {
  console.log("\nNada apagado. Passe os apelidos a remover como argumentos.");
  await pool.end();
  process.exit(0);
}

if (apelidos.length > 0) {
  const { rowCount } = await pool.query(
    `delete from students where nickname = any($1::text[])`,
    [apelidos],
  );
  console.log(`removidos: ${rowCount} aluno(s) — ${apelidos.join(", ")}`);
}

if (limparProf) {
  const { rowCount } = await pool.query(`delete from checkins where is_teacher = true`);
  console.log(`removidos: ${rowCount} check-in(s) do professor`);
}

const { rows } = await pool.query(
  `select (select count(*) from students)::int as alunos,
          (select count(*) from checkins)::int as checkins,
          (select count(*) from seasons)::int as temporadas`,
);
console.log("sobrou:", rows[0]);

await pool.end();
