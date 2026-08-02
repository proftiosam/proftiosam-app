import { timingSafeEqual } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db/index";
import { students } from "@/db/schema";
import { issueSession } from "./session";

/* ------------------------------------------------------------------ */
/* Apelidos                                                            */
/* ------------------------------------------------------------------ */

/**
 * Ninguém pode se passar por você.
 *
 * Numa turma onde os alunos não se conhecem, sua palavra é a única com peso —
 * um "prof_sam" falso no feed estragaria justamente a peça que sustenta o app.
 */
const RESERVED = [
  "prof",
  "profsam",
  "proftiosam",
  "tiosam",
  "sam",
  "professor",
  "teacher",
  "admin",
];

const NICKNAME_SHAPE = /^[a-z0-9](?:[a-z0-9._-]{1,22})[a-z0-9]$/;

export type NicknameProblem =
  | "curto"
  | "longo"
  | "formato"
  | "reservado"
  | "em-uso";

export function normalizeNickname(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize("NFD")
    // Propriedade Unicode em vez de um intervalo com caracteres combinantes
    // literais, que dependem da codificação do arquivo para sobreviver.
    // "dedé" e "dede" são a mesma pessoa no ranking.
    .replace(/\p{Diacritic}/gu, "");
}

export function checkNicknameShape(nickname: string): NicknameProblem | null {
  if (nickname.length < 3) return "curto";
  if (nickname.length > 24) return "longo";
  if (!NICKNAME_SHAPE.test(nickname)) return "formato";
  if (RESERVED.includes(nickname.replace(/[._-]/g, ""))) return "reservado";
  return null;
}

export function explainNicknameProblem(problem: NicknameProblem): string {
  switch (problem) {
    case "curto":
      return "Escolha um apelido com pelo menos 3 letras.";
    case "longo":
      return "Apelido muito comprido — no máximo 24 caracteres.";
    case "formato":
      return "Use letras, números, ponto, hífen ou sublinhado. Sem espaços.";
    case "reservado":
      return "Esse apelido é reservado para o professor. Escolha outro.";
    case "em-uso":
      return "Alguém já está usando esse apelido. Escolha outro.";
  }
}

/* ------------------------------------------------------------------ */
/* Códigos                                                             */
/* ------------------------------------------------------------------ */

/** Comparação de tempo constante, para o código não vazar por cronometragem. */
function codeMatches(given: string, expected: string | undefined): boolean {
  if (!expected) return false;
  const a = Buffer.from(given.trim().toUpperCase());
  const b = Buffer.from(expected.trim().toUpperCase());
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/* ------------------------------------------------------------------ */
/* Entrada                                                             */
/* ------------------------------------------------------------------ */

export type LoginResult =
  | { ok: true; studentId: number; nickname: string; returning: boolean }
  | { ok: false; error: "codigo" | NicknameProblem; message: string };

/**
 * Código da turma + apelido. Sem senha e sem e-mail.
 *
 * Quem digita um apelido que já existe está voltando, não invadindo: com menos
 * de dez alunos particulares que nem se conhecem, colisão de apelido é
 * reencontro, não ataque. Se isso mudar, o lugar de apertar é aqui.
 */
export async function loginStudent(code: string, rawNickname: string): Promise<LoginResult> {
  if (!codeMatches(code, process.env.JOIN_CODE)) {
    return { ok: false, error: "codigo", message: "Código não confere. Confira com o professor." };
  }

  const nickname = normalizeNickname(rawNickname);
  const problem = checkNicknameShape(nickname);
  if (problem) {
    return { ok: false, error: problem, message: explainNicknameProblem(problem) };
  }

  const existing = await db.query.students.findFirst({
    where: eq(students.nickname, nickname),
  });

  if (existing) {
    if (!existing.active) {
      await db.update(students).set({ active: true }).where(eq(students.id, existing.id));
    }
    await issueSession({ kind: "student", studentId: existing.id, nickname });
    return { ok: true, studentId: existing.id, nickname, returning: true };
  }

  const [created] = await db
    .insert(students)
    .values({ nickname })
    // Corrida entre dois cadastros com o mesmo apelido no mesmo instante.
    .onConflictDoNothing({ target: students.nickname })
    .returning();

  if (!created) {
    return { ok: false, error: "em-uso", message: explainNicknameProblem("em-uso") };
  }

  await issueSession({ kind: "student", studentId: created.id, nickname });
  return { ok: true, studentId: created.id, nickname, returning: false };
}

export async function loginTeacher(code: string): Promise<{ ok: boolean; message?: string }> {
  if (!codeMatches(code, process.env.TEACHER_CODE)) {
    return { ok: false, message: "Código não confere." };
  }
  await issueSession({ kind: "teacher" });
  return { ok: true };
}

/** Só você vê nome real. O aluno nunca é solicitado a informá-lo. */
export async function setRealName(studentId: number, realName: string): Promise<void> {
  await db
    .update(students)
    .set({ realName: realName.trim().slice(0, 80) || null })
    .where(eq(students.id, studentId));
}

export async function countActiveStudents(): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(students)
    .where(eq(students.active, true));
  return row?.n ?? 0;
}
