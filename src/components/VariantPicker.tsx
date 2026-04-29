"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { addToCartAction } from "@/app/actions/cart";
import type { ColorCardVM } from "@/lib/shopify/types";

type Props = {
  card: ColorCardVM;
};

export function VariantPicker({ card }: Props) {
  const hasSizes = card.sizes.length > 0;
  const initialSize = hasSizes
    ? (card.sizes.find((s) => s.available) ?? card.sizes[0])
    : null;

  const [selectedVariantId, setSelectedVariantId] = useState<string>(
    initialSize?.variantId ?? card.defaultVariantId,
  );
  const [isAdding, startAdding] = useTransition();

  const selectedSize = hasSizes
    ? card.sizes.find((s) => s.variantId === selectedVariantId)
    : null;

  const canAddToBag = hasSizes
    ? Boolean(selectedSize?.available)
    : card.anyAvailable;

  function handleAddToBag() {
    if (!canAddToBag || isAdding) return;
    startAdding(async () => {
      const result = await addToCartAction(selectedVariantId);
      if (result.ok) {
        const sizeLabel = selectedSize ? ` (${selectedSize.value})` : "";
        const colorLabel = card.color ? ` in ${card.color}` : "";
        toast.success(`Added ${card.productTitle}${colorLabel}${sizeLabel}`, {
          description: `Bag now has ${result.cart.totalQuantity} item${result.cart.totalQuantity === 1 ? "" : "s"}.`,
        });
      } else {
        toast.error("Could not add to bag", {
          description: result.error,
        });
      }
    });
  }

  const buttonLabel = isAdding
    ? "Adding…"
    : !card.anyAvailable
      ? "Sold out"
      : hasSizes && !selectedSize?.available
        ? "Select a size"
        : "Add to bag";

  return (
    <div className="mt-3 flex flex-col gap-3">
      {hasSizes && (
        <div role="radiogroup" aria-label={`Sizes for ${card.productTitle}`}>
          <ul className="flex flex-wrap gap-1.5">
            {card.sizes.map((size) => {
              const isSelected = size.variantId === selectedVariantId;
              const stateClasses = !size.available
                ? "cursor-not-allowed border-dashed border-gray-300 bg-gray-50 text-gray-400 line-through"
                : isSelected
                  ? "cursor-pointer border-gray-900 bg-gray-900 text-white"
                  : "cursor-pointer border-gray-300 bg-white text-gray-800 hover:border-gray-900";
              return (
                <li key={size.variantId}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    aria-disabled={!size.available}
                    disabled={!size.available}
                    title={
                      size.available
                        ? `${size.value} — in stock`
                        : `${size.value} — sold out`
                    }
                    onClick={() => {
                      if (size.available) setSelectedVariantId(size.variantId);
                    }}
                    className={`inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-2.5 text-xs font-medium transition-colors ${stateClasses}`}
                  >
                    {size.value}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <button
        type="button"
        disabled={!canAddToBag || isAdding}
        onClick={handleAddToBag}
        className={
          !canAddToBag
            ? "inline-flex h-9 w-full cursor-not-allowed items-center justify-center rounded-md bg-gray-200 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500"
            : "inline-flex h-9 w-full items-center justify-center rounded-md bg-gray-900 px-3 text-xs font-semibold uppercase tracking-wide text-white transition-colors hover:bg-black disabled:cursor-wait disabled:opacity-70"
        }
      >
        {buttonLabel}
      </button>
    </div>
  );
}
