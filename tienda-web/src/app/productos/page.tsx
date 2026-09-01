import { getDatabase } from "@/lib/db";
import { getMeliDiscountPercent } from "@/lib/settings";
import { calculateWebPrice } from "@/lib/pricing";
import type { Product } from "@/types/product";
import type { Category } from "@/types/category";
import ProductCatalog from "@/components/ProductCatalog";

export default async function ProductsPage() {
  const db = await getDatabase();

  const discountPercent = await getMeliDiscountPercent();

  const products = await db
    .collection<Product>("products")
    .find({
      visible: true,
    })
    .sort({
      title: 1,
    })
    .toArray();

  const categories = await db
    .collection<Category>("categories")
    .find({})
    .sort({
      name: 1,
    })
    .toArray();

  const formattedProducts = products.map((product) => ({
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

  const formattedCategories = categories.map((category) => ({
    categoryId: category.categoryId,
    meliName: category.meliName,
    name: category.name,
    updatedAt: category.updatedAt.toISOString(),
  }));

  return (
    <main className="min-h-screen bg-zinc-100 pt-24">
      <section className="mx-auto max-w-7xl px-6 pb-24">

        <div className="mb-10">
          <p className="font-proxima text-sm font-bold uppercase tracking-wider text-emerald-600">
            Catálogo
          </p>

          <h1 className="mt-2 font-proxima text-4xl font-bold tracking-tight text-zinc-950">
            Todos los productos
          </h1>

          <p className="mt-3 max-w-2xl font-proxima text-base font-bold text-zinc-500">
            Explorá nuestro catálogo y encontrá el producto que estás buscando.
          </p>
        </div>

        <ProductCatalog
          products={formattedProducts}
          categories={formattedCategories}
        />

      </section>
    </main>
  );
}
