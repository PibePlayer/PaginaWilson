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

  const search =
    params.search?.trim() || "";

  const categoryId =
    params.categoryId || "all";

  const minPrice =
    params.minPrice || "";

  const maxPrice =
    params.maxPrice || "";

  const {
    formattedProducts,
    formattedCategories,
    total,
  } = await withDatabase(async (db) => {
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

    /*
     * El filtro que ingresa el usuario corresponde
     * al precio FINAL de SOGUE.
     *
     * Ejemplo:
     *
     * Precio ML efectivo: $800.000
     * Descuento SOGUE: 10%
     * Precio SOGUE: $720.000
     *
     * Si el usuario busca $700.000 - $750.000,
     * debemos encontrar productos cuyo precio ML
     * efectivo esté aproximadamente entre:
     *
     * $700.000 / 0,90 = $777.777
     * $750.000 / 0,90 = $833.333
     *
     * Por eso convertimos el rango antes de
     * consultar MongoDB.
     */

    const minPriceNumber =
      Number(minPrice);

    const maxPriceNumber =
      Number(maxPrice);

    const hasMinPrice =
      minPrice !== "" &&
      Number.isFinite(minPriceNumber);

    const hasMaxPrice =
      maxPrice !== "" &&
      Number.isFinite(maxPriceNumber);

    const discountFactor =
      1 - discountPercent / 100;

    if (
      (hasMinPrice || hasMaxPrice) &&
      discountFactor > 0
    ) {
      const meliPriceFilter: Record<
        string,
        number
      > = {};

      if (hasMinPrice) {
        meliPriceFilter.$gte =
          minPriceNumber /
          discountFactor;
      }

      if (hasMaxPrice) {
        meliPriceFilter.$lte =
          maxPriceNumber /
          discountFactor;
      }

      /*
       * Preferimos meliDiscountedPrice,
       * porque representa el precio efectivo
       * actual de MercadoLibre.
       *
       * Para productos antiguos que todavía
       * no tengan ese campo, utilizamos meliPrice
       * como fallback.
       */
      filter.$or = [
        {
          meliDiscountedPrice:
            meliPriceFilter,
        },
        {
          meliDiscountedPrice: {
            $exists: false,
          },
          meliPrice:
            meliPriceFilter,
        },
      ];
    }

    const [
      products,
      total,
      categories,
    ] = await Promise.all([
      productsCollection
        .find(filter)
        .sort({
          title: 1,
        })
        .limit(PAGE_SIZE)
        .toArray(),

      productsCollection.countDocuments(
        filter
      ),

      db
        .collection<Category>("categories")
        .find({})
        .sort({
          name: 1,
        })
        .toArray(),
    ]);

    return {
      formattedProducts:
        products.map((product) => {
          const currentMeliPrice =
            product.meliDiscountedPrice ??
            product.meliPrice;

          return {
            meliId: product.meliId,
            title: product.title,

            meliPrice:
              product.meliPrice,

            meliDiscountedPrice:
              product.meliDiscountedPrice,

            currencyId:
              product.currencyId,

            availableQuantity:
              product.availableQuantity,

            thumbnail:
              product.thumbnail,

            permalink:
              product.permalink,

            status:
              product.status,

            visible:
              product.visible,

            featured:
              product.featured,

            categoryId:
              product.categoryId,

            updatedAt:
              product.updatedAt.toISOString(),

            webPrice:
              calculateWebPrice(
                currentMeliPrice,
                discountPercent
              ),

            discountPercent,
          };
        }),

      formattedCategories:
        categories.map((category) => ({
          categoryId:
            category.categoryId,

          name:
            category.name,
        })),

      total,
    };
  });

  return (
    <main className="min-h-screen bg-zinc-100 pt-24">
      <section className="mx-auto max-w-7xl px-6 pb-24">
        <ProductCatalog
          key={`${search}|${categoryId}|${minPrice}|${maxPrice}`}
          initialProducts={
            formattedProducts
          }
          categories={
            formattedCategories
          }
          initialTotal={total}
          initialSearch={search}
          initialCategoryId={
            categoryId
          }
          initialMinPrice={minPrice}
          initialMaxPrice={maxPrice}
        />
      </section>
    </main>
  );
}