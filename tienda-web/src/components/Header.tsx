"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function Header() {
  const [visible, setVisible] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let lastScrollY = window.scrollY;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Siempre visible arriba de todo
      if (currentScrollY <= 10) {
        setVisible(true);
        lastScrollY = currentScrollY;
        return;
      }

      // Bajando → ocultar
      if (currentScrollY > lastScrollY) {
        setVisible(false);
        setMenuOpen(false);
      }

      // Subiendo → mostrar
      else if (currentScrollY < lastScrollY) {
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

  return (
    <header
      className={`
        fixed
        inset-x-0
        top-0
        z-40
        border-b
        border-zinc-200
        bg-white/95
        backdrop-blur
        transition-transform
        duration-300
        ease-out
        ${visible ? "translate-y-0" : "-translate-y-full"}
      `}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">

        {/* Logo */}
        <Link
          href="/"
          onClick={closeMenu}
          className="font-proxima text-xl font-bold tracking-tight text-zinc-950"
        >
          SOGUE
        </Link>

        {/* Navegación Desktop */}
        <nav className="hidden items-center gap-8 md:flex">
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

          <Link
            href="/categorias"
            className="font-proxima text-sm font-bold text-zinc-700 transition hover:text-zinc-950"
          >
            Categorías
          </Link>

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
        </nav>

        {/* WhatsApp Desktop */}
        <a
          href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_PHONE}`}
          target="_blank"
          rel="noopener noreferrer"
          className="hidden items-center gap-2 rounded-xl bg-green-500 px-4 py-2.5 font-proxima text-sm font-bold text-white transition hover:bg-green-700 md:flex"
        >
          <img
            src="/whatsapp.svg"
            alt=""
            aria-hidden="true"
            className="h-5 w-5 shrink-0 object-contain"
          />

          WhatsApp
        </a>

        {/* Botón Hamburguesa Mobile */}
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={menuOpen}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-zinc-900 transition hover:bg-zinc-100 md:hidden"
        >
          {menuOpen ? (
            // X
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
            // Hamburger
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

      {/* Menú Mobile */}
      <div
        className={`
          overflow-hidden border-t border-zinc-200 md:hidden
          transition-all duration-300 ease-out
          ${
            menuOpen
              ? "max-h-[500px] opacity-100"
              : "max-h-0 opacity-0"
          }
        `}
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
              href="/categorias"
              onClick={closeMenu}
              className="border-b border-zinc-100 py-4 font-proxima text-base font-bold text-zinc-700 transition hover:text-zinc-950"
            >
              Categorías
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

            {/* WhatsApp Mobile */}
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