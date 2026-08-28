import { getDatabase } from "@/lib/db";
import { mercadoLibreFetch } from "@/lib/mercadolibre";

interface MercadoLibreCategory {
  id: string;
  name: string;
  picture: string | null;
  path_from_root: {
    id: string;
    name: string;
  }[];
}

export async function getOrCreateCategory(categoryId: string) {
  const db = await getDatabase();

  const existing = await db.collection("categories").findOne({
    meliId: categoryId,
  });

  if (existing) {
    return existing;
  }

  const category =
    await mercadoLibreFetch<MercadoLibreCategory>(
      `/categories/${categoryId}`
    );

  const document = {
    meliId: category.id,
    name: category.name,
    picture: category.picture,
    pathFromRoot: category.path_from_root,
    updatedAt: new Date(),
  };

  await db.collection("categories").insertOne(document);

  return document;
}