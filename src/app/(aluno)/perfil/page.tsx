import { redirect } from "next/navigation";
import { sair } from "../../actions";
import { currentSeason, todayView } from "@/lib/queries";
import { requireStudent } from "@/lib/session";
import { faltam } from "@/lib/texto";

export default async function PerfilPage() {
  const session = await requireStudent();
  const season = await currentSeason();
  if (!season) redirect("/entrar");

  const view = await todayView(session.studentId, season);

  const faltamMeta = Math.max(0, season.goalDays - view.days);
  const faltamTudo = Math.max(0, season.totalDays - view.days);

  const conquistas = [
    { n: "Primeiro check-in", d: "você começou", ok: view.days >= 1 },
    { n: "Sequência de 3", d: "3 dias seguidos", ok: view.streak >= 3 },
    {
      n: "Hall da Semana",
      d: faltamMeta === 0 ? "conquistado" : faltam(faltamMeta),
      ok: faltamMeta === 0,
    },
    {
      n: "Semana cheia",
      d: faltamTudo === 0 ? "conquistado" : `os ${season.totalDays} dias · ${faltam(faltamTudo)}`,
      ok: faltamTudo === 0,
    },
  ];

  return (
    <>
      <header className="appbar">
        <div>
          <h1 className="appbar-title">Seu progresso</h1>
          <p className="appbar-sub">apelido: {session.nickname}</p>
        </div>
      </header>

      <main className="screen">
        <div className="stats">
          <div className="stat">
            <span className="num">{view.points}</span>
            <small>pontos na temporada</small>
          </div>
          <div className="stat">
            <span className="num">{view.days}</span>
            <small>dias com check-in</small>
          </div>
          <div className="stat">
            <span className="num">{view.streak}</span>
            <small>sequência atual</small>
          </div>
          <div className="stat">
            <span className="num">{view.shieldsLeft}</span>
            <small>{view.shieldsLeft === 1 ? "protetor restante" : "protetores restantes"}</small>
          </div>
        </div>

        <div className="group">
          <p className="sec-label">Conquistas</p>
          <div className="badges">
            {conquistas.map((c) => (
              <div key={c.n} className="badge" data-locked={c.ok ? "0" : "1"}>
                <span className="badge-n">{c.n}</span>
                <span className="badge-d">{c.d}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <p className="sec-label">Instalar no celular</p>
          <p className="tiny muted" style={{ margin: 0 }}>
            No iPhone: toque em Compartilhar e depois em &ldquo;Adicionar à Tela de Início&rdquo;. No
            Android, o menu do navegador tem &ldquo;Instalar app&rdquo;. Sem isso as notificações não
            funcionam — é limitação do sistema, não do app.
          </p>
        </div>

        <form action={sair}>
          <button className="btn btn-ghost btn-block" type="submit">
            Sair
          </button>
        </form>
      </main>
    </>
  );
}
