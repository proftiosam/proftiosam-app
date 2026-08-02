"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ABAS = [
  { href: "/hoje", label: "Hoje" },
  { href: "/ideias", label: "Ideias" },
  { href: "/ranking", label: "Ranking" },
  { href: "/perfil", label: "Perfil" },
] as const;

export function TabBar() {
  const path = usePathname();

  return (
    <nav className="tabbar">
      {ABAS.map((aba) => (
        <Link
          key={aba.href}
          href={aba.href}
          aria-current={path === aba.href ? "page" : undefined}
        >
          {aba.label}
        </Link>
      ))}
    </nav>
  );
}
