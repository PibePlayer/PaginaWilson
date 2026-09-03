import Link from "next/link";
import { STORE_NAME } from "@/lib/store-config";

const steps = [
  {
    number: "01",
    title: "Elegí tu producto",
    description:
      "Explorá nuestro catálogo y encontrá el producto que estás buscando. Podés utilizar el buscador o las categorías para encontrarlo rápidamente.",
  },
  {
    number: "02",
    title: "Consultá por WhatsApp",
    description:
      "Desde la publicación del producto, hacé clic en “Consultar por WhatsApp” para comunicarte directamente con nosotros.",
  },
  {
    number: "03",
    title: "Confirmamos disponibilidad",
    description:
      "Verificamos que el producto esté disponible y confirmamos el precio web vigente antes de avanzar con la compra.",
  },
  {
    number: "04",
    title: "Realizá el pago",
    description:
      "Te indicamos los medios de pago disponibles y los datos necesarios para completar la operación.",
  },
  {
    number: "05",
    title: "Retirá o recibí tu compra",
    description:
      "Una vez confirmado el pago, coordinamos con vos el retiro o la entrega de tu compra.",
  },
];

export default function ComoComprarPage() {
  const whatsappPhone =
    process.env.NEXT_PUBLIC_WHATSAPP_PHONE;

  const whatsappMessage = encodeURIComponent(
    "Hola! Quisiera consultar cómo realizar una compra."
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
            ¿Cómo comprar?
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-500">
            Comprar en {STORE_NAME} es simple. Elegí el producto que
            querés, consultanos por WhatsApp y coordinamos tu
            compra de forma rápida y sencilla.
          </p>

        </div>
      </section>

      {/* Pasos */}
        <section className="mx-auto max-w-7xl px-6 pb-20">
        <div className="mb-8">
            <p className="mx-auto max-w-4xl text-sm font-bold uppercase tracking-wider text-emerald-600">
            Paso a paso
            </p>

            <h2 className="mx-auto max-w-4xl text-3xl font-bold tracking-tight">
            Comprar es simple
            </h2>
        </div>

        <div className="mx-auto max-w-4xl">
            {steps.map((step, index) => (
            <div key={step.number}>
                <article className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:border-zinc-300 hover:shadow-md md:p-7">
                <div className="flex gap-5">

                    {/* Número */}
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 font-proxima text-sm font-bold text-white">
                    {step.number}
                    </div>

                    {/* Contenido */}
                    <div>
                    <h3 className="text-xl font-bold tracking-tight text-zinc-950">
                        {step.title}
                    </h3>

                    <p className="mt-2 max-w-2xl font-proxima text-base leading-7 text-zinc-500">
                        {step.description}
                    </p>
                    </div>

                </div>
                </article>

                {/* Flecha entre pasos */}
                {index !== steps.length - 1 && (
                <div className="flex h-12 items-center justify-center">
                    <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="h-6 w-6 text-emerald-600"
                    >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 5v14m0 0 5-5m-5 5-5-5"
                    />
                    </svg>
                </div>
                )}
            </div>
            ))}
        </div>
        </section>

      {/* WhatsApp */}
      <section className="mx-auto max-w-7xl px-6 pb-20">

        <div className="rounded-2xl bg-zinc-950 px-7 py-8 md:px-9">

          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">

            <div>
              <p className="font-proxima text-sm font-bold uppercase tracking-wider text-emerald-400">
                ¿Necesitás ayuda?
              </p>

              <h2 className="mt-2 text-2xl font-bold tracking-tight text-white">
                Estamos para ayudarte.
              </h2>

              <p className="mt-2 max-w-xl font-proxima text-sm leading-6 text-zinc-400">
                Si tenés alguna duda sobre un producto, stock o
                el proceso de compra, escribinos por WhatsApp.
              </p>
            </div>

            {whatsappPhone && (
              <a
                href={`https://wa.me/${whatsappPhone}?text=${whatsappMessage}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-green-500 px-5 py-3 font-proxima text-sm font-bold text-white transition hover:bg-green-600 active:scale-[0.98]"
              >
                <img
                  src="/whatsapp.svg"
                  alt=""
                  aria-hidden="true"
                  className="h-5 w-5"
                />
                Consultar por WhatsApp
              </a>
            )}

          </div>

        </div>

      </section>

      {/* Información importante */}
      <section className="mx-auto max-w-7xl px-6 pb-24">

        <div className="rounded-2xl border border-zinc-200 bg-white p-7 md:p-9">

          <h2 className="text-xl font-bold tracking-tight text-zinc-950">
            Información importante
          </h2>

          <div className="mt-5 max-w-4xl space-y-3 font-proxima text-sm leading-6 text-zinc-600">

            <p>
              Los precios publicados en nuestra web corresponden
              a precios especiales para compras realizadas por
              este medio.
            </p>

            <p>
              La disponibilidad de los productos está sujeta a
              stock. Antes de realizar el pago confirmamos la
              disponibilidad del artículo solicitado.
            </p>

            <p>
              Las imágenes de los productos son sólo a modo
              ilustrativo y pueden diferir del artículo en stock.
            </p>

            <p>
              Los precios indicados tienen IVA incluido y pueden
              sufrir variaciones sin previo aviso.
            </p>

          </div>

          <div className="mt-7">
            <Link
              href="/productos"
              className="inline-flex rounded-xl bg-zinc-950 px-5 py-3 font-proxima text-sm font-bold text-white transition hover:bg-zinc-800"
            >
              Ver productos
            </Link>
          </div>

        </div>

      </section>

    </main>
  );
}