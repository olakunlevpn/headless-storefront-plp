# Headless storefront PLP

A product listing page for a soft goods storefront, built against the public
[mock.shop](https://mock.shop) Storefront API. Next.js 16 App Router, React 19,
TypeScript, Tailwind 4. Server components do the data work, a couple of small
client islands handle interactivity, and the cart talks to mock.shop directly
through server actions.

Zod validates every Storefront API response at the boundary. Sonner handles
the toast notifications.

## Running it

```bash
git clone https://github.com/olakunlevpn/headless-storefront-plp.git
cd headless-storefront-plp
npm install
npm run dev
```

Open http://localhost:3000.

```bash
npm run build        # production build
npm run start        # serve the production build
npm run lint         # eslint
npm test             # vitest, runs the data-layer unit tests once
npm run test:watch   # vitest in watch mode
npx tsc --noEmit     # type check
```

## Configuration

Two environment variables, both optional.

| Variable                            | Default                  | What it does                                         |
| ----------------------------------- | ------------------------ | ---------------------------------------------------- |
| `NEXT_PUBLIC_STOREFRONT_ENDPOINT`   | `https://mock.shop/api`  | The Storefront API endpoint to hit.                  |
| `PLP_COLLECTION_HANDLE`             | `featured`               | Which collection the PLP renders. See note below.    |

There is no `.env.example` because nothing has to be set for the app to work.

### About the `frontpage` collection

The brief asks for the `frontpage` collection. mock.shop does not expose a
collection with that handle. The collections it does expose are `men`,
`women`, `unisex`, `tops`, `bottoms`, `accessories`, `featured`, `shoes`. I
defaulted to `featured` because it is the closest semantic match (it is what
mock.shop puts on its own demo homepage). If you want to point at a different
collection, set `PLP_COLLECTION_HANDLE`.

```bash
PLP_COLLECTION_HANDLE=men npm run dev
```

## The variant decision

A product like *Men's Crewneck* on mock.shop has 5 colors and 3 sizes, so 15
variants. The brief asks how you represent that on a listing page. The
options are:

1. **One card per product.** Compact, but hides the colors. Customers have to
   click to find out what is available.
2. **One card per color.** A bit wider grid, but color is a real visual
   choice. Sizes can live inside the card as small pills.
3. **One card per variant.** 15 cards for one crewneck. Drowns out everything
   else.

I went with option 2. Color is the thing customers scan a soft goods grid
for, so it earns a card. Size is a refinement that fits inside the card as a
row of pills. This mirrors what most apparel stores actually ship (Allbirds,
Vuori, Jellycat all do the same thing).

The brief asks for four cases to be handled. Here is what the model does for
each one:

| Case                          | What renders                                                  |
| ----------------------------- | ------------------------------------------------------------- |
| Single variant                | One card. No color row. No size row. Image, title, price.     |
| Size only product             | One card. Size pills, no color row.                           |
| Color and size                | N cards (one per color), each with the sizes for that color.  |
| Mixed availability            | Sold out sizes are dashed and struck through, but selectable shows them as disabled. The card stays interactive while at least one size is in stock. |
| Fully sold out                | The card dims, a "Sold out" badge appears, every size is disabled. The Add to bag button reads "Sold out".  |

Two flags on the view model do most of the work: `anyAvailable` for the
card, and `available` per size for the pills.

The fully-sold-out path is not exercised by the live `featured` collection
(everything in there is in stock right now), so it is covered by a unit
test instead. See `src/lib/shopify/normalize.test.ts`.

## The query

The list query lives in `src/lib/shopify/queries.ts`. It fetches what the
card actually renders and nothing else.

```graphql
query CollectionPLP($handle: String!, $first: Int!) {
  collection(handle: $handle) {
    id
    title
    handle
    products(first: $first) {
      nodes {
        id
        handle
        title
        featuredImage { url, altText, width, height }
        options { name, values }
        variants(first: 100) {
          nodes {
            id
            title
            availableForSale
            selectedOptions { name, value }
            price { amount, currencyCode }
            image { url, altText, width, height }
          }
        }
      }
    }
  }
}
```

What I deliberately left out at this layer:

- `descriptionHtml`, `seo`, `metafields`. Those are PDP concerns.
- `media` (the full gallery). The list only needs one image per color.
- `compareAtPrice`. There is no sale UI in scope.
- `availableForSale` on the product itself. It is derivable from the
  variants and would only confuse things if the product flag and the
  variant flags ever disagreed.

`variants(first: 100)` is intentional. One round trip gives the normalizer
everything it needs to compute per-color size availability without paginating
inside the loader. It is the obvious thing to revisit at scale, and I do
revisit it below.

## Validation at the boundary

Every response from mock.shop runs through a Zod schema before the rest of
the app touches it. Schemas live in `src/lib/shopify/schemas.ts`. The TS
types in `types.ts` are inferred from the schemas with `z.infer<>`, so the
runtime check and the compile-time type can never drift apart.

If mock.shop renames a field or changes a shape, you get one clean error
that names the field path:

```
Storefront response failed validation: data.collection.products.nodes.0.variants: Required
```

Instead of an undefined access deep in `normalize.ts` half a stack frame
later.

The `addToCartAction` server action also runs its inputs through Zod. The
variant id has to match the Shopify GID format (`gid://shopify/ProductVariant/<id>`),
quantity has to be a positive integer up to 99. Bad input never reaches
mock.shop.

The raw GraphQL response never leaves `src/lib/shopify/`. The boundary
between the API and the rest of the app is `ColorCardVM`, defined in
`src/lib/shopify/types.ts`:

```ts
type ColorCardVM = {
  id: string;
  productHandle: string;
  productTitle: string;
  color: string | null;
  imageUrl: string;
  imageAlt: string;
  fromPrice: Money;
  anyAvailable: boolean;
  sizes: SizeOption[];
  isSingleVariant: boolean;
  defaultVariantId: string;
};
```

That is what the components see. No nested option lists, no GIDs the client
does not need, nothing tied to the Storefront API shape. If we ever swap
mock.shop for a custom catalog service, only `normalize.ts` changes.

## Server, client, and where the line is

The page renders server-side by default. The cart is server-owned state. The
only client islands are the things that genuinely need browser state.

**Server:**

- `app/page.tsx` fetches the collection and renders the grid.
- `components/ProductCard.tsx` renders the card itself. Pure HTML output.
- `components/SiteHeader.tsx` reads the cart cookie, fetches the cart,
  hands it to the drawer.
- `app/actions/cart.ts` server actions: `addToCartAction`,
  `removeFromCartAction`, `getCurrentCart`, `clearCartAction`.

**Client:**

- `components/VariantPicker.tsx`. Owns the selected size, calls the add
  action, shows inline status. One per card.
- `components/CartDrawer.tsx`. Owns open/close, renders the cart prop, calls
  the remove action.
- `app/error.tsx`. Error boundaries have to be client.

The cart cookie is `httpOnly` and only stores an opaque mock.shop cart id.
The actual cart contents live in mock.shop and are re-fetched server-side on
every render. No client-side cart store, no duplication. When a server
action runs, it calls `revalidatePath('/')` and the header re-renders with
fresh cart data. The drawer just reads its prop.

This means the grid stays shippable as static HTML even though it has
interactive controls inside it. Only `VariantPicker` hydrates, and only one
small island per visible card.

## Add to bag, end to end

```
1. Click a size pill.
   VariantPicker.tsx: setSelectedVariantId(size.variantId)

2. Click "Add to bag".
   addToCartAction(selectedVariantId) runs on the server.
     - reads the cartId cookie
     - if cookie exists: cartLinesAdd(cartId, variantId)
     - if not: cartCreate({ lines: [...] }), then writeCartId(newId)
     - revalidatePath('/')
   Returns { ok: true, cart: CartVM } or { ok: false, error }.

3. The route revalidates.
   SiteHeader re-renders. getCurrentCart() reads the cookie,
   calls cartGet(cartId), passes the fresh cart to CartDrawer.

4. The bag pill in the header updates.
   The drawer, when opened, shows the new line, subtotal, and a
   live mock.shop checkoutUrl.
```

If mock.shop loses the cart between requests, the action falls back to
`cartCreate` and overwrites the cookie, so the user is never stuck.

The Checkout button in the drawer is `cart.checkoutUrl` from the API, the
real `https://demostore.mock.shop/cart/c/<id>?key=<key>`. We hand off to
Shopify's hosted checkout the same way a real headless storefront would.

### Why server actions

We could have built `/api/cart/add` and called it from the client. Server
actions just remove a layer:

- The action is a function the client component imports and calls. No URL,
  no fetch wrapper, no JSON shape to maintain on both sides.
- Cookie read/write, mock.shop call, and revalidation all run in one
  server-side transaction.
- `revalidatePath('/')` is the same primitive every other Next mutation
  uses, so the drawer refresh is built-in instead of hand-rolled.

## Part 3: the drop scenario

The brief asks what would change if a drop sent traffic up by 100x while
inventory changed by the second. Here is the shape of it. No code in this
section, just the architecture.

### What breaks today

Every render hits mock.shop. The page is dynamic, fetches are
`cache: 'no-store'`. At normal traffic that is fine. At 100x it makes the
storefront API the bottleneck and the page TTFB becomes mock.shop's p99.

There is no signal saying "variant X just sold out", so any cache we put
in front of this would either go stale or never warm up.

### Cache plan

Two layers, with TTLs explicit per data shape.

| Layer                             | What it caches                                                          | TTL                                          | Invalidation                                 |
| --------------------------------- | ----------------------------------------------------------------------- | -------------------------------------------- | -------------------------------------------- |
| Edge (Vercel Edge or Cloudflare)  | Full HTML response, keyed by collection and locale.                     | 5 to 10 seconds with stale-while-revalidate up to 60. | Tag-based purge on inventory webhook.        |
| Origin (`use cache` + `cacheLife`)| The normalized `ColorCardVM[]`. Not the raw GraphQL.                    | 5 seconds during the drop, 60 seconds steady.| `revalidateTag('collection:featured')`.      |

The HTML layer absorbs the spike. With a 5 second TTL, 100x traffic hits the
origin once every 5 seconds per edge POP. The data layer absorbs the renders
that miss HTML cache (personalized headers, A/B variants, anything the edge
key cannot deduplicate).

We do not cache GraphQL responses. Caching at the API shape couples us to a
transport concern. Cache the view model. That is the boundary we own.

### Telling the user what they are looking at

Stale stock is fine if you tell people. A few options:

- Stamp every card with the render time, and put a "Stock as of HH:MM:SS"
  line in the page header. People understand that during a drop, what they
  see is seconds old.
- The cart mutation re-checks at write time. If the variant sold out
  between page load and add, the action returns a structured error and the
  UI shows "Just sold out, try a different size" inline.
- For the hot drop window only, open SSE or long polling to a "drop status"
  endpoint and mark sizes sold out without a refresh. Not worth standing
  up outside the drop.

### Pre-launch and the flip

Before launch, serve a static landing page with the hero, a countdown, and
maybe an email capture. No inventory, indefinitely cached. Zero pressure on
the origin.

At launch, a scheduled invalidation flips the route from the landing page
to the live PLP. The first request after the flip pays one cold render.
Everyone else hits the CDN for the next few seconds.

For the first minute, TTL drops to 2 or 3 seconds and tag purges fire on
every inventory webhook. After 5 minutes, TTL eases back to steady state.

The route URL stays the same the whole time, so warm DNS keeps working.

### The trade-off

We trade a few seconds of stock accuracy for the ability to actually serve
the page under load. The PLP is up to N seconds stale where N is the cache
TTL. The cart is the source of truth and is never cached. A user can click
a size that looks available and get rejected at add. We make that rejection
a first-class UX: "Just sold out, try a different size" right inside the
card.

The alternative is bypassing the cache to guarantee real-time accuracy,
falling over at 100x, and losing the order entirely. A graceful "actually,
that just sold out" beats a spinner that never resolves.

## Trade-offs and known gaps

A few things I would change with more time, in roughly the order I would
change them.

**`variants(first: 100)` per product on the list.** Works for any realistic
apparel SKU, but the payload grows linearly with `variants_per_product *
products_per_page`. Twenty-four products at thirty variants each is roughly
seven hundred variant rows that get fetched and then discarded by
normalization. Two ways out:

1. Fetch only `featuredImage`, `options`, and a per-color "any available"
   flag at list time. Lazy-load the size pills via the PDP query on hover
   or click intent.
2. Keep the variant fetch, but cache the normalized `ColorCardVM[]` by
   collection handle with `use cache` and `cacheLife`. Pay normalization
   once per cache window, not once per request.

I would pick (2) for normal traffic and (1) only if the catalog grew into
the thousands.

**Color swatch hex is hard-coded** in `src/lib/colors.ts`. In a real
storefront the swatch hex (or the swatch image) belongs on a Shopify
metafield attached to the option value, not a developer-maintained map.
This is a quick fix when the catalog has the metafield available.

**From-price is the minimum across a color's sizes.** If a product prices
sizes differently and the cheapest is 2XL, the card shows the 2XL price
with a "From" prefix. Standard PLP convention. Worth confirming with the
merchant before going live.

**The route-level Suspense skeleton is the only loading state.** A real
build would have a `loading.tsx` per route segment and probably skeleton
states inside the cart drawer too.

**The error boundary is generic.** It catches anything thrown during render
and shows a "Try again" button. A real implementation would distinguish
"collection not found" (recoverable, suggest alternatives) from "storefront
unreachable" (retry with backoff).

**No optimistic UI on Add to bag.** The button waits for mock.shop to
confirm before showing the new count. With a slower API, this is the
obvious place for `useOptimistic`.

## File layout

```
src/
  app/
    page.tsx                  PLP server component, Suspense boundary, dynamic route
    layout.tsx                Root layout, header mount
    error.tsx                 Route-level error boundary (client)
    globals.css               Theme tokens, light scheme
    actions/
      cart.ts                 Server actions: add, remove, get, clear
  components/
    ProductCard.tsx           Server component, one color = one card
    VariantPicker.tsx         Client island: size selection, Add to bag
    CartDrawer.tsx            Client island: bag pill, slide-out drawer
    SiteHeader.tsx            Server component: brand + cart drawer mount
    ColorSwatch.tsx           Hex-mapped color dot
  lib/
    colors.ts                 Color name to hex map
    format.ts                 Money formatter
    cart-cookie.ts            cartId cookie helpers (httpOnly)
    shopify/
      client.ts               GraphQL POST for the collection query
      queries.ts              COLLECTION_QUERY
      cart.ts                 cartCreate, cartLinesAdd, cartGet, cartLinesRemove
      normalize.ts            Raw product to ColorCardVM[]
      normalize.test.ts       Vitest, 11 cases covering the four required cases
      schemas.ts              Zod schemas for every API response and view model
      types.ts                TS types inferred from the Zod schemas
```

## Tests

Vitest runs against the data layer.

```bash
npm test
```

Eleven cases in `src/lib/shopify/normalize.test.ts` cover:

- Single variant
- Fully sold out (anyAvailable false, every size disabled)
- Mixed availability with per-size flags
- Mixed availability picking the first available variant as default
- Color and size, one card per color, sizes inside
- Color order preserved from the API
- From-price as the minimum
- Image fallback to `featuredImage` when no variant image
- Image preferred from variant when present
- Empty variants returning no cards
- `collectionToCards` flattening across products

Component-level tests against the rendered DOM (Testing Library) would be
the next layer to add.

## Verifying the data really comes from mock.shop

Quick way:

```bash
npm run dev
```

Click Add to bag in the browser. The dev server logs the server action
including the variant id it just added.

Direct way:

```bash
curl -s -X POST https://mock.shop/api \
  -H "Content-Type: application/json" \
  -d '{"query":"{ collection(handle: \"featured\") { title products(first: 1) { nodes { title variants(first: 3) { nodes { id title availableForSale price { amount currencyCode } } } } } } }"}' \
| python3 -m json.tool
```

Every product title, variant id, price, and cart line id you see in the UI
is reproducible from this endpoint. Nothing is mocked or stubbed in the
app itself.
