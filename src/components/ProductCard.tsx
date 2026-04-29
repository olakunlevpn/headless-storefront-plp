import Image from "next/image";
import { ColorSwatch } from "./ColorSwatch";
import { VariantPicker } from "./VariantPicker";
import { formatMoney } from "@/lib/format";
import type { ColorCardVM } from "@/lib/shopify/types";

type Props = {
  card: ColorCardVM;
  priority?: boolean;
};

export function ProductCard({ card, priority = false }: Props) {
  const isSoldOut = !card.anyAvailable;
  const showFromPricePrefix =
    card.sizes.length > 1 &&
    card.sizes.some((s) => s.price.amount !== card.sizes[0]?.price.amount);

  const containerClasses = isSoldOut
    ? "group relative flex w-full flex-col overflow-hidden rounded-lg border border-gray-200 bg-white opacity-70"
    : "group relative flex w-full flex-col overflow-hidden rounded-lg border border-gray-200 bg-white";

  return (
    <article
      className={containerClasses}
      aria-label={`${card.productTitle}${card.color ? ` in ${card.color}` : ""}`}
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-gray-100">
        {card.imageUrl ? (
          <Image
            src={card.imageUrl}
            alt={card.imageAlt}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            priority={priority}
            className="object-cover transition-opacity duration-300 group-hover:opacity-75"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-gray-400">
            No image
          </div>
        )}

        {isSoldOut && (
          <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-900 ring-1 ring-gray-900/10">
            Sold out
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col space-y-2 p-4">
        <h3 className="text-sm font-medium text-gray-900">
          {card.productTitle}
        </h3>

        <div className="flex flex-1 flex-col justify-end">
          {card.color && (
            <p className="flex items-center gap-1.5 text-sm italic text-gray-500">
              <ColorSwatch color={card.color} />
              <span>{card.color}</span>
            </p>
          )}

          <p className="mt-1 text-base font-medium tabular-nums text-gray-900">
            {showFromPricePrefix ? "From " : ""}
            {formatMoney(card.fromPrice)}
          </p>

          <VariantPicker card={card} />
        </div>
      </div>
    </article>
  );
}
