import { cookies } from "next/headers";

const CART_COOKIE_NAME = "cartId";
const CART_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export async function readCartId(): Promise<string | null> {
  const store = await cookies();
  return store.get(CART_COOKIE_NAME)?.value ?? null;
}

export async function writeCartId(id: string): Promise<void> {
  const store = await cookies();
  store.set(CART_COOKIE_NAME, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: CART_COOKIE_MAX_AGE_SECONDS,
    path: "/",
  });
}

export async function clearCartId(): Promise<void> {
  const store = await cookies();
  store.delete(CART_COOKIE_NAME);
}
