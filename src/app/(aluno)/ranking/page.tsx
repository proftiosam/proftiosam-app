import Link from "next/link";
import { redirect } from "next/navigation";
import { currentSeason, ranking } from "@/lib/queries";
import { requireStudent } from "@/lib/session";

export default async function RankingPage() {
  const session = await requireStudent();
  const season = await currentSeason();
  if (!season) redirect("/entrar");

  const rows = await ranking(season);
  const noRitmo = rows.filter((r) => r.onPace);

  return (
    <>
      <header className="appbar">
        <div>
          <h1 className="appbar-title">Ranking</h1>
          <p className="appbar-sub">{season.name}</p>
        </div>
        <Link className="chip-user" href="/perfil">
          {session.nickname}
        </Link>
      </header>

      <main className="screen">
        <p className="sec-label">Classificação</p>

        <div className="group">
          {rows.map((row, i) => (
            <div
              key={row.studentId}
              className="rank"
              data-pos={i + 1}
              data-me={row.nickname === session.nickname ? "1" : "0"}
            >
              <span className="pos">{i + 1}</span>
              <div className="rank-mid">
                <span className="nick">
                  {row.nickname}
                  {row.nickname === session.nickname ? " · você" : ""}
                </span>
                <div className="week" aria-label="dias da temporada">
                  {row.week.map((estado, d) => (
                    <i key={d} data-s={estado} />
                  ))}
                </div>
              </div>
              <div className="rank-pts">
                <span className="num">{row.points}</span>
                <small>PONTOS</small>
              </div>
            </div>
          ))}
        </div>

        <div className="card">
          <p className="sec-label">Hall da Semana</p>
          <p className="tiny muted" style={{ margin: 0 }}>
            Quem chegar a {season.goalDays} dias com check-in entra aqui. Hoje{" "}
            <span className="num">{noRitmo.length}</span>{" "}
            {noRitmo.length === 1 ? "pessoa está" : "pessoas estão"} no ritmo.
          </p>
          {season.prize ? (
            <p className="tiny" style={{ margin: 0 }}>
              <strong>Prêmio:</strong> {season.prize}
            </p>
          ) : null}
        </div>
      </main>
    </>
  );
}
