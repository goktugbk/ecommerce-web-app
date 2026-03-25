// Ortak tip: runtime export YOK, sadece type (derlemede silinir)
export type SessionUser = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: "ADMIN" | "CUSTOMER";
} | null;
