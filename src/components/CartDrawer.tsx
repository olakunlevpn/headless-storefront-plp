"use client";

import { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { removeFromCartAction } from "@/app/actions/cart";
import { formatMoney } from "@/lib/format";
import type { CartVM } from "@/lib/shopify/cart";

type Props = {
  cart: CartVM | null;
};

export function CartDrawer({ cart }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMutating, startMutating] = useTransition();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    if (isOpen) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen]);

  const totalQuantity = cart?.totalQuantity ?? 0;

  function handleRemove(lineId: string) {
    startMutating(async () => {
      const result = await removeFromCartAction(lineId);
      if (result.ok) {
        toast.success("Item removed", {
          description:
            result.cart.totalQuantity === 0
              ? "Your bag is empty."
              : `Bag now has ${result.cart.totalQuantity} item${result.cart.totalQuantity === 1 ? "" : "s"}.`,
        });
      } else {
        toast.error("Could not remove item", {
          description: result.error,
        });
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label={`Open bag, ${totalQuantity} ${totalQuantity === 1 ? "item" : "items"}`}
        className="relative inline-flex h-9 items-center gap-2 rounded-full border border-gray-300 bg-white px-3 text-sm font-medium text-gray-900 hover:border-gray-900"
      >
        <span>Bag</span>
        <span
          className={
            totalQuantity > 0
              ? "inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-gray-900 px-1.5 text-[11px] font-semibold text-white"
              : "inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-gray-100 px-1.5 text-[11px] font-semibold text-gray-500"
          }
        >
          {totalQuantity}
        </span>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-end"
          aria-modal="true"
          role="dialog"
          aria-label="Shopping bag"
        >
          <button
            type="button"
            aria-label="Close bag"
            onClick={() => setIsOpen(false)}
            className="absolute inset-0 h-full w-full bg-black/40"
          />
          <aside className="relative flex h-screen w-full max-w-md flex-col bg-white shadow-xl">
            <header className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <h2 className="text-base font-semibold text-gray-900">
                Your bag
              </h2>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-md px-2 py-1 text-sm text-gray-600 hover:bg-gray-100"
              >
                Close
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {cart && cart.lines.length > 0 ? (
                <ul className="flex flex-col gap-4">
                  {cart.lines.map((line) => (
                    <li key={line.id} className="flex gap-3">
                      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-gray-100">
                        {line.imageUrl && (
                          <Image
                            src={line.imageUrl}
                            alt={line.imageAlt}
                            fill
                            sizes="80px"
                            className="object-cover"
                          />
                        )}
                      </div>
                      <div className="flex flex-1 flex-col">
                        <p className="text-sm font-medium text-gray-900">
                          {line.productTitle}
                        </p>
                        {line.variantTitle &&
                          line.variantTitle !== "Default Title" && (
                            <p className="text-xs italic text-gray-500">
                              {line.variantTitle}
                            </p>
                          )}
                        <p className="mt-1 text-sm tabular-nums text-gray-900">
                          {line.quantity} × {formatMoney(line.unitPrice)}
                        </p>
                        <button
                          type="button"
                          onClick={() => handleRemove(line.id)}
                          disabled={isMutating}
                          className="mt-1 self-start text-xs text-gray-500 underline disabled:opacity-50"
                        >
                          Remove
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-12 text-center text-sm text-gray-500">
                  Your bag is empty.
                </p>
              )}
            </div>

            {cart && cart.lines.length > 0 && (
              <footer className="border-t border-gray-200 px-5 py-4">
                <div className="mb-3 flex items-baseline justify-between">
                  <span className="text-sm text-gray-600">Subtotal</span>
                  <span className="text-base font-medium tabular-nums text-gray-900">
                    {formatMoney(cart.totalAmount)}
                  </span>
                </div>
                <a
                  href={cart.checkoutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-10 w-full items-center justify-center rounded-md bg-gray-900 text-sm font-semibold uppercase tracking-wide text-white hover:bg-black"
                >
                  Checkout
                </a>
                <p className="mt-2 text-center text-[10px] uppercase tracking-wide text-gray-400">
                  mock.shop demo checkout
                </p>
              </footer>
            )}
          </aside>
        </div>
      )}
    </>
  );
}
