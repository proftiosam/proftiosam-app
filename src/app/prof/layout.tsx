import { redirect } from "next/navigation";
import { readSession } from "@/lib/session";
import { TabBarProf } from "./tabbar";

export default async function ProfLayout({ children }: { children: React.ReactNode }) {
  const session = await readSession();
  if (session?.kind !== "teacher") redirect("/entrar");

  return (
    <div className="shell">
      {children}
      <TabBarProf />
    </div>
  );
}
