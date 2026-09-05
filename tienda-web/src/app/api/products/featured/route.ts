import { NextResponse } from "next/server";

import { withDatabase } from "@/lib/db";
import { getMeliDiscountPercent } from "@/lib/settings";
import { calculateWebPrice } from "@/lib/pricing";
import type { Product } from "@/types/product";

export async function GET() {
  try {
    return await withDatabase(async (db) => {
      const [
        discountPercent,
        products,
      ] = await Promise.all([
        getMeliDiscountPercent(db),

        db
          .collection<Product>("products")
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