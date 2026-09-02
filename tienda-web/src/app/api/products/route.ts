import { NextRequest, NextResponse } from "next/server";
import { withDatabase } from "@/lib/db";
import { getMeliDiscountPercent } from "@/lib/settings";
import { calculateWebPrice } from "@/lib/pricing";
import type { Product } from "@/types/product";

const PAGE_SIZE = 12;

export async function GET(request: NextRequest) {
  try {
    return await withDatabase(async (db) => {
      const searchParams = request.nextUrl.searchParams;
      const page = Math.max(
        1,
        Number(searchParams.get("page")) || 1
      );
      const categoryId = searchParams.get("categoryId") || null;
      const skip = (page - 1) * PAGE_SIZE;
      const filter: {
        visible: boolean;
        categoryId?: string;
      } = {
        visible: true,
      };

      if (categoryId) {
        filter.categoryId = categoryId;
      }

      const productsCollection =
        db.collection<Product>("products");
      const [products, total, discountPercent] = await Promise.all([
        productsCollection
          .find(filter)
          .sort({
            title: 1,
          })
          .skip(skip)
          .limit(PAGE_SIZE)
          .toArray(),
        productsCollection.countDocuments(filter),
        getMeliDiscountPercent(db),
      ]);

      const formattedProducts = products.map((product) => ({
        meliId: product.meliId,
        title: product.title,
        meliPrice: product.meliPrice,
        currencyId: product.currencyId,
        availableQuantity: product.availableQuantity,
        thumbnail: product.thumbnail,
        permalink: product.permalink,
        status: product.status,
        visible: product.visible,
        featured: product.featured,
        categoryId: product.categoryId,
        updatedAt: product.updatedAt.toISOString(),
        webPrice: calculateWebPrice(
          product.meliPrice,
          discountPercent
        ),
        discountPercent,
      }));

      return NextResponse.json({
        products: formattedProducts,
        page,
        pageSize: PAGE_SIZE,
        total,
        hasMore: skip + formattedProducts.length < total,
      });
    });
  } catch (error) {
    console.error("Products API error:", error);

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
