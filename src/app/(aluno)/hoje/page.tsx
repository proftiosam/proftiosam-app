import Link from "next/link";
import { redirect } from "next/navigation";
import { verProtetor } from "../../actions";
import { Marcar } from "./marcar";
import { currentSeason, todayView } from "@/lib/queries";
import { DAILY_CAP } from "@/lib/rules";
import { plural } from "@/lib/texto";
import { requireStudent } from "@/lib/session";

const Chama = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M12 2.5c.6 3.2-1.3 4.4-2.7 5.9-1.5 1.6-2.6 3-2.6 5.4a5.3 5.3 0 0 0 10.6 0c0-2-.8-3.3-1.9-4.6-.4 1-1 1.6-1.8 1.9.6-2.9-.4-6.2-1.6-8.6Z"
      fill="currentColor"
    />
  </svg>
);

export default async function HojePage({
  searchParams,
}: {
  searchParams: Promise<{ sugestao?: string; atividade?: string }>;
}) {
  const session = await requireStudent();
  const season = await currentSeason();
  if (!season) redirect("/entrar");

  const view = await todayView(session.studentId, season);
  const params = await searchParams;

  const metaPct = Math.min(100, (view.days / season.goalDays) * 100);
  // Sem temporada nova criada, o dia passa do total. Melhor dizer que acabou
  // do que oferecer botões que o servidor vai recusar.
  const encerrada = view.seasonDay > season.totalDays;

  return (
    <>
      <header className="appbar">
        <div>
          <h1 className="appbar-title">{season.name}</h1>
          <p className="appbar-sub">
            {encerrada ? "encerrada" : `Dia ${view.seasonDay} de ${season.totalDays}`}
          </p>
        </div>
        <Link className="chip-user" href="/perfil">
          {session.nickname}
        </Link>
      </header>

      <main className="screen">
        {view.unacknowledgedShield ? (
          <form action={verProtetor} className="saved">
            <strong style={{ fontSize: 14 }}>Sua sequência foi salva.</strong>
            <span className="tiny">
              Você não marcou nada em {view.unacknowledgedShield} e a gente gastou seu protetor.
              A sequência continua de pé.
            </span>
            <button className="btn" type="submit" style={{ alignSelf: "flex-start" }}>
              Entendi
            </button>
          </form>
        ) : null}

        <div className="streak">
          <div className="flame">
            <Chama />
          </div>
          <div>
            <div className="streak-n">{plural(view.streak, "dia", "dias")}</div>
            <div className="tiny muted" style={{ marginTop: 3 }}>
              de sequência sem falhar
            </div>
          </div>
        </div>

        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
            <p className="sec-label">Meta da temporada</p>
            <span className="num tiny">
              {view.days} / {season.goalDays} dias
            </span>
          </div>
          <div className="bar">
            <i style={{ width: `${metaPct}%` }} />
          </div>
          <p className="tiny muted" style={{ margin: 0 }}>
            Bateu {season.goalDays} dias em {season.totalDays}, você entra no Hall da Semana. Não
            importa em que lugar do ranking.
          </p>
          <p className="shield" style={{ margin: 0 }}>
            Protetor de sequência: <b>{view.shieldsLeft} de {season.shields}</b> disponível
          </p>
        </div>

        {encerrada ? (
          <div className="empty">
            <div style={{ fontFamily: "var(--f-display)", fontSize: 19, color: "var(--ink)", marginBottom: 6 }}>
              Temporada encerrada
            </div>
            <div className="tiny">
              Você fechou com {view.days} de {season.goalDays} dias e {view.points} pontos. A
              próxima começa quando o Prof. Sam abrir.
            </div>
          </div>
        ) : (
          <div className="group">
            <p className="sec-label">
              Marcar hoje &nbsp;·&nbsp; {view.todayCheckins.length} de {DAILY_CAP} check-ins usados
            </p>

            {view.todayCheckins.map((c) => (
              <div key={c.id} className="done-row">
                <span className="num">+{c.points}</span>
                <span>{c.activityName}</span>
                {c.note ? <span className="tiny muted">· {c.note}</span> : null}
              </div>
            ))}

            <Marcar
              remaining={view.remaining}
              sugestao={params.sugestao ?? null}
              atividadeInicial={view.remaining > 0 ? (params.atividade ?? null) : null}
            />
          </div>
        )}

        {season.weeklyChallenge ? (
          <div className="card">
            <p className="sec-label">Desafio da semana</p>
            <p className="post-note">{season.weeklyChallenge}</p>
            <p className="tiny muted" style={{ margin: 0 }}>
              Proposto pelo Prof. Sam
            </p>
          </div>
        ) : null}
      </main>
    </>
  );
}
