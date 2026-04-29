import Link from "next/link";
import { CartDrawer } from "./CartDrawer";
import { getCurrentCart } from "@/app/actions/cart";

export async function SiteHeader() {
  const cart = await getCurrentCart();
  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="text-base font-semibold tracking-tight text-gray-900"
        >
          softgoods
        </Link>
        <CartDrawer cart={cart} />
      </div>
    </header>
  );
}
