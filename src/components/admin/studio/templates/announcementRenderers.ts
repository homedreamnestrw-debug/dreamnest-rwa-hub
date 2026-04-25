export type AnnouncementCategory = "business" | "seasonal" | "engagement";

export interface AnnouncementField {
  key: string;
  label: string;
  type: "text" | "textarea" | "date" | "number" | "rating";
  placeholder?: string;
  optional?: boolean;
}

export interface AnnouncementTemplate {
  key: string;
  category: AnnouncementCategory;
  title: string;
  emoji: string;
  defaultHeadline: string;
  defaultSubline?: string;
  accent: "terracotta" | "charcoal" | "forest" | "midnight" | "dustyRose" | "cream";
  badge?: string;
  fields: AnnouncementField[];
  buildHeadline?: (v: Record<string, string>) => string;
  buildSubline?: (v: Record<string, string>) => string;
  respectful?: boolean; // suppress promotion styling
}

export const ANNOUNCEMENT_TEMPLATES: AnnouncementTemplate[] = [
  // Business
  {
    key: "we_are_open",
    category: "business",
    title: "We Are Open",
    emoji: "🟢",
    defaultHeadline: "We're Open!",
    accent: "forest",
    badge: "OPEN",
    fields: [
      { key: "hours", label: "Opening hours", type: "text", placeholder: "Mon–Sat · 9 AM – 7 PM" },
      { key: "address", label: "Address", type: "text", placeholder: "KG 123 Street, Kigali" },
      { key: "phone", label: "Phone", type: "text", placeholder: "0788 742 122" },
    ],
    buildSubline: (v) =>
      [v.hours, v.address, v.phone].filter(Boolean).join("  ·  "),
  },
  {
    key: "closed_today",
    category: "business",
    title: "Closed Today",
    emoji: "🔒",
    defaultHeadline: "Closed Today",
    accent: "charcoal",
    badge: "CLOSED",
    fields: [
      { key: "date", label: "Date", type: "text", placeholder: "Friday, May 2" },
      { key: "reason", label: "Reason", type: "text", optional: true },
      { key: "reopen", label: "Reopens", type: "text", placeholder: "Monday at 9 AM" },
    ],
    buildHeadline: (v) => `Closed${v.date ? ` · ${v.date}` : ""}`,
    buildSubline: (v) =>
      [v.reason, v.reopen ? `Reopens ${v.reopen}` : ""].filter(Boolean).join("\n"),
  },
  {
    key: "new_arrival",
    category: "business",
    title: "New Arrival",
    emoji: "✨",
    defaultHeadline: "Just landed at DreamNest!",
    accent: "terracotta",
    badge: "NEW",
    fields: [{ key: "product", label: "Product name", type: "text" }],
    buildSubline: (v) => v.product ?? "",
  },
  {
    key: "restock_alert",
    category: "business",
    title: "Restock Alert",
    emoji: "🎉",
    defaultHeadline: "It's back!",
    accent: "forest",
    badge: "BACK IN STOCK",
    fields: [{ key: "product", label: "Product", type: "text" }],
    buildSubline: (v) =>
      `${v.product ?? ""}\nShop now at dreamnestrw.com`,
  },
  {
    key: "flash_sale",
    category: "business",
    title: "Flash Sale",
    emoji: "🔥",
    defaultHeadline: "FLASH SALE",
    accent: "terracotta",
    badge: "LIMITED",
    fields: [
      { key: "percent", label: "Discount %", type: "number", placeholder: "20" },
      { key: "duration", label: "Duration", type: "text", placeholder: "48 hours only" },
      { key: "scope", label: "What's on sale", type: "text", placeholder: "All bedding sets" },
    ],
    buildHeadline: (v) => `${v.percent ?? "20"}% OFF`,
    buildSubline: (v) =>
      [v.scope, v.duration].filter(Boolean).join("\n"),
  },
  {
    key: "promotion",
    category: "business",
    title: "Promotion",
    emoji: "🎁",
    defaultHeadline: "Special Offer",
    accent: "dustyRose",
    badge: "PROMO",
    fields: [
      { key: "details", label: "Details", type: "text", placeholder: "Buy 2, get 1 free" },
      { key: "validity", label: "Valid until", type: "text", placeholder: "May 31" },
      { key: "code", label: "Promo code", type: "text", optional: true },
    ],
    buildSubline: (v) =>
      [v.details, v.validity ? `Valid until ${v.validity}` : "", v.code ? `Code: ${v.code}` : ""]
        .filter(Boolean)
        .join("\n"),
  },
  {
    key: "free_delivery",
    category: "business",
    title: "Free Delivery",
    emoji: "🚚",
    defaultHeadline: "Free delivery in Kigali",
    accent: "forest",
    badge: "FREE SHIPPING",
    fields: [
      { key: "period", label: "Period", type: "text", placeholder: "All May long" },
      { key: "conditions", label: "Conditions", type: "text", optional: true },
    ],
    buildSubline: (v) =>
      [v.period, v.conditions].filter(Boolean).join("\n"),
  },
  {
    key: "milestone",
    category: "business",
    title: "Thank You Milestone",
    emoji: "🙏",
    defaultHeadline: "Thank you, Rwanda!",
    accent: "terracotta",
    fields: [
      { key: "milestone", label: "Milestone", type: "text", placeholder: "1,000 happy customers" },
    ],
    buildSubline: (v) => v.milestone ?? "",
  },
  // Seasonal & cultural
  {
    key: "memorial_day",
    category: "seasonal",
    title: "Genocide Memorial",
    emoji: "🕊️",
    defaultHeadline: "Kwibuka",
    defaultSubline:
      "We remember. We unite. We renew.\n\nNo promotions today out of respect.",
    accent: "charcoal",
    fields: [],
    respectful: true,
  },
  {
    key: "liberation_day",
    category: "seasonal",
    title: "Liberation Day",
    emoji: "🇷🇼",
    defaultHeadline: "Happy Liberation Day",
    defaultSubline: "Celebrating freedom and a renewed Rwanda.",
    accent: "forest",
    fields: [],
  },
  {
    key: "umuganura",
    category: "seasonal",
    title: "Umuganura Harvest",
    emoji: "🌾",
    defaultHeadline: "Happy Umuganura",
    defaultSubline: "A season of gratitude — bring its warmth into your home.",
    accent: "terracotta",
    fields: [],
  },
  {
    key: "christmas",
    category: "seasonal",
    title: "Christmas & New Year",
    emoji: "🎄",
    defaultHeadline: "Cozy holidays from DreamNest",
    defaultSubline: "Wrap your bedroom in festive comfort.",
    accent: "midnight",
    fields: [],
  },
  {
    key: "valentines",
    category: "seasonal",
    title: "Valentine's Day",
    emoji: "💝",
    defaultHeadline: "Gift comfort this Valentine's",
    defaultSubline: "The softest way to say I love you.",
    accent: "dustyRose",
    fields: [],
  },
  {
    key: "back_to_school",
    category: "seasonal",
    title: "Back to School",
    emoji: "🎒",
    defaultHeadline: "Back to school. Back to bed.",
    defaultSubline: "Set up the perfect study & sleep sanctuary.",
    accent: "terracotta",
    fields: [],
  },
  {
    key: "rainy_season",
    category: "seasonal",
    title: "Rainy Season",
    emoji: "🌧️",
    defaultHeadline: "Cozy season is here",
    defaultSubline: "Layer up — and hibernate in style.",
    accent: "midnight",
    fields: [],
  },
  // Engagement
  {
    key: "customer_spotlight",
    category: "engagement",
    title: "Customer Spotlight",
    emoji: "⭐",
    defaultHeadline: "Happy Customer",
    accent: "terracotta",
    badge: "SPOTLIGHT",
    fields: [
      { key: "name", label: "Customer first name", type: "text" },
      { key: "rating", label: "Stars (1–5)", type: "rating" },
    ],
    buildHeadline: (v) => `${v.name ?? "A friend"} loves DreamNest`,
    buildSubline: (v) => "★".repeat(Math.min(5, Math.max(1, Number(v.rating || 5)))),
  },
  {
    key: "testimonial",
    category: "engagement",
    title: "Testimonial",
    emoji: "💬",
    defaultHeadline: "“The softest sleep I've had in years.”",
    accent: "cream",
    fields: [
      { key: "quote", label: "Customer quote", type: "textarea" },
      { key: "name", label: "Customer first name", type: "text" },
    ],
    buildHeadline: (v) => (v.quote ? `“${v.quote}”` : "“Add a quote…”"),
    buildSubline: (v) => (v.name ? `— ${v.name}` : ""),
  },
  {
    key: "poll",
    category: "engagement",
    title: "Poll / Question",
    emoji: "🗳️",
    defaultHeadline: "Which do you prefer?",
    accent: "midnight",
    fields: [
      { key: "left", label: "Option A", type: "text" },
      { key: "right", label: "Option B", type: "text" },
    ],
    buildSubline: (v) => `${v.left ?? "Option A"}   vs   ${v.right ?? "Option B"}`,
  },
  {
    key: "behind_scenes",
    category: "engagement",
    title: "Behind the Scenes",
    emoji: "🎬",
    defaultHeadline: "Meet the team",
    defaultSubline: "Crafting your sanctuary, one detail at a time.",
    accent: "taupe" as any,
    fields: [{ key: "subline", label: "Subtitle", type: "text", optional: true }],
    buildSubline: (v) => v.subline || "Crafting your sanctuary, one detail at a time.",
  },
];
