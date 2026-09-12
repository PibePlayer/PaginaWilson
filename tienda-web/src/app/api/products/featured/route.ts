import { NextResponse } from "next/server";

import { withDatabase } from "@/lib/db";
import { getMeliDiscountPercent } from "@/lib/settings";
import { calculateWebPrice } from "@/lib/pricing";
import {
  getCachedCatalogDiscount,
  getCachedCatalogProducts,
} from "@/lib/catalog-cache";

import type { Product } from "@/types/product";

async function getFeaturedFromCache() {
  const [
    cachedProducts,
    cachedDiscount,
  ] = await Promise.all([
    getCachedCatalogProducts(),
    getCachedCatalogDiscount(),
  ]);

  /*
   * Si falta cualquiera de los valores,
   * usamos MongoDB como fallback.
   */
  if (
    cachedProducts === null ||
    cachedDiscount === null
  ) {
    return null;
  }

  const products =
    cachedProducts
      .filter(
        (product) =>
          product.visible &&
          product.featured
      )
      .sort(
        (a, b) =>
          new Date(
            b.updatedAt
          ).getTime() -
          new Date(
            a.updatedAt
          ).getTime()
      )
      .slice(0, 8);

  const result =
    products.map((product) => {
      const effectiveMeliPrice =
        product.meliDiscountedPrice ??
        product.meliPrice;

      return {
        ...product,

        meliDiscountedPrice:
          effectiveMeliPrice,

        webPrice:
          calculateWebPrice(
            effectiveMeliPrice,
            cachedDiscount
          ),

        discountPercent:
          cachedDiscount,
      };
    });

  return {
    total:
      result.length,

    products:
      result,
  };
}

async function getFeaturedFromMongo() {
  return withDatabase(async (db) => {
    const [
      discountPercent,
      products,
    ] = await Promise.all([
      getMeliDiscountPercent(db),

      db
        .collection<Product>(
          "products"
        )
        .find({
          visible: true,
          featured: true,
        })
        .sort({
          updatedAt: -1,
        })
        .limit(8)
        .toArray(),
    ]);

    const result =
      products.map((product) => {
        const effectiveMeliPrice =
          product.meliDiscountedPrice ??
          product.meliPrice;

        return {
          ...product,

          meliDiscountedPrice:
            effectiveMeliPrice,

          webPrice:
            calculateWebPrice(
              effectiveMeliPrice,
              discountPercent
            ),

          discountPercent,
        };
      });

    return NextResponse.json({
      total:
        result.length,

      products:
        result,
    });
  });
}

export async function GET() {
  try {
    const cachedResult =
      await getFeaturedFromCache();

    if (cachedResult !== null) {
      console.log(
        `[FEATURED] Usando catálogo KV (${cachedResult.total} productos)`
      );

      return NextResponse.json(
        cachedResult
      );
    }

    console.log(
      "[FEATURED] KV no disponible. Usando MongoDB."
    );

    return await getFeaturedFromMongo();
  } catch (error) {
    console.error(
      "Featured products API error:",
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