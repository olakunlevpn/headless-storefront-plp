import { z } from "zod";
import { StorefrontError } from "./client";
import {
  CartCreateResponseSchema,
  CartLinesAddResponseSchema,
  CartLinesRemoveResponseSchema,
  CartQueryResponseSchema,
} from "./schemas";
import type { CartVM, RawCart } from "./types";

export type { CartLineVM, CartVM } from "./types";

const ENDPOINT =
  process.env.NEXT_PUBLIC_STOREFRONT_ENDPOINT ?? "https://mock.shop/api";

const CART_FIELDS_FRAGMENT = /* GraphQL */ `
  fragment CartFields on Cart {
    id
    checkoutUrl
    totalQuantity
    cost {
      totalAmount {
        amount
        currencyCode
      }
    }
    lines(first: 50) {
      nodes {
        id
        quantity
        merchandise {
          ... on ProductVariant {
            id
            title
            image {
              url
              altText
            }
            price {
              amount
              currencyCode
            }
            product {
              title
              handle
            }
            selectedOptions {
              name
              value
            }
          }
        }
      }
    }
  }
`;

const CART_CREATE_MUTATION = /* GraphQL */ `
  ${CART_FIELDS_FRAGMENT}
  mutation CartCreate($lines: [CartLineInput!]!) {
    cartCreate(input: { lines: $lines }) {
      cart {
        ...CartFields
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const CART_LINES_ADD_MUTATION = /* GraphQL */ `
  ${CART_FIELDS_FRAGMENT}
  mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
    cartLinesAdd(cartId: $cartId, lines: $lines) {
      cart {
        ...CartFields
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const CART_GET_QUERY = /* GraphQL */ `
  ${CART_FIELDS_FRAGMENT}
  query CartGet($id: ID!) {
    cart(id: $id) {
      ...CartFields
    }
  }
`;

const CART_LINES_REMOVE_MUTATION = /* GraphQL */ `
  ${CART_FIELDS_FRAGMENT}
  mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
    cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
      cart {
        ...CartFields
      }
      userErrors {
        field
        message
      }
    }
  }
`;

function describeZodError(err: z.ZodError): string {
  return err.issues
    .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("; ");
}

function normalizeCart(raw: RawCart): CartVM {
  return {
    id: raw.id,
    checkoutUrl: raw.checkoutUrl,
    totalQuantity: raw.totalQuantity,
    totalAmount: {
      amount: Number.parseFloat(raw.cost.totalAmount.amount),
      currencyCode: raw.cost.totalAmount.currencyCode,
    },
    lines: raw.lines.nodes.map((node) => ({
      id: node.id,
      quantity: node.quantity,
      variantId: node.merchandise.id,
      variantTitle: node.merchandise.title,
      productTitle: node.merchandise.product.title,
      productHandle: node.merchandise.product.handle,
      imageUrl: node.merchandise.image?.url ?? null,
      imageAlt:
        node.merchandise.image?.altText ?? node.merchandise.product.title,
      unitPrice: {
        amount: Number.parseFloat(node.merchandise.price.amount),
        currencyCode: node.merchandise.price.currencyCode,
      },
    })),
  };
}

async function postGraphQL(
  query: string,
  variables: Record<string, unknown>,
): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables }),
      cache: "no-store",
    });
  } catch (cause) {
    throw new StorefrontError("Cart request failed (network)", cause);
  }
  if (!res.ok) {
    throw new StorefrontError(
      `Cart request failed: ${res.status} ${res.statusText}`,
    );
  }
  return res.json();
}

type CartMutationPayload = {
  cart: RawCart | null;
  userErrors: Array<{ message: string }>;
};

function unwrapCartMutation(
  payload: CartMutationPayload,
  operation: string,
): RawCart {
  if (payload.userErrors.length) {
    throw new StorefrontError(
      payload.userErrors.map((e) => e.message).join("; ") ||
        `${operation} user error`,
    );
  }
  if (!payload.cart) {
    throw new StorefrontError(`${operation} returned no cart`);
  }
  return payload.cart;
}

function failOnTopLevelGraphQLErrors(
  errors: Array<{ message: string }> | undefined,
): void {
  if (errors?.length) {
    throw new StorefrontError(errors.map((e) => e.message).join("; "));
  }
}

export async function cartCreate(
  variantId: string,
  quantity = 1,
): Promise<CartVM> {
  const raw = await postGraphQL(CART_CREATE_MUTATION, {
    lines: [{ quantity, merchandiseId: variantId }],
  });
  const parsed = CartCreateResponseSchema.safeParse(raw);
  if (!parsed.success) {
    throw new StorefrontError(
      `cartCreate failed validation: ${describeZodError(parsed.error)}`,
    );
  }
  failOnTopLevelGraphQLErrors(parsed.data.errors);
  const cart = unwrapCartMutation(parsed.data.data.cartCreate, "cartCreate");
  return normalizeCart(cart);
}

export async function cartLinesAdd(
  cartId: string,
  variantId: string,
  quantity = 1,
): Promise<CartVM> {
  const raw = await postGraphQL(CART_LINES_ADD_MUTATION, {
    cartId,
    lines: [{ quantity, merchandiseId: variantId }],
  });
  const parsed = CartLinesAddResponseSchema.safeParse(raw);
  if (!parsed.success) {
    throw new StorefrontError(
      `cartLinesAdd failed validation: ${describeZodError(parsed.error)}`,
    );
  }
  failOnTopLevelGraphQLErrors(parsed.data.errors);
  const cart = unwrapCartMutation(
    parsed.data.data.cartLinesAdd,
    "cartLinesAdd",
  );
  return normalizeCart(cart);
}

export async function cartGet(cartId: string): Promise<CartVM | null> {
  const raw = await postGraphQL(CART_GET_QUERY, { id: cartId });
  const parsed = CartQueryResponseSchema.safeParse(raw);
  if (!parsed.success) {
    throw new StorefrontError(
      `cartGet failed validation: ${describeZodError(parsed.error)}`,
    );
  }
  failOnTopLevelGraphQLErrors(parsed.data.errors);
  if (!parsed.data.data.cart) return null;
  return normalizeCart(parsed.data.data.cart);
}

export async function cartLinesRemove(
  cartId: string,
  lineIds: string[],
): Promise<CartVM> {
  const raw = await postGraphQL(CART_LINES_REMOVE_MUTATION, {
    cartId,
    lineIds,
  });
  const parsed = CartLinesRemoveResponseSchema.safeParse(raw);
  if (!parsed.success) {
    throw new StorefrontError(
      `cartLinesRemove failed validation: ${describeZodError(parsed.error)}`,
    );
  }
  failOnTopLevelGraphQLErrors(parsed.data.errors);
  const cart = unwrapCartMutation(
    parsed.data.data.cartLinesRemove,
    "cartLinesRemove",
  );
  return normalizeCart(cart);
}
