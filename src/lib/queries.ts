import { and, desc, eq, gt, inArray, isNull, lte, sql } from "drizzle-orm";
import { db } from "@/db/index";
import { checkins, reactions, seasons, shieldUses, students } from "@/db/schema";
import {
  DAILY_CAP,
  activity,
  currentStreak,
  dayKey,
  daysInactive,
  evaluateCheckin,
  inactivityThreshold,
  isOnPace,
  requiredPace,
  seasonDay,
  shieldToSpend,
  type CheckinRejection,
  type Season as SeasonRules,
} from "./rules";
import type { Season as SeasonRow } from "@/db/schema";

/* ------------------------------------------------------------------ */
/* Temporada                                                           */
/* ------------------------------------------------------------------ */

export function seasonRules(row: SeasonRow): SeasonRules {
  return {
    startsOn: row.startsOn,
    totalDays: row.totalDays,
    goalDays: row.goalDays,
    shields: row.shields,
  };
}

/**
 * A temporada valendo hoje.
 *
 * Filtra por data de início já passada de propósito: agendar a próxima com
 * antecedência é o fluxo normal, e sem este filtro ela tomaria o lugar da atual
 * no instante em que fosse criada, deixando a turma sem temporada válida até a
 * data chegar.
 */
export async function currentSeason(today = dayKey()): Promise<SeasonRow | null> {
  const [row] = await db
    .select()
    .from(seasons)
    .where(lte(seasons.startsOn, today))
    .orderBy(desc(seasons.startsOn))
    .limit(1);
  return row ?? null;
}

/** A próxima temporada agendada, se houver. */
export async function nextSeason(today = dayKey()): Promise<SeasonRow | null> {
  const [row] = await db
    .select()
    .from(seasons)
    .where(gt(seasons.startsOn, today))
    .orderBy(seasons.startsOn)
    .limit(1);
  return row ?? null;
}

/* ------------------------------------------------------------------ */
/* Dias por aluno                                                      */
/* ------------------------------------------------------------------ */

interface DayIndex {
  checkinDays: Map<number, Set<string>>;
  shieldedDays: Map<number, Set<string>>;
}

/**
 * Todos os dias marcados da temporada, de todo mundo, em duas consultas.
 *
 * Com menos de dez alunos e temporadas de uma semana isso é um punhado de
 * linhas — calcular sequência em memória sai mais simples e mais legível do
 * que uma window function que ninguém vai querer manter daqui a seis meses.
 */
async function loadDayIndex(seasonId: number): Promise<DayIndex> {
  // Em paralelo: uma não depende da outra, e cada ida ao banco custa ~165ms
  // enquanto ele estiver fora do Brasil.
  const [marked, shields] = await Promise.all([
    db
      .selectDistinct({ studentId: checkins.studentId, day: checkins.day })
      .from(checkins)
      .where(and(eq(checkins.seasonId, seasonId), eq(checkins.isTeacher, false))),
    db
      .select({ studentId: shieldUses.studentId, day: shieldUses.day })
      .from(shieldUses)
      .where(eq(shieldUses.seasonId, seasonId)),
  ]);

  const checkinDays = new Map<number, Set<string>>();
  for (const row of marked) {
    if (row.studentId === null) continue;
    const set = checkinDays.get(row.studentId) ?? new Set<string>();
    set.add(row.day);
    checkinDays.set(row.studentId, set);
  }

  const shieldedDays = new Map<number, Set<string>>();
  for (const row of shields) {
    const set = shieldedDays.get(row.studentId) ?? new Set<string>();
    set.add(row.day);
    shieldedDays.set(row.studentId, set);
  }

  return { checkinDays, shieldedDays };
}

/* ------------------------------------------------------------------ */
/* Ranking                                                             */
/* ------------------------------------------------------------------ */

/** Sentinela para "nunca marcou nada". Maior que qualquer temporada real. */
export const NEVER_CHECKED_IN = 9999;

export interface RankRow {
  studentId: number;
  nickname: string;
  realName: string | null;
  points: number;
  days: number;
  streak: number;
  daysInactive: number;
  onPace: boolean;
  /** Um por dia da temporada: marcou, faltou, ou ainda não chegou. */
  week: Array<"feito" | "falhou" | "futuro">;
}

export async function ranking(season: SeasonRow, today = dayKey()): Promise<RankRow[]> {
  const rules = seasonRules(season);

  const [{ checkinDays, shieldedDays }, totals] = await Promise.all([
    loadDayIndex(season.id),
    db
      .select({
        studentId: students.id,
        nickname: students.nickname,
        realName: students.realName,
        points: sql<number>`coalesce(sum(${checkins.points}), 0)::int`,
        lastDay: sql<string | null>`max(${checkins.day})`,
      })
      .from(students)
      .leftJoin(
        checkins,
        and(eq(checkins.studentId, students.id), eq(checkins.seasonId, season.id)),
      )
      .where(eq(students.active, true))
      .groupBy(students.id, students.nickname, students.realName),
  ]);

  const dayIndex = seasonDay(rules, today);

  const rows: RankRow[] = totals.map((row) => {
    const marked = checkinDays.get(row.studentId) ?? new Set<string>();
    const shielded = shieldedDays.get(row.studentId) ?? new Set<string>();

    const week: RankRow["week"] = [];
    for (let i = 0; i < season.totalDays; i += 1) {
      const day = shiftFrom(season.startsOn, i);
      if (i + 1 > dayIndex) week.push("futuro");
      else if (marked.has(day) || shielded.has(day)) week.push("feito");
      else week.push("falhou");
    }

    return {
      studentId: row.studentId,
      nickname: row.nickname,
      realName: row.realName,
      points: row.points,
      days: marked.size,
      streak: currentStreak({ checkinDays: marked, shieldedDays: shielded, today }),
      // Finito de propósito: Infinity vira null ao atravessar para o cliente,
      // e "nunca marcou nada" é justamente quem precisa aparecer no alerta.
      daysInactive: row.lastDay ? daysInactive(row.lastDay, today) : NEVER_CHECKED_IN,
      onPace: isOnPace(marked.size, rules, today),
      week,
    };
  });

  rows.sort((a, b) => b.points - a.points || b.days - a.days || a.nickname.localeCompare(b.nickname));
  return rows;
}

function shiftFrom(start: string, offset: number): string {
  const [y, m, d] = start.split("-").map(Number);
  const dt = new Date(Date.UTC(y!, m! - 1, d!));
  dt.setUTCDate(dt.getUTCDate() + offset);
  return dt.toISOString().slice(0, 10);
}

/* ------------------------------------------------------------------ */
/* Feed                                                                */
/* ------------------------------------------------------------------ */

export interface FeedPost {
  id: number;
  nickname: string;
  isTeacher: boolean;
  activityId: string;
  activityName: string;
  points: number;
  note: string | null;
  day: string;
  createdAt: Date;
  teacherReaction: string | null;
  teacherComment: string | null;
  /** Contagem por emoji, só de reações de aluno. */
  reactions: Record<string, number>;
  /** Emojis que o aluno que está olhando já deu. */
  mine: string[];
}

export async function feed(
  season: SeasonRow,
  viewerId: number | null,
  limit = 60,
): Promise<FeedPost[]> {
  const rows = await db
    .select({
      id: checkins.id,
      isTeacher: checkins.isTeacher,
      nickname: students.nickname,
      activityId: checkins.activityId,
      points: checkins.points,
      note: checkins.note,
      day: checkins.day,
      createdAt: checkins.createdAt,
      teacherReaction: checkins.teacherReaction,
      teacherComment: checkins.teacherComment,
    })
    .from(checkins)
    .leftJoin(students, eq(checkins.studentId, students.id))
    .where(eq(checkins.seasonId, season.id))
    .orderBy(desc(checkins.createdAt))
    .limit(limit);

  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);
  const reacts = await db
    .select({
      checkinId: reactions.checkinId,
      emoji: reactions.emoji,
      studentId: reactions.studentId,
    })
    .from(reactions)
    .where(inArray(reactions.checkinId, ids));

  const byCheckin = new Map<number, { counts: Record<string, number>; mine: string[] }>();
  for (const r of reacts) {
    const entry = byCheckin.get(r.checkinId) ?? { counts: {}, mine: [] };
    entry.counts[r.emoji] = (entry.counts[r.emoji] ?? 0) + 1;
    if (viewerId !== null && r.studentId === viewerId) entry.mine.push(r.emoji);
    byCheckin.set(r.checkinId, entry);
  }

  return rows.map((row) => {
    const entry = byCheckin.get(row.id);
    return {
      id: row.id,
      nickname: row.isTeacher ? "Prof. Sam" : (row.nickname ?? "aluno"),
      isTeacher: row.isTeacher,
      activityId: row.activityId,
      activityName: activity(row.activityId).name,
      points: row.points,
      note: row.note,
      day: row.day,
      createdAt: row.createdAt,
      teacherReaction: row.teacherReaction,
      teacherComment: row.teacherComment,
      reactions: entry?.counts ?? {},
      mine: entry?.mine ?? [],
    };
  });
}

/* ------------------------------------------------------------------ */
/* O dia do aluno                                                      */
/* ------------------------------------------------------------------ */

export interface TodayView {
  todayCheckins: Array<{ id: number; activityId: string; activityName: string; points: number; note: string | null }>;
  remaining: number;
  streak: number;
  days: number;
  points: number;
  goalDays: number;
  seasonDay: number;
  /** Protetor gasto que o aluno ainda não viu. Vira o aviso "sua sequência foi salva". */
  unacknowledgedShield: string | null;
  shieldsLeft: number;
}

export async function todayView(
  studentId: number,
  season: SeasonRow,
  today = dayKey(),
): Promise<TodayView> {
  const rules = seasonRules(season);

  const [mine, shields] = await Promise.all([
    db
      .select()
      .from(checkins)
      .where(and(eq(checkins.studentId, studentId), eq(checkins.seasonId, season.id))),
    db
      .select()
      .from(shieldUses)
      .where(and(eq(shieldUses.studentId, studentId), eq(shieldUses.seasonId, season.id))),
  ]);

  const markedDays = new Set(mine.map((c) => c.day));
  const shieldedDays = new Set(shields.map((s) => s.day));
  const todays = mine.filter((c) => c.day === today);
  const pending = shields.find((s) => !s.acknowledged);

  return {
    todayCheckins: todays.map((c) => ({
      id: c.id,
      activityId: c.activityId,
      activityName: activity(c.activityId).name,
      points: c.points,
      note: c.note,
    })),
    remaining: Math.max(0, DAILY_CAP - todays.length),
    streak: currentStreak({ checkinDays: markedDays, shieldedDays, today }),
    days: markedDays.size,
    points: mine.reduce((sum, c) => sum + c.points, 0),
    goalDays: season.goalDays,
    seasonDay: seasonDay(rules, today),
    unacknowledgedShield: pending?.day ?? null,
    shieldsLeft: Math.max(0, season.shields - shields.length),
  };
}

/* ------------------------------------------------------------------ */
/* Gravar check-in                                                     */
/* ------------------------------------------------------------------ */

export type CheckinResult =
  | { ok: true; id: number; points: number }
  | { ok: false; reason: CheckinRejection };

/**
 * Grava o check-in dentro de uma transação.
 *
 * Contar quantos já existem hoje e inserir precisam ser a mesma operação:
 * dois toques rápidos no botão furariam o teto de três se o teste ficasse
 * fora dela.
 */
export async function createCheckin(args: {
  studentId: number;
  season: SeasonRow;
  activityId: string;
  note: string | null;
  today?: string;
}): Promise<CheckinResult> {
  const today = args.today ?? dayKey();
  const rules = seasonRules(args.season);

  return db.transaction(async (tx) => {
    // Trava a linha do aluno, não o resultado da contagem: o Postgres recusa
    // FOR UPDATE junto de função de agregação. Travar o aluno serializa os
    // check-ins dele e deixa os outros sete em paz.
    await tx.select({ id: students.id }).from(students).where(eq(students.id, args.studentId)).for("update");

    const [row] = await tx
      .select({ n: sql<number>`count(*)::int` })
      .from(checkins)
      .where(
        and(
          eq(checkins.studentId, args.studentId),
          eq(checkins.seasonId, args.season.id),
          eq(checkins.day, today),
        ),
      );

    const verdict = evaluateCheckin({
      activityId: args.activityId,
      checkinsToday: row?.n ?? 0,
      season: rules,
      today,
    });

    if (!verdict.ok) return verdict;

    const [created] = await tx
      .insert(checkins)
      .values({
        studentId: args.studentId,
        seasonId: args.season.id,
        activityId: args.activityId,
        points: verdict.points,
        note: args.note?.trim().slice(0, 140) || null,
        day: today,
      })
      .returning({ id: checkins.id });

    return { ok: true as const, id: created!.id, points: verdict.points };
  });
}

/** Check-in seu. Entra no feed, fica fora do ranking, não tem teto. */
export async function createTeacherCheckin(args: {
  season: SeasonRow;
  activityId: string;
  note: string | null;
  today?: string;
}): Promise<{ id: number }> {
  const [created] = await db
    .insert(checkins)
    .values({
      isTeacher: true,
      seasonId: args.season.id,
      activityId: args.activityId,
      points: activity(args.activityId).points,
      note: args.note?.trim().slice(0, 140) || null,
      day: args.today ?? dayKey(),
      teacherSeenAt: new Date(),
    })
    .returning({ id: checkins.id });

  return { id: created!.id };
}

/* ------------------------------------------------------------------ */
/* Reações                                                             */
/* ------------------------------------------------------------------ */

export async function toggleReaction(
  checkinId: number,
  studentId: number,
  emoji: string,
): Promise<"added" | "removed"> {
  const deleted = await db
    .delete(reactions)
    .where(
      and(
        eq(reactions.checkinId, checkinId),
        eq(reactions.studentId, studentId),
        eq(reactions.emoji, emoji),
      ),
    )
    .returning({ id: reactions.id });

  if (deleted.length > 0) return "removed";

  await db
    .insert(reactions)
    .values({ checkinId, studentId, emoji })
    .onConflictDoNothing();

  return "added";
}

/* ------------------------------------------------------------------ */
/* Fila do professor                                                   */
/* ------------------------------------------------------------------ */

export async function teacherQueue(season: SeasonRow) {
  return db
    .select({
      id: checkins.id,
      nickname: students.nickname,
      realName: students.realName,
      activityId: checkins.activityId,
      points: checkins.points,
      note: checkins.note,
      day: checkins.day,
      createdAt: checkins.createdAt,
    })
    .from(checkins)
    .innerJoin(students, eq(checkins.studentId, students.id))
    .where(
      and(
        eq(checkins.seasonId, season.id),
        eq(checkins.isTeacher, false),
        isNull(checkins.teacherSeenAt),
      ),
    )
    .orderBy(desc(checkins.createdAt));
}

export async function teacherReact(checkinId: number, emoji: string): Promise<void> {
  await db
    .update(checkins)
    .set({ teacherReaction: emoji, teacherSeenAt: new Date() })
    .where(eq(checkins.id, checkinId));
}

export async function teacherComment(checkinId: number, text: string): Promise<void> {
  await db
    .update(checkins)
    .set({ teacherComment: text.trim().slice(0, 240), teacherSeenAt: new Date() })
    .where(eq(checkins.id, checkinId));
}

export async function teacherSkip(checkinId: number): Promise<void> {
  await db
    .update(checkins)
    .set({ teacherSeenAt: new Date() })
    .where(eq(checkins.id, checkinId));
}

export async function setWeeklyChallenge(seasonId: number, text: string): Promise<void> {
  await db
    .update(seasons)
    .set({ weeklyChallenge: text.trim().slice(0, 200) || null })
    .where(eq(seasons.id, seasonId));
}

export async function listStudents() {
  return db.select().from(students).orderBy(students.nickname);
}

/**
 * O aluno da sessão ainda existe?
 *
 * A sessão vale um ano e o aluno pode ter sido removido nesse meio-tempo.
 * Sem esta checagem o celular dele continua abrindo o app com dados vazios,
 * e o primeiro check-in estoura na chave estrangeira.
 */
export async function activeStudentExists(studentId: number): Promise<boolean> {
  const [row] = await db
    .select({ id: students.id })
    .from(students)
    .where(and(eq(students.id, studentId), eq(students.active, true)))
    .limit(1);
  return Boolean(row);
}

/* ------------------------------------------------------------------ */
/* Painel                                                              */
/* ------------------------------------------------------------------ */

export interface Panel {
  rows: RankRow[];
  missing: RankRow[];
  activeToday: number;
  onPace: number;
  queueSize: number;
  requiredPace: number;
  seasonDay: number;
}

export async function panel(season: SeasonRow, today = dayKey()): Promise<Panel> {
  const rules = seasonRules(season);
  const [rows, queue] = await Promise.all([ranking(season, today), teacherQueue(season)]);
  const limit = inactivityThreshold(rules);

  return {
    rows,
    missing: rows
      .filter((r) => r.daysInactive >= limit)
      .sort((a, b) => b.daysInactive - a.daysInactive),
    activeToday: rows.filter((r) => r.daysInactive === 0).length,
    onPace: rows.filter((r) => r.onPace).length,
    queueSize: queue.length,
    requiredPace: requiredPace(rules, today),
    seasonDay: seasonDay(rules, today),
  };
}

/* ------------------------------------------------------------------ */
/* Virada do dia                                                       */
/* ------------------------------------------------------------------ */

/**
 * Gasta protetor de quem merecia. Roda uma vez por dia, logo após a virada
 * em São Paulo. Devolve os apelidos salvos, para o log.
 */
export async function spendShields(season: SeasonRow, today = dayKey()): Promise<string[]> {
  const rules = seasonRules(season);
  const { checkinDays, shieldedDays } = await loadDayIndex(season.id);
  const active = await db.select().from(students).where(eq(students.active, true));
  const saved: string[] = [];

  for (const student of active) {
    const day = shieldToSpend({
      checkinDays: checkinDays.get(student.id) ?? [],
      shieldedDays: shieldedDays.get(student.id) ?? [],
      season: rules,
      today,
    });
    if (!day) continue;

    await db
      .insert(shieldUses)
      .values({ studentId: student.id, seasonId: season.id, day })
      .onConflictDoNothing();

    saved.push(student.nickname);
  }

  return saved;
}

export async function acknowledgeShield(studentId: number): Promise<void> {
  await db
    .update(shieldUses)
    .set({ acknowledged: true })
    .where(and(eq(shieldUses.studentId, studentId), eq(shieldUses.acknowledged, false)));
}
