import { z } from "zod";
import { COLLECTION_QUERY } from "./queries";
import { CollectionResponseSchema } from "./schemas";
import type { RawCollection } from "./types";

const ENDPOINT =
  process.env.NEXT_PUBLIC_STOREFRONT_ENDPOINT ?? "https://mock.shop/api";

export class StorefrontError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = "StorefrontError";
  }
}

function describeZodError(err: z.ZodError): string {
  return err.issues
    .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("; ");
}

export async function fetchCollection(
  handle: string,
  first = 24,
): Promise<RawCollection | null> {
  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: COLLECTION_QUERY,
        variables: { handle, first },
      }),
      cache: "no-store",
    });
  } catch (cause) {
    throw new StorefrontError("Storefront request failed (network)", cause);
  }

  if (!res.ok) {
    throw new StorefrontError(
      `Storefront request failed: ${res.status} ${res.statusText}`,
    );
  }

  const json = await res.json();

  const parsed = CollectionResponseSchema.safeParse(json);
  if (!parsed.success) {
    throw new StorefrontError(
      `Storefront response failed validation: ${describeZodError(parsed.error)}`,
    );
  }

  if (parsed.data.errors?.length) {
    throw new StorefrontError(
      `Storefront returned errors: ${parsed.data.errors.map((e) => e.message).join("; ")}`,
    );
  }

  return parsed.data.data.collection;
}
