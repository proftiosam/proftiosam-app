"use client";

import { useActionState, useState } from "react";
import { marcar, type FormState } from "../../actions";
import { ACTIVITIES } from "@/lib/rules";

const inicial: FormState = { error: null };

export function Marcar({
  remaining,
  sugestao,
  atividadeInicial,
}: {
  remaining: number;
  sugestao: string | null;
  atividadeInicial: string | null;
}) {
  // Vem preenchida quando o aluno chegou pelo "Fazer também" de outro post.
  const [escolhida, setEscolhida] = useState<string | null>(atividadeInicial);
  const [state, action, pending] = useActionState(marcar, inicial);

  const cheio = remaining <= 0;
  const atividade = ACTIVITIES.find((a) => a.id === escolhida);

  if (atividade) {
    return (
      <form action={action} className="card">
        <input type="hidden" name="atividade" value={atividade.id} />

        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <span
            className="num"
            style={{
              fontSize: 15,
              color: "var(--accent)",
              background: "var(--accent-soft)",
              padding: "5px 10px",
              borderRadius: 8,
            }}
          >
            +{atividade.points}
          </span>
          <h3 style={{ fontFamily: "var(--f-display)", fontSize: 19, margin: 0, fontWeight: 600 }}>
            {atividade.name}
          </h3>
        </div>

        <div className="field">
          <label htmlFor="nota">O que você fez? Uma linha basta.</label>
          <input
            id="nota"
            name="nota"
            maxLength={140}
            autoFocus
            placeholder={
              sugestao ? `inspirado em: ${sugestao}` : "ex: 30 min de Anki, phrasal verbs"
            }
          />
        </div>

        {state.error ? <p className="error">{state.error}</p> : null}

        <div className="say">
          <button
            className="btn btn-ghost"
            type="button"
            onClick={() => setEscolhida(null)}
            disabled={pending}
          >
            Cancelar
          </button>
          <button className="btn" type="submit" style={{ flex: 1 }} disabled={pending}>
            {pending ? "Marcando…" : "Marcar"}
          </button>
        </div>
      </form>
    );
  }

  return (
    <>
      <div className="acts">
        {ACTIVITIES.map((a) => (
          <button
            key={a.id}
            className="act"
            type="button"
            disabled={cheio}
            onClick={() => setEscolhida(a.id)}
          >
            <span className="act-pts">
              {a.points}
              <span>PTS</span>
            </span>
            <span className="act-name">{a.name}</span>
          </button>
        ))}
      </div>

      {cheio ? (
        <p className="tiny muted" style={{ margin: 0 }}>
          Teto diário atingido. Volte amanhã — o teto existe pra você escolher o que vale a pena,
          não pra acumular ponto fácil.
        </p>
      ) : null}

      {state.error ? <p className="error">{state.error}</p> : null}
    </>
  );
}
