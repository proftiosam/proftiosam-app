/**
 * Regras do jogo.
 *
 * Tudo aqui é função pura sobre datas em formato "YYYY-MM-DD" no fuso do aluno.
 * Nada de Date solto: sequência quebrada por fuso horário é o bug mais chato
 * desse tipo de app, e ele só aparece com um aluno reclamando uma semana depois.
 */

export const TZ = "America/Sao_Paulo";

/* ------------------------------------------------------------------ */
/* Atividades                                                          */
/* ------------------------------------------------------------------ */

export const ACTIVITIES = [
  { id: "aula", name: "English Class", points: 10 },
  { id: "fala", name: "Falar / conversar", points: 8 },
  { id: "estudo", name: "Do homework", points: 6 },
  { id: "leitura", name: "Leitura", points: 4 },
  { id: "jogo", name: "Jogo em inglês", points: 3 },
  { id: "podcast", name: "Podcast", points: 3 },
  { id: "serie", name: "Série / filme", points: 3 },
  { id: "musica", name: "Música", points: 2 },
] as const;

export type ActivityId = (typeof ACTIVITIES)[number]["id"];

const BY_ID = new Map(ACTIVITIES.map((a) => [a.id as string, a]));

export function activity(id: string) {
  const found = BY_ID.get(id);
  if (!found) throw new Error(`atividade desconhecida: ${id}`);
  return found;
}

export function isActivityId(id: string): id is ActivityId {
  return BY_ID.has(id);
}

/**
 * Quantos check-ins valem ponto por dia.
 *
 * Sem teto, o aluno marca música + série + podcast todo dia e sobe no ranking
 * sem estudar. Com teto ele precisa escolher, e escolher já é reflexão.
 */
export const DAILY_CAP = 3;

/* ------------------------------------------------------------------ */
/* Dias                                                                */
/* ------------------------------------------------------------------ */

/** "YYYY-MM-DD" no fuso informado. */
export function dayKey(at: Date = new Date(), tz: string = TZ): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
}

export function shiftDay(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number);
  if (y === undefined || m === undefined || d === undefined) {
    throw new Error(`data inválida: ${key}`);
  }
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

/** Dias inteiros de `from` até `to`. Negativo se `to` for anterior. */
export function daysBetween(from: string, to: string): number {
  const ms = Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

/* ------------------------------------------------------------------ */
/* Temporada                                                           */
/* ------------------------------------------------------------------ */

export interface Season {
  startsOn: string;
  totalDays: number;
  /** Dias com check-in necessários para entrar no Hall. */
  goalDays: number;
  /** Protetores de sequência disponíveis na temporada inteira. */
  shields: number;
}

/** Dia 1 é o primeiro dia. Passa de totalDays quando a temporada acabou. */
export function seasonDay(season: Season, today: string): number {
  return daysBetween(season.startsOn, today) + 1;
}

export function seasonEndsOn(season: Season): string {
  return shiftDay(season.startsOn, season.totalDays - 1);
}

export function seasonIsOver(season: Season, today: string): boolean {
  return seasonDay(season, today) > season.totalDays;
}

/**
 * Quantos dias com check-in o aluno precisaria ter agora para terminar na meta.
 *
 * Usado no "no ritmo da meta" — que é o número que importa numa turma onde o
 * ranking motiva pouco, porque todo mundo pode bater a meta ao mesmo tempo.
 */
export function requiredPace(season: Season, today: string): number {
  const day = Math.min(Math.max(seasonDay(season, today), 0), season.totalDays);
  return Math.round((day * season.goalDays) / season.totalDays);
}

export function isOnPace(daysWithCheckin: number, season: Season, today: string): boolean {
  return daysWithCheckin >= requiredPace(season, today);
}

/**
 * A partir de quantos dias sumido o aluno entra na lista de alerta.
 *
 * Numa temporada de 7 dias, esperar o terceiro dia é esperar demais — já são
 * 40% da temporada perdidos. Em temporada longa, 3 dias ainda é ruído.
 */
export function inactivityThreshold(season: Season): number {
  return season.totalDays <= 10 ? 2 : 3;
}

/* ------------------------------------------------------------------ */
/* Sequência                                                           */
/* ------------------------------------------------------------------ */

export interface StreakInput {
  /** Dias em que o aluno fez ao menos um check-in. */
  checkinDays: Iterable<string>;
  /** Dias cobertos por protetor já gasto. */
  shieldedDays?: Iterable<string>;
  today: string;
}

/**
 * Sequência atual em dias.
 *
 * O dia de hoje ainda não acabou: se o aluno não marcou hoje, a sequência
 * continua valendo até virar o dia. Punir às 9h da manhã por não ter estudado
 * ainda é o jeito mais rápido de fazer alguém desinstalar.
 */
export function currentStreak({ checkinDays, shieldedDays, today }: StreakInput): number {
  const marked = new Set(checkinDays);
  const shielded = new Set(shieldedDays ?? []);
  const counts = (day: string) => marked.has(day) || shielded.has(day);

  let cursor = counts(today) ? today : shiftDay(today, -1);
  let streak = 0;

  while (counts(cursor)) {
    streak += 1;
    cursor = shiftDay(cursor, -1);
  }

  return streak;
}

/**
 * O dia de ontem precisa de protetor?
 *
 * Roda uma vez por dia, na virada. Se devolver um dia, gaste um protetor e
 * registre — o aluno acorda sabendo que foi salvo, em vez de descobrir que
 * perdeu. Devolve null quando não há nada a salvar ou não há protetor sobrando.
 */
export function shieldToSpend(args: {
  checkinDays: Iterable<string>;
  shieldedDays: Iterable<string>;
  season: Season;
  today: string;
}): string | null {
  const { season, today } = args;
  const marked = new Set(args.checkinDays);
  const shielded = new Set(args.shieldedDays);

  if (shielded.size >= season.shields) return null;

  const yesterday = shiftDay(today, -1);
  if (marked.has(yesterday) || shielded.has(yesterday)) return null;

  // Fora da temporada não se gasta protetor.
  if (daysBetween(season.startsOn, yesterday) < 0) return null;
  if (yesterday > seasonEndsOn(season)) return null;

  // Só salva quem tinha uma sequência viva para salvar.
  const before = shiftDay(yesterday, -1);
  if (!marked.has(before) && !shielded.has(before)) return null;

  return yesterday;
}

/* ------------------------------------------------------------------ */
/* Pontos                                                              */
/* ------------------------------------------------------------------ */

export interface CheckinLike {
  day: string;
  activityId: string;
  /** Pontos congelados no momento do check-in. */
  points: number;
}

/** Quantos check-ins do dia ainda cabem no teto. */
export function remainingToday(checkinsToday: number): number {
  return Math.max(0, DAILY_CAP - checkinsToday);
}

export type CheckinRejection = "teto-diario" | "atividade-invalida" | "fora-da-temporada";

/**
 * Diz se o check-in pode entrar, e por quanto.
 *
 * Os pontos saem daqui e são gravados na linha. Se você mudar o peso de uma
 * atividade no meio da temporada, o histórico não se reescreve sozinho.
 */
export function evaluateCheckin(args: {
  activityId: string;
  checkinsToday: number;
  season: Season;
  today: string;
}): { ok: true; points: number } | { ok: false; reason: CheckinRejection } {
  if (!isActivityId(args.activityId)) {
    return { ok: false, reason: "atividade-invalida" };
  }
  if (seasonIsOver(args.season, args.today) || seasonDay(args.season, args.today) < 1) {
    return { ok: false, reason: "fora-da-temporada" };
  }
  if (args.checkinsToday >= DAILY_CAP) {
    return { ok: false, reason: "teto-diario" };
  }
  return { ok: true, points: activity(args.activityId).points };
}

export function totalPoints(checkins: readonly CheckinLike[]): number {
  return checkins.reduce((sum, c) => sum + c.points, 0);
}

export function distinctDays(checkins: readonly CheckinLike[]): number {
  return new Set(checkins.map((c) => c.day)).size;
}

/**
 * Dias sem nenhum check-in, contando de hoje para trás.
 *
 * Zero significa que marcou hoje. Alimenta o alerta de sumido no seu painel —
 * na prática, a tela de maior retorno do app inteiro.
 */
export function daysInactive(lastCheckinDay: string | null, today: string): number {
  if (!lastCheckinDay) return Number.POSITIVE_INFINITY;
  return Math.max(0, daysBetween(lastCheckinDay, today));
}
