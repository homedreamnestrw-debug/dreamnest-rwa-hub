import { describe, it, expect } from "vitest";
import { buildLedger } from "./inventoryLedger";

const item = (loc: string, qty: number) => ({ key: "p1", product_id: "p1", variant_id: null, location_id: loc, name: "Duvet", sku: "S", category_id: null, category: "Bed", cost: 1000, quantity: qty });
const mv = (loc: string, prev: number, next: number, at: string) => ({ product_id: "p1", variant_id: null, location_id: loc, movement_type: "adjustment", quantity: 0, previous_stock: prev, new_stock: next, created_at: at });

describe("inventory ledger", () => {
  const from = new Date("2026-10-01T00:00:00Z"), to = new Date("2026-10-31T23:59:59Z");
  it("opening + inward - outward = closing, excluding later movements", () => {
    const [r] = buildLedger([item("A", 12)], [mv("A", 5, 15, "2026-10-05T00:00:00Z"), mv("A", 15, 10, "2026-10-10T00:00:00Z"), mv("A", 10, 12, "2026-11-02T00:00:00Z")], from, to, null);
    expect(r).toMatchObject({ opening: 5, inward: 10, outward: 5, closing: 10 });
  });
  it("filters by location", () => {
    const rows = buildLedger([item("A", 4), item("B", 6)], [mv("B", 0, 6, "2026-10-05T00:00:00Z")], from, to, "A");
    expect(rows[0]).toMatchObject({ opening: 4, inward: 0, closing: 4 });
  });
});
