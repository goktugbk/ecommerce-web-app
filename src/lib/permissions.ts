export type Permission =
  | "product.read" | "product.create" | "product.update" | "product.delete"
  | "user.read"    | "order.read"     | "order.update";

const ROLE_PERMS: Record<"ADMIN"|"CUSTOMER", Permission[]> = {
  ADMIN: ["product.read","product.create","product.update","product.delete","user.read","order.read","order.update"],
  CUSTOMER: [],
};

export function can(role: "ADMIN"|"CUSTOMER", p: Permission) {
  return ROLE_PERMS[role]?.includes(p) ?? false;
}