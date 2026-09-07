import { NextRequest, NextResponse } from "next/server";

import { withDatabase } from "@/lib/db";
import { getMeliDiscountPercent } from "@/lib/settings";
import { calculateWebPrice } from "@/lib/pricing";
import type { Product } from "@/types/product";

const PAGE_SIZE = 12;

export async function GET(
  request: NextRequest
) {
  try {
    return await withDatabase(async (db) => {
      const searchParams =
        request.nextUrl.searchParams;

      const page = Math.max(
        1,
        Number(searchParams.get("page")) || 1
      );

      const categoryId =
        searchParams.get("categoryId") || null;

      const search =
        searchParams.get("search")?.trim() || "";

      const minPriceParam =
        searchParams.get("minPrice");

      const maxPriceParam =
        searchParams.get("maxPrice");

      const minPrice = minPriceParam
        ? Number(minPriceParam)
        : null;

      const maxPrice = maxPriceParam
        ? Number(maxPriceParam)
        : null;

      const skip =
        (page - 1) * PAGE_SIZE;

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

      /*
       * Descuento global de la tienda.
       *
       * Se utiliza solamente cuando el producto
       * no tiene un descuento individual.
       */
      const globalDiscountPercent =
        await getMeliDiscountPercent(db);

      /*
       * El filtro de precio representa el
       * precio FINAL de SOGUE.
       *
       * Como cada producto puede tener un
       * descuento diferente, no podemos convertir
       * minPrice/maxPrice usando solamente el
       * descuento global.
       *
       * En su lugar, calculamos el precio final
       * dentro de MongoDB:
       *
       * precio ML efectivo *
       * (1 - descuento / 100)
       *
       * donde:
       *
       * descuento =
       *   descuento individual del producto
       *   o descuento global si no existe.
       */
      const hasMinPrice =
        minPrice !== null &&
        Number.isFinite(minPrice);

      const hasMaxPrice =
        maxPrice !== null &&
        Number.isFinite(maxPrice);

      const priceFilterStages: Record<
        string,
        unknown
      > = {};

      if (hasMinPrice) {
        priceFilterStages.$gte =
          minPrice;
      }

      if (hasMaxPrice) {
        priceFilterStages.$lte =
          maxPrice;
      }

      const productsCollection =
        db.collection<Product>(
          "products"
        );

      /*
       * Construimos una pipeline para poder
       * calcular el precio SOGUE individual
       * antes de aplicar el filtro y la
       * paginación.
       */
      const pipeline: Record<
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
      ];

      /*
       * Aplicamos el filtro sobre el precio
       * final de SOGUE.
       */
      if (
        Object.keys(priceFilterStages)
          .length > 0
      ) {
        pipeline.push({
          $match: {
            webPrice:
              priceFilterStages,
          },
        });
      }

      /*
       * Orden, paginación y conteo.
       */
      const dataPipeline = [
        ...pipeline,
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
        },
      ];

      const countPipeline = [
        ...pipeline,
        {
          $count: "total",
        },
      ];

      const [
        products,
        countResult,
      ] = await Promise.all([
        productsCollection
          .aggregate<Product>(
            dataPipeline
          )
          .toArray(),

        productsCollection
          .aggregate<{
            total: number;
          }>(countPipeline)
          .toArray(),
      ]);

      const total =
        countResult[0]?.total ?? 0;

      const formattedProducts =
        products.map((product) => {
          /*
           * Precio efectivo actual de ML.
           *
           * Si existe una promoción:
           *   meliDiscountedPrice
           *
           * Si no:
           *   meliPrice
           */
          const effectiveMeliPrice =
            product.meliDiscountedPrice ??
            product.meliPrice;

          /*
           * El descuento individual tiene
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

            /*
             * Precio original de la
             * publicación en MercadoLibre.
             */
            meliPrice:
              product.meliPrice,

            /*
             * Precio efectivo actual
             * de MercadoLibre.
             */
            meliDiscountedPrice:
              effectiveMeliPrice,

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
                effectiveMeliPrice,
                effectiveDiscountPercent
              ),

            /*
             * Descuento que realmente
             * se está aplicando.
             */
            discountPercent:
              effectiveDiscountPercent,
          };
        });

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
      });
    });
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