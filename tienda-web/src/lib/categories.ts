import { withDatabase } from "@/lib/db";
import { mercadoLibreFetch } from "@/lib/mercadolibre";

interface MercadoLibreCategory {
  id: string;
  name: string;
}

export async function getOrCreateCategory(
  categoryId: string
) {
  return withDatabase(async (db) => {
    const existing =
      await db.collection("categories").findOne({
        categoryId,
      });

    if (existing) {
      return existing;
    }

    const category =
      await mercadoLibreFetch<MercadoLibreCategory>(
        `/categories/${categoryId}`,
        undefined,
        db
      );

    const document = {
      categoryId: category.id,
      meliName: category.name,
      name: category.name,
      updatedAt: new Date(),
    };

    await db.collection("categories").insertOne(
      document
    );

    return document;
  });
}