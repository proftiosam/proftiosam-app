"use client";

import { useActionState, useState } from "react";
import { entrarAluno, entrarProfessor, type FormState } from "../actions";

const inicial: FormState = { error: null };

export function EntrarForm() {
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
        <div className="field">
          <label htmlFor="codigo">Código da turma</label>
          <input
            id="codigo"
            name="codigo"
            placeholder="ING-TESTE"
            autoComplete="off"
            autoCapitalize="characters"
            required
          />
        </div>

        <div className="field">
          <label htmlFor="apelido">Seu apelido</label>
          <input
            id="apelido"
            name="apelido"
            placeholder="como você quer aparecer"
            autoComplete="off"
            autoCapitalize="none"
            minLength={3}
            maxLength={24}
            required
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
