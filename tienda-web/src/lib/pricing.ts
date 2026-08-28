export function calculateWebPrice(
  meliPrice: number,
  discountPercent: number
): number {
  const price = meliPrice * (1 - discountPercent / 100);

  return Math.round(price);
}