import { getDatabase } from "@/lib/db";

const DEFAULT_DISCOUNT_PERCENT = 10;

export async function getMeliDiscountPercent(): Promise<number> {
  const db = await getDatabase();

  const settings = await db.collection("settings").findOne({
    key: "store",
  });

  if (!settings) {
    return DEFAULT_DISCOUNT_PERCENT;
  }

  const discount = Number(settings.meliDiscountPercent);

  if (!Number.isFinite(discount) || discount < 0 || discount > 100) {
    return DEFAULT_DISCOUNT_PERCENT;
  }

  return discount;
}