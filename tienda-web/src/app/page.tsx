import ProductCard from "@/components/ProductCard";
import { getDatabase } from "@/lib/db";
import { getMeliDiscountPercent } from "@/lib/settings";
import { calculateWebPrice } from "@/lib/pricing";
import type { Product } from "@/types/product";

export default async function Home() {
  const db = await getDatabase();
  const discountPercent = await getMeliDiscountPercent();

  const products = await db
    .collection<Product>("products")
    .find({
      visible: true,
      featured: true,
    })
    .sort({
      updatedAt: -1,
    })
    .limit(8)
    .toArray();

  const featuredProducts = products.map((product) => ({
    ...product,
    webPrice: calculateWebPrice(
      product.meliPrice,
      discountPercent
    ),
    discountPercent,
  }));

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <section className="mx-auto max-w-7xl px-6 pb-16 pt-24">
        <div className="max-w-3xl">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-green-400">
            Tecnología & Servicio Técnico
          </p>

          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Tecnología al mejor precio.
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-400">
            Encontrá notebooks, smartwatches y tecnología seleccionada.
            Consultá directamente por WhatsApp y obtené nuestro precio web.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-24">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wider text-zinc-500">
              Selección
            </p>

            <h2 className="mt-2 text-3xl font-bold">
              Productos destacados
            </h2>
          </div>
        </div>

        {featuredProducts.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {featuredProducts.map((product) => (
              <ProductCard
                key={product.meliId}
                product={product}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 px-6 py-16 text-center">
            <p className="text-zinc-400">
              Todavía no hay productos destacados.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}