export interface StockItem {
  key: string; product_id: string; variant_id: string | null; location_id: string;
  name: string; sku: string | null; category_id: string | null; category: string;
  cost: number; quantity: number;
}
export interface Movement {
  product_id: string | null; variant_id: string | null; location_id: string | null;
  movement_type: string; quantity: number; previous_stock: number; new_stock: number; created_at: string;
}
export interface LedgerRow {
  key: string; name: string; sku: string | null; category_id: string | null; category: string;
  cost: number; opening: number; inward: number; outward: number; closing: number;
}

/** Signed change in stock caused by a movement. */
export function movementDelta(m: Movement): number {
  const d = (m.new_stock ?? 0) - (m.previous_stock ?? 0);
  if (d !== 0) return d;
  const q = Math.abs(m.quantity || 0);
  return m.movement_type === "sale" ? -q : m.movement_type === "restock" || m.movement_type === "return" ? q : m.quantity || 0;
}

/**
 * Closing = current stock − net movements after `to`.
 * Opening = closing − net movements inside [from, to].
 */
export function buildLedger(items: StockItem[], movements: Movement[], from: Date, to: Date, locationId: string | null): LedgerRow[] {
  const map = new Map<string, LedgerRow & { current: number }>();
  for (const it of items) {
    if (locationId && it.location_id !== locationId) continue;
    const r = map.get(it.key);
    if (r) r.current += it.quantity;
    else map.set(it.key, { key: it.key, name: it.name, sku: it.sku, category_id: it.category_id, category: it.category, cost: it.cost, current: it.quantity, opening: 0, inward: 0, outward: 0, closing: 0 });
  }
  const after = new Map<string, number>();
  const fromT = from.getTime(), toT = to.getTime();
  for (const m of movements) {
    if (locationId && m.location_id !== locationId) continue;
    const key = m.variant_id ?? m.product_id;
    if (!key || !map.has(key)) continue;
    const t = new Date(m.created_at).getTime();
    const d = movementDelta(m);
    if (t > toT) after.set(key, (after.get(key) || 0) + d);
    else if (t >= fromT) {
      const r = map.get(key)!;
      if (d > 0) r.inward += d; else r.outward += -d;
    }
  }
  return [...map.values()].map(({ current, ...r }) => {
    const closing = current - (after.get(r.key) || 0);
    return { ...r, closing, opening: closing - r.inward + r.outward };
  });
}
