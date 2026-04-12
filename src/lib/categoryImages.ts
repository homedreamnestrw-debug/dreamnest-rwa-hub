import bedding from "@/assets/categories/bedding.jpg";
import pillows from "@/assets/categories/pillows.jpg";
import homeDecor from "@/assets/categories/home-decor.jpg";
import bathBody from "@/assets/categories/bath-body.jpg";
import bedroomEssentials from "@/assets/categories/bedroom-essentials.jpg";

export const categoryImages: Record<string, string> = {
  bedding,
  pillows,
  "home-decor": homeDecor,
  "bath-body": bathBody,
  "bedroom-essentials": bedroomEssentials,
};

export function getCategoryImage(slug: string, imageUrl?: string | null): string {
  return imageUrl || categoryImages[slug] || "";
}
