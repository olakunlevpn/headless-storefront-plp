import { Suspense } from "react";
import { ProductCard } from "@/components/ProductCard";
import { fetchCollection } from "@/lib/shopify/client";
import { collectionToCards } from "@/lib/shopify/normalize";

const COLLECTION_HANDLE = process.env.PLP_COLLECTION_HANDLE ?? "featured";
const PRIORITY_CARD_COUNT = 3;

export const dynamic = "force-dynamic";

export default function PLPPage() {
  return (
    <div className="bg-white">
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 sm:py-24 lg:max-w-7xl lg:px-8">
        <header className="mb-10 flex flex-col gap-1">
          <p className="text-xs uppercase tracking-wider text-gray-500">
            Collection
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
            Featured
          </h1>
          <p className="mt-1 max-w-xl text-sm text-gray-500">
            Soft-toy storefront sample. One card per color, with per-size
            availability shown inside the card.
          </p>
        </header>

        <h2 className="sr-only">Products</h2>

        <Suspense fallback={<ProductGridSkeleton />}>
          <ProductGrid handle={COLLECTION_HANDLE} />
        </Suspense>
      </div>
    </div>
  );
}

async function ProductGrid({ handle }: { handle: string }) {
  const collection = await fetchCollection(handle);

  if (!collection) {
    return (
      <p className="rounded-md border border-gray-200 bg-gray-50 p-6 text-sm text-gray-700">
        Collection <code className="font-mono">{handle}</code> not found on
        mock.shop. Set <code className="font-mono">PLP_COLLECTION_HANDLE</code>{" "}
        to one of: men, women, unisex, tops, bottoms, accessories, featured,
        shoes.
      </p>
    );
  }

  const cards = collectionToCards(collection);

  if (cards.length === 0) {
    return (
      <p className="rounded-md border border-gray-200 bg-gray-50 p-6 text-sm text-gray-700">
        No products in <strong>{collection.title}</strong>.
      </p>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-y-4 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-10 lg:grid-cols-3 lg:gap-x-8">
      {cards.map((card, index) => (
        <li key={card.id} className="flex h-full">
          <ProductCard card={card} priority={index < PRIORITY_CARD_COUNT} />
        </li>
      ))}
    </ul>
  );
}

function ProductGridSkeleton() {
  return (
    <ul className="grid grid-cols-1 gap-y-4 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-10 lg:grid-cols-3 lg:gap-x-8">
      {Array.from({ length: 6 }).map((_, i) => (
        <li key={i} className="flex">
          <div className="flex w-full flex-col overflow-hidden rounded-lg border border-gray-200 bg-white">
            <div className="aspect-[3/4] w-full animate-pulse bg-gray-100" />
            <div className="flex flex-col gap-2 p-4">
              <div className="h-4 w-2/3 animate-pulse rounded bg-gray-100" />
              <div className="h-3 w-1/3 animate-pulse rounded bg-gray-100" />
              <div className="h-4 w-1/4 animate-pulse rounded bg-gray-100" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
