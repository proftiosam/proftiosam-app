import { redirect } from "next/navigation";
import { profDesafio } from "../../actions";
import { currentSeason, seasonRules } from "@/lib/queries";
import { ACTIVITIES, DAILY_CAP, dayKey, seasonDay } from "@/lib/rules";
import { requireTeacher } from "@/lib/session";
import { plural } from "@/lib/texto";

export default async function TemporadaPage() {
  await requireTeacher();
  const season = await currentSeason();
  if (!season) redirect("/entrar");

  const dia = seasonDay(seasonRules(season), dayKey());
  const restam = Math.max(0, season.totalDays - dia);

  return (
    <>
      <header className="appbar">
        <div>
          <h1 className="appbar-title">Temporada</h1>
          <p className="appbar-sub">regras e desafios</p>
        </div>
        <span className="chip-user">Prof. Sam</span>
      </header>

      <main className="screen">
        <div className="card">
          <p className="sec-label">Em andamento</p>
          <h2 style={{ fontFamily: "var(--f-display)", fontSize: 20, margin: 0, fontWeight: 600 }}>
            {season.name}
          </h2>
          <div className="bar">
            <i style={{ width: `${Math.min(100, (dia / season.totalDays) * 100)}%` }} />
          </div>
          <p className="tiny muted" style={{ margin: 0 }}>
            Dia {dia} de {season.totalDays} · meta de {season.goalDays} dias ·{" "}
            {restam === 0 ? "último dia" : `encerra em ${plural(restam, "dia", "dias")}`}
          </p>
          {season.prize ? (
            <p className="tiny" style={{ margin: 0 }}>
              <strong>Prêmio:</strong> {season.prize}
            </p>
          ) : null}
        </div>

        <form action={profDesafio} className="card">
          <p className="sec-label">Desafio da semana</p>
          <div className="field">
            <textarea name="desafio" rows={2} defaultValue={season.weeklyChallenge ?? ""} />
          </div>
          <button className="btn" type="submit" style={{ alignSelf: "flex-start" }}>
            Publicar pra turma
          </button>
          <p className="tiny muted" style={{ margin: 0 }}>
            Aparece na tela inicial de todo mundo.
          </p>
        </form>

        <div className="card">
          <p className="sec-label">Pontuação por atividade</p>
          <div className="group">
            {ACTIVITIES.map((a) => (
              <div
                key={a.id}
                className="tiny"
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}
              >
                <span>{a.name}</span>
                <span className="num" style={{ color: "var(--accent)" }}>
                  {a.points}
                </span>
              </div>
            ))}
          </div>
          <p className="tiny muted" style={{ margin: 0 }}>
            Teto de {DAILY_CAP} check-ins por dia. Para mudar um peso, edite{" "}
            <code>src/lib/rules.ts</code> — o histórico já gravado não se reescreve.
          </p>
        </div>
      </main>
    </>
  );
}
