import { relations, sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/pg-core";

/* ------------------------------------------------------------------ */
/* Alunos                                                              */
/* ------------------------------------------------------------------ */

/**
 * O aluno entra com código + apelido. Sem senha, sem e-mail.
 *
 * `nickname` é o que todo mundo vê; `realName` só aparece no seu painel.
 * Como eles são particulares e não se conhecem, o apelido tira o
 * constrangimento de ficar em último.
 */
export const students = pgTable(
  "students",
  {
    id: serial("id").primaryKey(),
    nickname: varchar("nickname", { length: 24 }).notNull(),
    realName: varchar("real_name", { length: 80 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    /** Desativa sem apagar histórico — aluno que saiu não some do passado. */
    active: boolean("active").notNull().default(true),
    reminderOptIn: boolean("reminder_opt_in").notNull().default(true),
  },
  (t) => ({
    nicknameUnique: unique("students_nickname_unique").on(t.nickname),
  }),
);

/** Uma linha por aparelho. O mesmo aluno pode ter celular e notebook. */
export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: serial("id").primaryKey(),
    studentId: integer("student_id").references(() => students.id, { onDelete: "cascade" }),
    /** Nulo = é a inscrição do professor. */
    isTeacher: boolean("is_teacher").notNull().default(false),
    endpoint: text("endpoint").notNull(),
    keys: jsonb("keys").notNull().$type<{ p256dh: string; auth: string }>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    endpointUnique: unique("push_endpoint_unique").on(t.endpoint),
  }),
);

/* ------------------------------------------------------------------ */
/* Temporadas                                                          */
/* ------------------------------------------------------------------ */

/**
 * A janela de pontuação. O ranking zera a cada temporada — quem entra
 * atrasado não olha para um líder inalcançável.
 */
export const seasons = pgTable("seasons", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 60 }).notNull(),
  startsOn: date("starts_on").notNull(),
  totalDays: integer("total_days").notNull(),
  /** Dias com check-in para entrar no Hall. Alvo alcançável por todos. */
  goalDays: integer("goal_days").notNull(),
  /** Perdões de sequência disponíveis na temporada inteira. */
  shields: integer("shields").notNull().default(1),
  prize: text("prize"),
  /** Tarefa específica da semana, escrita por você. */
  weeklyChallenge: text("weekly_challenge"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ------------------------------------------------------------------ */
/* Check-ins                                                           */
/* ------------------------------------------------------------------ */

/**
 * Um check-in é a unidade de tudo: pontos, sequência, feed e ranking
 * saem daqui.
 *
 * `points` é congelado no momento da marcação. Se você mudar o peso de
 * "Leitura" no meio da temporada, o histórico não se reescreve sozinho.
 *
 * `studentId` nulo com `isTeacher` verdadeiro é um check-in seu: aparece
 * no feed dos alunos e fica fora do ranking.
 */
export const checkins = pgTable(
  "checkins",
  {
    id: serial("id").primaryKey(),
    studentId: integer("student_id").references(() => students.id, { onDelete: "cascade" }),
    isTeacher: boolean("is_teacher").notNull().default(false),
    seasonId: integer("season_id")
      .notNull()
      .references(() => seasons.id, { onDelete: "cascade" }),
    activityId: varchar("activity_id", { length: 16 }).notNull(),
    points: integer("points").notNull(),
    note: varchar("note", { length: 140 }),
    /** Dia no fuso do aluno. É por ele que sequência e teto são calculados. */
    day: date("day").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),

    /* Presença do professor, gravada no próprio check-in ------------ */
    teacherReaction: varchar("teacher_reaction", { length: 8 }),
    teacherComment: varchar("teacher_comment", { length: 240 }),
    /** Preenchido quando sai da sua fila, por reação, comentário ou pulo. */
    teacherSeenAt: timestamp("teacher_seen_at", { withTimezone: true }),
  },
  (t) => ({
    byStudentDay: index("checkins_student_day_idx").on(t.studentId, t.day),
    bySeason: index("checkins_season_idx").on(t.seasonId, t.day),
    /** A fila do professor: o que ainda não foi visto, mais novo primeiro. */
    queue: index("checkins_queue_idx")
      .on(t.createdAt)
      .where(sql`${t.teacherSeenAt} is null and ${t.isTeacher} = false`),
  }),
);

/** Reação de aluno em check-in alheio. A do professor mora no próprio check-in. */
export const reactions = pgTable(
  "reactions",
  {
    id: serial("id").primaryKey(),
    checkinId: integer("checkin_id")
      .notNull()
      .references(() => checkins.id, { onDelete: "cascade" }),
    studentId: integer("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    emoji: varchar("emoji", { length: 8 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    onePerEmoji: unique("reactions_unique").on(t.checkinId, t.studentId, t.emoji),
  }),
);

/**
 * Protetores gastos. Uma linha por dia salvo.
 *
 * Registrado na virada do dia para que o aluno acorde sabendo que foi
 * salvo, em vez de descobrir que perdeu.
 */
export const shieldUses = pgTable(
  "shield_uses",
  {
    id: serial("id").primaryKey(),
    studentId: integer("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    seasonId: integer("season_id")
      .notNull()
      .references(() => seasons.id, { onDelete: "cascade" }),
    day: date("day").notNull(),
    /** Falso até o aluno abrir o app e ver o aviso. */
    acknowledged: boolean("acknowledged").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    onePerDay: unique("shield_uses_unique").on(t.studentId, t.day),
  }),
);

/* ------------------------------------------------------------------ */

export const studentsRelations = relations(students, ({ many }) => ({
  checkins: many(checkins),
  reactions: many(reactions),
  shieldUses: many(shieldUses),
}));

export const checkinsRelations = relations(checkins, ({ one, many }) => ({
  student: one(students, { fields: [checkins.studentId], references: [students.id] }),
  season: one(seasons, { fields: [checkins.seasonId], references: [seasons.id] }),
  reactions: many(reactions),
}));

export const reactionsRelations = relations(reactions, ({ one }) => ({
  checkin: one(checkins, { fields: [reactions.checkinId], references: [checkins.id] }),
  student: one(students, { fields: [reactions.studentId], references: [students.id] }),
}));

export type Student = typeof students.$inferSelect;
export type Season = typeof seasons.$inferSelect;
export type Checkin = typeof checkins.$inferSelect;
