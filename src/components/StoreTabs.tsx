"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

/** Abas do painel da loja, com a aba atual destacada. */
export default function StoreTabs({ id, pending }: { id: string; pending: number }) {
  const path = usePathname();
  const base = `/painel/${id}`;
  const tabs = [
    { href: base, label: "Configurações", exact: true },
    { href: `${base}/produtos`, label: "Produtos" },
    { href: `${base}/categorias`, label: "Categorias" },
    { href: `${base}/importar`, label: "Importar" },
    { href: `${base}/fretes`, label: "Fretes" },
    { href: `${base}/pedidos`, label: "Pedidos", badge: pending },
  ];
  return (
    <nav className="tabs" aria-label="Seções da loja">
      {tabs.map((t) => {
        const on = t.exact ? path === t.href : path.startsWith(t.href);
        return (
          <Link key={t.href} href={t.href} className={on ? "on" : undefined} aria-current={on ? "page" : undefined}>
            {t.label}{!!t.badge && <span className="dot">{t.badge}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
