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
    discount?: string;
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

  const discount =
    params.discount || "";

  const {
    formattedProducts,
    formattedCategories,
    discountOptions,
    total,
  } = await withDatabase(async (db) => {
    const globalDiscountPercent =
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

    const minPriceNumber =
      Number(minPrice);

    const maxPriceNumber =
      Number(maxPrice);

    const discountNumber =
      Number(discount);

    const hasMinPrice =
      minPrice !== "" &&
      Number.isFinite(minPriceNumber);

    const hasMaxPrice =
      maxPrice !== "" &&
      Number.isFinite(maxPriceNumber);

    const hasDiscountFilter =
      discount !== "" &&
      Number.isFinite(discountNumber);

    const priceFilter: Record<string, number> =
      {};

    if (hasMinPrice) {
      priceFilter.$gte =
        minPriceNumber;
    }

    if (hasMaxPrice) {
      priceFilter.$lte =
        maxPriceNumber;
    }

    /*
     * Pipeline base:
     *
     * búsqueda + categoría
     *
     * Calculamos:
     * - precio efectivo de MercadoLibre
     * - descuento SOGUE efectivo
     * - precio web
     * - descuento total real
     */
    const basePipeline: Record<string, unknown>[] =
      [
        {
          $match: filter,
        },
        {
          $addFields: {
            effectiveMeliPrice: {
              $ifNull: [
                "$meliDiscountedPrice",
                "$meliPrice",
              ],
            },

            effectiveDiscountPercent: {
              $ifNull: [
                "$discountPercent",
                globalDiscountPercent,
              ],
            },
          },
        },
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
        {
          $addFields: {
            totalDiscountPercent: {
              $round: [
                {
                  $multiply: [
                    {
                      $subtract: [
                        1,
                        {
                          $divide: [
                            "$webPrice",
                            "$meliPrice",
                          ],
                        },
                      ],
                    },
                    100,
                  ],
                },
                1,
              ],
            },
          },
        },
      ];

    /*
     * El precio sí forma parte de los filtros.
     */
    if (
      Object.keys(priceFilter).length > 0
    ) {
      basePipeline.push({
        $match: {
          webPrice: priceFilter,
        },
      });
    }

    /*
     * Productos:
     * primero búsqueda + categoría + precio,
     * después descuento total mínimo.
     */
    const productsPipeline: Record<string, unknown>[] =
      [
        ...basePipeline,
      ];

    if (hasDiscountFilter) {
      productsPipeline.push({
        $match: {
          totalDiscountPercent: {
            $gte: discountNumber,
          },
        },
      });
    }

    productsPipeline.push(
      {
        $sort: {
          title: 1,
        },
      },
      {
        $limit: PAGE_SIZE,
      }
    );

    /*
     * Opciones de descuento:
     *
     * Se calculan sobre búsqueda + categoría +
     * precio, ignorando el descuento seleccionado.
     *
     * IMPORTANTE:
     * Ahora representan el DESCUENTO TOTAL REAL,
     * es decir, la diferencia entre el precio original
     * de MercadoLibre y el precio final de SOGUE.
     */
    const discountOptionsPipeline: Record<
      string,
      unknown
    >[] = [
      ...basePipeline,
      {
        $match: {
          totalDiscountPercent: {
            $gt: 0,
          },
        },
      },
      {
        $group: {
          _id: "$totalDiscountPercent",
        },
      },
      {
        $sort: {
          _id: 1,
        },
      },
    ];

    /*
     * Conteo total.
     */
    const countPipeline: Record<string, unknown>[] =
      [
        ...basePipeline,
      ];

    if (hasDiscountFilter) {
      countPipeline.push({
        $match: {
          totalDiscountPercent: {
            $gte: discountNumber,
          },
        },
      });
    }

    countPipeline.push({
      $count: "total",
    });

    const [
      products,
      countResult,
      categories,
      discountResults,
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
        .collection<Category>("categories")
        .find({})
        .sort({ name: 1 })
        .toArray(),

      productsCollection
        .aggregate<{
          _id: number;
        }>(discountOptionsPipeline)
        .toArray(),
    ]);

    const total =
      countResult[0]?.total ?? 0;

    const availableDiscountOptions =
      discountResults
        .map((item) => item._id)
        .filter(
          (value) =>
            Number.isFinite(value) &&
            value > 0
        );

    return {
      formattedProducts:
        products.map((product) => {
          const currentMeliPrice =
            product.meliDiscountedPrice ??
            product.meliPrice;

          const effectiveDiscountPercent =
            product.discountPercent ??
            globalDiscountPercent;

          const webPrice =
            calculateWebPrice(
              currentMeliPrice,
              effectiveDiscountPercent
            );

          /*
           * Descuento total respecto al precio
           * original de MercadoLibre.
           *
           * Se calcula usando el mismo precio web
           * que se muestra en la card.
           */
          const totalDiscountPercent =
            product.meliPrice > 0
              ? ((product.meliPrice -
                  webPrice) /
                  product.meliPrice) *
                100
              : 0;

          const roundedTotalDiscount =
            Number(
              totalDiscountPercent.toFixed(1)
            );

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

            webPrice,

            /*
             * ProductCard utiliza este campo para
             * mostrar el descuento total.
             */
            discountPercent:
              roundedTotalDiscount,
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

      discountOptions:
        availableDiscountOptions,

      total,
    };
  });

  return (
    <main className="min-h-screen bg-zinc-100 pt-24">
      <section className="mx-auto max-w-7xl px-6 pb-24">
        <ProductCatalog
          key={`${search}|${categoryId}|${minPrice}|${maxPrice}|${discount}`}
          initialProducts={
            formattedProducts
          }
          categories={
            formattedCategories
          }
          discountOptions={
            discountOptions
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
          initialDiscount={
            discount
          }
        />
      </section>
    </main>
  );
}