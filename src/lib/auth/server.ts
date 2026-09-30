import "server-only";
import { createNeonAuth } from "@neondatabase/auth/next/server";

export function getAuth() {
  const baseUrl = process.env.NEON_AUTH_BASE_URL;
  const cookieSecret = process.env.NEON_AUTH_COOKIE_SECRET;

  if (!baseUrl || !cookieSecret || cookieSecret.length < 32) {
    throw new Error("Neon Auth requiere NEON_AUTH_BASE_URL y un NEON_AUTH_COOKIE_SECRET de al menos 32 caracteres.");
  }

  return createNeonAuth({
    baseUrl,
    cookies: { secret: cookieSecret },
  });
}