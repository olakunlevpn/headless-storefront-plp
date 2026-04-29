import type {
  ColorCardVM,
  Money,
  RawCollection,
  RawProduct,
  RawVariant,
  SizeOption,
} from "./types";

const SIZE_OPTION_NAMES = new Set(["size"]);
const COLOR_OPTION_NAMES = new Set(["color", "colour"]);
const NO_COLOR_KEY = "default";

function normalizeOptionName(name: string): string {
  return name.trim().toLowerCase();
}

function getSelectedOptionValue(
  variant: RawVariant,
  optionNames: Set<string>,
): string | null {
  for (const opt of variant.selectedOptions) {
    if (optionNames.has(normalizeOptionName(opt.name))) return opt.value;
  }
  return null;
}

function toMoney(amount: string, currencyCode: string): Money {
  return { amount: Number.parseFloat(amount), currencyCode };
}

function getProductOptionValues(
  product: RawProduct,
  optionNames: Set<string>,
): string[] {
  const opt = product.options.find((o) =>
    optionNames.has(normalizeOptionName(o.name)),
  );
  return opt?.values ?? [];
}

export function productToCards(product: RawProduct): ColorCardVM[] {
  const variants = product.variants.nodes;
  if (variants.length === 0) return [];

  const sizeOrder = getProductOptionValues(product, SIZE_OPTION_NAMES);
  const colorOrder = getProductOptionValues(product, COLOR_OPTION_NAMES);

  const variantsByColor = new Map<string | null, RawVariant[]>();
  for (const variant of variants) {
    const color = getSelectedOptionValue(variant, COLOR_OPTION_NAMES);
    const list = variantsByColor.get(color);
    if (list) list.push(variant);
    else variantsByColor.set(color, [variant]);
  }

  const orderedColors: (string | null)[] = colorOrder.length
    ? colorOrder.filter((c) => variantsByColor.has(c))
    : [null];

  for (const color of variantsByColor.keys()) {
    if (!orderedColors.includes(color)) orderedColors.push(color);
  }

  const cards: ColorCardVM[] = [];

  for (const color of orderedColors) {
    const colorVariants = variantsByColor.get(color);
    if (!colorVariants || colorVariants.length === 0) continue;

    const sizes = buildSizes(colorVariants, sizeOrder);
    const anyAvailable = colorVariants.some((v) => v.availableForSale);

    const variantWithImage = colorVariants.find((v) => v.image);
    const image = variantWithImage?.image ?? product.featuredImage;

    const cheapestVariant = colorVariants.reduce((min, v) =>
      Number.parseFloat(v.price.amount) < Number.parseFloat(min.price.amount)
        ? v
        : min,
    );

    const defaultVariant =
      colorVariants.find((v) => v.availableForSale) ?? colorVariants[0];

    cards.push({
      id: `${product.handle}::${color ?? NO_COLOR_KEY}`,
      productHandle: product.handle,
      productTitle: product.title,
      color,
      imageUrl: image?.url ?? "",
      imageAlt:
        image?.altText ?? `${product.title}${color ? ` — ${color}` : ""}`,
      fromPrice: toMoney(
        cheapestVariant.price.amount,
        cheapestVariant.price.currencyCode,
      ),
      anyAvailable,
      sizes,
      isSingleVariant: variants.length === 1,
      defaultVariantId: defaultVariant.id,
    });
  }

  return cards;
}

function buildSizes(variants: RawVariant[], sizeOrder: string[]): SizeOption[] {
  if (sizeOrder.length === 0) return [];

  const variantBySize = new Map<string, RawVariant>();
  for (const variant of variants) {
    const size = getSelectedOptionValue(variant, SIZE_OPTION_NAMES);
    if (size && !variantBySize.has(size)) variantBySize.set(size, variant);
  }

  return sizeOrder
    .filter((s) => variantBySize.has(s))
    .map<SizeOption>((s) => {
      const variant = variantBySize.get(s)!;
      return {
        value: s,
        variantId: variant.id,
        available: variant.availableForSale,
        price: toMoney(variant.price.amount, variant.price.currencyCode),
      };
    });
}

export function collectionToCards(collection: RawCollection): ColorCardVM[] {
  return collection.products.nodes.flatMap(productToCards);
}
