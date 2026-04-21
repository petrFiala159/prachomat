export const RECEIPT_CATEGORIES: Record<string, { label: string; emoji: string }> = {
  material:  { label: "Materiál",        emoji: "📦" },
  services:  { label: "Služby",          emoji: "🛠" },
  software:  { label: "Software / SaaS", emoji: "💻" },
  travel:    { label: "Cestovné",        emoji: "✈️" },
  fuel:      { label: "PHM",             emoji: "⛽" },
  meals:     { label: "Stravování",      emoji: "🍽" },
  office:    { label: "Kancelář",        emoji: "🏢" },
  phone:     { label: "Telefon / internet", emoji: "📱" },
  marketing: { label: "Marketing",       emoji: "📣" },
  other:     { label: "Ostatní",         emoji: "📄" },
};

export type ReceiptCategoryKey = keyof typeof RECEIPT_CATEGORIES;

export function getCategoryLabel(key: string): string {
  return RECEIPT_CATEGORIES[key]?.label ?? key;
}
