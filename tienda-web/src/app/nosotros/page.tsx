import Link from "next/link";
import { STORE_NAME } from "@/lib/store-config";

const values = [
  {
    number: "01",
    title: "Elegimos con criterio",
    description:
      "Buscamos equipos con configuraciones equilibradas y prestaciones que realmente aporten valor según el uso que se les va a dar.",
  },
  {
    number: "02",
    title: "Pensamos en cada usuario",
    description:
      "No todos necesitan la misma notebook. Te ayudamos a encontrar una opción acorde a tu trabajo, estudio, desarrollo, diseño o entretenimiento.",
  },
  {
    number: "03",
    title: "Personalizamos tu equipo",
    description:
      "Adaptamos cada notebook a las necesidades del cliente para que recibas un equipo preparado para empezar a usar.",
  },
];

const uses = [
  "Estudio",
  "Trabajo",
  "Programación",
  "Diseño",
  "Gaming",
  "Uso diario",
];

export default function NosotrosPage() {
  return (
    <main className="min-h-screen bg-zinc-100 text-zinc-950">
      {/* Hero */}
      <section className="mx-auto max-w-7xl px-6 pb-16 pt-32">
        <div className="max-w-3xl">
          <p className="mb-4 font-proxima text-sm font-bold uppercase tracking-wider text-emerald-600">
            Sobre nosotros
          </p>

          <h1 className="font-proxima text-4xl font-bold tracking-tight sm:text-6xl">
            Tecnología que se adapta a vos.
          </h1>

          <p className="mt-6 max-w-2xl font-proxima text-lg leading-8 text-zinc-500">
            En {STORE_NAME} creemos que elegir una notebook no debería
            ser complicado. Seleccionamos equipos, analizamos sus
            configuraciones y los preparamos pensando en el uso real
            de cada persona.
          </p>
        </div>
      </section>

      {/* Qué hacemos */}
      <section className="mx-auto max-w-7xl px-6 pb-20">
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-2xl border border-zinc-200 bg-white p-7 shadow-sm md:p-9">
            <p className="font-proxima text-sm font-bold uppercase tracking-wider text-emerald-600">
              Qué hacemos
            </p>

            <h2 className="mt-3 font-proxima text-3xl font-bold tracking-tight text-zinc-950 md:text-4xl">
              Una notebook no debería ser una compra a ciegas.
            </h2>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-7 shadow-sm md:p-9">
            <div className="space-y-4 font-proxima text-base leading-7 text-zinc-600">
              <p>
                En {STORE_NAME} nos enfocamos en ofrecer notebooks con
                configuraciones pensadas para diferentes necesidades y
                presupuestos.
              </p>

              <p>
                Nuestro objetivo es hacer más simple la elección:
                entender para qué necesitás el equipo, encontrar una
                opción adecuada y dejarla preparada para vos.
              </p>

              <p>
                Porque pagar más no siempre significa obtener lo que
                necesitás.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Nuestra forma de trabajar */}
      <section className="mx-auto max-w-7xl px-6 pb-20">
        <div className="mb-8">
          <p className="font-proxima text-sm font-bold uppercase tracking-wider text-emerald-600">
            Nuestra forma de trabajar
          </p>

          <h2 className="mt-2 font-proxima text-3xl font-bold tracking-tight text-zinc-950">
            Simple, claro y personalizado.
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {values.map((value) => (
            <article
              key={value.number}
              className="rounded-2xl border border-zinc-200 bg-white p-7 shadow-sm transition hover:border-zinc-300 hover:shadow-md"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 font-proxima text-sm font-bold text-white">
                {value.number}
              </div>

              <h3 className="mt-6 font-proxima text-xl font-bold tracking-tight text-zinc-950">
                {value.title}
              </h3>

              <p className="mt-3 font-proxima text-sm leading-6 text-zinc-500">
                {value.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* Para quién */}
      <section className="mx-auto max-w-7xl px-6 pb-20">
        <div className="rounded-2xl border border-zinc-200 bg-white p-7 shadow-sm md:p-9">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div>
              <p className="font-proxima text-sm font-bold uppercase tracking-wider text-emerald-600">
                Para qué la necesitás
              </p>

              <h2 className="mt-2 font-proxima text-3xl font-bold tracking-tight text-zinc-950 md:text-4xl">
                Encontrá el equipo para tu día a día.
              </h2>

              <p className="mt-4 max-w-lg font-proxima text-base leading-7 text-zinc-500">
                Ya sea para estudiar, trabajar, programar o simplemente
                disfrutar de tu tiempo libre, buscamos que la notebook
                esté a la altura de lo que necesitás.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {uses.map((use) => (
                <div
                  key={use}
                  className="flex min-h-24 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 px-4 text-center font-proxima text-sm font-bold text-zinc-800 transition hover:border-zinc-300 hover:bg-white"
                >
                  {use}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-6 pb-24">
        <div className="rounded-2xl bg-zinc-950 px-7 py-8 md:px-9">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-proxima text-sm font-bold uppercase tracking-wider text-emerald-400">
                ¿Buscás una notebook?
              </p>

              <h2 className="mt-2 font-proxima text-2xl font-bold tracking-tight text-white">
                Estamos para ayudarte.
              </h2>

              <p className="mt-2 max-w-xl font-proxima text-sm leading-6 text-zinc-400">
                Mirá nuestros equipos disponibles o contactanos y te
                ayudamos a encontrar una opción que se adapte a lo que
                necesitás.
              </p>
            </div>

            <Link
              href="/productos"
              className="inline-flex shrink-0 items-center justify-center rounded-xl bg-emerald-600 px-5 py-3 font-proxima text-sm font-bold text-white transition hover:bg-emerald-700 active:scale-[0.98]"
            >
              Ver productos
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}