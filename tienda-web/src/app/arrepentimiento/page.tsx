import Link from "next/link";
import { STORE_NAME } from "@/lib/store-config";

export default function ArrepentimientoPage() {
  const whatsappPhone =
    process.env.NEXT_PUBLIC_WHATSAPP_PHONE;

  const whatsappMessage = encodeURIComponent(
    `Hola! Quiero ejercer mi derecho de arrepentimiento sobre una compra realizada directamente con ${STORE_NAME}.`
  );

  return (
    <main className="min-h-screen bg-zinc-100 text-zinc-950">

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-6 pb-16 pt-32">
        <div className="max-w-3xl">

          <p className="mb-4 text-sm font-bold uppercase tracking-wider text-emerald-600">
            Servicio al Cliente
          </p>

          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Botón de arrepentimiento
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-500">
            Si realizaste una compra directamente con {STORE_NAME} y
            querés ejercer tu derecho de arrepentimiento, podés
            iniciar la gestión comunicándote con nosotros por
            WhatsApp.
          </p>

        </div>
      </section>

      {/* Gestión */}
      <section className="mx-auto max-w-7xl px-6 pb-24">

        <div className="ml-4 max-w-4xl md:ml-8">

          {/* Compra directa */}
          <article className="rounded-2xl border border-zinc-200 bg-white p-7 shadow-sm md:p-9">

            <div className="flex gap-5">

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-5 w-5 text-white"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8 12h8m-4-4v8m8-4a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z"
                  />
                </svg>
              </div>

              <div className="min-w-0">

                <p className="text-sm font-proxima tracking-wide font-bold uppercase text-emerald-600">
                  Compras directas
                </p>

                <h2 className="mt-2 text-2xl font-bold tracking-tight">
                  ¿Compraste directamente con {STORE_NAME}?
                </h2>

                <p className="mt-4 font-proxima text-base leading-7 text-zinc-500">
                  Si realizaste una compra directamente con
                  nosotros, podés ejercer tu derecho de
                  arrepentimiento comunicándote por WhatsApp.
                </p>

                <p className="mt-3 font-proxima text-base leading-7 text-zinc-500">
                  Para iniciar la gestión, enviá tu solicitud
                  indicando los datos necesarios para identificar
                  la compra. Nuestro equipo te indicará los pasos
                  a seguir.
                </p>

                {whatsappPhone && (
                  <a
                    href={`https://wa.me/${whatsappPhone}?text=${whatsappMessage}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-7 inline-flex items-center gap-2 rounded-xl bg-green-500 px-5 py-3 font-proxima text-sm font-bold text-white transition hover:bg-green-600 active:scale-[0.98]"
                  >
                    <img
                      src="/whatsapp.svg"
                      alt=""
                      aria-hidden="true"
                      className="h-5 w-5"
                    />
                    Solicitar arrepentimiento
                  </a>
                )}

              </div>

            </div>

          </article>

{/* Separador */}
{/* Separador */}
<div className="flex h-14 items-center justify-center">
  <div className="h-px w-[clamp(20rem,70%,50rem)] bg-zinc-300" />
</div>

          {/* MercadoLibre */}
          <article className="rounded-2xl border border-zinc-200 bg-white p-7 shadow-sm md:p-9">

            <div className="flex gap-5">

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FFE600] font-proxima text-xs font-bold text-white">
                <img
                    src="/mercadolibre.svg"
                    alt=""
                    aria-hidden="true"
                    className="h-5 w-5"
                  />
              </div>

              <div className="min-w-0">

                <p className="font-proxima tracking-wide text-sm font-bold uppercase text-zinc-500">
                  Compras en MercadoLibre
                </p>

                <h2 className="mt-2 text-2xl font-bold tracking-tight">
                  ¿Compraste a través de MercadoLibre?
                </h2>

                <p className="mt-4 font-proxima text-base leading-7 text-zinc-500">
                  Si realizaste la compra a través de
                  MercadoLibre, la gestión del arrepentimiento,
                  devolución o cancelación debe realizarse
                  directamente desde la plataforma.
                </p>

                <p className="mt-3 font-proxima text-base leading-7 text-zinc-500">
                  Ingresá a tus compras para seleccionar la
                  operación correspondiente y seguir las opciones
                  disponibles para ese pedido.
                </p>

                <a
                  href="https://myaccount.mercadolibre.com.ar/my_purchases/list"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#FFE600] px-5 py-3 font-proxima text-sm font-bold text-[#333333] transition hover:bg-[#F5D900] active:scale-[0.98]"
                >
                  <img
                    src="/mercadolibre.svg"
                    alt=""
                    aria-hidden="true"
                    className="h-5 w-5"
                  />
                  Ir a mis compras
                </a>

              </div>

            </div>

          </article>

        </div>

      </section>

    </main>
  );
}