import { redirect } from "next/navigation";
import { profComentar, profPular, profReagir } from "../../actions";
import { ProfMarcar } from "./marcar";
import { currentSeason, teacherQueue } from "@/lib/queries";
import { quando } from "@/lib/quando";
import { activity } from "@/lib/rules";
import { requireTeacher } from "@/lib/session";

const REACTS = ["🔥", "👏", "💪", "🎯"] as const;

export default async function FilaPage() {
  await requireTeacher();
  const season = await currentSeason();
  if (!season) redirect("/entrar");

  const fila = await teacherQueue(season);

  return (
    <>
      <header className="appbar">
        <div>
          <h1 className="appbar-title">Fila do dia</h1>
          <p className="appbar-sub">{fila.length} esperando você</p>
        </div>
        <span className="chip-user">Prof. Sam</span>
      </header>

      <main className="screen">
        {fila.length === 0 ? (
          <div className="empty">
            <div style={{ fontFamily: "var(--f-display)", fontSize: 19, color: "var(--ink)", marginBottom: 6 }}>
              Fila zerada
            </div>
            <div className="tiny">
              Todo mundo que marcou já ouviu de você. Volte amanhã.
            </div>
          </div>
        ) : (
          <>
            <p className="sec-label">{fila.length} esperando você</p>
            <p className="tiny muted" style={{ margin: "-6px 0 0" }}>
              Uma emoji já resolve. O aluno vê que foi você que reagiu — é a única validação real
              que ele tem aqui dentro.
            </p>

            <div className="group">
              {fila.map((item) => (
                <article key={item.id} className="post">
                  <div className="post-head">
                    <span className="nick">{item.realName ?? item.nickname}</span>
                    <span className="tag">
                      {activity(item.activityId).name} · {item.points}
                    </span>
                    <span className="when">{quando(item.createdAt)}</span>
                  </div>

                  {item.note ? <p className="post-note">{item.note}</p> : null}

                  <div className="qrow">
                    {REACTS.map((emoji) => (
                      <form action={profReagir} key={emoji} style={{ flex: 1, display: "flex" }}>
                        <input type="hidden" name="checkin" value={item.id} />
                        <input type="hidden" name="emoji" value={emoji} />
                        <button className="qreact" type="submit">
                          {emoji}
                        </button>
                      </form>
                    ))}
                  </div>

                  <form action={profComentar} className="say">
                    <input type="hidden" name="checkin" value={item.id} />
                    <input name="texto" maxLength={240} placeholder="Ou escreva uma linha…" />
                    <button className="btn" type="submit">
                      Enviar
                    </button>
                  </form>

                  <form action={profPular}>
                    <input type="hidden" name="checkin" value={item.id} />
                    <button className="link-skip" type="submit">
                      Pular este
                    </button>
                  </form>
                </article>
              ))}
            </div>
          </>
        )}

        <ProfMarcar />
      </main>
    </>
  );
}
