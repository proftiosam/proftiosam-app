"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ABAS = [
  { href: "/prof", label: "Painel" },
  { href: "/prof/fila", label: "Fila" },
  { href: "/prof/temporada", label: "Temporada" },
  { href: "/prof/alunos", label: "Alunos" },
] as const;

export function TabBarProf() {
  const path = usePathname();

  return (
    <nav className="tabbar">
      {ABAS.map((aba) => (
        <Link key={aba.href} href={aba.href} aria-current={path === aba.href ? "page" : undefined}>
          {aba.label}
        </Link>
      ))}
    </nav>
  );
}
