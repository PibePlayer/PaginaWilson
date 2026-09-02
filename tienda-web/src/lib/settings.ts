import type { Db } from "mongodb";

const DEFAULT_DISCOUNT_PERCENT = 10;

export async function getMeliDiscountPercent(
  db: Db
): Promise<number> {
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
