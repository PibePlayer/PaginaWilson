import {
  NextRequest,
  NextResponse,
} from "next/server";

import { requireAdminApi } from "@/lib/require-admin-api";
import { withDatabase } from "@/lib/db";
import type { Product } from "@/types/product";

interface CategoryChange {
  categoryId: string;
  name: string;
}

interface FeaturedChange {
  meliId: string;
  featured: boolean;
}

interface ApplyChangesBody {
  discountPercent?: number;
  categories?: CategoryChange[];
  featured?: FeaturedChange[];
  featuredOrder?: string[];
}

export async function POST(
  request: NextRequest
) {
  const auth =
    await requireAdminApi(request);

  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const body =
      (await request.json()) as ApplyChangesBody;

    if (
      body.discountPercent !==
        undefined &&
      (!Number.isFinite(
        body.discountPercent
      ) ||
        body.discountPercent < 0 ||
        body.discountPercent > 100)
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "El descuento debe estar entre 0 y 100.",
        },
        {
          status: 400,
        }
      );
    }

    const categories =
      Array.isArray(
        body.categories
      )
        ? body.categories
        : [];

    const featured =
      Array.isArray(
        body.featured
      )
        ? body.featured
        : [];

    const hasFeaturedOrder =
      Array.isArray(
        body.featuredOrder
      );

    const featuredOrder =
      hasFeaturedOrder
        ? body.featuredOrder!
        : [];

    for (const category of categories) {
      if (
        typeof category.categoryId !==
          "string" ||
        typeof category.name !==
          "string" ||
        !category.categoryId.trim() ||
        !category.name.trim()
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Hay una categoría inválida.",
          },
          {
            status: 400,
          }
        );
      }

      if (
        category.name.trim()
          .length > 100
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "El nombre de una categoría es demasiado largo.",
          },
          {
            status: 400,
          }
        );
      }
    }

    for (const product of featured) {
      if (
        typeof product.meliId !==
          "string" ||
        typeof product.featured !==
          "boolean" ||
        !product.meliId.trim()
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Hay un cambio de destacado inválido.",
          },
          {
            status: 400,
          }
        );
      }
    }

    if (hasFeaturedOrder) {
      if (
        featuredOrder.some(
          (meliId) =>
            typeof meliId !==
              "string" ||
            !meliId.trim()
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Hay un orden de destacados inválido.",
          },
          {
            status: 400,
          }
        );
      }

      const uniqueIds =
        new Set(
          featuredOrder
        );

      if (
        uniqueIds.size !==
        featuredOrder.length
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Hay productos repetidos en el orden de destacados.",
          },
          {
            status: 400,
          }
        );
      }
    }

    await withDatabase(
      async (db) => {
        if (
          body.discountPercent !==
          undefined
        ) {
          await db
            .collection("settings")
            .updateOne(
              {
                key: "store",
              },
              {
                $set: {
                  discountPercent:
                    body.discountPercent,
                  updatedAt:
                    new Date(),
                },
              },
              {
                upsert: true,
              }
            );
        }

        if (
          categories.length > 0
        ) {
          await db
            .collection("categories")
            .bulkWrite(
              categories.map(
                (category) => ({
                  updateOne: {
                    filter: {
                      categoryId:
                        category.categoryId.trim(),
                    },
                    update: {
                      $set: {
                        name:
                          category.name.trim(),
                        updatedAt:
                          new Date(),
                      },
                    },
                  },
                })
              )
            );
        }

        if (
          featured.length > 0
        ) {
          await db
            .collection<Product>("products")
            .bulkWrite(
              featured.map(
                (product) => ({
                  updateOne: {
                    filter: {
                      meliId:
                        product.meliId.trim(),
                    },
                    update: {
                      $set: {
                        featured:
                          product.featured,
                        updatedAt:
                          new Date(),
                      },
                    },
                  },
                })
              )
            );
        }

        if (hasFeaturedOrder) {
          const currentProducts =
            await db
              .collection<Product>(
                "products"
              )
              .find({
                visible: true,
              })
              .project({
                meliId: 1,
                featured: 1,
              })
              .toArray();

          const changedFeatured =
            new Map(
              featured.map(
                (item) => [
                  item.meliId.trim(),
                  item.featured,
                ]
              )
            );

          const finalFeaturedIds =
            currentProducts
              .filter((product) => {
                const changed =
                  changedFeatured.get(
                    product.meliId
                  );

                return changed !==
                  undefined
                  ? changed
                  : product.featured;
              })
              .map(
                (product) =>
                  product.meliId
              );

          const finalFeaturedSet =
            new Set(
              finalFeaturedIds
            );

          const orderSet =
            new Set(
              featuredOrder
            );

          if (
            finalFeaturedSet.size !==
              orderSet.size ||
            finalFeaturedIds.some(
              (meliId) =>
                !orderSet.has(
                  meliId
                )
            )
          ) {
            throw new Error(
              "El orden de destacados no coincide con los productos destacados."
            );
          }

          const orderUpdates =
            featuredOrder.map(
              (
                meliId,
                index
              ) => ({
                updateOne: {
                  filter: {
                    meliId,
                  },
                  update: {
                    $set: {
                      featuredOrder:
                        index,
                    },
                  },
                },
              })
            );

          if (
            orderUpdates.length > 0
          ) {
            await db
              .collection<Product>(
                "products"
              )
              .bulkWrite(
                orderUpdates
              );
          }

          const deactivatedIds =
            featured
              .filter(
                (item) =>
                  !item.featured
              )
              .map(
                (item) =>
                  item.meliId.trim()
              );

          if (
            deactivatedIds.length > 0
          ) {
            await db
              .collection<Product>(
                "products"
              )
              .updateMany(
                {
                  meliId: {
                    $in:
                      deactivatedIds,
                  },
                },
                {
                  $unset: {
                    featuredOrder: "",
                  },
                }
              );
          }
        }
      }
    );

    const response =
      NextResponse.json({
        success: true,
      });

    await auth.refreshCookie(
      response
    );

    return response;
  } catch (error) {
    console.error(
      "Admin apply changes error:",
      error
    );

    const response =
      NextResponse.json(
        {
          success: false,
          error:
            error instanceof Error &&
            error.message ===
              "El orden de destacados no coincide con los productos destacados."
              ? error.message
              : "No se pudieron aplicar los cambios.",
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