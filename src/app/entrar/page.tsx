import { redirect } from "next/navigation";
import { activeStudentExists } from "@/lib/queries";
import { readSession } from "@/lib/session";
import { EntrarForm } from "./form";

export default async function EntrarPage() {
  const session = await readSession();

  if (session?.kind === "teacher") redirect("/prof");
  // Só manda para dentro se o aluno da sessão ainda existir. Um cookie órfão
  // aqui viraria laço infinito com o layout do aluno, que redireciona de volta.
  if (session?.kind === "student" && (await activeStudentExists(session.studentId))) {
    redirect("/hoje");
  }

  return (
    <main className="enter">
      <div>
        <h1>Seu inglês de hoje, marcado.</h1>
        <p className="lead" style={{ marginTop: 10 }}>
          Todo dia que você faz alguma coisa em inglês — aula, série, música, uma conversa —
          entra aqui. A sequência é o que importa.
        </p>
      </div>

      <EntrarForm />
    </main>
  );
}
