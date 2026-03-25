// src/lib/auth.ts
import "server-only";

export type { SessionUser } from "./auth-server";

export {
  getSessionUser,
  requireUser,
  setSessionCookie,
  clearSessionCookie,
  getSession, // legacy alias
} from "./auth-server";
