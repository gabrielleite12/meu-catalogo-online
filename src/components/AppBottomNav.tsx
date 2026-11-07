"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AppBottomNav() {
  const rawPath = usePathname();
  const pathname = rawPath || "";

  const [cartCount, setCartCount] = useState<number>(0);
  const [mounted, setMounted] = useState(false);

  // Determina se a rota atual é de uma loja específica (ex: /[slug] ou /[slug]/p/[id])
  const parts = pathname.split("/").filter(Boolean);
  const isGlobalRoute =
    !pathname ||
    pathname === "/" ||
    pathname.startsWith("/painel") ||
    pathname.startsWith("/conta") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/ajuda") ||
    pathname.startsWith("/termos") ||
    pathname.startsWith("/privacidade");

  const isStore = !isGlobalRoute && parts.length > 0;
  const storeSlug = isStore ? parts[0] : "";

  // Sincroniza a quantidade de itens no carrinho da loja atual
  useEffect(() => {
    setMounted(true);
    if (!isStore || !storeSlug) {
      setCartCount(0);
      return;
    }

    // Leitura inicial do localStorage do carrinho da loja
    try {
      const saved = JSON.parse(localStorage.getItem(`cart2:${storeSlug}`) || "{}");
      const totalItems = Object.values(saved).reduce((acc: number, val) => acc + Number(val || 0), 0);
      setCartCount(totalItems);
    } catch {
      setCartCount(0);
    }

    // Listener para atualizações reativas emitidas pelo StoreCart
    const handleCartUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ count?: number; slug?: string }>;
      if (customEvent.detail) {
        if (!customEvent.detail.slug || customEvent.detail.slug === storeSlug) {
          setCartCount(customEvent.detail.count ?? 0);
        }
      }
    };

    window.addEventListener("vz-cart-count", handleCartUpdate);
    return () => window.removeEventListener("vz-cart-count", handleCartUpdate);
  }, [isStore, storeSlug]);

  // Se estiver na tela de login, não exibe o menu para manter foco total
  if (pathname.startsWith("/login")) {
    return null;
  }

  // Ação de Buscar inteligente
  const handleSearchClick = (e: React.MouseEvent) => {
    if (isStore) {
      e.preventDefault();
      const searchInput = document.querySelector(".search-input") as HTMLInputElement;
      if (searchInput) {
        searchInput.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => searchInput.focus(), 300);
      }
    } else {
      const homeSearchInput = document.querySelector('input[name="q"]') as HTMLInputElement;
      if (homeSearchInput) {
        e.preventDefault();
        homeSearchInput.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => homeSearchInput.focus(), 300);
      }
    }
  };

  // Ação de abrir carrinho na loja
  const handleCartClick = (e: React.MouseEvent) => {
    if (isStore) {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent("vz-open-cart"));
    }
  };

  // Ação de abrir o agente de IA
  const handleAgentClick = (e: React.MouseEvent) => {
    e.preventDefault();
    window.dispatchEvent(new CustomEvent("vz-open-agent"));
  };

  // Rolagem suave para o topo se já estiver na página inicial da loja ou do site
  const handleHomeClick = (e: React.MouseEvent, targetHref: string) => {
    if (pathname === targetHref) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const isStoreHome = isStore && pathname === `/${storeSlug}`;
  const isSiteHome = pathname === "/";

  return (
    <nav className="app-bottom-nav" aria-label="Menu principal do aplicativo">
      <div className="app-bottom-nav-inner">
        {/* Item 1: Início / Vitrine da Loja */}
        {isStore ? (
          <Link
            href={`/${storeSlug}`}
            onClick={(e) => handleHomeClick(e, `/${storeSlug}`)}
            className={`nav-item ${isStoreHome ? "active" : ""}`}
            title="Página inicial da loja"
          >
            <span className="nav-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </span>
            <span className="nav-label">Loja</span>
          </Link>
        ) : (
          <Link
            href="/"
            onClick={(e) => handleHomeClick(e, "/")}
            className={`nav-item ${isSiteHome ? "active" : ""}`}
            title="Página inicial Vitrine Zap"
          >
            <span className="nav-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </span>
            <span className="nav-label">Início</span>
          </Link>
        )}

        {/* Item 2: Buscar */}
        {isStore ? (
          <button
            type="button"
            onClick={handleSearchClick}
            className="nav-item"
            title="Buscar produtos na loja"
          >
            <span className="nav-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <span className="nav-label">Buscar</span>
          </button>
        ) : (
          <Link
            href="/?focusSearch=1"
            onClick={handleSearchClick}
            className="nav-item"
            title="Buscar lojas e produtos"
          >
            <span className="nav-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <span className="nav-label">Buscar</span>
          </Link>
        )}

        {/* Item 3: Agente de IA (Atendente na loja ou Aprile no Marketplace) */}
        <button
          type="button"
          onClick={handleAgentClick}
          className="nav-item nav-item-agent"
          title={isStore ? "Abrir Atendente IA da loja" : "Falar com Aprile - Busca IA"}
        >
          <span className="nav-icon agent-icon-wrap">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v2" />
              <path d="M12 20v2" />
              <path d="m4.93 4.93 1.41 1.41" />
              <path d="m17.66 17.66 1.41 1.41" />
              <path d="M2 12h2" />
              <path d="M20 12h2" />
              <path d="m6.34 17.66-1.41 1.41" />
              <path d="m19.07 4.93-1.41 1.41" />
              <circle cx="12" cy="12" r="4" />
            </svg>
            <span className="nav-agent-beta">BETA</span>
          </span>
          <span className="nav-label">{isStore ? "Atendente" : "Aprile IA"}</span>
        </button>

        {/* Item 4: Carrinho (se estiver em loja) ou Pedidos (se global) */}
        {isStore ? (
          <button
            type="button"
            onClick={handleCartClick}
            className="nav-item nav-item-cart"
            title="Ver pedido da loja"
          >
            <span className="nav-icon cart-icon-wrap">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
              {mounted && cartCount > 0 && (
                <span className="nav-cart-badge" aria-label={`${cartCount} itens no carrinho`}>
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </span>
            <span className="nav-label">Pedido</span>
          </button>
        ) : (
          <Link
            href="/conta"
            className={`nav-item ${pathname.startsWith("/conta") ? "active" : ""}`}
            title="Meus Pedidos"
          >
            <span className="nav-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
            </span>
            <span className="nav-label">Pedidos</span>
          </Link>
        )}

        {/* Item 5: Minha Conta ou Painel do Lojista */}
        {pathname.startsWith("/painel") ? (
          <Link
            href="/painel"
            className="nav-item active"
            title="Painel de controle da loja"
          >
            <span className="nav-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
            </span>
            <span className="nav-label">Painel</span>
          </Link>
        ) : (
          <Link
            href="/conta"
            className={`nav-item ${pathname.startsWith("/conta") ? "active" : ""}`}
            title="Perfil e dados do usuário"
          >
            <span className="nav-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </span>
            <span className="nav-label">Conta</span>
          </Link>
        )}
      </div>
    </nav>
  );
}
