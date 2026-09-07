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

    const priceFilter: Record<string, number> = {};

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
     * búsqueda + categoría + precio.
     *
     * El filtro de descuento se aplica después
     * y NO forma parte de la generación de opciones.
     */
    const basePipeline: Record<string, unknown>[] = [
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
    ];

    /*
     * El precio sí forma parte de los filtros actuales.
     * Por eso las opciones de descuento se calculan
     * después de aplicar este filtro.
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
     * Pipeline de productos:
     * parte de los filtros actuales y recién acá
     * aplica el descuento mínimo seleccionado.
     */
    const productsPipeline: Record<string, unknown>[] = [
      ...basePipeline,
    ];

    if (hasDiscountFilter) {
      productsPipeline.push({
        $match: {
          effectiveDiscountPercent: {
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
     * Se calculan a partir de los productos que cumplen
     * búsqueda + categoría + precio, pero IGNORANDO
     * el descuento actualmente seleccionado.
     *
     * Así, si estamos viendo Notebooks y hay 5%, 10% y 20%,
     * aparecen:
     *
     * 5% o más
     * 10% o más
     * 20% o más
     */
    const discountOptionsPipeline = [
      ...basePipeline,
      {
        $group: {
          _id: "$effectiveDiscountPercent",
        },
      },
      {
        $sort: {
          _id: 1,
        },
      },
    ];

    const countPipeline = [
      ...productsPipeline.slice(
        0,
        productsPipeline.length - 2
      ),
    ];

    if (hasDiscountFilter) {
      countPipeline.push({
        $match: {
          effectiveDiscountPercent: {
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
        .aggregate<{ total: number }>(
          countPipeline
        )
        .toArray(),

      db
        .collection<Category>("categories")
        .find({})
        .sort({ name: 1 })
        .toArray(),

      productsCollection
        .aggregate<{
          _id: number;
        }>(
          discountOptionsPipeline
        )
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

            webPrice:
              calculateWebPrice(
                currentMeliPrice,
                effectiveDiscountPercent
              ),

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