/**
 * Cria a temporada inicial. Rode uma vez, depois de migrar.
 *
 *   npm run db:seed
 *
 * Com SEED_DEMO=1 também popula alunos e check-ins falsos, para você navegar
 * no app cheio antes de a turma entrar. Nunca rode isso no banco de produção
 * depois que houver aluno de verdade.
 */
import { count } from "drizzle-orm";
import { db } from "./index";
import { checkins, seasons, students } from "./schema";
import { ACTIVITIES, activity, dayKey, shiftDay } from "../lib/rules";

const DEMO_STUDENTS = [
  { nickname: "tocha", realName: "Rafael M.", days: [0, 1, 2, 3] },
  { nickname: "raposa", realName: "Ana Beatriz P.", days: [0, 1, 2, 3] },
  { nickname: "jow", realName: "João Pedro S.", days: [0, 2, 3] },
  { nickname: "luna", realName: "Luana S.", days: [0, 1, 2] },
  { nickname: "kchan", realName: "Karina C.", days: [0, 2, 3] },
  { nickname: "mike_br", realName: "Michel A.", days: [0, 1] },
  { nickname: "dede", realName: "André L.", days: [0] },
  { nickname: "vini", realName: "Vinícius R.", days: [] },
];

const DEMO_NOTES: Record<string, string> = {
  aula: "Aula de hoje. Past perfect finalmente entrou.",
  fala: "Gravei 3 minutos falando sobre meu fim de semana.",
  estudo: "30 min de Anki, deck de phrasal verbs.",
  leitura: "Duas páginas do Percy Jackson antes de dormir.",
  jogo: "Stardew Valley em inglês, quase 1h.",
  podcast: "Episódio novo no trânsito.",
  serie: "The Office S2E4, legenda em inglês.",
  musica: "Playlist do Hozier no caminho do trabalho.",
};

async function main() {
  const [existing] = await db.select({ n: count() }).from(seasons);
  if ((existing?.n ?? 0) > 0) {
    console.log("Já existe temporada. Nada a fazer.");
    return;
  }

  const today = dayKey();

  const [season] = await db
    .insert(seasons)
    .values({
      name: "Semana de teste",
      startsOn: today,
      totalDays: 7,
      goalDays: 5,
      shields: 1,
      prize: "Troféu no perfil + destaque no Hall da Semana",
      weeklyChallenge: "Ver um filme em inglês",
    })
    .returning();

  if (!season) throw new Error("não consegui criar a temporada");
  console.log(`Temporada "${season.name}" criada, começando em ${today}.`);

  if (process.env.SEED_DEMO !== "1") {
    console.log("Pronto. Use SEED_DEMO=1 se quiser dados falsos para navegar.");
    return;
  }

  // Finge que a temporada começou há 3 dias, para o app abrir com movimento.
  const start = shiftDay(today, -3);
  await db.update(seasons).set({ startsOn: start });

  for (const demo of DEMO_STUDENTS) {
    const [student] = await db
      .insert(students)
      .values({ nickname: demo.nickname, realName: demo.realName })
      .onConflictDoNothing({ target: students.nickname })
      .returning();

    if (!student) continue;

    for (const offset of demo.days) {
      const day = shiftDay(start, offset);
      // Um ou dois check-ins por dia, variando a atividade pelo índice.
      const picks = ACTIVITIES.filter((_, i) => (i + offset + student.id) % 4 === 0).slice(0, 2);
      for (const pick of picks) {
        await db.insert(checkins).values({
          studentId: student.id,
          seasonId: season.id,
          activityId: pick.id,
          points: activity(pick.id).points,
          note: DEMO_NOTES[pick.id] ?? null,
          day,
        });
      }
    }
  }

  // Você também aparece no feed. Fora do ranking.
  await db.insert(checkins).values({
    isTeacher: true,
    seasonId: season.id,
    activityId: "leitura",
    points: activity("leitura").points,
    note: "Terminei The Dispossessed, da Ursula Le Guin. Denso, mas o inglês é limpo.",
    day: today,
    teacherSeenAt: new Date(),
  });

  console.log(`Dados de demonstração criados para ${DEMO_STUDENTS.length} alunos.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
