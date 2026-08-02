"use client";

import { useActionState, useState } from "react";
import { profMarcar, type FormState } from "../../actions";
import { ACTIVITIES } from "@/lib/rules";

const inicial: FormState = { error: null };

/**
 * Você também marca.
 *
 * Feed de professor que só cobra e nunca aparece é o que faz o aluno parar de
 * abrir o app. Fica no feed deles, fora do ranking.
 */
export function ProfMarcar() {
  const [escolhida, setEscolhida] = useState<string | null>(null);
  const [state, action, pending] = useActionState(profMarcar, inicial);

  const atividade = ACTIVITIES.find((a) => a.id === escolhida);

  return (
    <div className="group">
      <p className="sec-label">Você também marca</p>

      {atividade ? (
        <form
          action={async (form) => {
            await action(form);
            setEscolhida(null);
          }}
          className="card"
        >
          <input type="hidden" name="atividade" value={atividade.id} />
          <h3 style={{ fontFamily: "var(--f-display)", fontSize: 18, margin: 0, fontWeight: 600 }}>
            {atividade.name}
          </h3>
          <div className="field">
            <label htmlFor="nota-prof">O que você fez?</label>
            <input id="nota-prof" name="nota" maxLength={140} autoFocus />
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
              {pending ? "Publicando…" : "Publicar no feed"}
            </button>
          </div>
        </form>
      ) : (
        <div className="acts">
          {ACTIVITIES.map((a) => (
            <button key={a.id} className="act" type="button" onClick={() => setEscolhida(a.id)}>
              <span className="act-pts" style={{ color: "var(--ink-3)" }}>
                —
              </span>
              <span className="act-name">{a.name}</span>
            </button>
          ))}
        </div>
      )}

      <p className="tiny muted" style={{ margin: 0 }}>
        Aparece no feed dos alunos, fora do ranking.
      </p>
    </div>
  );
}
