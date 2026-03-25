// src/lib/order-status.ts
export const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: "Ödeme Bekliyor",
  PAID: "Ödendi",
  SHIPPED: "Kargolandı",
  DELIVERED: "Teslim Edildi",
  CANCELED: "İptal",
};

export function statusBadgeClasses(status: string) {
  switch (status) {
    case "PAID":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    case "SHIPPED":
      return "bg-blue-50 text-blue-700 ring-blue-200";
    case "DELIVERED":
      return "bg-indigo-50 text-indigo-700 ring-indigo-200";
    case "CANCELED":
      return "bg-rose-50 text-rose-700 ring-rose-200";
    default:
      return "bg-amber-50 text-amber-700 ring-amber-200";
  }
}
