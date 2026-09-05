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

      const discountPercent =
        await getMeliDiscountPercent(db);

      /*
       * Los filtros representan el
       * precio final de SOGUE.
       *
       * Precio SOGUE =
       * precio efectivo ML *
       * (1 - descuento SOGUE / 100)
       *
       * Por lo tanto, convertimos el
       * rango solicitado al rango
       * equivalente del precio efectivo
       * de MercadoLibre.
       */

      const discountFactor =
        1 - discountPercent / 100;

      if (discountFactor > 0) {
        const priceFilter: Record<
          string,
          number
        > = {};

        if (
          minPrice !== null &&
          Number.isFinite(minPrice)
        ) {
          priceFilter.$gte =
            minPrice /
            discountFactor;
        }

        if (
          maxPrice !== null &&
          Number.isFinite(maxPrice)
        ) {
          priceFilter.$lte =
            maxPrice /
            discountFactor;
        }

        if (
          Object.keys(priceFilter).length > 0
        ) {
          /*
           * Productos nuevos:
           * usamos el precio efectivo
           * actual de MercadoLibre.
           *
           * Productos antiguos:
           * si todavía no tienen
           * meliDiscountedPrice,
           * usamos meliPrice.
           */
          filter.$or = [
            {
              meliDiscountedPrice:
                priceFilter,
            },
            {
              meliDiscountedPrice: {
                $exists: false,
              },
              meliPrice:
                priceFilter,
            },
          ];
        }
      }

      const productsCollection =
        db.collection<Product>(
          "products"
        );

      const [products, total] =
        await Promise.all([
          productsCollection
            .find(filter)
            .sort({
              title: 1,
            })
            .skip(skip)
            .limit(PAGE_SIZE)
            .toArray(),

          productsCollection.countDocuments(
            filter
          ),
        ]);

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
             *
             * Ejemplo:
             *
             * ML efectivo: $800.000
             * SOGUE: 10%
             * Web: $720.000
             */
            webPrice:
              calculateWebPrice(
                effectiveMeliPrice,
                discountPercent
              ),

            discountPercent,
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