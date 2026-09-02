import ProductCard from "@/components/ProductCard";
import { withDatabase } from "@/lib/db";
import { getMeliDiscountPercent } from "@/lib/settings";
import { calculateWebPrice } from "@/lib/pricing";
import type { Product } from "@/types/product";

export default async function Home() {
  const featuredProducts = await withDatabase(async (db) => {
    const discountPercent = await getMeliDiscountPercent(db);

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

    return products.map((product) => ({
      meliId: product.meliId,
      title: product.title,
      meliPrice: product.meliPrice,
      currencyId: product.currencyId,
      availableQuantity: product.availableQuantity,
      thumbnail: product.thumbnail,
      permalink: product.permalink,
      status: product.status,
      visible: product.visible,
      featured: product.featured,
      categoryId: product.categoryId,
      updatedAt: product.updatedAt.toISOString(),
      webPrice: calculateWebPrice(
        product.meliPrice,
        discountPercent
      ),
      discountPercent,
    }));
  });

  return (
    <main className="min-h-screen bg-zinc-100 text-zinc-950">

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-6 pb-16 pt-32">
        <div className="max-w-3xl">

          <p className="mb-4 text-sm font-bold uppercase text-emerald-600">
            Tecnología & Servicio Técnico
          </p>

          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Tecnología al mejor precio.
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-500">
            Encontrá notebooks, smartwatches y tecnología seleccionada.
            Consultá directamente por WhatsApp y obtené nuestro precio web.
          </p>

        </div>
      </section>

      {/* Productos destacados */}
      <section className="mx-auto max-w-7xl px-6 pb-24">

        <div className="mb-8 flex items-end justify-between">
          <div>

            <p className="text-sm font-bold uppercase tracking-wider text-zinc-500">
              Selección
            </p>

            <h2 className="mt-2 text-3xl font-bold">
              Productos destacados
            </h2>

          </div>
        </div>

        {featuredProducts.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {featuredProducts.map((product) => (
              <ProductCard
                key={product.meliId}
                product={product}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 px-6 py-16 text-center">
            <p className="font-proxima text-zinc-400">
              Todavía no hay productos destacados.
            </p>
          </div>
        )}

      </section>

    </main>
  );
}
