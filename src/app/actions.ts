"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { loginStudent, loginTeacher } from "@/lib/auth";
import {
  acknowledgeShield,
  createCheckin,
  createTeacherCheckin,
  currentSeason,
  setWeeklyChallenge,
  teacherComment,
  teacherReact,
  teacherSkip,
  toggleReaction,
} from "@/lib/queries";
import { readSession, requireStudent, requireTeacher, clearSession } from "@/lib/session";

export type FormState = { error: string | null };

/* ------------------------------------------------------------------ */
/* Entrada                                                             */
/* ------------------------------------------------------------------ */

export async function entrarAluno(_prev: FormState, form: FormData): Promise<FormState> {
  const code = String(form.get("codigo") ?? "");
  const nickname = String(form.get("apelido") ?? "");

  const result = await loginStudent(code, nickname);
  if (!result.ok) return { error: result.message };

  redirect("/hoje");
}

export async function entrarProfessor(_prev: FormState, form: FormData): Promise<FormState> {
  const result = await loginTeacher(String(form.get("codigo") ?? ""));
  if (!result.ok) return { error: result.message ?? "Código não confere." };

  redirect("/prof");
}

export async function sair(): Promise<void> {
  await clearSession();
  redirect("/entrar");
}

/* ------------------------------------------------------------------ */
/* Aluno                                                               */
/* ------------------------------------------------------------------ */

export async function marcar(_prev: FormState, form: FormData): Promise<FormState> {
  const session = await requireStudent();
  const season = await currentSeason();
  if (!season) return { error: "Nenhuma temporada em andamento." };

  const result = await createCheckin({
    studentId: session.studentId,
    season,
    activityId: String(form.get("atividade") ?? ""),
    note: String(form.get("nota") ?? "") || null,
  });

  if (!result.ok) {
    const reasons = {
      "teto-diario": "Você já usou seus 3 check-ins de hoje. Volte amanhã.",
      "atividade-invalida": "Atividade desconhecida.",
      "fora-da-temporada": "A temporada não está aberta agora.",
    } as const;
    return { error: reasons[result.reason] };
  }

  revalidatePath("/hoje");
  revalidatePath("/ideias");
  revalidatePath("/ranking");
  redirect("/hoje?feito=1");
}

export async function reagir(form: FormData): Promise<void> {
  const session = await requireStudent();
  await toggleReaction(
    Number(form.get("checkin")),
    session.studentId,
    String(form.get("emoji") ?? ""),
  );
  revalidatePath("/ideias");
}

export async function verProtetor(): Promise<void> {
  const session = await requireStudent();
  await acknowledgeShield(session.studentId);
  revalidatePath("/hoje");
}

/* ------------------------------------------------------------------ */
/* Professor                                                           */
/* ------------------------------------------------------------------ */

export async function profReagir(form: FormData): Promise<void> {
  await requireTeacher();
  await teacherReact(Number(form.get("checkin")), String(form.get("emoji") ?? ""));
  revalidatePath("/prof/fila");
  revalidatePath("/prof");
}

export async function profComentar(form: FormData): Promise<void> {
  await requireTeacher();
  const text = String(form.get("texto") ?? "").trim();
  if (!text) return;
  await teacherComment(Number(form.get("checkin")), text);
  revalidatePath("/prof/fila");
  revalidatePath("/prof");
}

export async function profPular(form: FormData): Promise<void> {
  await requireTeacher();
  await teacherSkip(Number(form.get("checkin")));
  revalidatePath("/prof/fila");
  revalidatePath("/prof");
}

export async function profDesafio(form: FormData): Promise<void> {
  await requireTeacher();
  const season = await currentSeason();
  if (!season) return;

  await setWeeklyChallenge(season.id, String(form.get("desafio") ?? ""));
  revalidatePath("/prof/temporada");
  revalidatePath("/hoje");
}

export async function profMarcar(_prev: FormState, form: FormData): Promise<FormState> {
  await requireTeacher();
  const season = await currentSeason();
  if (!season) return { error: "Nenhuma temporada em andamento." };

  await createTeacherCheckin({
    season,
    activityId: String(form.get("atividade") ?? ""),
    note: String(form.get("nota") ?? "") || null,
  });

  revalidatePath("/prof/fila");
  revalidatePath("/ideias");
  return { error: null };
}

/* ------------------------------------------------------------------ */

export async function quemSou() {
  return readSession();
}
