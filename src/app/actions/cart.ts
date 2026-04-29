"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  cartCreate,
  cartGet,
  cartLinesAdd,
  cartLinesRemove,
} from "@/lib/shopify/cart";
import { ProductVariantGidSchema } from "@/lib/shopify/schemas";
import {
  clearCartId,
  readCartId,
  writeCartId,
} from "@/lib/cart-cookie";
import type { CartVM } from "@/lib/shopify/types";

export type CartActionResult =
  | { ok: true; cart: CartVM }
  | { ok: false; error: string };

const QuantitySchema = z.number().int().positive().max(99);

const AddToCartInputSchema = z.object({
  variantId: ProductVariantGidSchema,
  quantity: QuantitySchema.default(1),
});

const LineIdSchema = z.string().min(1, "Missing line id");

function describeZodError(err: z.ZodError): string {
  return err.issues
    .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("; ");
}

export async function addToCartAction(
  variantId: string,
  quantity = 1,
): Promise<CartActionResult> {
  const input = AddToCartInputSchema.safeParse({ variantId, quantity });
  if (!input.success) {
    return { ok: false, error: describeZodError(input.error) };
  }

  try {
    const existingCartId = await readCartId();

    if (existingCartId) {
      try {
        const cart = await cartLinesAdd(
          existingCartId,
          input.data.variantId,
          input.data.quantity,
        );
        revalidatePath("/");
        return { ok: true, cart };
      } catch {
        await clearCartId();
      }
    }

    const cart = await cartCreate(input.data.variantId, input.data.quantity);
    await writeCartId(cart.id);
    revalidatePath("/");
    return { ok: true, cart };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not add to cart.";
    return { ok: false, error: message };
  }
}

export async function removeFromCartAction(
  lineId: string,
): Promise<CartActionResult> {
  const parsed = LineIdSchema.safeParse(lineId);
  if (!parsed.success) {
    return { ok: false, error: describeZodError(parsed.error) };
  }

  try {
    const cartId = await readCartId();
    if (!cartId) return { ok: false, error: "No cart." };
    const cart = await cartLinesRemove(cartId, [parsed.data]);
    revalidatePath("/");
    return { ok: true, cart };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not remove line.";
    return { ok: false, error: message };
  }
}

export async function clearCartAction(): Promise<void> {
  await clearCartId();
  revalidatePath("/");
}

export async function getCurrentCart(): Promise<CartVM | null> {
  const cartId = await readCartId();
  if (!cartId) return null;
  try {
    return await cartGet(cartId);
  } catch {
    await clearCartId();
    return null;
  }
}
