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

  if (
    !Number.isFinite(discount) ||
    discount < 0 ||
    discount > 100
  ) {
    return DEFAULT_DISCOUNT_PERCENT;
  }

  return discount;
}

export async function setMeliDiscountPercent(
  db: Db,
  discountPercent: number
): Promise<void> {
  if (
    !Number.isFinite(discountPercent) ||
    discountPercent < 0 ||
    discountPercent > 100
  ) {
    throw new Error(
      "El descuento debe estar entre 0 y 100."
    );
  }

  await db.collection("settings").updateOne(
    {
      key: "store",
    },
    {
      $set: {
        meliDiscountPercent: discountPercent,
        updatedAt: new Date(),
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