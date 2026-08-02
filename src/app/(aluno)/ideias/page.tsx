import Link from "next/link";
import { redirect } from "next/navigation";
import { Post } from "./post";
import { currentSeason, feed, todayView } from "@/lib/queries";
import { requireStudent } from "@/lib/session";

export default async function IdeiasPage() {
  const session = await requireStudent();
  const season = await currentSeason();
  if (!season) redirect("/entrar");

  const [posts, view] = await Promise.all([
    feed(season, session.studentId),
    todayView(session.studentId, season),
  ]);

  const marcouHoje = view.todayCheckins.length > 0;

  return (
    <>
      <header className="appbar">
        <div>
          <h1 className="appbar-title">Ideias da turma</h1>
          <p className="appbar-sub">roube o que servir</p>
        </div>
        <Link className="chip-user" href="/perfil">
          {session.nickname}
        </Link>
      </header>

      <main className="screen">
        {!marcouHoje ? (
          <div className="nudge">
            <strong style={{ fontSize: 14 }}>Você ainda não marcou nada hoje.</strong>
            <span className="tiny">
              Roube uma ideia daqui de baixo — leva dez minutos e a sequência continua.
            </span>
          </div>
        ) : null}

        <p className="sec-label">O que a turma anda fazendo</p>
        <p className="tiny muted" style={{ margin: "-6px 0 0" }}>
          Não precisa conhecer ninguém pra roubar uma boa ideia. Toque em <strong>Fazer também</strong>{" "}
          e o check-in já vem preenchido.
        </p>

        {posts.length === 0 ? (
          <div className="empty">
            <div style={{ fontFamily: "var(--f-display)", fontSize: 19, color: "var(--ink)", marginBottom: 6 }}>
              Ninguém marcou nada ainda
            </div>
            <div className="tiny">Seja o primeiro. Amanhã tem gente pra copiar você.</div>
          </div>
        ) : (
          <div className="group">
            {posts.map((post) => (
              <Post key={post.id} post={post} viewer={session.nickname} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
