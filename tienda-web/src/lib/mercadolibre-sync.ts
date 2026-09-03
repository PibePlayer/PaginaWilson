import type { Db } from "mongodb";
import { withDatabase } from "@/lib/db";
import { mercadoLibreFetch } from "@/lib/mercadolibre";
import type { Product } from "@/types/product";
import type { Category } from "@/types/category";

interface SearchResponse {
  seller_id: string;
  results: string[];
  paging: {
    limit: number;
    offset: number;
    total: number;
  };
}

interface MercadoLibrePicture {
  id: string;
  url: string;
  secure_url: string;
  size: string;
  max_size: string;
}

interface MercadoLibreItem {
  id: string;
  title: string;
  price: number;
  currency_id: string;
  available_quantity: number;
  thumbnail: string;
  permalink: string;
  status: string;
  category_id: string;
  pictures: MercadoLibrePicture[];
}

interface MercadoLibreMultiGetResult {
  id: string;
  status_code: number;
  body?: MercadoLibreItem;
}

interface MercadoLibreIntegration {
  userId: number;
}

interface MercadoLibreCategory {
  id: string;
  name: string;
}

const categoryCache = new Map<string, string>();

async function getMercadoLibreCategoryName(
  db: Db,
  categoryId: string
): Promise<string> {
  const cached = categoryCache.get(categoryId);

  if (cached) {
    return cached;
  }

  const categoriesCollection =
    db.collection<Category>("categories");

  // Primero buscamos nuestra categoría.
  const existingCategory =
    await categoriesCollection.findOne({
      categoryId,
    });

  if (existingCategory) {
    categoryCache.set(
      categoryId,
      existingCategory.name
    );

    return existingCategory.name;
  }

  // Si no existe, la obtenemos desde MercadoLibre.
  const category =
    await mercadoLibreFetch<MercadoLibreCategory>(
      `/categories/${categoryId}`,
      undefined,
      db
    );

  await categoriesCollection.updateOne(
    {
      categoryId,
    },
    {
      $set: {
        meliName: category.name,
        updatedAt: new Date(),
      },
      $setOnInsert: {
        name: category.name,
      },
    },
    {
      upsert: true,
    }
  );

  categoryCache.set(
    categoryId,
    category.name
  );

  return category.name;
}

async function getMercadoLibreIntegration(
  db: Db
): Promise<MercadoLibreIntegration> {
  const integration =
    await db
      .collection<MercadoLibreIntegration>("integrations")
      .findOne({
        provider: "mercadolibre",
      });

  if (!integration) {
    throw new Error(
      "MercadoLibre is not connected"
    );
  }

  return integration;
}

/**
 * Divide un array en grupos.
 */
function chunk<T>(
  array: T[],
  size: number
): T[][] {
  const chunks: T[][] = [];

  for (
    let i = 0;
    i < array.length;
    i += size
  ) {
    chunks.push(
      array.slice(i, i + size)
    );
  }

  return chunks;
}

export async function syncMercadoLibreProducts() {
  return withDatabase(async (db) => {
    const integration =
      await getMercadoLibreIntegration(db);

    const productsCollection =
      db.collection<Product>("products");

    const activeMeliIds: string[] = [];

    const searchLimit = 100;
    const itemBulkLimit = 20;

    let offset = 0;
    let total = 0;
    let synced = 0;

    do {
      const search =
        await mercadoLibreFetch<SearchResponse>(
          `/users/${integration.userId}/items/search?status=active&limit=${searchLimit}&offset=${offset}`,
          undefined,
          db
        );

      total = search.paging.total;

      if (search.results.length === 0) {
        break;
      }

      activeMeliIds.push(
        ...search.results
      );

      const idChunks = chunk(
        search.results,
        itemBulkLimit
      );

      for (const ids of idChunks) {
        const multiGet =
          await mercadoLibreFetch<
            MercadoLibreMultiGetResult[]
          >(
            `/items/bulk?ids=${encodeURIComponent(
              ids.join(",")
            )}`,
            undefined,
            db
          );

        const operations = [];

        for (const result of multiGet) {
          if (
            result.status_code !== 200 ||
            !result.body
          ) {
            continue;
          }

          const item = result.body;

          if (
            item.status !== "active"
          ) {
            continue;
          }

          const categoryName =
            await getMercadoLibreCategoryName(
              db,
              item.category_id
            );

          operations.push({
            updateOne: {
              filter: {
                meliId: item.id,
              },

              update: {
                $set: {
                  meliId: item.id,
                  title: item.title,
                  meliPrice: item.price,
                  currencyId:
                    item.currency_id,
                  availableQuantity:
                    item.available_quantity,

                  thumbnail:
                    item.pictures?.[0]
                      ?.secure_url ??
                    item.thumbnail,

                  permalink:
                    item.permalink,

                  status:
                    item.status,

                  visible: true,

                  categoryId:
                    item.category_id,

                  categoryName,

                  updatedAt:
                    new Date(),
                },

                $setOnInsert: {
                  featured: false,
                },
              },

              upsert: true,
            },
          });
        }

        if (
          operations.length > 0
        ) {
          await productsCollection.bulkWrite(
            operations
          );

          synced +=
            operations.length;
        }
      }

      offset +=
        search.results.length;
    } while (offset < total);

    const deactivateResult =
      await productsCollection.updateMany(
        {
          meliId: {
            $nin: activeMeliIds,
          },

          visible: true,
        },

        {
          $set: {
            visible: false,
            updatedAt: new Date(),
          },
        }
      );

    const completedAt =
      new Date();

    await db
      .collection("settings")
      .updateOne(
        {
          key: "store",
        },

        {
          $set: {
            lastSyncAt:
              completedAt,

            updatedAt:
              completedAt,
          },

          $setOnInsert: {
            key: "store",
          },
        },

        {
          upsert: true,
        }
      );

    return {
      total,
      synced,

      deactivated:
        deactivateResult.modifiedCount,

      completedAt:
        completedAt.toISOString(),
    };
  });
}