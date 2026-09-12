import { NextRequest, NextResponse } from "next/server";

import { withDatabase } from "@/lib/db";
import { getMeliDiscountPercent } from "@/lib/settings";
import { calculateWebPrice } from "@/lib/pricing";
import {
  getCachedCatalogDiscount,
  getCachedCatalogProducts,
} from "@/lib/catalog-cache";

import type { Product } from "@/types/product";

const PAGE_SIZE = 12;

function formatProduct(
  product: Product,
  globalDiscountPercent: number
) {
  const effectiveMeliPrice =
    product.meliDiscountedPrice ??
    product.meliPrice;

  const effectiveDiscountPercent =
    product.discountPercent ??
    globalDiscountPercent;

  const webPrice =
    calculateWebPrice(
      effectiveMeliPrice,
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
      product.updatedAt instanceof Date
        ? product.updatedAt.toISOString()
        : String(product.updatedAt),

    webPrice,

    /*
     * ProductCard espera este campo
     * para mostrar el descuento total.
     */
    discountPercent:
      roundedTotalDiscount,
  };
}

/*
 * Catálogo usando Cloudflare KV.
 *
 * No toca MongoDB.
 */
async function getProductsFromCache(
  page: number,
  categoryId: string | null,
  search: string,
  minPrice: number | null,
  maxPrice: number | null,
  discount: number | null
) {
  const [
    cachedProducts,
    cachedDiscount,
  ] = await Promise.all([
    getCachedCatalogProducts(),
    getCachedCatalogDiscount(),
  ]);

  /*
   * Si falta cualquiera de los dos valores,
   * el caller hará fallback a MongoDB.
   */
  if (
    cachedProducts === null ||
    cachedDiscount === null
  ) {
    return null;
  }

  const hasMinPrice =
    minPrice !== null &&
    Number.isFinite(minPrice);

  const hasMaxPrice =
    maxPrice !== null &&
    Number.isFinite(maxPrice);

  const hasDiscountFilter =
    discount !== null &&
    Number.isFinite(discount);

  /*
   * Misma búsqueda que hacía MongoDB:
   * regex case-insensitive sobre title.
   */
  let searchRegex: RegExp | null = null;

  if (search) {
    searchRegex =
      new RegExp(search, "i");
  }

  /*
   * Primero aplicamos:
   * - visible
   * - categoría
   * - búsqueda
   */
  const baseProducts =
    cachedProducts.filter(
      (product) => {
        if (!product.visible) {
          return false;
        }

        if (
          categoryId &&
          product.categoryId !== categoryId
        ) {
          return false;
        }

        if (
          searchRegex &&
          !searchRegex.test(
            product.title
          )
        ) {
          return false;
        }

        return true;
      }
    );

  /*
   * Calculamos los precios y descuentos
   * exactamente igual que en Mongo.
   */
  const productsWithCalculatedValues =
    baseProducts
      .map((product) => {
        const effectiveMeliPrice =
          product.meliDiscountedPrice ??
          product.meliPrice;

        const effectiveDiscountPercent =
          product.discountPercent ??
          cachedDiscount;

        const webPrice =
          calculateWebPrice(
            effectiveMeliPrice,
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
            totalDiscountPercent.toFixed(
              1
            )
          );

        return {
          product,
          webPrice,
          totalDiscountPercent:
            roundedTotalDiscount,
        };
      });

  /*
   * Filtros de precio web.
   */
  const priceFilteredProducts =
    productsWithCalculatedValues.filter(
      (item) => {
        if (
          hasMinPrice &&
          item.webPrice < minPrice!
        ) {
          return false;
        }

        if (
          hasMaxPrice &&
          item.webPrice > maxPrice!
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
   *
   * Son descuentos totales.
   */
  const discountOptions =
    Array.from(
      new Set(
        priceFilteredProducts
          .map(
            (item) =>
              item.totalDiscountPercent
          )
          .filter(
            (value) =>
              Number.isFinite(value) &&
              value > 0
          )
      )
    ).sort(
      (a, b) => a - b
    );

  /*
   * Aplicamos el filtro de descuento
   * solamente a los productos.
   */
  const filteredProducts =
    hasDiscountFilter
      ? priceFilteredProducts.filter(
          (item) =>
            item.totalDiscountPercent >=
            discount!
        )
      : priceFilteredProducts;

  /*
   * Mongo hacía:
   *
   * $sort: { title: 1 }
   */
  filteredProducts.sort(
    (a, b) =>
      a.product.title.localeCompare(
        b.product.title
      )
  );

  const total =
    filteredProducts.length;

  const skip =
    (page - 1) *
    PAGE_SIZE;

  const paginatedProducts =
    filteredProducts.slice(
      skip,
      skip + PAGE_SIZE
    );

  const formattedProducts =
    paginatedProducts.map(
      (item) =>
        formatProduct(
          item.product,
          cachedDiscount
        )
    );

  return {
    products:
      formattedProducts,

    page,

    pageSize:
      PAGE_SIZE,

    total,

    hasMore:
      skip +
        formattedProducts.length <
      total,

    discountOptions,
  };
}

/*
 * Fallback original usando MongoDB.
 *
 * Se utiliza solamente cuando KV no tiene
 * catálogo o descuento.
 */
async function getProductsFromMongo(
  request: NextRequest,
  page: number,
  categoryId: string | null,
  search: string,
  minPrice: number | null,
  maxPrice: number | null,
  discount: number | null
) {
  return withDatabase(async (db) => {
    const hasMinPrice =
      minPrice !== null &&
      Number.isFinite(minPrice);

    const hasMaxPrice =
      maxPrice !== null &&
      Number.isFinite(maxPrice);

    const hasDiscountFilter =
      discount !== null &&
      Number.isFinite(discount);

    const skip =
      (page - 1) *
      PAGE_SIZE;

    const filter: Record<
      string,
      unknown
    > = {
      visible: true,
    };

    if (categoryId) {
      filter.categoryId =
        categoryId;
    }

    if (search) {
      filter.title = {
        $regex: search,
        $options: "i",
      };
    }

    const globalDiscountPercent =
      await getMeliDiscountPercent(
        db
      );

    const priceFilterStages: Record<
      string,
      number
    > = {};

    if (hasMinPrice) {
      priceFilterStages.$gte =
        minPrice!;
    }

    if (hasMaxPrice) {
      priceFilterStages.$lte =
        maxPrice!;
    }

    const productsCollection =
      db.collection<Product>(
        "products"
      );

    /*
     * Filtros base:
     *
     * búsqueda + categoría.
     *
     * Calculamos:
     * - precio efectivo de MercadoLibre
     * - descuento SOGUE
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
     * El precio web forma parte
     * de los filtros.
     */
    if (
      Object.keys(
        priceFilterStages
      ).length > 0
    ) {
      basePipeline.push({
        $match: {
          webPrice:
            priceFilterStages,
        },
      });
    }

    /*
     * Productos.
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
            $gte: discount!,
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
        $skip: skip,
      },
      {
        $limit: PAGE_SIZE,
      }
    );

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
            $gte: discount!,
          },
        },
      });
    }

    countPipeline.push({
      $count: "total",
    });

    /*
     * Opciones de descuento.
     *
     * Ignora el descuento seleccionado.
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

    const [
      products,
      countResult,
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

    const discountOptions =
      discountResults
        .map(
          (item) =>
            item._id
        )
        .filter(
          (value) =>
            Number.isFinite(value) &&
            value > 0
        );

    const formattedProducts =
      products.map(
        (product) =>
          formatProduct(
            product,
            globalDiscountPercent
          )
      );

    return NextResponse.json({
      products:
        formattedProducts,

      page,

      pageSize:
        PAGE_SIZE,

      total,

      hasMore:
        skip +
          formattedProducts.length <
        total,

      discountOptions,
    });
  });
}

export async function GET(
  request: NextRequest
) {
  try {
    const searchParams =
      request.nextUrl.searchParams;

    const page = Math.max(
      1,
      Number(
        searchParams.get("page")
      ) || 1
    );

    const categoryId =
      searchParams.get(
        "categoryId"
      ) || null;

    const search =
      searchParams
        .get("search")
        ?.trim() || "";

    const minPriceParam =
      searchParams.get(
        "minPrice"
      );

    const maxPriceParam =
      searchParams.get(
        "maxPrice"
      );

    const discountParam =
      searchParams.get(
        "discount"
      );

    const minPrice =
      minPriceParam
        ? Number(minPriceParam)
        : null;

    const maxPrice =
      maxPriceParam
        ? Number(maxPriceParam)
        : null;

    const discount =
      discountParam
        ? Number(discountParam)
        : null;

    /*
     * Primero intentamos KV.
     *
     * Esta es la ruta normal del cliente.
     */
    const cachedResult =
      await getProductsFromCache(
        page,
        categoryId,
        search,
        minPrice,
        maxPrice,
        discount
      );

    if (cachedResult !== null) {
      console.log(
        `[PRODUCTS API] Usando catálogo KV (${cachedResult.total} productos filtrados)`
      );

      return NextResponse.json(
        cachedResult
      );
    }

    /*
     * Fallback:
     *
     * Si KV está vacío/incompleto,
     * usamos MongoDB.
     */
    console.log(
      "[PRODUCTS API] KV no disponible. Usando MongoDB."
    );

    return await getProductsFromMongo(
      request,
      page,
      categoryId,
      search,
      minPrice,
      maxPrice,
      discount
    );
  } catch (error) {
    console.error(
      "Products API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Internal server error",
      },
      {
        status: 500,
      }
    );
  }
}