import { NextResponse } from "next/server";
import { currentSeason, spendShields } from "@/lib/queries";
import { dayKey } from "@/lib/rules";

// Toca o banco: nunca pode ser pré-renderizada.
export const dynamic = "force-dynamic";

/**
 * Virada do dia, 00:05 em São Paulo.
 *
 * Gasta o protetor de quem tinha sequência viva e não marcou ontem. Roda antes
 * de o aluno acordar, para ele encontrar "sua sequência foi salva" em vez de
 * descobrir que perdeu.
 *
 * Rodar duas vezes no mesmo dia é inofensivo: shield_uses tem única por
 * (aluno, dia) e a inserção ignora conflito.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }

  const season = await currentSeason();
  if (!season) {
    return NextResponse.json({ ok: true, nota: "nenhuma temporada em andamento" });
  }

  const hoje = dayKey();
  const salvos = await spendShields(season, hoje);

  return NextResponse.json({ ok: true, dia: hoje, salvos });
}
