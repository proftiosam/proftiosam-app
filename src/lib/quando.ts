import { dayKey } from "./rules";

/**
 * "agora", "há 3h", "ontem", "seg".
 *
 * Precisão de relógio não ajuda ninguém aqui: o que o aluno quer saber é se
 * aquilo é de hoje ou de antes.
 */
export function quando(at: Date, now = new Date()): string {
  const minutos = Math.floor((now.getTime() - at.getTime()) / 60000);

  if (minutos < 2) return "agora";
  if (minutos < 60) return `há ${minutos}min`;

  const hoje = dayKey(now);
  const dia = dayKey(at);

  if (dia === hoje) return `há ${Math.floor(minutos / 60)}h`;

  const ontem = dayKey(new Date(now.getTime() - 86_400_000));
  if (dia === ontem) return "ontem";

  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    timeZone: "America/Sao_Paulo",
  })
    .format(at)
    .replace(".", "");
}
