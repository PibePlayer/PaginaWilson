"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function Header() {
  const [visible, setVisible] = useState(true);

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
          className="font-proxima text-xl font-bold tracking-tight text-zinc-950"
        >
          WILSON
        </Link>

        {/* Navegación */}
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

        {/* WhatsApp */}
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

      </div>
    </header>
  );
}