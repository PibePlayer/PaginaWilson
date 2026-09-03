import {
  NextRequest,
  NextResponse,
} from "next/server";

import { requireAdminApi } from "@/lib/require-admin-api";
import { withDatabase } from "@/lib/db";
import type { Product } from "@/types/product";

const MAX_FEATURED_PRODUCTS = 8;

export async function PATCH(
  request: NextRequest
) {
  const auth =
    await requireAdminApi(request);

  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const body = await request.json();

    const meliId =
      typeof body.meliId === "string"
        ? body.meliId.trim()
        : "";

    const featured =
      body.featured === true;

    if (!meliId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "El ID de producto es obligatorio.",
        },
        {
          status: 400,
        }
      );
    }

    await withDatabase(async (db) => {
      const products =
        db.collection<Product>("products");

      const product =
        await products.findOne({
          meliId,
        });

      if (!product) {
        throw new Error(
          "Producto no encontrado."
        );
      }

      if (
        featured &&
        !product.featured
      ) {
        const featuredCount =
          await products.countDocuments({
            visible: true,
            featured: true,
          });

        if (
          featuredCount >=
          MAX_FEATURED_PRODUCTS
        ) {
          throw new Error(
            `Solo podés tener ${MAX_FEATURED_PRODUCTS} productos destacados.`
          );
        }
      }

      await products.updateOne(
        {
          meliId,
        },
        {
          $set: {
            featured,
            updatedAt: new Date(),
          },
        }
      );
    });

    const response =
      NextResponse.json({
        success: true,
        meliId,
        featured,
      });

    await auth.refreshCookie(response);

    return response;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo actualizar el producto.";

    const status =
      message.includes("Solo podés")
        ? 409
        : message ===
          "Producto no encontrado."
        ? 404
        : 500;

    console.error(
      "Admin product PATCH error:",
      error
    );

    const response =
      NextResponse.json(
        {
          success: false,
          error: message,
        },
        {
          status,
        }
      );

    await auth.refreshCookie(response);

    return response;
  }
}