import { redirect } from "next/navigation";
import { NEVER_CHECKED_IN, currentSeason, panel } from "@/lib/queries";
import { requireTeacher } from "@/lib/session";

export default async function PainelPage() {
  await requireTeacher();
  const season = await currentSeason();
  if (!season) redirect("/entrar");

  const p = await panel(season);

  return (
    <>
      <header className="appbar">
        <div>
          <h1 className="appbar-title">Painel</h1>
          <p className="appbar-sub">{season.name}</p>
        </div>
        <span className="chip-user">Prof. Sam</span>
      </header>

      <main className="screen">
        <div className="group">
          <p className="sec-label">Precisa de você</p>

          {p.missing.length === 0 ? (
            <div className="empty">
              <div className="tiny">Ninguém sumido. Aproveite.</div>
            </div>
          ) : (
            p.missing.map((row) => (
              <div key={row.studentId} className="alert">
                <div className="alert-days">
                  {row.daysInactive === NEVER_CHECKED_IN ? "—" : row.daysInactive}
                  <span>
                    {row.daysInactive === NEVER_CHECKED_IN
                      ? "NUNCA"
                      : row.daysInactive === 1
                        ? "DIA"
                        : "DIAS"}
                  </span>
                </div>
                <div className="alert-mid">
                  <div className="nick">{row.realName ?? row.nickname}</div>
                  <div className="tiny muted">
                    {row.realName ? `${row.nickname} · ` : ""}
                    {row.points} pts ·{" "}
                    {row.daysInactive === NEVER_CHECKED_IN
                      ? "entrou e nunca marcou nada"
                      : "sequência zerada"}
                  </div>
                </div>
              </div>
            ))
          )}

          <p className="tiny muted" style={{ margin: 0 }}>
            Numa temporada de {season.totalDays} dias, sumir 2 já é quase um terço dela. Uma
            mensagem agora ainda recupera.
          </p>
        </div>

        <div className="stats">
          <div className="stat">
            <span className="num">
              {p.activeToday} / {p.rows.length}
            </span>
            <small>marcaram hoje</small>
          </div>
          <div className="stat">
            <span className="num">{p.onPace}</span>
            <small>no ritmo da meta</small>
          </div>
          <div className="stat">
            <span className="num">{p.queueSize}</span>
            <small>esperando sua reação</small>
          </div>
          <div className="stat">
            <span className="num">
              {p.seasonDay} / {season.totalDays}
            </span>
            <small>dia da temporada</small>
          </div>
        </div>

        <div className="group">
          <p className="sec-label">A turma inteira</p>
          {p.rows.length === 0 ? (
            <div className="empty">
              <div className="tiny">Nenhum aluno entrou ainda.</div>
            </div>
          ) : (
            p.rows.map((row, i) => (
              <div key={row.studentId} className="srow">
                <span className="pos">{i + 1}</span>
                <div className="srow-mid">
                  <span className="nick">
                    {row.realName ?? row.nickname}
                    {/* Sem nome real cadastrado, repetir o apelido não informa nada. */}
                    {row.realName ? (
                      <span className="muted" style={{ fontWeight: 400 }}>
                        {" "}
                        · {row.nickname}
                      </span>
                    ) : null}
                  </span>
                  <div className="week" aria-label="dias da temporada">
                    {row.week.map((estado, d) => (
                      <i key={d} data-s={estado} />
                    ))}
                  </div>
                </div>
                <div className="rank-pts">
                  <span className="num">{row.points}</span>
                  <small>{row.days === 1 ? "1 DIA" : `${row.days} DIAS`}</small>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </>
  );
}
