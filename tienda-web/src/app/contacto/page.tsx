import Link from "next/link";
import { STORE_NAME } from "@/lib/store-config";

export default function ContactoPage() {
  const whatsappPhone =
    process.env.NEXT_PUBLIC_WHATSAPP_PHONE;

  const whatsappMessage = encodeURIComponent(
    "Hola! Quisiera hacer una consulta."
  );

  const mapQuery = encodeURIComponent(
    "Galería Jardín, Buenos Aires, Argentina"
  );

  return (
    <main className="min-h-screen bg-zinc-50 pt-24">
      <div className="mx-auto max-w-7xl px-6 py-12">

        {/* Encabezado */}
        <div className="max-w-2xl">
          <p className="font-proxima text-sm font-bold uppercase tracking-widest text-emerald-600">
            Contacto
          </p>

          <h1 className="mt-2 font-proxima text-4xl font-bold tracking-tight text-zinc-950 md:text-5xl">
            Estamos para ayudarte
          </h1>

          <p className="mt-4 font-proxima text-base leading-7 text-zinc-600">
            Podés contactarnos directamente por WhatsApp o
            acercarte a nuestro local.
          </p>
        </div>

        {/* Contenido */}
        <div className="mt-10 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">

          {/* Información */}
          <div className="flex flex-col gap-6">

            {/* WhatsApp */}
            <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100">
                <img
                  src="/whatsapp.svg"
                  alt=""
                  aria-hidden="true"
                  className="h-7 w-7"
                />
              </div>

              <h2 className="mt-5 font-proxima text-xl font-bold text-zinc-950">
                Contactanos por WhatsApp
              </h2>

              <p className="mt-2 font-proxima text-sm leading-6 text-zinc-600">
                Consultanos por productos, disponibilidad,
                precios o cualquier otra duda.
              </p>

              {whatsappPhone && (
                <a
                  href={`https://wa.me/${whatsappPhone}?text=${whatsappMessage}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-green-500 px-5 py-3.5 font-proxima text-sm font-bold text-white transition hover:bg-green-600 active:scale-[0.98]"
                >
                  <img
                    src="/whatsapp.svg"
                    alt=""
                    aria-hidden="true"
                    className="h-5 w-5"
                  />
                  Escribir por WhatsApp
                </a>
              )}
            </section>

            {/* Ubicación */}
            <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.8}
                  stroke="currentColor"
                  className="h-6 w-6 text-zinc-800"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                  />

                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 10.5c0 7.142-7.5 11-7.5 11s-7.5-3.858-7.5-11a7.5 7.5 0 1 1 15 0Z"
                  />
                </svg>
              </div>

              <h2 className="mt-5 font-proxima text-xl font-bold text-zinc-950">
                Cómo encontrarnos
              </h2>

              <p className="mt-2 font-proxima text-sm leading-6 text-zinc-600">
                Nos encontrás en:
              </p>

              <div className="mt-4 rounded-xl bg-zinc-50 p-4">
                <p className="font-proxima text-base font-bold text-zinc-950">
                  Galería Jardín
                </p>

                <p className="mt-1 font-proxima text-sm text-zinc-600">
                  Local 358
                </p>

                <div className="mt-3 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />

                  <p className="font-proxima text-sm font-bold text-zinc-700">
                    Identificado como “Outlet Store”
                  </p>
                </div>
              </div>

              <a
                href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 block text-center font-proxima text-sm font-bold text-zinc-700 underline decoration-zinc-300 underline-offset-4 transition hover:text-zinc-950"
              >
                Abrir en Google Maps
              </a>
            </section>
          </div>

          {/* Mapa */}
          <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <div className="border-b border-zinc-200 px-6 py-5">
              <h2 className="font-proxima text-xl font-bold text-zinc-950">
                Nuestra ubicación
              </h2>

              <p className="mt-1 font-proxima text-sm text-zinc-500">
                Galería Jardín · Local 358
              </p>
            </div>

            <div className="h-[420px] w-full lg:h-full lg:min-h-[540px]">
              <iframe
                src={`https://www.google.com/maps?q=${mapQuery}&output=embed`}
                width="100%"
                height="95%"
                style={{ border: 0 }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title={`Ubicación de ${STORE_NAME} en Galería Jardín`}
              />
            </div>
          </section>
        </div>

        {/* Volver a productos */}
        <div className="mt-10 text-center">
          <Link
            href="/productos"
            className="font-proxima text-sm font-bold text-zinc-600 transition hover:text-zinc-950"
          >
            ← Ver nuestros productos
          </Link>
        </div>
      </div>
    </main>
  );
}