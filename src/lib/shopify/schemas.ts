import { z } from "zod";

export const SHOPIFY_GID_REGEX =
  /^gid:\/\/shopify\/[A-Za-z]+\/[A-Za-z0-9]+(\?.+)?$/;

export const ProductVariantGidSchema = z
  .string()
  .regex(SHOPIFY_GID_REGEX, "Invalid Shopify ProductVariant GID");

export const RawMoneySchema = z.object({
  amount: z.string(),
  currencyCode: z.string(),
});

export const RawImageSchema = z.object({
  url: z.string().url(),
  altText: z.string().nullable(),
  width: z.number().nullable(),
  height: z.number().nullable(),
});

export const RawSelectedOptionSchema = z.object({
  name: z.string(),
  value: z.string(),
});

export const RawProductOptionSchema = z.object({
  name: z.string(),
  values: z.array(z.string()),
});

export const RawVariantSchema = z.object({
  id: z.string(),
  title: z.string(),
  availableForSale: z.boolean(),
  selectedOptions: z.array(RawSelectedOptionSchema),
  price: RawMoneySchema,
  image: RawImageSchema.nullable(),
});

export const RawProductSchema = z.object({
  id: z.string(),
  handle: z.string(),
  title: z.string(),
  featuredImage: RawImageSchema.nullable(),
  options: z.array(RawProductOptionSchema),
  variants: z.object({
    nodes: z.array(RawVariantSchema),
  }),
});

export const RawCollectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  handle: z.string(),
  products: z.object({
    nodes: z.array(RawProductSchema),
  }),
});

const GraphQLErrorsSchema = z
  .array(z.object({ message: z.string() }))
  .optional();

export const CollectionResponseSchema = z.object({
  data: z.object({
    collection: RawCollectionSchema.nullable(),
  }),
  errors: GraphQLErrorsSchema,
});

const RawCartLineMerchandiseSchema = z.object({
  id: z.string(),
  title: z.string(),
  image: z
    .object({
      url: z.string().url(),
      altText: z.string().nullable(),
    })
    .nullable(),
  price: RawMoneySchema,
  product: z.object({
    title: z.string(),
    handle: z.string(),
  }),
});

const RawCartLineSchema = z.object({
  id: z.string(),
  quantity: z.number().int().nonnegative(),
  merchandise: RawCartLineMerchandiseSchema,
});

export const RawCartSchema = z.object({
  id: z.string(),
  checkoutUrl: z.string().url(),
  totalQuantity: z.number().int().nonnegative(),
  cost: z.object({
    totalAmount: RawMoneySchema,
  }),
  lines: z.object({
    nodes: z.array(RawCartLineSchema),
  }),
});

const UserErrorsSchema = z.array(
  z.object({
    field: z.array(z.string()).nullable().optional(),
    message: z.string(),
  }),
);

export const CartMutationPayloadSchema = z.object({
  cart: RawCartSchema.nullable(),
  userErrors: UserErrorsSchema,
});

export const CartCreateResponseSchema = z.object({
  data: z.object({
    cartCreate: CartMutationPayloadSchema,
  }),
  errors: GraphQLErrorsSchema,
});

export const CartLinesAddResponseSchema = z.object({
  data: z.object({
    cartLinesAdd: CartMutationPayloadSchema,
  }),
  errors: GraphQLErrorsSchema,
});

export const CartLinesRemoveResponseSchema = z.object({
  data: z.object({
    cartLinesRemove: CartMutationPayloadSchema,
  }),
  errors: GraphQLErrorsSchema,
});

export const CartQueryResponseSchema = z.object({
  data: z.object({
    cart: RawCartSchema.nullable(),
  }),
  errors: GraphQLErrorsSchema,
});

export const MoneySchema = z.object({
  amount: z.number(),
  currencyCode: z.string(),
});

export const SizeOptionSchema = z.object({
  value: z.string(),
  variantId: z.string(),
  available: z.boolean(),
  price: MoneySchema,
});

export const ColorCardVMSchema = z.object({
  id: z.string(),
  productHandle: z.string(),
  productTitle: z.string(),
  color: z.string().nullable(),
  imageUrl: z.string(),
  imageAlt: z.string(),
  fromPrice: MoneySchema,
  anyAvailable: z.boolean(),
  sizes: z.array(SizeOptionSchema),
  isSingleVariant: z.boolean(),
  defaultVariantId: z.string(),
});

export const CartLineVMSchema = z.object({
  id: z.string(),
  quantity: z.number().int().nonnegative(),
  variantId: z.string(),
  variantTitle: z.string(),
  productTitle: z.string(),
  productHandle: z.string(),
  imageUrl: z.string().nullable(),
  imageAlt: z.string(),
  unitPrice: MoneySchema,
});

export const CartVMSchema = z.object({
  id: z.string(),
  checkoutUrl: z.string().url(),
  totalQuantity: z.number().int().nonnegative(),
  totalAmount: MoneySchema,
  lines: z.array(CartLineVMSchema),
});
