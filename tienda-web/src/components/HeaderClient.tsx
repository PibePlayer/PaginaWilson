"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface HeaderClientProps {
  desktopAction?: ReactNode;
}

export default function HeaderClient({
  desktopAction
}: HeaderClientProps) {
  const router = useRouter();

  const [visible, setVisible] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const updateSearchFromUrl = () => {
      const params = new URLSearchParams(
        window.location.search
      );

      setSearch(params.get("search") || "");
    };

    updateSearchFromUrl();

    window.addEventListener(
      "popstate",
      updateSearchFromUrl
    );

    return () => {
      window.removeEventListener(
        "popstate",
        updateSearchFromUrl
      );
    };
  }, []);

  useEffect(() => {
    let lastScrollY = window.scrollY;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY <= 10) {
        setVisible(true);
        lastScrollY = currentScrollY;
        return;
      }

      if (currentScrollY > lastScrollY) {
        setVisible(false);
        setMenuOpen(false);
      } else if (currentScrollY < lastScrollY) {
        setVisible(true);
      }

      lastScrollY = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, {
      passive: true,
    });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const closeMenu = () => {
    setMenuOpen(false);
  };

  function handleSearchSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const query = search.trim();

    if (!query) {
      setSearch("");
      router.push("/productos");
      setMenuOpen(false);
      return;
    }

    setSearch(query);

    router.push(
      `/productos?search=${encodeURIComponent(query)}`
    );

    setMenuOpen(false);
  }

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 border-b border-zinc-200 bg-white/95 backdrop-blur transition-transform duration-300 ease-out ${
        visible
          ? "translate-y-0"
          : "-translate-y-full"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center px-6">

        {/* Logo */}
        <div className="shrink-0">
          <Link
            href="/"
            onClick={closeMenu}
            className="font-proxima text-xl font-bold tracking-tight text-zinc-950"
          >
            SOGUE
          </Link>
        </div>

        {/* Navegación + búsqueda */}
        <nav className="hidden flex-1 items-center justify-center md:flex">
          <div className="flex items-center gap-[clamp(1rem,2.8vw,4rem)] max-[800px]:gap-2">

            <Link
              href="/"
              className="font-proxima text-sm font-bold text-zinc-700 transition hover:text-zinc-950"
            >
              Inicio
            </Link>

            <Link
              href="/productos"
              className="font-proxima text-sm font-bold text-zinc-700 transition hover:text-zinc-950"
            >
              Productos
            </Link>

            {/* Buscador sobresaliente */}
            <form
              onSubmit={handleSearchSubmit}
              className="relative z-50 -my-3 w-[clamp(180px,22vw,320px)]"
            >
              <div className="flex items-center overflow-hidden rounded-xl border border-zinc-300 bg-white shadow-md transition hover:border-zinc-400 hover:shadow-lg focus-within:border-zinc-950 focus-within:ring-2 focus-within:ring-zinc-950/10">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="ml-3 h-4 w-4 shrink-0 text-zinc-400"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m21 21-4.35-4.35m0 0A7.5 7.5 0 1 0 6.04 6.04a7.5 7.5 0 0 0 10.61 10.61Z"
                  />
                </svg>

                <input
                  type="search"
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Buscar productos..."
                  className="min-w-0 flex-1 bg-transparent px-3 py-2.5 font-proxima text-sm font-bold text-zinc-900 outline-none placeholder:text-zinc-400"
                />
              </div>
            </form>

            <Link
              href="/servicio-tecnico"
              className="font-proxima text-sm font-bold text-zinc-700 transition hover:text-zinc-950"
            >
              Servicio Técnico
            </Link>

            <Link
              href="/contacto"
              className="font-proxima text-sm font-bold text-zinc-700 transition hover:text-zinc-950"
            >
              Contacto
            </Link>

          </div>
        </nav>

        {/* Acciones + WhatsApp */}
        <div className="ml-3 md:ml-0 flex shrink-0 items-center justify-end gap-2">
          {desktopAction}

          <a
            href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_PHONE}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden items-center gap-2 rounded-xl bg-green-500 px-4 py-2.5 font-proxima text-sm font-bold text-white transition hover:bg-green-600 md:flex"
          >
            <img
              src="/whatsapp.svg"
              alt=""
              aria-hidden="true"
              className="h-5 w-5 shrink-0 object-contain"
            />

            WhatsApp
          </a>
        </div>

        {/* Mobile search */}
        <form
          onSubmit={handleSearchSubmit}
          className="mx-3 flex min-w-0 flex-1 items-center md:hidden"
        >
          <div className="relative w-full">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m21 21-4.35-4.35m0 0A7.5 7.5 0 1 0 6.04 6.04a7.5 7.5 0 0 0 10.61 10.61Z"
              />
            </svg>

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Buscar..."
              className="w-full rounded-lg border border-zinc-300 bg-zinc-50 py-2 pl-9 pr-3 font-proxima text-sm font-bold text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-950 focus:bg-white"
            />
          </div>
        </form>

        {/* Mobile menu button */}
        <button
          type="button"
          onClick={() =>
            setMenuOpen((open) => !open)
          }
          aria-label={
            menuOpen
              ? "Cerrar menú"
              : "Abrir menú"
          }
          aria-expanded={menuOpen}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-zinc-900 transition hover:bg-zinc-100 md:hidden"
        >
          {menuOpen ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="h-6 w-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18 18 6M6 6l12 12"
              />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="h-6 w-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile menu */}
      <div
        className={`overflow-hidden border-t border-zinc-200 transition-all duration-300 ease-out md:hidden ${
          menuOpen
            ? "max-h-[500px] opacity-100"
            : "max-h-0 opacity-0"
        }`}
      >
        <nav className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex flex-col">

            <Link
              href="/"
              onClick={closeMenu}
              className="border-b border-zinc-100 py-4 font-proxima text-base font-bold text-zinc-700 transition hover:text-zinc-950"
            >
              Inicio
            </Link>

            <Link
              href="/productos"
              onClick={closeMenu}
              className="border-b border-zinc-100 py-4 font-proxima text-base font-bold text-zinc-700 transition hover:text-zinc-950"
            >
              Productos
            </Link>

            <Link
              href="/servicio-tecnico"
              onClick={closeMenu}
              className="border-b border-zinc-100 py-4 font-proxima text-base font-bold text-zinc-700 transition hover:text-zinc-950"
            >
              Servicio Técnico
            </Link>

            <Link
              href="/contacto"
              onClick={closeMenu}
              className="border-b border-zinc-100 py-4 font-proxima text-base font-bold text-zinc-700 transition hover:text-zinc-950"
            >
              Contacto
            </Link>

            <a
              href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_PHONE}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={closeMenu}
              className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-green-500 px-4 py-3 font-proxima text-sm font-bold text-white transition hover:bg-green-700"
            >
              <img
                src="/whatsapp.svg"
                alt=""
                aria-hidden="true"
                className="h-5 w-5 shrink-0 object-contain"
              />

              WhatsApp
            </a>

          </div>
        </nav>
      </div>
    </header>
  );
}