import { redirect } from "next/navigation";
import { readSession } from "@/lib/session";

export default async function Home() {
  const session = await readSession();
  if (session?.kind === "student") redirect("/hoje");
  if (session?.kind === "teacher") redirect("/prof");
  redirect("/entrar");
}
