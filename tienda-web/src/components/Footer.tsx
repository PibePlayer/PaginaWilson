import Link from "next/link";
import { STORE_NAME, STORE_TAGLINE } from "@/lib/store-config";

export default function Footer() {
  return (
    <footer className="border-t border-zinc-200 bg-zinc-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Marca */}
          <div>
            <Link
              href="/"
              className="font-proxima text-2xl font-bold tracking-tight"
            >
              {STORE_NAME}
            </Link>

            <p className="mt-3 max-w-xs font-proxima text-sm leading-6 text-zinc-400">
              {STORE_TAGLINE}
            </p>
          </div>

          {/* Servicio al cliente */}
          <div>
            <h3 className="font-proxima text-sm font-bold uppercase tracking-wide text-white">
              Servicio al Cliente
            </h3>

            <nav className="mt-4 flex flex-col gap-3">
              <Link
                href="/como-comprar"
                className="w-fit font-proxima text-sm text-zinc-400 transition hover:text-white"
              >
                ¿Cómo comprar?
              </Link>

              <Link
                href="/arrepentimiento"
                className="w-fit font-proxima text-sm text-zinc-400 transition hover:text-white"
              >
                Botón de arrepentimiento
              </Link>

              <Link
                href="/contacto"
                className="w-fit font-proxima text-sm text-zinc-400 transition hover:text-white"
              >
                Contacto
              </Link>
            </nav>
          </div>

          {/* Información */}
          <div>
            <h3 className="font-proxima text-sm font-bold uppercase tracking-wide text-white">
              Información
            </h3>

            <nav className="mt-4 flex flex-col gap-3">
              <Link
                href="/nosotros"
                className="w-fit font-proxima text-sm text-zinc-400 transition hover:text-white"
              >
                Nosotros
              </Link>

              <Link
                href="/servicio-tecnico"
                className="w-fit font-proxima text-sm text-zinc-400 transition hover:text-white"
              >
                Servicio Técnico
              </Link>

              <Link
                href="/productos"
                className="w-fit font-proxima text-sm text-zinc-400 transition hover:text-white"
              >
                Productos
              </Link>
            </nav>
          </div>

          {/* WhatsApp */}
          <div>
            <h3 className="font-proxima text-sm font-bold uppercase tracking-wide text-white">
              ¿Necesitás ayuda?
            </h3>

            <p className="mt-4 font-proxima text-sm leading-6 text-zinc-400">
              Estamos para ayudarte. Consultanos por WhatsApp.
            </p>

            {process.env.NEXT_PUBLIC_WHATSAPP_PHONE && (
              <a
                href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_PHONE}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-green-500 px-4 py-2.5 font-proxima text-sm font-bold text-white transition hover:bg-green-600"
              >
                <img
                  src="/whatsapp.svg"
                  alt=""
                  aria-hidden="true"
                  className="h-5 w-5"
                />

                WhatsApp
              </a>
            )}
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-12 border-t border-zinc-800 pt-8">
          <p className="font-proxima text-xs leading-5 text-zinc-500">
            <strong className="font-bold text-zinc-400">
              IMPORTANTE:
            </strong>{" "}
            Todas las imágenes de los productos son sólo a modo
            ilustrativo y pueden diferir del artículo en stock. Los
            precios indicados tienen IVA incluido y pueden sufrir
            variaciones sin previo aviso. Disponibilidad sujeta a
            stock.
          </p>
        </div>

        {/* Copyright */}
        <div className="mt-6 flex flex-col gap-2 border-t border-zinc-800 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-proxima text-xs text-zinc-500">
            © {new Date().getFullYear()} {STORE_NAME}. Todos los derechos reservados.
          </p>

          <p className="font-proxima text-xs text-zinc-600">
            {STORE_NAME}
          </p>
        </div>
      </div>
    </footer>
  );
}