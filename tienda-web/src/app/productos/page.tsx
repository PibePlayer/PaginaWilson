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
  const params =
    await searchParams;

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
    /*
     * Descuento global de la tienda.
     *
     * Se utiliza como fallback para productos
     * que no tengan un descuento individual.
     */
    const globalDiscountPercent =
      await getMeliDiscountPercent(db);

    const productsCollection =
      db.collection<Product>(
        "products"
      );

    const filter: Record<
      string,
      unknown
    > = {
      visible: true,
    };

    if (search) {
      filter.title = {
        $regex: search,
        $options: "i",
      };
    }

    if (categoryId !== "all") {
      filter.categoryId =
        categoryId;
    }

    const minPriceNumber =
      Number(minPrice);

    const maxPriceNumber =
      Number(maxPrice);

    const hasMinPrice =
      minPrice !== "" &&
      Number.isFinite(
        minPriceNumber
      );

    const hasMaxPrice =
      maxPrice !== "" &&
      Number.isFinite(
        maxPriceNumber
      );

    /*
     * El filtro de precio corresponde
     * al precio FINAL de SOGUE.
     *
     * Cada producto puede tener un descuento
     * individual diferente, por lo que debemos
     * calcular el precio final de cada producto
     * dentro de MongoDB antes de filtrar.
     */
    const priceFilter: Record<
      string,
      number
    > = {};

    if (hasMinPrice) {
      priceFilter.$gte =
        minPriceNumber;
    }

    if (hasMaxPrice) {
      priceFilter.$lte =
        maxPriceNumber;
    }

    /*
     * Pipeline base.
     */
    const pipeline: Record<
      string,
      unknown
    >[] = [
      {
        $match: filter,
      },

      /*
       * Precio efectivo de MercadoLibre.
       *
       * Si hay promoción:
       *   meliDiscountedPrice
       *
       * Si no:
       *   meliPrice
       */
      {
        $addFields: {
          effectiveMeliPrice: {
            $ifNull: [
              "$meliDiscountedPrice",
              "$meliPrice",
            ],
          },

          /*
           * Descuento individual si existe.
           * De lo contrario, descuento global.
           */
          effectiveDiscountPercent: {
            $ifNull: [
              "$discountPercent",
              globalDiscountPercent,
            ],
          },
        },
      },

      /*
       * Calculamos el precio final SOGUE.
       */
      {
        $addFields: {
          webPrice: {
            $round: [
              {
                $multiply: [
                  "$effectiveMeliPrice",
                  {
                    $subtract: [
                      1,
                      {
                        $divide: [
                          "$effectiveDiscountPercent",
                          100,
                        ],
                      },
                    ],
                  },
                ],
              },
              0,
            ],
          },
        },
      },
    ];

    /*
     * Filtramos por precio final SOGUE.
     */
    if (
      Object.keys(priceFilter)
        .length > 0
    ) {
      pipeline.push({
        $match: {
          webPrice:
            priceFilter,
        },
      });
    }

    /*
     * Obtenemos los productos de esta página.
     */
    const productsPipeline = [
      ...pipeline,

      {
        $sort: {
          title: 1,
        },
      },

      {
        $limit: PAGE_SIZE,
      },
    ];

    /*
     * Conteo total.
     */
    const countPipeline = [
      ...pipeline,

      {
        $count: "total",
      },
    ];

    const [
      products,
      countResult,
      categories,
    ] = await Promise.all([
      productsCollection
        .aggregate<Product>(
          productsPipeline
        )
        .toArray(),

      productsCollection
        .aggregate<{
          total: number;
        }>(countPipeline)
        .toArray(),

      db
        .collection<Category>(
          "categories"
        )
        .find({})
        .sort({
          name: 1,
        })
        .toArray(),
    ]);

    const total =
      countResult[0]?.total ?? 0;

    return {
      formattedProducts:
        products.map((product) => {
          /*
           * Precio efectivo actual de ML.
           */
          const currentMeliPrice =
            product.meliDiscountedPrice ??
            product.meliPrice;

          /*
           * Descuento individual tiene
           * prioridad sobre el global.
           */
          const effectiveDiscountPercent =
            product.discountPercent ??
            globalDiscountPercent;

          return {
            meliId:
              product.meliId,

            title:
              product.title,

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

            /*
             * Precio final SOGUE.
             */
            webPrice:
              calculateWebPrice(
                currentMeliPrice,
                effectiveDiscountPercent
              ),

            /*
             * Descuento realmente utilizado.
             */
            discountPercent:
              effectiveDiscountPercent,
          };
        }),

      formattedCategories:
        categories.map(
          (category) => ({
            categoryId:
              category.categoryId,

            name:
              category.name,
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
          initialMinPrice={
            minPrice
          }
          initialMaxPrice={
            maxPrice
          }
        />

      </section>
    </main>
  );
}