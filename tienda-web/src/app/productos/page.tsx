import { withDatabase } from "@/lib/db";
import { getMeliDiscountPercent } from "@/lib/settings";
import { calculateWebPrice } from "@/lib/pricing";
import type { Product } from "@/types/product";
import type { Category } from "@/types/category";
import ProductCatalog from "@/components/ProductCatalog";

const PAGE_SIZE = 12;

interface ProductsPageProps {
  searchParams: Promise<{
    search?: string;
    categoryId?: string;
    minPrice?: string;
    maxPrice?: string;
  }>;
}

export default async function ProductsPage({
  searchParams,
}: ProductsPageProps) {
  const params = await searchParams;

  const search = params.search?.trim() || "";
  const categoryId = params.categoryId || "all";
  const minPrice = params.minPrice || "";
  const maxPrice = params.maxPrice || "";

  const { formattedProducts, formattedCategories, total } =
    await withDatabase(async (db) => {
      const discountPercent =
        await getMeliDiscountPercent(db);

      const productsCollection =
        db.collection<Product>("products");

      const filter: Record<string, unknown> = {
        visible: true,
      };

      if (search) {
        filter.title = {
          $regex: search,
          $options: "i",
        };
      }

      if (categoryId !== "all") {
        filter.categoryId = categoryId;
      }

      const discountFactor =
        1 - discountPercent / 100;

      if (discountFactor > 0) {
        const priceFilter: Record<string, number> = {};

        const minPriceNumber = Number(minPrice);
        const maxPriceNumber = Number(maxPrice);

        if (
          minPrice &&
          Number.isFinite(minPriceNumber)
        ) {
          priceFilter.$gte =
            minPriceNumber / discountFactor;
        }

        if (
          maxPrice &&
          Number.isFinite(maxPriceNumber)
        ) {
          priceFilter.$lte =
            maxPriceNumber / discountFactor;
        }

        if (Object.keys(priceFilter).length > 0) {
          filter.meliPrice = priceFilter;
        }
      }

      const [products, total, categories] =
        await Promise.all([
          productsCollection
            .find(filter)
            .sort({
              title: 1,
            })
            .limit(PAGE_SIZE)
            .toArray(),

          productsCollection.countDocuments(filter),

          db
            .collection<Category>("categories")
            .find({})
            .sort({
              name: 1,
            })
            .toArray(),
        ]);

      return {
        formattedProducts: products.map((product) => ({
          meliId: product.meliId,
          title: product.title,
          meliPrice: product.meliPrice,
          currencyId: product.currencyId,
          availableQuantity:
            product.availableQuantity,
          thumbnail: product.thumbnail,
          permalink: product.permalink,
          status: product.status,
          visible: product.visible,
          featured: product.featured,
          categoryId: product.categoryId,
          updatedAt:
            product.updatedAt.toISOString(),
          webPrice: calculateWebPrice(
            product.meliPrice,
            discountPercent
          ),
          discountPercent,
        })),

        formattedCategories: categories.map(
          (category) => ({
            categoryId: category.categoryId,
            name: category.name,
          })
        ),

        total,
      };
    });

  return (
    <main className="min-h-screen bg-zinc-100 pt-24">
      <section className="mx-auto max-w-7xl px-6 pb-24">
        <ProductCatalog
          key={`${search}|${categoryId}|${minPrice}|${maxPrice}`}
          initialProducts={formattedProducts}
          categories={formattedCategories}
          initialTotal={total}
          initialSearch={search}
          initialCategoryId={categoryId}
          initialMinPrice={minPrice}
          initialMaxPrice={maxPrice}
        />
      </section>
    </main>
  );
}