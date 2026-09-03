import {
  NextRequest,
  NextResponse,
} from "next/server";

import { requireAdminApi } from "@/lib/require-admin-api";
import { withDatabase } from "@/lib/db";
import type { Product } from "@/types/product";

export async function GET(
  request: NextRequest
) {
  const auth =
    await requireAdminApi(request);

  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const products =
      await withDatabase(async (db) =>
        db
          .collection<Product>("products")
          .find({
            visible: true,
          })
          .sort({
            featured: -1,
            title: 1,
          })
          .toArray()
      );

    const featuredProducts =
      products
        .filter(
          (product) =>
            product.featured
        )
        .sort((a, b) => {
          const orderA =
            a.featuredOrder ??
            Number.MAX_SAFE_INTEGER;

          const orderB =
            b.featuredOrder ??
            Number.MAX_SAFE_INTEGER;

          if (orderA !== orderB) {
            return orderA - orderB;
          }

          return a.title.localeCompare(
            b.title,
            "es"
          );
        });

    const nonFeaturedProducts =
      products.filter(
        (product) =>
          !product.featured
      );

    /*
     * Los productos que todavía no tienen
     * featuredOrder reciben un orden temporal
     * basado en la posición actual.
     *
     * No escribimos en Mongo desde el GET.
     * Se persistirá al presionar "Aplicar cambios".
     */
    const normalizedFeatured =
      featuredProducts.map(
        (product, index) => ({
          ...product,
          featuredOrder:
            product.featuredOrder ??
            index,
        })
      );

    const orderedProducts = [
      ...normalizedFeatured,
      ...nonFeaturedProducts,
    ];

    const response =
      NextResponse.json({
        success: true,
        products:
          orderedProducts.map(
            (product) => ({
              meliId:
                product.meliId,
              title:
                product.title,
              meliPrice:
                product.meliPrice,
              currencyId:
                product.currencyId,
              availableQuantity:
                product.availableQuantity,
              thumbnail:
                product.thumbnail,
              featured:
                product.featured,
              featuredOrder:
                product.featured
                  ? product.featuredOrder
                  : undefined,
            })
          ),
      });

    await auth.refreshCookie(response);

    return response;
  } catch (error) {
    console.error(
      "Admin featured GET error:",
      error
    );

    const response =
      NextResponse.json(
        {
          success: false,
          error:
            "No se pudieron cargar los productos.",
        },
        {
          status: 500,
        }
      );

    await auth.refreshCookie(response);

    return response;
  }
}

export async function PATCH(
  request: NextRequest
) {
  const auth =
    await requireAdminApi(request);

  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const body =
      await request.json();

    const meliId =
      typeof body.meliId === "string"
        ? body.meliId.trim()
        : "";

    const featured =
      typeof body.featured === "boolean"
        ? body.featured
        : null;

    if (
      !meliId ||
      featured === null
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "El producto y el estado destacado son obligatorios.",
        },
        {
          status: 400,
        }
      );
    }

    const result =
      await withDatabase(async (db) =>
        db
          .collection<Product>("products")
          .updateOne(
            {
              meliId,
            },
            {
              $set: {
                featured,
                updatedAt:
                  new Date(),
              },
            }
          )
      );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "No se encontró el producto.",
        },
        {
          status: 404,
        }
      );
    }

    const response =
      NextResponse.json({
        success: true,
        meliId,
        featured,
      });

    await auth.refreshCookie(response);

    return response;
  } catch (error) {
    console.error(
      "Admin featured PATCH error:",
      error
    );

    const response =
      NextResponse.json(
        {
          success: false,
          error:
            "No se pudo actualizar el producto.",
        },
        {
          status: 500,
        }
      );

    await auth.refreshCookie(response);

    return response;
  }
}