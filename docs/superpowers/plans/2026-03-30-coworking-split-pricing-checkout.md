# Coworking Split Pricing / Checkout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the coworking `cart-pricing` endpoint usage into two calls — `getCartPricing` on Step 3 mount (display deposit + pricing) and `createCheckoutSession` on submit (get Stripe URL and redirect).

**Architecture:** The backend already has two separate endpoints: `POST /cart-pricing` (pure pricing, no Stripe) and `POST /create-checkout` (creates Stripe session, returns URL). The frontend needs to be updated to use them correctly — call `cart-pricing` on step mount to show the deposit amount and pricing summary, and call `create-checkout` only when the user clicks "Pay deposit". A separate `depositInfo` state variable holds the deposit data returned by `cart-pricing` and displays it in the UI.

**Tech Stack:** Next.js, React, TypeScript

---

## File Map

| File | Change |
|------|--------|
| `lib/constants/api.ts` | Add `COWORKING_CREATE_CHECKOUT` endpoint |
| `types/api/coworking.api.types.ts` | Remove `checkoutUrl` from `CoworkingCheckoutPricingResponse`; add `CoworkingCreateCheckoutResponse` |
| `services/api/coworking.api.ts` | Rename `createCheckoutIntent` → `getCartPricing`; add `createCheckoutSession` |
| `lib/components/catering/Step3ContactDetails.tsx` | Replace `calculatePricing` logic; add `depositInfo` state; replace submit call; display deposit |

`PricingSummary.tsx` requires no changes.

---

### Task 1: Add `COWORKING_CREATE_CHECKOUT` endpoint constant

**Files:**
- Modify: `lib/constants/api.ts`

- [ ] **Step 1: Add the constant after `COWORKING_CART_PRICING`**

In `lib/constants/api.ts`, find:
```ts
  COWORKING_CART_PRICING: (spaceSlug: string) =>
    `/coworking/${spaceSlug}/cart-pricing`,
```

Add immediately after:
```ts
  COWORKING_CREATE_CHECKOUT: (spaceSlug: string) =>
    `/coworking/${spaceSlug}/create-checkout`,
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/thadoos/Coding/AllRestaurantApps/halkins-food
npx tsc --noEmit
```
Expected: no errors related to this file.

- [ ] **Step 3: Commit**

```bash
git add lib/constants/api.ts
git commit -m "feat: add COWORKING_CREATE_CHECKOUT endpoint constant"
```

---

### Task 2: Update coworking API response types

**Files:**
- Modify: `types/api/coworking.api.types.ts`

**Context:** `CoworkingCheckoutPricingResponse` currently has a `checkoutUrl?: string` field left over from when `cart-pricing` also created Stripe sessions. That field now belongs only to `create-checkout`. A new `CoworkingCreateCheckoutResponse` type is needed for the checkout call.

- [ ] **Step 1: Remove `checkoutUrl` from `CoworkingCheckoutPricingResponse`**

Find `CoworkingCheckoutPricingResponse` in `types/api/coworking.api.types.ts`. Remove the `checkoutUrl?: string` line. The interface should look like:

```ts
export interface CoworkingCheckoutPricingResponse {
  isValid: boolean;
  subtotal: number;
  deliveryFee: number;
  restaurantPromotionDiscount?: number;
  totalDiscount?: number;
  promoDiscount?: number;
  venueHireFee?: number;
  venueHireDiscount?: number;
  total: number;
  error?: string;
  distanceInMiles?: number;
  deliveryFeeBreakdown?: {
    baseFee: number;
    portionFee: number;
    drinksFee: number;
    subtotal: number;
    distanceMultiplier: number;
    finalDeliveryFee: number;
    requiresCustomQuote: boolean;
  };
  deposit?: {
    amount: number;
    perDayRate: number;
    days: number;
  } | null;
}
```

- [ ] **Step 2: Add `CoworkingCreateCheckoutResponse`**

Directly after `CoworkingCheckoutPricingResponse`, add:

```ts
/**
 * Response for POST /create-checkout — creates a Stripe Checkout session.
 * Call this only when the user clicks "Pay deposit".
 */
export interface CoworkingCreateCheckoutResponse {
  checkoutUrl: string;
  deposit: {
    amount: number;
    perDayRate: number;
    days: number;
  } | null;
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add types/api/coworking.api.types.ts
git commit -m "feat: split CoworkingCheckoutPricingResponse and add CoworkingCreateCheckoutResponse"
```

---

### Task 3: Update the coworking API service

**Files:**
- Modify: `services/api/coworking.api.ts`

**Context:** `createCheckoutIntent` currently calls `POST /cart-pricing` and returns `CoworkingCheckoutPricingResponse` (which previously included `checkoutUrl`). It needs to be renamed to `getCartPricing` to match its new purpose (pricing display only). A new `createCheckoutSession` method calls `POST /create-checkout` and returns `CoworkingCreateCheckoutResponse`.

- [ ] **Step 1: Import `CoworkingCreateCheckoutResponse`**

Find the import block at the top of `services/api/coworking.api.ts` that imports from `@/types/api`. Add `CoworkingCreateCheckoutResponse` to it:

```ts
import {
  // ... existing imports ...
  CoworkingCreateCheckoutResponse,
} from '@/types/api';
```

- [ ] **Step 2: Rename `createCheckoutIntent` → `getCartPricing` and update its return type**

Find the `createCheckoutIntent` method. Replace the entire method with:

```ts
/**
 * Get cart pricing (deposit + catering totals) for display on the final step.
 * Does NOT create a Stripe session — safe to call on page load.
 * Backend: POST /coworking/:spaceSlug/cart-pricing
 */
async getCartPricing(
  spaceSlug: string,
  data: CreateCoworkingOrderRequest
): Promise<CoworkingCheckoutPricingResponse> {
  try {
    const response = await this.fetchWithSession(
      `${API_BASE_URL}${API_ENDPOINTS.COWORKING_CART_PRICING(spaceSlug)}`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return {
        isValid: false,
        subtotal: 0,
        deliveryFee: 0,
        total: 0,
        error: error.message || 'Failed to calculate pricing',
      } as CoworkingCheckoutPricingResponse;
    }

    return response.json();
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to calculate pricing';
    return {
      isValid: false,
      subtotal: 0,
      deliveryFee: 0,
      total: 0,
      error: message,
    } as CoworkingCheckoutPricingResponse;
  }
}
```

- [ ] **Step 3: Add `createCheckoutSession`**

Directly after `getCartPricing`, add:

```ts
/**
 * Create a Stripe Checkout session and return the checkout URL.
 * Call this ONLY when the user clicks "Pay deposit".
 * Backend: POST /coworking/:spaceSlug/create-checkout
 */
async createCheckoutSession(
  spaceSlug: string,
  data: CreateCoworkingOrderRequest
): Promise<CoworkingCreateCheckoutResponse> {
  const response = await this.fetchWithSession(
    `${API_BASE_URL}${API_ENDPOINTS.COWORKING_CREATE_CHECKOUT(spaceSlug)}`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to initiate checkout');
  }

  return response.json();
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors. If there are errors about `createCheckoutIntent` being referenced elsewhere, they will be fixed in Task 4.

- [ ] **Step 5: Commit**

```bash
git add services/api/coworking.api.ts
git commit -m "feat: replace createCheckoutIntent with getCartPricing and createCheckoutSession"
```

---

### Task 4: Update Step3ContactDetails

**Files:**
- Modify: `lib/components/catering/Step3ContactDetails.tsx`

**Context:** Four changes in this file:
1. Add `depositInfo` state to hold deposit data from `cart-pricing`
2. Replace `calculatePricing` — remove the catering/no-catering branch and the `withEstimatedVenueHireFee` call; always call `coworkingService.getCartPricing()` using `buildCoworkingOrderData()`
3. Replace `createCheckoutIntent` with `createCheckoutSession` in `submitOrder`
4. Display the deposit amount in the UI

- [ ] **Step 1: Add `depositInfo` state**

Find the existing state declarations near the top of the component (around where `pricing` and `calculatingPricing` are declared). Add `depositInfo` directly after `pricing`:

```ts
const [depositInfo, setDepositInfo] = useState<{
  amount: number;
  perDayRate: number;
  days: number;
} | null>(null);
```

- [ ] **Step 2: Replace `calculatePricing`**

Find the entire `calculatePricing` function and replace it with:

```ts
const calculatePricing = async () => {
  setCalculatingPricing(true);
  try {
    const slug = resolvedSpaceSlug;
    if (!slug) {
      setPricing(null);
      setDepositInfo(null);
      return;
    }

    const { spaceSlug, orderData } = buildCoworkingOrderData();
    const result = await coworkingService.getCartPricing(spaceSlug, orderData);

    if (!result.isValid) {
      setPricing(null);
      setDepositInfo(null);
      return;
    }

    setPricing(result as unknown as CateringPricingResult);
    setDepositInfo(result.deposit ?? null);

    // If promo codes are applied but resulted in no discount, warn the user
    if (promoCodes.length > 0) {
      const hasDiscount = (result.promoDiscount ?? 0) > 0 || (result.venueHireDiscount ?? 0) > 0;
      if (!hasDiscount) {
        setPromoSuccess("");
        setPromoError("Promo code may not apply to current items");
      } else {
        setPromoError((prev) =>
          prev === "Promo code may not apply to current items" ? "" : prev
        );
      }
    }
  } catch (error: unknown) {
    console.error("Error calculating pricing:", error);
    setPricing(null);
    setDepositInfo(null);
  } finally {
    setCalculatingPricing(false);
  }
};
```

Also remove the `withEstimatedVenueHireFee` function entirely (it was used only inside the old `calculatePricing`):

```ts
// DELETE this entire function:
function withEstimatedVenueHireFee(
  pricingResult: CateringPricingResult
): CateringPricingResult {
  ...
}
```

- [ ] **Step 3: Update `submitOrder` to use `createCheckoutSession`**

Find this block inside `submitOrder`:

```ts
const { spaceSlug, orderData } = buildCoworkingOrderData();
const checkoutResponse = await coworkingService.createCheckoutIntent(
  spaceSlug,
  orderData
);

if (!checkoutResponse.isValid) {
  throw new Error(
    checkoutResponse.error || "Unable to start deposit checkout."
  );
}

if (!checkoutResponse.checkoutUrl) {
  throw new Error("Checkout URL was not returned by the server.");
}

if (typeof window !== "undefined") {
  window.location.assign(checkoutResponse.checkoutUrl);
  return;
}
```

Replace it with:

```ts
const { spaceSlug, orderData } = buildCoworkingOrderData();
const checkoutResponse = await coworkingService.createCheckoutSession(
  spaceSlug,
  orderData
);

if (typeof window !== "undefined") {
  window.location.assign(checkoutResponse.checkoutUrl);
  return;
}
```

(`createCheckoutSession` throws on failure, so no `isValid` check is needed.)

- [ ] **Step 4: Display the deposit amount in the UI**

Find the existing "Venue-only checkout" info box in the JSX:

```tsx
{!hasSelectedCatering && (
  <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-4 text-sm text-sky-900">
    <p className="font-semibold">Venue-only checkout</p>
    <p className="mt-1 text-sky-800/85">
      You haven&apos;t added catering yet, so this checkout will secure the venue with a deposit only.
    </p>
  </div>
)}
```

Add a deposit amount row directly above this box (visible regardless of whether catering is selected):

```tsx
{depositInfo && (
  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm">
    <div className="flex justify-between items-center">
      <div>
        <p className="font-semibold text-amber-900">Deposit due now</p>
        <p className="text-amber-700 mt-0.5">
          £{depositInfo.perDayRate.toFixed(2)} × {depositInfo.days} day{depositInfo.days !== 1 ? "s" : ""}
        </p>
      </div>
      <p className="text-lg font-bold text-amber-900">
        £{depositInfo.amount.toFixed(2)}
      </p>
    </div>
  </div>
)}
```

- [ ] **Step 5: Verify TypeScript compiles with no errors**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add lib/components/catering/Step3ContactDetails.tsx
git commit -m "feat: use getCartPricing on mount and createCheckoutSession on submit in Step3"
```

---

### Task 5: Manual verification

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Navigate to the coworking booking flow**

Go to a coworking space URL, authenticate, add items, reach Step 3.

- [ ] **Step 3: Verify pricing loads on mount**

Expected on Step 3 load:
- Catering subtotal, delivery fee, and totals display correctly in `PricingSummary`
- Deposit amount box appears showing "Deposit due now" with the per-day rate, days, and total
- No Stripe session is created (check the Stripe dashboard — no new session should appear yet)

- [ ] **Step 4: Verify pricing loads without catering**

Go through the flow without selecting any catering items.

Expected:
- Deposit amount box still shows (deposit is independent of catering)
- Catering rows show £0.00

- [ ] **Step 5: Verify checkout redirect on submit**

Fill in contact details and click "Pay deposit".

Expected:
- Button shows loading state
- A new Stripe Checkout session appears in Stripe dashboard (created only at this moment)
- Browser redirects to the Stripe-hosted payment page
- The deposit amount on the Stripe page matches the amount shown in the deposit box

- [ ] **Step 6: Verify promo code still works**

Apply a valid promo code.

Expected:
- `calculatePricing` re-runs (triggered by `promoCodes` dependency)
- Discount appears in the pricing summary
- Deposit amount is unchanged (promos don't affect the deposit)
