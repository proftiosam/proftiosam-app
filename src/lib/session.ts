import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "tiosam";

/**
 * Um ano.
 *
 * Não há senha para recuperar: se a sessão expirar, o aluno precisa lembrar do
 * código e do apelido que escolheu. Sessão curta aqui não protege nada e só
 * cria uma chance a mais de o aluno desistir na porta.
 */
const MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export type Session =
  | { kind: "student"; studentId: number; nickname: string }
  | { kind: "teacher" };

function secret(): Uint8Array {
  const value = process.env.SESSION_SECRET;
  if (!value) throw new Error("SESSION_SECRET não está definida.");
  return new TextEncoder().encode(value);
}

export async function issueSession(session: Session): Promise<void> {
  const token = await new SignJWT({ ...session })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secret());

  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function readSession(): Promise<Session | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.kind === "teacher") return { kind: "teacher" };
    if (
      payload.kind === "student" &&
      typeof payload.studentId === "number" &&
      typeof payload.nickname === "string"
    ) {
      return { kind: "student", studentId: payload.studentId, nickname: payload.nickname };
    }
    return null;
  } catch {
    // Assinatura inválida ou expirada. Trata como deslogado, sem drama.
    return null;
  }
}

export async function requireStudent() {
  const session = await readSession();
  if (session?.kind !== "student") throw new Error("não autenticado");
  return session;
}

export async function requireTeacher() {
  const session = await readSession();
  if (session?.kind !== "teacher") throw new Error("não autorizado");
  return session;
}

export async function clearSession(): Promise<void> {
  (await cookies()).delete(COOKIE_NAME);
}
