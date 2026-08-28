import { getDatabase } from "@/lib/db";
import { mercadoLibreFetch } from "@/lib/mercadolibre";
import type { Product } from "@/types/product";

interface SearchResponse {
  seller_id: string;
  results: string[];
  paging: {
    limit: number;
    offset: number;
    total: number;
  };
}

interface MercadoLibreItem {
  id: string;
  title: string;
  price: number;
  currency_id: string;
  available_quantity: number;
  category_id: string;
  thumbnail: string;
  permalink: string;
  status: string;
}

interface MercadoLibreMultiGetResult {
  code: number;
  body?: MercadoLibreItem;
}

interface MercadoLibreIntegration {
  userId: number;
}

async function getMercadoLibreIntegration(): Promise<MercadoLibreIntegration> {
  const db = await getDatabase();

  const integration =
    await db.collection<MercadoLibreIntegration>("integrations").findOne({
      provider: "mercadolibre",
    });

  if (!integration) {
    throw new Error("MercadoLibre is not connected");
  }

  return integration;
}

/**
 * Divide un array en grupos.
 */
function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];

  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }

  return chunks;
}

export async function syncMercadoLibreProducts() {
  const integration = await getMercadoLibreIntegration();
  const db = await getDatabase();

  const productsCollection = db.collection<Product>("products");

  const activeMeliIds: string[] = [];

  const searchLimit = 100;
  let offset = 0;
  let total = 0;
  let synced = 0;

  do {
    const search = await mercadoLibreFetch<SearchResponse>(
      `/users/${integration.userId}/items/search?status=active&limit=${searchLimit}&offset=${offset}`
    );

    total = search.paging.total;

    if (search.results.length === 0) {
      break;
    }

    // Guardamos todos los IDs activos.
    activeMeliIds.push(...search.results);

    /*
     * MercadoLibre permite un máximo de 20 IDs por
     * llamada al endpoint Multiget.
     */
    const idChunks = chunk(search.results, 20);

    for (const ids of idChunks) {
      const multiGet = await mercadoLibreFetch<MercadoLibreMultiGetResult[]>(
        `/items?ids=${encodeURIComponent(ids.join(","))}`
      );

      const operations = multiGet
        .filter((result) => {
          return result.code === 200 && result.body;
        })
        .filter((result) => {
          return result.body?.status === "active";
        })
        .map((result) => {
          const item = result.body!;

          const product: Product = {
            meliId: item.id,
            title: item.title,
            meliPrice: item.price,
            currencyId: item.currency_id,
            availableQuantity: item.available_quantity,
            thumbnail: item.thumbnail,
            permalink: item.permalink,
            status: item.status,
            categoryId: item.category_id,
            visible: true,
            updatedAt: new Date(),
          };

          return {
            updateOne: {
              filter: {
                meliId: item.id,
              },
              update: {
                $set: product,
              },
              upsert: true,
            },
          };
        });

      if (operations.length > 0) {
        await productsCollection.bulkWrite(operations);
        synced += operations.length;
      }
    }

    offset += search.results.length;
  } while (offset < total);

  /*
   * Todo producto que tengamos en MongoDB pero que ya no
   * esté entre las publicaciones activas de MercadoLibre
   * deja de estar visible.
   */
  const deactivateResult = await productsCollection.updateMany(
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

  return {
    total,
    synced,
    deactivated: deactivateResult.modifiedCount,
  };
}