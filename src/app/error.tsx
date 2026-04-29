"use client";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function Error({ error, reset }: Props) {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <h2 className="text-base font-semibold text-red-900">
          Could not load products
        </h2>
        <p className="mt-2 text-sm text-red-800">{error.message}</p>
        <button
          onClick={reset}
          className="mt-4 inline-flex items-center rounded-md bg-red-900 px-3 py-1.5 text-sm font-medium text-white"
          type="button"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
