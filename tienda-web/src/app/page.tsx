import ProductCard from "@/components/ProductCard";

import { withDatabase } from "@/lib/db";
import { getMeliDiscountPercent } from "@/lib/settings";
import { calculateWebPrice } from "@/lib/pricing";
import {
  getCachedCatalogDiscount,
  getCachedCatalogProducts,
} from "@/lib/catalog-cache";

import type { Product } from "@/types/product";

type HomeProduct = Omit<Product, "updatedAt"> & {
  updatedAt: string;
  webPrice: number;
  discountPercent: number;
};

export default async function Home() {
  const homeStart = performance.now();

  console.log("[HOME] ===== INICIO =====");

  let featuredProducts: HomeProduct[];

  const [
    cachedProducts,
    cachedDiscount,
  ] = await Promise.all([
    getCachedCatalogProducts(),
    getCachedCatalogDiscount(),
  ]);

  if (
    cachedProducts !== null &&
    cachedDiscount !== null
  ) {
    console.log(
      `[HOME] Usando catálogo KV (${cachedProducts.length} productos)`
    );

    const products =
      cachedProducts
        .filter(
          (product) =>
            product.visible &&
            product.featured
        )
        .sort((a, b) => {
          const orderA =
            a.featuredOrder ??
            Number.MAX_SAFE_INTEGER;

          const orderB =
            b.featuredOrder ??
            Number.MAX_SAFE_INTEGER;

          if (orderA !== orderB) {
            return orderA - orderB;
          }

          return (
            new Date(b.updatedAt).getTime() -
            new Date(a.updatedAt).getTime()
          );
        })
        .slice(0, 8);

    featuredProducts =
      products.map((product) => {
        const currentMeliPrice =
          product.meliDiscountedPrice ??
          product.meliPrice;

        const effectiveDiscountPercent =
          product.discountPercent ??
          cachedDiscount;

        return {
          ...product,

          updatedAt:
            new Date(
              product.updatedAt
            ).toISOString(),

          webPrice:
            calculateWebPrice(
              currentMeliPrice,
              effectiveDiscountPercent
            ),

          discountPercent:
            effectiveDiscountPercent,
        };
      });
  } else {
    console.log(
      "[HOME] KV no disponible. Usando MongoDB."
    );

    featuredProducts =
      await withDatabase(async (db) => {
        const productsFilter = {
          visible: true,
          featured: true,
        };

        const [
          discountPercent,
          products,
        ] = await Promise.all([
          getMeliDiscountPercent(db),

          db
            .collection<Product>("products")
            .find(productsFilter)
            .toArray(),
        ]);

        products.sort((a, b) => {
          const orderA =
            a.featuredOrder ??
            Number.MAX_SAFE_INTEGER;

          const orderB =
            b.featuredOrder ??
            Number.MAX_SAFE_INTEGER;

          if (orderA !== orderB) {
            return orderA - orderB;
          }

          return (
            b.updatedAt.getTime() -
            a.updatedAt.getTime()
          );
        });

        const selectedProducts =
          products.slice(0, 8);

        return selectedProducts.map(
          (product) => {
            const currentMeliPrice =
              product.meliDiscountedPrice ??
              product.meliPrice;

            const effectiveDiscountPercent =
              product.discountPercent ??
              discountPercent;

            return {
              ...product,

              updatedAt:
                product.updatedAt.toISOString(),

              webPrice:
                calculateWebPrice(
                  currentMeliPrice,
                  effectiveDiscountPercent
                ),

              discountPercent:
                effectiveDiscountPercent,
            };
          }
        );
      });
  }

  console.log(
    `[HOME] productos seleccionados: ${featuredProducts.length}`
  );

  console.log(
    `[HOME] TOTAL: ${(
      performance.now() - homeStart
    ).toFixed(1)} ms`
  );

  console.log("[HOME] ===== FIN =====");

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
            {featuredProducts.map(
              (product) => (
                <ProductCard
                  key={product.meliId}
                  product={product}
                />
              )
            )}
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