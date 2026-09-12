import { withDatabase } from "@/lib/db";
import { getMeliDiscountPercent } from "@/lib/settings";
import { calculateWebPrice } from "@/lib/pricing";
import {
  getCachedCatalogDiscount,
  getCachedCatalogProducts,
} from "@/lib/catalog-cache";

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

interface FormattedProduct {
  meliId: string;
  title: string;
  meliPrice: number;
  meliDiscountedPrice?: number;
  currencyId: string;
  availableQuantity: number;
  thumbnail: string;
  permalink: string;
  status: string;
  visible: boolean;
  featured: boolean;
  categoryId: string;
  updatedAt: string;
  webPrice: number;
  discountPercent: number;
}

interface CatalogResult {
  formattedProducts: FormattedProduct[];
  formattedCategories: {
    categoryId: string;
    name: string;
  }[];
  discountOptions: number[];
  total: number;
}

function formatProduct(
  product: Product,
  globalDiscountPercent: number
): FormattedProduct {
  const currentMeliPrice =
    product.meliDiscountedPrice ??
    product.meliPrice;

  const effectiveDiscountPercent =
    product.discountPercent ??
    globalDiscountPercent;

  const webPrice = calculateWebPrice(
    currentMeliPrice,
    effectiveDiscountPercent
  );

  /*
   * Descuento total respecto al precio
   * original de MercadoLibre.
   */
  const totalDiscountPercent =
    product.meliPrice > 0
      ? ((product.meliPrice - webPrice) /
          product.meliPrice) *
        100
      : 0;

  const roundedTotalDiscount = Number(
    totalDiscountPercent.toFixed(1)
  );

  return {
    meliId: product.meliId,

    title: product.title,

    meliPrice: product.meliPrice,

    meliDiscountedPrice:
      product.meliDiscountedPrice,

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
      product.updatedAt instanceof Date
        ? product.updatedAt.toISOString()
        : String(product.updatedAt),

    webPrice,

    /*
     * ProductCard utiliza este campo para
     * mostrar el descuento total.
     */
    discountPercent:
      roundedTotalDiscount,
  };
}

async function getCatalogFromCache(
  search: string,
  categoryId: string,
  minPrice: string,
  maxPrice: string,
  discount: string
): Promise<CatalogResult | null> {
  const [
    cachedProducts,
    globalDiscountPercent,
  ] = await Promise.all([
    getCachedCatalogProducts(),
    getCachedCatalogDiscount(),
  ]);

  /*
   * Si falta cualquiera de los dos valores,
   * usamos Mongo como fallback.
   */
  if (
    cachedProducts === null ||
    globalDiscountPercent === null
  ) {
    console.log(
      "[PRODUCTS] Cache incompleto, usando Mongo fallback"
    );

    return null;
  }

  console.log(
    `[PRODUCTS] Usando catálogo KV (${cachedProducts.length} productos)`
  );

  const minPriceNumber = Number(minPrice);
  const maxPriceNumber = Number(maxPrice);
  const discountNumber = Number(discount);

  const hasMinPrice =
    minPrice !== "" &&
    Number.isFinite(minPriceNumber);

  const hasMaxPrice =
    maxPrice !== "" &&
    Number.isFinite(maxPriceNumber);

  const hasDiscountFilter =
    discount !== "" &&
    Number.isFinite(discountNumber);

  /*
   * Primero aplicamos búsqueda + categoría.
   */
  const baseProducts =
    cachedProducts.filter((product) => {
      if (!product.visible) {
        return false;
      }

      if (
        search &&
        !product.title
          .toLowerCase()
          .includes(search.toLowerCase())
      ) {
        return false;
      }

      if (
        categoryId !== "all" &&
        product.categoryId !== categoryId
      ) {
        return false;
      }

      return true;
    });

  /*
   * Calculamos precios y descuentos sobre los
   * productos que pasaron los filtros base.
   */
  const productsWithCalculatedValues =
    baseProducts.map((product) => {
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
        product,
        webPrice,
        totalDiscountPercent:
          roundedTotalDiscount,
      };
    });

  /*
   * Precio web.
   */
  const priceFilteredProducts =
    productsWithCalculatedValues.filter(
      ({
        webPrice,
      }) => {
        if (
          hasMinPrice &&
          webPrice < minPriceNumber
        ) {
          return false;
        }

        if (
          hasMaxPrice &&
          webPrice > maxPriceNumber
        ) {
          return false;
        }

        return true;
      }
    );

  /*
   * Opciones de descuento:
   *
   * búsqueda + categoría + precio,
   * ignorando el descuento seleccionado.
   */
  const discountOptions = Array.from(
    new Set(
      priceFilteredProducts
        .map(
          ({
            totalDiscountPercent,
          }) => totalDiscountPercent
        )
        .filter(
          (value) =>
            Number.isFinite(value) &&
            value > 0
        )
    )
  ).sort((a, b) => a - b);

  /*
   * Productos finales:
   * búsqueda + categoría + precio +
   * descuento seleccionado.
   */
  const finalProducts =
    hasDiscountFilter
      ? priceFilteredProducts.filter(
          ({
            totalDiscountPercent,
          }) =>
            totalDiscountPercent >=
            discountNumber
        )
      : priceFilteredProducts;

  /*
   * Mismo orden que Mongo:
   * title ascendente.
   */
  finalProducts.sort((a, b) =>
    a.product.title.localeCompare(
      b.product.title
    )
  );

  const total = finalProducts.length;

  /*
   * La página inicial siempre toma los
   * primeros 12 productos.
   */
  const formattedProducts =
    finalProducts
      .slice(0, PAGE_SIZE)
      .map(
        ({
          product,
        }) =>
          formatProduct(
            product,
            globalDiscountPercent
          )
      );

  /*
   * Las categorías salen del mismo catálogo KV.
   *
   * Usamos todos los productos visibles,
   * no solamente los resultados actuales,
   * igual que la consulta anterior a
   * la colección "categories".
   */
  const categoriesMap = new Map<
    string,
    string
  >();

  for (const product of cachedProducts) {
    if (
      product.visible &&
      product.categoryId &&
      product.categoryName
    ) {
      categoriesMap.set(
        product.categoryId,
        product.categoryName
      );
    }
  }

  const formattedCategories =
    Array.from(
      categoriesMap.entries()
    )
      .map(
        ([
          categoryId,
          name,
        ]) => ({
          categoryId,
          name,
        })
      )
      .sort((a, b) =>
        a.name.localeCompare(
          b.name
        )
      );

  return {
    formattedProducts,
    formattedCategories,
    discountOptions,
    total,
  };
}

async function getCatalogFromMongo(
  search: string,
  categoryId: string,
  minPrice: string,
  maxPrice: string,
  discount: string
): Promise<CatalogResult> {
  return withDatabase(async (db) => {
    const globalDiscountPercent =
      await getMeliDiscountPercent(db);

    const productsCollection =
      db.collection<Product>("products");

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
      Number.isFinite(
        minPriceNumber
      );

    const hasMaxPrice =
      maxPrice !== "" &&
      Number.isFinite(
        maxPriceNumber
      );

    const hasDiscountFilter =
      discount !== "" &&
      Number.isFinite(
        discountNumber
      );

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
    const basePipeline: Record<
      string,
      unknown
    >[] = [
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
     * El precio sí forma parte
     * de los filtros.
     */
    if (
      Object.keys(priceFilter)
        .length > 0
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
    const productsPipeline: Record<
      string,
      unknown
    >[] = [
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
     * búsqueda + categoría + precio,
     * ignorando el descuento seleccionado.
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
          _id:
            "$totalDiscountPercent",
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
    const countPipeline: Record<
      string,
      unknown
    >[] = [
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
        }>(
          countPipeline
        )
        .toArray(),

      db
        .collection<Category>(
          "categories"
        )
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
      countResult[0]?.total ??
      0;

    const availableDiscountOptions =
      discountResults
        .map(
          (item) => item._id
        )
        .filter(
          (value) =>
            Number.isFinite(value) &&
            value > 0
        );

    return {
      formattedProducts:
        products.map(
          (product) =>
            formatProduct(
              product,
              globalDiscountPercent
            )
        ),

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

  const discount =
    params.discount || "";

  /*
   * Primero intentamos KV.
   *
   * Si el cache no existe o está incompleto,
   * usamos exactamente el flujo anterior
   * con Mongo.
   */
  const cachedResult =
    await getCatalogFromCache(
      search,
      categoryId,
      minPrice,
      maxPrice,
      discount
    );

  const {
    formattedProducts,
    formattedCategories,
    discountOptions,
    total,
  } =
    cachedResult ??
    (await getCatalogFromMongo(
      search,
      categoryId,
      minPrice,
      maxPrice,
      discount
    ));

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
          initialTotal={
            total
          }
          initialSearch={
            search
          }
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