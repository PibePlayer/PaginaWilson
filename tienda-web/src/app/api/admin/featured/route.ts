import {
  NextRequest,
  NextResponse,
} from "next/server";

import { requireAdminApi } from "@/lib/require-admin-api";
import {
  getCachedCatalogProducts,
  getCachedCatalogDiscount,
  rebuildCatalogProducts,
} from "@/lib/catalog-cache";

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
    /*
     * IMPORTANTE:
     *
     * No consultamos MongoDB desde este endpoint.
     *
     * El catálogo administrativo necesita los mismos
     * productos visibles que ya tenemos almacenados en KV.
     *
     * La búsqueda y los filtros se realizan del lado
     * del cliente en AdminFeatured.
     */
    const [
      cachedProducts,
      cachedDiscount,
    ] = await Promise.all([
      getCachedCatalogProducts(),
      getCachedCatalogDiscount(),
    ]);

    /*
     * Si el cache todavía no existe, no hacemos fallback
     * automático a Mongo.
     *
     * Esto es intencional: este endpoint debe ser barato
     * en CPU y no queremos que una ausencia de KV vuelva
     * a disparar una consulta costosa a Mongo.
     */
    if (
      cachedProducts === null ||
      cachedDiscount === null
    ) {
      const response =
        NextResponse.json(
          {
            success: false,
            error:
              "El cache del catálogo no está disponible. Ejecutá una sincronización del catálogo.",
          },
          {
            status: 503,
          }
        );

      await auth.refreshCookie(
        response
      );

      return response;
    }

    /*
     * El cliente ya se encarga de:
     *
     * - búsqueda por título
     * - destacados
     * - no destacados
     * - descuentos particulares
     * - orden visual de destacados
     *
     * Por lo tanto enviamos todos los productos visibles.
     */
    const response =
      NextResponse.json({
        success: true,
        globalDiscountPercent:
          cachedDiscount,

        products:
          cachedProducts.map(
            (product: Product) => ({
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

              featured:
                product.featured,

              featuredOrder:
                product.featured
                  ? product.featuredOrder
                  : undefined,

              /*
               * IMPORTANTE:
               *
               * undefined significa que el producto
               * utiliza el descuento global.
               *
               * No convertirlo a 0.
               */
              discountPercent:
                product.discountPercent,
            })
          ),
      });

    await auth.refreshCookie(
      response
    );

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

    await auth.refreshCookie(
      response
    );

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

    /*
     * Este PATCH es un endpoint independiente del sistema
     * de ApplyChanges.
     *
     * Si alguien lo utiliza, primero actualizamos Mongo
     * y después reconstruimos el cache para que el catálogo
     * público y AdminFeatured queden sincronizados.
     */
    const { withDatabase } =
      await import("@/lib/db");

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

    /*
     * Mantener KV sincronizado.
     */
    await rebuildCatalogProducts();

    const response =
      NextResponse.json({
        success: true,
        meliId,
        featured,
      });

    await auth.refreshCookie(
      response
    );

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

    await auth.refreshCookie(
      response
    );

    return response;
  }
}