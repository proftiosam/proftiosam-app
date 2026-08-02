import { headers } from "next/headers";
import { sair } from "../../actions";
import { listStudents } from "@/lib/queries";
import { requireTeacher } from "@/lib/session";

export default async function AlunosPage() {
  await requireTeacher();
  const alunos = await listStudents();
  const codigo = process.env.JOIN_CODE ?? "ING-TESTE";

  // Monta o convite com o domínio pelo qual você chegou aqui, para o link
  // continuar certo quando o app sair do .vercel.app e virar app.proftiosam.com.
  const cabecalhos = await headers();
  const host = cabecalhos.get("host") ?? "app.proftiosam.com";
  const esquema = host.startsWith("localhost") ? "http" : "https";
  const convite = `${esquema}://${host}/entrar?c=${encodeURIComponent(codigo)}`;

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
          <p className="sec-label">Link de convite</p>
          <p
            style={{
              margin: 0,
              fontFamily: "var(--f-data)",
              fontSize: 13,
              wordBreak: "break-all",
              color: "var(--accent)",
              fontWeight: 600,
            }}
          >
            {convite}
          </p>
          <p className="tiny muted" style={{ margin: 0 }}>
            Mande este endereço pro aluno. O código já vai dentro dele — o aluno só escolhe um
            apelido e está dentro. Sem senha, sem e-mail, sem código pra digitar.
          </p>
          <p className="tiny muted" style={{ margin: 0 }}>
            Quem abrir o endereço sem o link precisa do código <strong>{codigo}</strong>. É o que
            impede um estranho de entrar e escolher o apelido de um aluno seu.
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
