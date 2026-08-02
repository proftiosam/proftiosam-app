"use client";

import { useActionState, useState } from "react";
import { entrarAluno, entrarProfessor, type FormState } from "../actions";

const inicial: FormState = { error: null };

/**
 * Quando o aluno chega pelo link do professor, o código vem junto e ele só
 * escolhe um apelido. Digitar código é fricção que não protege de ninguém:
 * quem tem o link tem o código de qualquer jeito.
 *
 * O campo continua existindo para quem abrir o endereço na mão.
 */
export function EntrarForm({ codigoDoLink }: { codigoDoLink: string | null }) {
  const [modoProfessor, setModoProfessor] = useState(false);
  const [alunoState, alunoAction, alunoPending] = useActionState(entrarAluno, inicial);
  const [profState, profAction, profPending] = useActionState(entrarProfessor, inicial);

  if (modoProfessor) {
    return (
      <>
        <form action={profAction} className="group">
          <div className="field">
            <label htmlFor="codigo-prof">Código de professor</label>
            <input
              id="codigo-prof"
              name="codigo"
              autoComplete="off"
              autoCapitalize="characters"
              required
            />
          </div>
          {profState.error ? <p className="error">{profState.error}</p> : null}
          <button className="btn btn-block" type="submit" disabled={profPending}>
            {profPending ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <button className="link-skip" type="button" onClick={() => setModoProfessor(false)}>
          Sou aluno
        </button>
      </>
    );
  }

  return (
    <>
      <form action={alunoAction} className="group">
        {codigoDoLink ? (
          <input type="hidden" name="codigo" value={codigoDoLink} />
        ) : (
          <div className="field">
            <label htmlFor="codigo">Código da turma</label>
            <input
              id="codigo"
              name="codigo"
              autoComplete="off"
              autoCapitalize="characters"
              required
            />
            <span className="tiny muted">
              Está no link que o professor mandou. Se você não tem, peça pra ele.
            </span>
          </div>
        )}

        <div className="field">
          <label htmlFor="apelido">Escolha seu apelido</label>
          <input
            id="apelido"
            name="apelido"
            placeholder="como você quer aparecer"
            autoComplete="off"
            autoCapitalize="none"
            minLength={3}
            maxLength={24}
            required
            autoFocus={Boolean(codigoDoLink)}
          />
          <span className="tiny muted">
            É o que os outros vão ver. Não precisa ser seu nome. Se você já entrou antes, use o
            mesmo apelido para voltar pra sua conta.
          </span>
        </div>

        {alunoState.error ? <p className="error">{alunoState.error}</p> : null}

        <button className="btn btn-block" type="submit" disabled={alunoPending}>
          {alunoPending ? "Entrando…" : "Entrar"}
        </button>
      </form>

      <button className="link-skip" type="button" onClick={() => setModoProfessor(true)}>
        Sou o professor
      </button>
    </>
  );
}
