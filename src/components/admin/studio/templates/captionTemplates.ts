import { SITE_URL } from "./brandTokens";

export type CaptionType = "launch" | "sale" | "restock" | "general";

export interface CaptionInput {
  productName: string;
  price: number;
  originalPrice?: number;
  discountPct?: number;
  type: CaptionType;
}

const HASHTAGS =
  "#DreamNest #BedroomRwanda #HomeDecorKigali #PremiumBedding #KigaliHome #RwandaDecor";

const fmt = (n: number) => `RWF ${n.toLocaleString("en-US")}`;

export function generateCaption(input: CaptionInput): string {
  const { productName, price, originalPrice, discountPct, type } = input;

  switch (type) {
    case "launch":
      return `Introducing ${productName} ✨\nTransform your bedroom into a cozy sanctuary.\n${fmt(price)} — Shop now at ${SITE_URL} 🛒\n\n${HASHTAGS}`;
    case "sale": {
      const off = discountPct ?? 10;
      const orig = originalPrice ?? price;
      return `🔥 ${off}% OFF ${productName} — Today only!\n${fmt(orig)} → ${fmt(price)}\nLink in bio 👆\n\n${HASHTAGS} #DreamNestSale`;
    }
    case "restock":
      return `It's BACK! 🎉\n${productName} is back in stock. Don't miss it this time — ${SITE_URL}\n\n${HASHTAGS}`;
    case "general":
    default:
      return `Sweet dreams start with the perfect bedding ✨\n${productName} — ${fmt(price)}\n${SITE_URL}\n\n${HASHTAGS}`;
  }
}
