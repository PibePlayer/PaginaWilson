import type {
  AnyBulkWriteOperation,
  Collection,
  Db,
  UpdateFilter,
} from "mongodb";

import { withDatabase } from "@/lib/db";
import { mercadoLibreFetch } from "@/lib/mercadolibre";
import type {
  Product,
  ProductAttribute,
} from "@/types/product";
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

interface MercadoLibreAttribute {
  id: string;
  name: string;
  value_id?: string | null;
  value_name?: string | null;
  value_struct?: {
    number?: number;
    unit?: string;
  } | null;
  attribute_group_id?: string | null;
  attribute_group_name?: string | null;
}

interface MercadoLibreItem {
  id: string;
  title: string;
  currency_id: string;
  available_quantity: number;
  thumbnail: string;
  permalink: string;
  status: string;
  category_id: string;
  pictures: MercadoLibrePicture[];
  attributes?: MercadoLibreAttribute[];
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

interface MercadoLibreSalePrice {
  amount: number;
  regular_amount: number | null;
  currency_id: string;
}

interface MercadoLibreDescription {
  text?: string;
  plain_text?: string;
  last_updated?: string;
  date_created?: string;
}

export interface MercadoLibreSyncOptions {
  prices?: boolean;
  descriptions?: boolean;
  discounts?: boolean;

  images?: boolean;
  stock?: boolean;
  productInfo?: boolean;
  category?: boolean;
  attributes?: boolean;

  quick?: boolean;
  missingDescriptionsOnly?: boolean;
}

export interface MercadoLibreSyncResult {
  total: number;
  synced: number;
  newProducts: number;
  descriptionsFound: number;
  descriptionsMissing: number;
  deactivated: number;
  completedAt: string;
}

type ProductBulkOperation =
  AnyBulkWriteOperation<Product>;

const categoryCache = new Map<string, string>();

async function getMercadoLibreCategoryName(
  db: Db,
  categoryId: string
): Promise<string> {
  const cached =
    categoryCache.get(categoryId);

  if (cached) {
    return cached;
  }

  const categoriesCollection =
    db.collection<Category>("categories");

  const existingCategory =
    await categoriesCollection.findOne({
      categoryId,
    });

  if (existingCategory) {
    const name =
      existingCategory.meliName ||
      existingCategory.name;

    categoryCache.set(categoryId, name);

    return name;
  }

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
      .collection<MercadoLibreIntegration>(
        "integrations"
      )
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

async function getMercadoLibreSalePrice(
  db: Db,
  itemId: string
): Promise<MercadoLibreSalePrice> {
  return mercadoLibreFetch<MercadoLibreSalePrice>(
    `/items/${encodeURIComponent(
      itemId
    )}/sale_price?context=channel_marketplace`,
    undefined,
    db
  );
}

async function getMercadoLibreDescription(
  db: Db,
  itemId: string
): Promise<MercadoLibreDescription | null> {
  try {
    const description =
      await mercadoLibreFetch<MercadoLibreDescription>(
        `/items/${encodeURIComponent(
          itemId
        )}/description`,
        undefined,
        db
      );

    return description;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    /*
     * 404 = MercadoLibre no tiene descripción
     * para esta publicación.
     *
     * Nunca eliminamos la descripción existente
     * en MongoDB en este caso.
     */
    if (
      message.includes(
        "MercadoLibre API error 404"
      )
    ) {
      return null;
    }

    console.error(
      `MercadoLibre description fetch error: ${itemId}`,
      error
    );

    return null;
  }
}

function normalizeDescription(
  description:
    | MercadoLibreDescription
    | null
): string | null {
  if (!description) {
    return null;
  }

  /*
   * Normalmente ML devuelve plain_text.
   *
   * Como fallback utilizamos text.
   * Esto evita perder una descripción cuando
   * la API cambia el formato de respuesta.
   */
  const plainText =
    description.plain_text?.trim();

  if (plainText) {
    return plainText;
  }

  const text =
    description.text?.trim();

  if (text) {
    /*
     * Si viene HTML, hacemos una limpieza básica.
     */
    return text
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .trim();
  }

  return null;
}

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

async function getActiveMeliIds(
  db: Db,
  userId: number
): Promise<string[]> {
  const activeMeliIds: string[] = [];

  const searchLimit = 100;

  let offset = 0;
  let total = 0;

  do {
    const search =
      await mercadoLibreFetch<SearchResponse>(
        `/users/${userId}/items/search?status=active&limit=${searchLimit}&offset=${offset}`,
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

    offset += search.results.length;
  } while (offset < total);

  return activeMeliIds;
}

async function getMercadoLibreItems(
  db: Db,
  ids: string[]
): Promise<MercadoLibreItem[]> {
  const items: MercadoLibreItem[] = [];

  const itemBulkLimit = 20;

  for (
    const idChunk of chunk(
      ids,
      itemBulkLimit
    )
  ) {
    const multiGet =
      await mercadoLibreFetch<
        MercadoLibreMultiGetResult[]
      >(
        `/items/bulk?ids=${encodeURIComponent(
          idChunk.join(",")
        )}`,
        undefined,
        db
      );

    for (const result of multiGet) {
      if (
        result.status_code !== 200 ||
        !result.body
      ) {
        continue;
      }

      if (
        result.body.status !== "active"
      ) {
        continue;
      }

      items.push(result.body);
    }
  }

  return items;
}

function buildPictures(
  item: MercadoLibreItem
): string[] {
  return Array.from(
    new Set(
      item.pictures
        ?.map(
          (picture) =>
            picture.secure_url
        )
        .filter(Boolean) ?? []
    )
  ).slice(0, 8);
}

function buildAttributes(
  item: MercadoLibreItem
): ProductAttribute[] {
  return (
    item.attributes ?? []
  ).map((attribute) => ({
    id: attribute.id,
    name: attribute.name,
    value_id:
      attribute.value_id ?? null,
    value_name:
      attribute.value_name ?? null,
    value_struct:
      attribute.value_struct ?? null,
    attribute_group_id:
      attribute.attribute_group_id ??
      null,
    attribute_group_name:
      attribute.attribute_group_name ??
      null,
  }));
}

async function syncItem(
  db: Db,
  productsCollection: Collection<Product>,
  item: MercadoLibreItem,
  options: MercadoLibreSyncOptions
): Promise<{
  operation: ProductBulkOperation;
  descriptionFound: boolean;
  descriptionMissing: boolean;
}> {
  const existingProduct =
    await productsCollection.findOne({
      meliId: item.id,
    });

  const isNewProduct =
    !existingProduct;

  /*
   * Un producto nuevo necesita todos sus
   * datos para poder aparecer correctamente.
   *
   * quick también utiliza todos los datos,
   * pero solamente se ejecuta sobre productos
   * que todavía no existen.
   */
  const shouldSyncFullData =
    isNewProduct ||
    options.quick === true;

  const updateSet: Record<
    string,
    unknown
  > = {};

  let descriptionFound = false;
  let descriptionMissing = false;

  /*
   * =========================================================
   * PRECIOS / DESCUENTOS
   * =========================================================
   */
  if (
    shouldSyncFullData ||
    options.prices ||
    options.discounts
  ) {
    const salePrice =
      await getMercadoLibreSalePrice(
        db,
        item.id
      );

    const regularPrice =
      salePrice.regular_amount ??
      salePrice.amount;

    const discountedPrice =
      salePrice.amount;

    if (
      shouldSyncFullData ||
      options.prices
    ) {
      updateSet.meliPrice =
        regularPrice;

      updateSet.currencyId =
        salePrice.currency_id ??
        item.currency_id;
    }

    if (
      shouldSyncFullData ||
      options.discounts
    ) {
      updateSet.meliDiscountedPrice =
        discountedPrice;
    }
  }

  /*
   * =========================================================
   * DATOS AVANZADOS
   * =========================================================
   */

  /*
   * Imágenes
   */
  if (
    shouldSyncFullData ||
    options.images
  ) {
    const pictures =
      buildPictures(item);

    updateSet.thumbnail =
      pictures[0] ??
      item.thumbnail;

    updateSet.pictures =
      pictures;
  }

  /*
   * Stock
   */
  if (
    shouldSyncFullData ||
    options.stock
  ) {
    updateSet.availableQuantity =
      item.available_quantity;
  }

  /*
   * Título / enlace / estado
   */
  if (
    shouldSyncFullData ||
    options.productInfo
  ) {
    updateSet.title =
      item.title;

    updateSet.permalink =
      item.permalink;

    updateSet.status =
      item.status;
  }

  /*
   * Categoría
   */
  if (
    shouldSyncFullData ||
    options.category
  ) {
    const categoryName =
      await getMercadoLibreCategoryName(
        db,
        item.category_id
      );

    updateSet.categoryId =
      item.category_id;

    updateSet.categoryName =
      categoryName;
  }

  /*
   * Atributos
   */
  if (
    shouldSyncFullData ||
    options.attributes
  ) {
    updateSet.attributes =
      buildAttributes(item);
  }

  /*
   * En un producto nuevo siempre tiene que
   * quedar visible.
   *
   * En un producto existente NO modificamos
   * visible salvo que sea un nuevo producto.
   */
  if (shouldSyncFullData) {
    updateSet.meliId =
      item.id;

    updateSet.visible =
      true;
  }

  /*
   * =========================================================
   * DESCRIPCIÓN
   * =========================================================
   *
   * Nunca eliminamos una descripción existente
   * porque ML devuelva 404 o una respuesta vacía.
   */
  if (
    shouldSyncFullData ||
    options.descriptions ||
    options.missingDescriptionsOnly
  ) {
    const description =
      await getMercadoLibreDescription(
        db,
        item.id
      );

    const plainText =
      normalizeDescription(
        description
      );

    if (plainText) {
      updateSet.description =
        plainText;

      descriptionFound = true;
    } else {
      descriptionMissing = true;

      /*
       * DELIBERADAMENTE NO HACEMOS:
       *
       * updateSet.description = "";
       *
       * ni $unset.
       *
       * MongoDB conservará la descripción
       * existente.
       */
    }
  }

  /*
   * Solo actualizamos updatedAt si realmente
   * estamos procesando este producto.
   */
  updateSet.updatedAt =
    new Date();

  const update: UpdateFilter<Product> =
    {
      $set:
        updateSet as UpdateFilter<Product>["$set"],

      $setOnInsert: {
        featured: false,
      },
    };

  const operation:
    ProductBulkOperation = {
    updateOne: {
      filter: {
        meliId: item.id,
      },

      update,

      upsert: true,
    },
  };

  return {
    operation,
    descriptionFound,
    descriptionMissing,
  };
}

export async function getProductsWithoutDescription() {
  return withDatabase(async (db) => {
    return db
      .collection<Product>("products")
      .find({
        visible: true,

        $or: [
          {
            description: {
              $exists: false,
            },
          },
          {
            description: "",
          },
        ],
      })
      .project({
        meliId: 1,
      })
      .toArray();
  });
}

export async function getProductDescriptionStats() {
  return withDatabase(async (db) => {
    const collection =
      db.collection<Product>("products");

    const total =
      await collection.countDocuments({
        visible: true,
      });

    const withoutDescription =
      await collection.countDocuments({
        visible: true,

        $or: [
          {
            description: {
              $exists: false,
            },
          },
          {
            description: "",
          },
        ],
      });

    return {
      total,

      withDescription:
        total -
        withoutDescription,

      withoutDescription,
    };
  });
}

async function saveLastSync(
  db: Db,
  completedAt: Date
) {
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
}

export async function syncMercadoLibreProducts(
  options: MercadoLibreSyncOptions = {}
): Promise<MercadoLibreSyncResult> {
  return withDatabase(async (db) => {
    const integration =
      await getMercadoLibreIntegration(
        db
      );

    const productsCollection =
      db.collection<Product>(
        "products"
      );

    /*
     * =========================================================
     * SYNC RÁPIDO
     * =========================================================
     */
    if (options.quick) {
      const activeMeliIds =
        await getActiveMeliIds(
          db,
          integration.userId
        );

      const existingProducts =
        await productsCollection
          .find({
            meliId: {
              $in:
                activeMeliIds,
            },
          })
          .project({
            meliId: 1,
          })
          .toArray();

      const existingIds =
        new Set(
          existingProducts.map(
            (product) =>
              product.meliId
          )
        );

      const newIds =
        activeMeliIds.filter(
          (id) =>
            !existingIds.has(id)
        );

      let synced = 0;
      let descriptionsFound = 0;
      let descriptionsMissing = 0;

      for (
        const idChunk of chunk(
          newIds,
          5
        )
      ) {
        const items =
          await getMercadoLibreItems(
            db,
            idChunk
          );

        const operations:
          ProductBulkOperation[] =
          [];

        for (
          const item of items
        ) {
          const syncResult =
            await syncItem(
              db,
              productsCollection,
              item,
              {
                quick: true,
              }
            );

          operations.push(
            syncResult.operation
          );

          if (
            syncResult.descriptionFound
          ) {
            descriptionsFound++;
          }

          if (
            syncResult.descriptionMissing
          ) {
            descriptionsMissing++;
          }
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

      const completedAt =
        new Date();

      await saveLastSync(
        db,
        completedAt
      );

      return {
        total:
          activeMeliIds.length,

        synced,

        newProducts:
          newIds.length,

        descriptionsFound,

        descriptionsMissing,

        deactivated: 0,

        completedAt:
          completedAt.toISOString(),
      };
    }

    /*
     * =========================================================
     * SOLO DESCRIPCIONES FALTANTES
     * =========================================================
     */
    if (
      options.missingDescriptionsOnly
    ) {
      const products =
        await productsCollection
          .find({
            visible: true,

            $or: [
              {
                description: {
                  $exists: false,
                },
              },
              {
                description: "",
              },
            ],
          })
          .project({
            meliId: 1,
          })
          .toArray();

      const ids =
        products.map(
          (product) =>
            product.meliId
        );

      let synced = 0;
      let descriptionsFound = 0;
      let descriptionsMissing = 0;

      for (
        const idChunk of chunk(
          ids,
          5
        )
      ) {
        const items =
          await getMercadoLibreItems(
            db,
            idChunk
          );

        const operations:
          ProductBulkOperation[] =
          [];

        for (
          const item of items
        ) {
          const syncResult =
            await syncItem(
              db,
              productsCollection,
              item,
              {
                descriptions:
                  true,

                missingDescriptionsOnly:
                  true,
              }
            );

          operations.push(
            syncResult.operation
          );

          if (
            syncResult.descriptionFound
          ) {
            descriptionsFound++;
          }

          if (
            syncResult.descriptionMissing
          ) {
            descriptionsMissing++;
          }
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

      const completedAt =
        new Date();

      await saveLastSync(
        db,
        completedAt
      );

      return {
        total:
          ids.length,

        synced,

        newProducts: 0,

        descriptionsFound,

        descriptionsMissing,

        deactivated: 0,

        completedAt:
          completedAt.toISOString(),
      };
    }

    /*
     * =========================================================
     * SYNC NORMAL / SELECCIONADO
     * =========================================================
     */

    const activeMeliIds =
      await getActiveMeliIds(
        db,
        integration.userId
      );

    const existingProducts =
      await productsCollection
        .find({
          meliId: {
            $in:
              activeMeliIds,
          },
        })
        .project({
          meliId: 1,
        })
        .toArray();

    const existingIds =
      new Set(
        existingProducts.map(
          (product) =>
            product.meliId
        )
      );

    const newIds =
      activeMeliIds.filter(
        (id) =>
          !existingIds.has(id)
      );

    /*
     * Si seleccionamos algo, procesamos
     * todos los productos activos.
     *
     * Si no hay selección, solamente
     * incorporamos nuevos productos.
     */
    const hasSelectedSync =
      options.prices ||
      options.descriptions ||
      options.discounts ||
      options.images ||
      options.stock ||
      options.productInfo ||
      options.category ||
      options.attributes;

    const idsToProcess =
      hasSelectedSync
        ? activeMeliIds
        : newIds;

    let synced = 0;
    let descriptionsFound = 0;
    let descriptionsMissing = 0;

    const newIdSet =
      new Set(newIds);

    for (
      const idChunk of chunk(
        idsToProcess,
        5
      )
    ) {
      const items =
        await getMercadoLibreItems(
          db,
          idChunk
        );

      const operations:
        ProductBulkOperation[] =
        [];

      for (
        const item of items
      ) {
        const isNewProduct =
          newIdSet.has(
            item.id
          );

        const syncResult =
          await syncItem(
            db,
            productsCollection,
            item,
            {
              ...options,

              /*
               * Un producto nuevo recibe
               * automáticamente todos sus
               * datos estructurales.
               */
              quick:
                isNewProduct,
            }
          );

        operations.push(
          syncResult.operation
        );

        if (
          syncResult.descriptionFound
        ) {
          descriptionsFound++;
        }

        if (
          syncResult.descriptionMissing
        ) {
          descriptionsMissing++;
        }
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

    /*
     * Este modo es el único que desactiva
     * publicaciones que ya no están activas
     * en MercadoLibre.
     */
    const deactivateResult =
      await productsCollection.updateMany(
        {
          meliId: {
            $nin:
              activeMeliIds,
          },

          visible: true,
        },
        {
          $set: {
            visible: false,
            updatedAt:
              new Date(),
          },
        }
      );

    const completedAt =
      new Date();

    await saveLastSync(
      db,
      completedAt
    );

    return {
      total:
        activeMeliIds.length,

      synced,

      newProducts:
        newIds.length,

      descriptionsFound,

      descriptionsMissing,

      deactivated:
        deactivateResult.modifiedCount,

      completedAt:
        completedAt.toISOString(),
    };
  });
}