/** Whole-number percentage off, e.g. 500 -> 400 is 20. Returns 0 when the price did not go down. */
export function discountPercent(from: number, to: number): number {
  if (from <= 0 || to >= from) return 0;
  return Math.round(((from - to) / from) * 100);
}

/** The "was" price and percentage for a listing, or null when it has no price drop. */
export function priceDrop(price: number, previousPrice?: number | null): { was: number; percent: number } | null {
  if (!previousPrice || previousPrice <= price) return null;
  const percent = discountPercent(previousPrice, price);
  return percent > 0 ? { was: previousPrice, percent } : null;
}
