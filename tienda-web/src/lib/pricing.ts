export function calculateWebPrice(
  meliDiscountedPrice: number,
  discountPercent: number
): number {
  const price =
    meliDiscountedPrice *
    (1 - discountPercent / 100);

  return Math.round(price);
}