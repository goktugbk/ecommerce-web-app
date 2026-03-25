// src/lib/prisma.ts
import { PrismaClient } from "@prisma/client";

// Global tanım: Hot-reload sırasında PrismaClient'i yeniden oluşturmamak için
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

// Development ortamında hot reload sırasında tekrar tekrar instance açılmasını önler
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
