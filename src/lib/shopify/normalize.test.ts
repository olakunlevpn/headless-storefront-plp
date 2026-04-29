import { describe, expect, it } from "vitest";
import { productToCards, collectionToCards } from "./normalize";
import type { RawCollection, RawProduct, RawVariant } from "./types";

function makeVariant(overrides: Partial<RawVariant> & { id: string }): RawVariant {
  return {
    id: overrides.id,
    title: overrides.title ?? "Default Title",
    availableForSale: overrides.availableForSale ?? true,
    selectedOptions: overrides.selectedOptions ?? [
      { name: "Title", value: "Default Title" },
    ],
    price: overrides.price ?? { amount: "100.0", currencyCode: "CAD" },
    image: overrides.image ?? null,
  };
}

function makeProduct(overrides: Partial<RawProduct> & { handle: string }): RawProduct {
  return {
    id: overrides.id ?? `gid://shopify/Product/${overrides.handle}`,
    handle: overrides.handle,
    title: overrides.title ?? overrides.handle,
    featuredImage: overrides.featuredImage ?? null,
    options: overrides.options ?? [{ name: "Title", values: ["Default Title"] }],
    variants: overrides.variants ?? {
      nodes: [makeVariant({ id: "gid://shopify/ProductVariant/1" })],
    },
  };
}

describe("productToCards — single variant (Brief case 1)", () => {
  it("emits one card with no sizes and no color when product has only Default Title", () => {
    const product = makeProduct({
      handle: "black-sunnies",
      title: "Black Sunnies",
      options: [{ name: "Title", values: ["Default Title"] }],
      variants: {
        nodes: [
          makeVariant({
            id: "gid://shopify/ProductVariant/100",
            title: "Default Title",
            price: { amount: "50.0", currencyCode: "CAD" },
          }),
        ],
      },
    });

    const cards = productToCards(product);

    expect(cards).toHaveLength(1);
    const [card] = cards;
    expect(card.color).toBeNull();
    expect(card.sizes).toEqual([]);
    expect(card.isSingleVariant).toBe(true);
    expect(card.anyAvailable).toBe(true);
    expect(card.defaultVariantId).toBe("gid://shopify/ProductVariant/100");
    expect(card.fromPrice).toEqual({ amount: 50, currencyCode: "CAD" });
  });
});

describe("productToCards — fully sold-out (Brief case 2)", () => {
  it("flags the card as not available when every variant is unavailable", () => {
    const product = makeProduct({
      handle: "ghost-hoodie",
      title: "Ghost Hoodie",
      options: [
        { name: "Size", values: ["Small", "Medium", "Large"] },
        { name: "Color", values: ["Phantom"] },
      ],
      variants: {
        nodes: [
          makeVariant({
            id: "gid://shopify/ProductVariant/201",
            title: "Small / Phantom",
            availableForSale: false,
            selectedOptions: [
              { name: "Size", value: "Small" },
              { name: "Color", value: "Phantom" },
            ],
            price: { amount: "90.0", currencyCode: "CAD" },
          }),
          makeVariant({
            id: "gid://shopify/ProductVariant/202",
            title: "Medium / Phantom",
            availableForSale: false,
            selectedOptions: [
              { name: "Size", value: "Medium" },
              { name: "Color", value: "Phantom" },
            ],
            price: { amount: "90.0", currencyCode: "CAD" },
          }),
          makeVariant({
            id: "gid://shopify/ProductVariant/203",
            title: "Large / Phantom",
            availableForSale: false,
            selectedOptions: [
              { name: "Size", value: "Large" },
              { name: "Color", value: "Phantom" },
            ],
            price: { amount: "90.0", currencyCode: "CAD" },
          }),
        ],
      },
    });

    const cards = productToCards(product);

    expect(cards).toHaveLength(1);
    const [card] = cards;
    expect(card.anyAvailable).toBe(false);
    expect(card.color).toBe("Phantom");
    expect(card.sizes).toHaveLength(3);
    expect(card.sizes.every((s) => s.available === false)).toBe(true);
    expect(card.defaultVariantId).toBe("gid://shopify/ProductVariant/201");
  });
});

describe("productToCards — mixed availability (Brief case 3)", () => {
  it("preserves per-size availability flags", () => {
    const product = makeProduct({
      handle: "high-top-sneakers",
      title: "High Top Sneakers",
      options: [{ name: "Size", values: ["6", "7", "8", "9", "10"] }],
      variants: {
        nodes: [
          makeVariant({
            id: "gid://shopify/ProductVariant/300",
            title: "6",
            availableForSale: true,
            selectedOptions: [{ name: "Size", value: "6" }],
            price: { amount: "180.0", currencyCode: "CAD" },
          }),
          makeVariant({
            id: "gid://shopify/ProductVariant/301",
            title: "7",
            availableForSale: true,
            selectedOptions: [{ name: "Size", value: "7" }],
            price: { amount: "180.0", currencyCode: "CAD" },
          }),
          makeVariant({
            id: "gid://shopify/ProductVariant/302",
            title: "8",
            availableForSale: true,
            selectedOptions: [{ name: "Size", value: "8" }],
            price: { amount: "180.0", currencyCode: "CAD" },
          }),
          makeVariant({
            id: "gid://shopify/ProductVariant/303",
            title: "9",
            availableForSale: false,
            selectedOptions: [{ name: "Size", value: "9" }],
            price: { amount: "180.0", currencyCode: "CAD" },
          }),
          makeVariant({
            id: "gid://shopify/ProductVariant/304",
            title: "10",
            availableForSale: false,
            selectedOptions: [{ name: "Size", value: "10" }],
            price: { amount: "180.0", currencyCode: "CAD" },
          }),
        ],
      },
    });

    const cards = productToCards(product);

    expect(cards).toHaveLength(1);
    const [card] = cards;
    expect(card.anyAvailable).toBe(true);
    expect(card.color).toBeNull();
    expect(card.sizes.map((s) => [s.value, s.available])).toEqual([
      ["6", true],
      ["7", true],
      ["8", true],
      ["9", false],
      ["10", false],
    ]);
    expect(card.defaultVariantId).toBe("gid://shopify/ProductVariant/300");
  });

  it("picks first available variant as defaultVariantId, not first listed", () => {
    const product = makeProduct({
      handle: "partial-stock",
      title: "Partial Stock",
      options: [{ name: "Size", values: ["S", "M", "L"] }],
      variants: {
        nodes: [
          makeVariant({
            id: "gid://shopify/ProductVariant/400",
            availableForSale: false,
            selectedOptions: [{ name: "Size", value: "S" }],
          }),
          makeVariant({
            id: "gid://shopify/ProductVariant/401",
            availableForSale: true,
            selectedOptions: [{ name: "Size", value: "M" }],
          }),
          makeVariant({
            id: "gid://shopify/ProductVariant/402",
            availableForSale: false,
            selectedOptions: [{ name: "Size", value: "L" }],
          }),
        ],
      },
    });

    const [card] = productToCards(product);
    expect(card.defaultVariantId).toBe("gid://shopify/ProductVariant/401");
  });
});

describe("productToCards — multi-option color × size (Brief case 4)", () => {
  it("emits one card per color, with all sizes for that color inside", () => {
    const product = makeProduct({
      handle: "mens-crewneck",
      title: "Men's Crewneck",
      options: [
        { name: "Size", values: ["Small", "Medium", "Large"] },
        { name: "Color", values: ["Green", "Olive"] },
      ],
      variants: {
        nodes: [
          makeVariant({
            id: "gid://shopify/ProductVariant/500",
            title: "Small / Green",
            selectedOptions: [
              { name: "Size", value: "Small" },
              { name: "Color", value: "Green" },
            ],
            price: { amount: "120.0", currencyCode: "CAD" },
          }),
          makeVariant({
            id: "gid://shopify/ProductVariant/501",
            title: "Medium / Green",
            selectedOptions: [
              { name: "Size", value: "Medium" },
              { name: "Color", value: "Green" },
            ],
            price: { amount: "120.0", currencyCode: "CAD" },
          }),
          makeVariant({
            id: "gid://shopify/ProductVariant/502",
            title: "Large / Green",
            selectedOptions: [
              { name: "Size", value: "Large" },
              { name: "Color", value: "Green" },
            ],
            price: { amount: "120.0", currencyCode: "CAD" },
          }),
          makeVariant({
            id: "gid://shopify/ProductVariant/503",
            title: "Small / Olive",
            selectedOptions: [
              { name: "Size", value: "Small" },
              { name: "Color", value: "Olive" },
            ],
            price: { amount: "120.0", currencyCode: "CAD" },
          }),
          makeVariant({
            id: "gid://shopify/ProductVariant/504",
            title: "Medium / Olive",
            selectedOptions: [
              { name: "Size", value: "Medium" },
              { name: "Color", value: "Olive" },
            ],
            price: { amount: "120.0", currencyCode: "CAD" },
          }),
          makeVariant({
            id: "gid://shopify/ProductVariant/505",
            title: "Large / Olive",
            selectedOptions: [
              { name: "Size", value: "Large" },
              { name: "Color", value: "Olive" },
            ],
            price: { amount: "120.0", currencyCode: "CAD" },
          }),
        ],
      },
    });

    const cards = productToCards(product);

    expect(cards).toHaveLength(2);
    expect(cards.map((c) => c.color)).toEqual(["Green", "Olive"]);
    for (const card of cards) {
      expect(card.sizes.map((s) => s.value)).toEqual(["Small", "Medium", "Large"]);
      expect(card.isSingleVariant).toBe(false);
      expect(card.anyAvailable).toBe(true);
    }
  });

  it("preserves API-supplied color order", () => {
    const product = makeProduct({
      handle: "rainbow-tee",
      title: "Rainbow Tee",
      options: [
        { name: "Size", values: ["S"] },
        { name: "Color", values: ["Red", "Green", "Blue"] },
      ],
      variants: {
        nodes: [
          makeVariant({
            id: "gid://shopify/ProductVariant/600",
            selectedOptions: [
              { name: "Size", value: "S" },
              { name: "Color", value: "Blue" },
            ],
          }),
          makeVariant({
            id: "gid://shopify/ProductVariant/601",
            selectedOptions: [
              { name: "Size", value: "S" },
              { name: "Color", value: "Red" },
            ],
          }),
          makeVariant({
            id: "gid://shopify/ProductVariant/602",
            selectedOptions: [
              { name: "Size", value: "S" },
              { name: "Color", value: "Green" },
            ],
          }),
        ],
      },
    });

    const cards = productToCards(product);
    expect(cards.map((c) => c.color)).toEqual(["Red", "Green", "Blue"]);
  });
});

describe("productToCards — fromPrice", () => {
  it("uses minimum price across the color's variants", () => {
    const product = makeProduct({
      handle: "tiered",
      title: "Tiered",
      options: [{ name: "Size", values: ["S", "L"] }],
      variants: {
        nodes: [
          makeVariant({
            id: "gid://shopify/ProductVariant/700",
            selectedOptions: [{ name: "Size", value: "S" }],
            price: { amount: "150.0", currencyCode: "CAD" },
          }),
          makeVariant({
            id: "gid://shopify/ProductVariant/701",
            selectedOptions: [{ name: "Size", value: "L" }],
            price: { amount: "120.0", currencyCode: "CAD" },
          }),
        ],
      },
    });

    const [card] = productToCards(product);
    expect(card.fromPrice.amount).toBe(120);
  });
});

describe("productToCards — image fallback", () => {
  it("falls back to product.featuredImage when no variant has an image", () => {
    const product = makeProduct({
      handle: "no-variant-image",
      title: "No Variant Image",
      featuredImage: {
        url: "https://cdn.shopify.com/featured.jpg",
        altText: "Featured",
        width: 100,
        height: 100,
      },
      options: [{ name: "Color", values: ["Red"] }],
      variants: {
        nodes: [
          makeVariant({
            id: "gid://shopify/ProductVariant/800",
            selectedOptions: [{ name: "Color", value: "Red" }],
            image: null,
          }),
        ],
      },
    });

    const [card] = productToCards(product);
    expect(card.imageUrl).toBe("https://cdn.shopify.com/featured.jpg");
  });

  it("uses variant image when present", () => {
    const product = makeProduct({
      handle: "with-variant-image",
      title: "With Variant Image",
      featuredImage: {
        url: "https://cdn.shopify.com/featured.jpg",
        altText: "Featured",
        width: 100,
        height: 100,
      },
      options: [{ name: "Color", values: ["Red"] }],
      variants: {
        nodes: [
          makeVariant({
            id: "gid://shopify/ProductVariant/801",
            selectedOptions: [{ name: "Color", value: "Red" }],
            image: {
              url: "https://cdn.shopify.com/red.jpg",
              altText: "Red variant",
              width: 100,
              height: 100,
            },
          }),
        ],
      },
    });

    const [card] = productToCards(product);
    expect(card.imageUrl).toBe("https://cdn.shopify.com/red.jpg");
    expect(card.imageAlt).toBe("Red variant");
  });
});

describe("productToCards — empty variants", () => {
  it("returns no cards when product has no variants", () => {
    const product = makeProduct({
      handle: "empty",
      variants: { nodes: [] },
    });
    expect(productToCards(product)).toEqual([]);
  });
});

describe("collectionToCards", () => {
  it("flattens products to cards, preserving order", () => {
    const collection: RawCollection = {
      id: "gid://shopify/Collection/1",
      title: "Test",
      handle: "test",
      products: {
        nodes: [
          makeProduct({
            handle: "first",
            title: "First",
            options: [{ name: "Color", values: ["Red", "Blue"] }],
            variants: {
              nodes: [
                makeVariant({
                  id: "gid://shopify/ProductVariant/900",
                  selectedOptions: [{ name: "Color", value: "Red" }],
                }),
                makeVariant({
                  id: "gid://shopify/ProductVariant/901",
                  selectedOptions: [{ name: "Color", value: "Blue" }],
                }),
              ],
            },
          }),
          makeProduct({
            handle: "second",
            title: "Second",
            variants: {
              nodes: [makeVariant({ id: "gid://shopify/ProductVariant/902" })],
            },
          }),
        ],
      },
    };

    const cards = collectionToCards(collection);
    expect(cards.map((c) => c.id)).toEqual([
      "first::Red",
      "first::Blue",
      "second::default",
    ]);
  });
});
