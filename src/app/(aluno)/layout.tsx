import { redirect } from "next/navigation";
import { activeStudentExists } from "@/lib/queries";
import { readSession } from "@/lib/session";
import { TabBar } from "./tabbar";

export default async function AlunoLayout({ children }: { children: React.ReactNode }) {
  const session = await readSession();
  if (session?.kind !== "student") redirect("/entrar");

  // O cookie sobrevive à remoção do aluno. Mandar para a entrada resolve:
  // um login novo sobrescreve a sessão velha. Limpar o cookie aqui não dá —
  // o React não permite mexer em cookie durante a renderização.
  if (!(await activeStudentExists(session.studentId))) redirect("/entrar");

  return (
    <div className="shell">
      {children}
      <TabBar />
    </div>
  );
}
