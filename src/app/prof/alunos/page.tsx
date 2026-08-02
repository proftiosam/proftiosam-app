import { sair } from "../../actions";
import { listStudents } from "@/lib/queries";
import { requireTeacher } from "@/lib/session";

export default async function AlunosPage() {
  await requireTeacher();
  const alunos = await listStudents();
  const codigo = process.env.JOIN_CODE ?? "ING-TESTE";

  return (
    <>
      <header className="appbar">
        <div>
          <h1 className="appbar-title">Alunos</h1>
          <p className="appbar-sub">{alunos.length} cadastrados</p>
        </div>
        <span className="chip-user">Prof. Sam</span>
      </header>

      <main className="screen">
        <div className="card">
          <p className="sec-label">Código de entrada</p>
          <span className="code">{codigo}</span>
          <p className="tiny muted" style={{ margin: 0 }}>
            O aluno abre o link, digita esse código, escolhe um apelido e está dentro. Sem senha,
            sem e-mail.
          </p>
        </div>

        <div className="group">
          <p className="sec-label">{alunos.length} alunos</p>
          {alunos.length === 0 ? (
            <div className="empty">
              <div className="tiny">Ninguém entrou ainda. Mande o link e o código.</div>
            </div>
          ) : (
            alunos.map((a) => (
              <div key={a.id} className="srow">
                <div className="srow-mid">
                  <span className="nick">{a.realName ?? a.nickname}</span>
                  <span className="tiny muted">
                    aparece como <strong>{a.nickname}</strong> pros outros
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        <p className="tiny muted" style={{ margin: 0 }}>
          Só você vê os nomes reais. No ranking e no feed, todo mundo é apelido — como eles não se
          conhecem, isso tira o constrangimento de ficar em último.
        </p>

        <form action={sair}>
          <button className="btn btn-ghost btn-block" type="submit">
            Sair
          </button>
        </form>
      </main>
    </>
  );
}
