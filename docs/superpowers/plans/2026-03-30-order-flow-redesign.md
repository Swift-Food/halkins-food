# Order Flow Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the admin dashboard order flow to support two distinct order types — venue-hold-only orders (`deposit_paid`) and catering orders (`pending_admin_review`) — with clear, intuitive tabs and actions for each.

**Architecture:** Frontend-only change. The backend already exposes the correct statuses and endpoints. We update the type definitions to match the backend DTOs, then update the three dashboard components (OrdersList, OrderDetailModal, CoworkingDashboard) to reflect the new two-path flow. No new API endpoints are needed.

**Tech Stack:** Next.js, React, TypeScript, Tailwind CSS, lucide-react

---

## Background & Business Rules

**Two order types:**

| Status | Meaning | Admin can do |
|---|---|---|
| `deposit_paid` | Customer paid deposit, no catering yet — venue hold only | Reject only |
| `pending_admin_review` | Catering added, awaiting admin action | Set venue hire fee → approves (sends quote + unblocks Swift Food) OR reject |

**Approval = `setVenueHireFee`:** Calling the set-venue-hire-fee endpoint is the approval action. It emails the customer a full breakdown and unblocks Swift Food to accept on their side. There is no separate "approve" endpoint — the existing `approveOrder` service method is dead code and must be removed.

**Deposit is pre-paid:** Admin never sets or overrides the deposit amount. The deposit info is read-only and shown for context.

**Post-approval statuses** (unchanged): `admin_reviewed` → `restaurant_reviewed` → `payment_link_sent` → `paid` → `confirmed` → `preparing` → `ready` → `delivered` → `completed`.

---

## File Map

| File | Change |
|---|---|
| `types/api/coworking-dashboard.api.types.ts` | Add `CoworkingOrderDepositInfo`, update `DashboardOrderDetailResponse`, `DashboardOrderSummary`, `DashboardOrderStatusFilter` |
| `lib/components/coworking-dashboard/OrdersList.tsx` | New "Awaiting Catering" tab, `deposit_paid` badge/label/row style, remove quick-approve button, add `awaitingCateringCount` prop, remove `onQuickApprove` prop |
| `lib/components/coworking-dashboard/OrderDetailModal.tsx` | Conditional action section by status, deposit info card, rename "Send Quote" → "Approve & Send Quote", remove deposit amount input, remove dead approve button |
| `lib/components/coworking-dashboard/CoworkingDashboard.tsx` | Map `awaiting_catering` filter to `deposit_paid` API status, compute `awaitingCateringCount`, remove `handleQuickApprove`, update `OrdersList` props |

---

## Task 1: Update Frontend Type Definitions

**Files:**
- Modify: `types/api/coworking-dashboard.api.types.ts`

- [ ] **Step 1: Add `CoworkingOrderDepositInfo` interface and update `DashboardOrderStatusFilter`**

In `types/api/coworking-dashboard.api.types.ts`, make these changes:

```typescript
// Update DashboardOrderStatusFilter — add 'awaiting_catering' and 'deposit_paid'
export type DashboardOrderStatusFilter =
  | 'upcoming'
  | 'active'
  | 'completed'
  | 'cancelled'
  | 'all'
  | 'needs_review'       // frontend-only: fetches 'all', filters by adminReviewStatus === 'pending_admin_review'
  | 'awaiting_catering'  // frontend-only: sends status='deposit_paid' to API
  | 'deposit_paid';      // direct API value (used internally when mapping awaiting_catering)
```

```typescript
// Add this new interface (matches backend CoworkingOrderDepositInfo)
export interface CoworkingOrderDepositInfo {
  status: string;
  amount: number;
  perDayRate: number | null;
  days: number | null;
  paidAt: string | null;
  canResend: boolean;
}
```

- [ ] **Step 2: Add `cateringOrderId` to `DashboardOrderSummary` and `deposit` to `DashboardOrderDetailResponse`**

Update `DashboardOrderSummary`:
```typescript
export interface DashboardOrderSummary {
  id: string;
  cateringOrderId: string | null;  // null = no catering added yet
  status: string;
  adminReviewStatus: string;
  memberEmail: string;
  memberName: string | null;
  roomLocationDetails: string | null;
  bookingReference: string;
  subtotal: number;
  venueHireFee: number;
  total: number;
  itemCount: number;
  estimatedDelivery: string | null;
  createdAt: string;
}
```

Update `DashboardOrderDetailResponse`:
```typescript
export interface DashboardOrderDetailResponse {
  id: string;
  status: string;
  adminReviewStatus: string;
  adminReviewedAt: string | null;
  member: DashboardOrderMember;
  booking: DashboardOrderBooking;
  mealSessions: DashboardOrderMealSession[];
  items: DashboardOrderItem[];
  total: DashboardOrderTotal;
  additionalAnswers: Record<string, string> | null;
  eventDate: string | null;
  createdAt: string;
  estimatedDelivery: string | null;
  deposit: CoworkingOrderDepositInfo;  // new field
}
```

- [ ] **Step 3: Verify TypeScript compiles with no new errors**

```bash
cd /Users/arnavvaish/Code/Swift/halkinsWebsite
npx tsc --noEmit 2>&1 | head -40
```

Expected: same errors as before (if any) — no new type errors introduced.

- [ ] **Step 4: Commit**

```bash
git add types/api/coworking-dashboard.api.types.ts
git commit -m "feat: update dashboard types for deposit_paid order flow"
```

---

## Task 2: Update `OrdersList` Component

**Files:**
- Modify: `lib/components/coworking-dashboard/OrdersList.tsx`

**Props changing:**
- Remove: `onQuickApprove: (orderId: string) => Promise<void>`
- Add: `awaitingCateringCount: number`

- [ ] **Step 1: Update the props interface and status tab definitions**

Replace the `OrdersListProps` interface and `statusTabs` array at the top of the file:

```typescript
interface OrdersListProps {
  orders: DashboardOrderSummary[];
  activeStatus: DashboardOrderStatusFilter;
  pendingCount: number;
  awaitingCateringCount: number;
  onStatusChange: (status: DashboardOrderStatusFilter) => void;
  onOrderClick: (orderId: string) => void;
  loading: boolean;
}
```

```typescript
const statusTabs: {
  value: DashboardOrderStatusFilter;
  label: string;
  icon: typeof Clock;
  color: string;
}[] = [
  { value: "all", label: "All", icon: List, color: "bg-gray-100 text-gray-700" },
  { value: "awaiting_catering", label: "Awaiting Catering", icon: Clock, color: "bg-blue-100 text-blue-700" },
  { value: "needs_review", label: "Needs Review", icon: AlertTriangle, color: "bg-amber-100 text-amber-700" },
  { value: "upcoming", label: "Upcoming", icon: Clock, color: "bg-yellow-100 text-yellow-700" },
  { value: "active", label: "Active", icon: PlayCircle, color: "bg-blue-100 text-blue-700" },
  { value: "completed", label: "Completed", icon: CheckCircle, color: "bg-green-100 text-green-700" },
  { value: "cancelled", label: "Cancelled", icon: XCircle, color: "bg-red-100 text-red-700" },
];
```

- [ ] **Step 2: Add `deposit_paid` to status badge and label maps**

```typescript
const statusBadgeColor: Record<string, string> = {
  deposit_paid: "bg-blue-100 text-blue-800 border-blue-300",
  pending_review: "bg-yellow-100 text-yellow-800 border-yellow-300",
  pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
  admin_reviewed: "bg-blue-100 text-blue-800 border-blue-300",
  restaurant_reviewed: "bg-indigo-100 text-indigo-800 border-indigo-300",
  payment_link_sent: "bg-purple-100 text-purple-800 border-purple-300",
  paid: "bg-green-100 text-green-800 border-green-300",
  confirmed: "bg-green-100 text-green-800 border-green-300",
  preparing: "bg-indigo-100 text-indigo-800 border-indigo-300",
  ready: "bg-purple-100 text-purple-800 border-purple-300",
  delivered: "bg-green-100 text-green-800 border-green-300",
  completed: "bg-gray-100 text-gray-800 border-gray-300",
  cancelled: "bg-red-100 text-red-800 border-red-300",
};

const statusLabel: Record<string, string> = {
  deposit_paid: "Date Hold",
  pending_review: "Under Review",
  admin_reviewed: "Awaiting Restaurants",
  restaurant_reviewed: "Awaiting Payment",
  payment_link_sent: "Invoice Sent",
  paid: "Paid",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
};
```

- [ ] **Step 3: Update the tab badge rendering to include `awaitingCateringCount`**

In the tab button render loop, replace the badge logic so both `needs_review` and `awaiting_catering` show counts:

```typescript
{statusTabs.map((tab) => {
  const Icon = tab.icon;
  const isActive = activeStatus === tab.value;
  const isNeedsReview = tab.value === "needs_review";
  const isAwaitingCatering = tab.value === "awaiting_catering";
  const badgeCount = isNeedsReview
    ? pendingCount
    : isAwaitingCatering
    ? awaitingCateringCount
    : 0;

  return (
    <button
      key={tab.value}
      onClick={() => onStatusChange(tab.value)}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
        isActive
          ? isNeedsReview
            ? "bg-amber-100 text-amber-700 border border-amber-300"
            : isAwaitingCatering
            ? "bg-blue-100 text-blue-700 border border-blue-300"
            : "bg-primary/10 text-primary border border-primary/30"
          : "bg-gray-50 text-gray-600 hover:bg-gray-100 border border-transparent"
      }`}
    >
      <Icon className="h-4 w-4" />
      {tab.label}
      {badgeCount > 0 && (
        <span
          className={`ml-0.5 inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full text-xs font-bold text-white ${
            isNeedsReview ? "bg-amber-500" : "bg-blue-500"
          }`}
        >
          {badgeCount}
        </span>
      )}
    </button>
  );
})}
```

- [ ] **Step 4: Update the order row rendering — remove quick-approve, add `deposit_paid` row style**

Replace the entire order row render (the `orders.map` block) with:

```typescript
orders.map((order) => {
  const isDepositPaid = order.status === "deposit_paid";
  const needsReview = order.adminReviewStatus === "pending_admin_review";

  return (
    <div
      key={order.id}
      role="button"
      tabIndex={0}
      onClick={() => onOrderClick(order.id)}
      onKeyDown={(e) => handleRowKeyDown(e, order.id)}
      className={`w-full flex items-center gap-4 p-4 sm:px-6 sm:py-5 transition-colors text-left ${
        needsReview
          ? "border-l-4 border-amber-400 bg-amber-50/40 hover:bg-amber-50"
          : isDepositPaid
          ? "border-l-4 border-blue-300 bg-blue-50/30 hover:bg-blue-50/50"
          : "hover:bg-gray-50"
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1.5">
          {needsReview ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-amber-100 text-amber-800 border-amber-300">
              <AlertTriangle className="h-3 w-3" />
              Review Required
            </span>
          ) : (
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                statusBadgeColor[order.status] ||
                "bg-gray-100 text-gray-700 border-gray-300"
              }`}
            >
              {order.status === "pending_review" && order.adminReviewStatus === "approved"
                ? "Awaiting Swift Food Review"
                : statusLabel[order.status] || order.status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
            </span>
          )}
          <span className="text-xs text-gray-400">
            {formatDate(order.createdAt)}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
          <span className="flex items-center gap-1">
            <User className="h-3.5 w-3.5" />
            {order.memberName || order.memberEmail}
          </span>
          <span className="flex items-center gap-1">
            <Hash className="h-3.5 w-3.5" />
            {order.bookingReference}
          </span>
          {order.roomLocationDetails && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {order.roomLocationDetails}
            </span>
          )}
        </div>

        <div className="flex items-center gap-4 mt-1.5 text-sm">
          {isDepositPaid ? (
            <span className="text-blue-600 font-medium text-xs">
              Deposit paid · Awaiting catering
            </span>
          ) : (
            <>
              <span className="text-gray-500">
                {order.itemCount} item{order.itemCount !== 1 ? "s" : ""}
              </span>
              <span className="font-semibold text-gray-900">
                £{order.total.toFixed(2)}
              </span>
            </>
          )}
        </div>
      </div>

      <ChevronRight className="h-5 w-5 text-gray-300 flex-shrink-0" />
    </div>
  );
})
```

- [ ] **Step 5: Remove `approvingId` state and `handleQuickApprove` function, update destructuring**

Remove these from the component body:
- `const [approvingId, setApprovingId] = useState<string | null>(null);`
- The entire `handleQuickApprove` function

Update the destructured props (no `onQuickApprove`):
```typescript
export default function OrdersList({
  orders,
  activeStatus,
  pendingCount,
  awaitingCateringCount,
  onStatusChange,
  onOrderClick,
  loading,
}: OrdersListProps) {
```

Also remove the `Check` import from lucide-react since the approve button is gone (keep all others).

- [ ] **Step 6: Check TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -40
```

Expected: errors only from `CoworkingDashboard.tsx` about the changed props (will be fixed in Task 4).

- [ ] **Step 7: Commit**

```bash
git add lib/components/coworking-dashboard/OrdersList.tsx
git commit -m "feat: update OrdersList with awaiting_catering tab and deposit_paid row styling"
```

---

## Task 3: Update `OrderDetailModal` Component

**Files:**
- Modify: `lib/components/coworking-dashboard/OrderDetailModal.tsx`

**Key changes:**
- Add deposit info card (shown for all orders)
- For `deposit_paid` orders: show reject only, hide venue hire fee section
- For `pending_admin_review` orders: rename "Send Quote" → "Approve & Send Quote", remove `depositAmountInput`
- Remove `depositAmountInput` state and the "Customer Deposit" input entirely
- Add `deposit_paid` to status maps

- [ ] **Step 1: Add `deposit_paid` to status badge and label maps**

```typescript
const statusBadgeColor: Record<string, string> = {
  deposit_paid: "bg-blue-100 text-blue-800 border-blue-300",
  pending_review: "bg-yellow-100 text-yellow-800 border-yellow-300",
  pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
  admin_reviewed: "bg-blue-100 text-blue-800 border-blue-300",
  restaurant_reviewed: "bg-indigo-100 text-indigo-800 border-indigo-300",
  payment_link_sent: "bg-purple-100 text-purple-800 border-purple-300",
  paid: "bg-green-100 text-green-800 border-green-300",
  confirmed: "bg-green-100 text-green-800 border-green-300",
  preparing: "bg-indigo-100 text-indigo-800 border-indigo-300",
  ready: "bg-purple-100 text-purple-800 border-purple-300",
  delivered: "bg-green-100 text-green-800 border-green-300",
  completed: "bg-gray-100 text-gray-800 border-gray-300",
  cancelled: "bg-red-100 text-red-800 border-red-300",
};

const statusLabel: Record<string, string> = {
  deposit_paid: "Date Hold",
  pending_review: "Under Review",
  admin_reviewed: "Awaiting Restaurants",
  restaurant_reviewed: "Awaiting Payment",
  payment_link_sent: "Invoice Sent",
  paid: "Paid",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
};
```

- [ ] **Step 2: Remove dead state and update derived booleans**

Remove these state declarations:
```typescript
// REMOVE this line:
const [depositAmountInput, setDepositAmountInput] = useState("");
```

Update the derived booleans at the bottom of the state block:
```typescript
const isDepositPaid = order?.status === "deposit_paid";
const isPendingAdminReview = order?.adminReviewStatus === "pending_admin_review";
const needsReview = isPendingAdminReview;
const feeIsLocked = order
  ? ["paid", "confirmed", "completed", "cancelled"].includes(order.status)
  : false;
```

- [ ] **Step 3: Update `handleApprove` — remove deposit parameter**

Replace the `handleApprove` function:
```typescript
// REMOVE handleApprove entirely — approval is now done via handleSetVenueHireFee
// The "Approve & Send Quote" button will call handleSetVenueHireFee directly
```

- [ ] **Step 4: Add a deposit info card helper function**

Add this before the `return` statement in the component:

```typescript
function DepositInfoCard({ deposit }: { deposit: DashboardOrderDetailResponse['deposit'] }) {
  const paidDate = deposit.paidAt
    ? new Date(deposit.paidAt).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 mb-2">
        Deposit
      </p>
      <div className="flex items-center justify-between text-sm">
        <span className="text-blue-800 font-semibold">
          £{deposit.amount.toFixed(2)}
        </span>
        <span className="text-blue-600 text-xs">
          {deposit.status === "paid" ? "Paid" : deposit.status}
          {paidDate ? ` · ${paidDate}` : ""}
        </span>
      </div>
      {deposit.perDayRate != null && deposit.days != null && (
        <p className="text-xs text-blue-500 mt-1">
          £{deposit.perDayRate}/day × {deposit.days} day{deposit.days !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
```

Note: define this outside the `OrderDetailModal` function, above it.

- [ ] **Step 5: Update the order detail content — add deposit card, conditional action section**

Inside the main order detail `<div className="space-y-6">`, after the booking section and before the responses button, add the deposit card:

```typescript
{order.deposit && (
  <DepositInfoCard deposit={order.deposit} />
)}
```

Replace the entire `{isPending && (...)}` block at the bottom of the detail pane with this:

```typescript
{/* Action section — only shown for deposit_paid (reject only) or pending_admin_review (approve + reject) */}
{(isDepositPaid || isPendingAdminReview) && (
  <div className="space-y-3 border-t border-gray-200 pt-2">
    {actionError && (
      <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        {actionError}
      </div>
    )}

    {showRejectInput ? (
      <div className="space-y-3">
        <textarea
          value={rejectReason}
          onChange={(event) => setRejectReason(event.target.value)}
          placeholder="Reason for rejection (optional)"
          className="w-full resize-none rounded-lg border border-gray-300 p-3 text-sm focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-300"
          rows={2}
          maxLength={500}
        />
        <div className="flex gap-2">
          <button
            onClick={handleReject}
            disabled={actionLoading !== null}
            className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {actionLoading === "reject" ? "Rejecting..." : "Confirm Reject"}
          </button>
          <button
            onClick={() => {
              setShowRejectInput(false);
              setRejectReason("");
            }}
            disabled={actionLoading !== null}
            className="rounded-lg px-4 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100"
          >
            Cancel
          </button>
        </div>
      </div>
    ) : (
      <div className="space-y-3">
        {/* Venue hire fee + approve — only for pending_admin_review */}
        {isPendingAdminReview && !feeIsLocked && (
          <div className="space-y-2 rounded-lg border border-indigo-200 bg-indigo-50 p-3">
            <div className="flex items-center gap-1.5">
              <label className="block text-xs font-semibold text-indigo-700">
                Venue Hire Fee
              </label>
              <div className="group relative">
                <Info className="h-3.5 w-3.5 cursor-help text-indigo-400" />
                <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-72 -translate-x-1/2 rounded-lg bg-gray-900 p-3 text-xs leading-relaxed text-white opacity-0 shadow-lg transition-opacity group-hover:pointer-events-auto group-hover:opacity-100">
                  <p className="mb-2 font-semibold">How approval works:</p>
                  <ul className="list-disc space-y-1 pl-3.5">
                    <li>Set the venue hire fee and click Approve & Send Quote.</li>
                    <li>The customer receives an email with the full order breakdown.</li>
                    <li>Swift Food is unblocked to accept the catering order.</li>
                    <li>You can update the fee and resend until the customer pays.</li>
                    <li>Once paid, the fee can no longer be changed.</li>
                  </ul>
                  <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">£</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={venueHireFeeInput}
                  onChange={(e) => setVenueHireFeeInput(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-lg border border-indigo-300 py-2 pl-7 pr-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>
              <button
                onClick={handleSetVenueHireFee}
                disabled={actionLoading !== null || !venueHireFeeInput}
                className="whitespace-nowrap rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {actionLoading === "setFee" ? "Sending..." : "Approve & Send Quote"}
              </button>
            </div>
          </div>
        )}

        {/* Reject button — shown for both deposit_paid and pending_admin_review */}
        <button
          onClick={() => setShowRejectInput(true)}
          disabled={actionLoading !== null}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <XCircle className="h-4 w-4" />
          Reject Order
        </button>
      </div>
    )}
  </div>
)}
```

- [ ] **Step 6: Update the Summary section — hide venue hire fee input for `deposit_paid` orders**

The venue hire fee input in the Summary card is already inside `{!feeIsLocked && (...)}`. Wrap the entire venue hire fee block (both the locked display and the input) to also hide it when `isDepositPaid`:

```typescript
{/* In the Summary card, replace the venueHireFee section: */}
{!isDepositPaid && (
  <>
    {feeIsLocked ? (
      <div className="flex justify-between text-sm text-gray-700">
        <span>Event Hire Fee</span>
        <span className="font-semibold">
          {formatCurrency(order.total.venueHireFee || 0)}
        </span>
      </div>
    ) : (
      <div className="space-y-2 rounded-lg border border-indigo-200 bg-indigo-50 p-3">
        {/* ... existing venue hire fee input, unchanged ... */}
      </div>
    )}
  </>
)}
```

Also update the Total line to not add venueHireFee for deposit_paid orders:
```typescript
<div className="flex justify-between border-t border-gray-200 pt-2 text-base font-bold text-gray-900">
  <span>Total</span>
  <span className="text-primary">
    {isDepositPaid
      ? formatCurrency(order.total.subtotal + order.total.deliveryFee)
      : formatCurrency(
          order.total.subtotal +
          order.total.deliveryFee +
          (parseFloat(venueHireFeeInput) || 0)
        )}
  </span>
</div>
```

- [ ] **Step 7: Remove the `Check` import (no longer used) and `approveOrder` call**

The `Check` icon import and the entire `handleApprove` function should be removed. Verify `Check` is no longer referenced anywhere in the file before removing its import.

- [ ] **Step 8: Check TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -40
```

Expected: errors only from `CoworkingDashboard.tsx` about props (will be fixed in Task 4).

- [ ] **Step 9: Commit**

```bash
git add lib/components/coworking-dashboard/OrderDetailModal.tsx
git commit -m "feat: update OrderDetailModal with deposit info, conditional actions per order type"
```

---

## Task 4: Update `CoworkingDashboard` Component

**Files:**
- Modify: `lib/components/coworking-dashboard/CoworkingDashboard.tsx`

- [ ] **Step 1: Update the `fetchOrders` filter mapping**

In `CoworkingDashboardInner`, update the `fetchOrders` callback to handle the new `awaiting_catering` frontend filter:

```typescript
const fetchOrders = useCallback(async () => {
  if (!spaceId) return;
  setOrdersLoading(true);
  try {
    // Map frontend filter values to API status values
    let apiStatus: string;
    if (activeStatus === "needs_review") {
      apiStatus = "all";
    } else if (activeStatus === "awaiting_catering") {
      apiStatus = "deposit_paid";
    } else {
      apiStatus = activeStatus;
    }

    const data = await coworkingDashboardService.getOrders(spaceId, {
      status: apiStatus as any,
      limit: 50,
    });

    const filtered =
      activeStatus === "needs_review"
        ? data.orders.filter(
            (o) => o.adminReviewStatus === "pending_admin_review",
          )
        : data.orders;

    setOrders(filtered);
  } catch (err: unknown) {
    console.error("Failed to fetch orders:", err);
  } finally {
    setOrdersLoading(false);
  }
}, [spaceId, activeStatus]);
```

- [ ] **Step 2: Remove `handleQuickApprove`, add `awaitingCateringCount`**

Remove the entire `handleQuickApprove` callback:
```typescript
// DELETE this entire block:
// const handleQuickApprove = useCallback(
//   async (orderId: string) => { ... },
//   [spaceId, fetchOrders],
// );
```

Update the count computations:
```typescript
// Keep pendingCount for needs_review badge
const pendingCount = orders.filter(
  (o) => o.adminReviewStatus === "pending_admin_review",
).length;

// Add awaitingCateringCount for awaiting_catering badge
const awaitingCateringCount = orders.filter(
  (o) => o.status === "deposit_paid",
).length;
```

- [ ] **Step 3: Update the `OrdersList` JSX — add `awaitingCateringCount`, remove `onQuickApprove`**

```typescript
{spaceId && (
  <OrdersList
    orders={orders}
    activeStatus={activeStatus}
    pendingCount={pendingCount}
    awaitingCateringCount={awaitingCateringCount}
    onStatusChange={setActiveStatus}
    onOrderClick={setSelectedOrderId}
    loading={ordersLoading}
  />
)}
```

- [ ] **Step 4: Update the pending-approval banner to also show awaiting catering**

Replace the single banner with two separate banners:

```typescript
{/* Needs review banner */}
{spaceId && pendingCount > 0 && activeStatus !== "needs_review" && (
  <button
    onClick={() => setActiveStatus("needs_review")}
    className="w-full flex items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3.5 text-left hover:bg-amber-100 transition-colors"
  >
    <span className="flex items-center gap-3">
      <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
      <span className="text-sm font-semibold text-amber-800">
        {pendingCount} order{pendingCount !== 1 ? "s" : ""} need
        {pendingCount === 1 ? "s" : ""} your approval
      </span>
    </span>
    <span className="text-xs font-semibold text-amber-700 underline underline-offset-2">
      Review now
    </span>
  </button>
)}

{/* Awaiting catering banner */}
{spaceId && awaitingCateringCount > 0 && activeStatus !== "awaiting_catering" && (
  <button
    onClick={() => setActiveStatus("awaiting_catering")}
    className="w-full flex items-center justify-between gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3.5 text-left hover:bg-blue-100 transition-colors"
  >
    <span className="flex items-center gap-3">
      <Clock className="h-5 w-5 text-blue-500 flex-shrink-0" />
      <span className="text-sm font-semibold text-blue-800">
        {awaitingCateringCount} venue hold{awaitingCateringCount !== 1 ? "s" : ""} awaiting catering
      </span>
    </span>
    <span className="text-xs font-semibold text-blue-700 underline underline-offset-2">
      View
    </span>
  </button>
)}
```

Make sure `Clock` is imported from lucide-react (it likely already is).

- [ ] **Step 5: Check TypeScript compiles cleanly**

```bash
npx tsc --noEmit 2>&1 | head -40
```

Expected: no errors related to these files.

- [ ] **Step 6: Commit**

```bash
git add lib/components/coworking-dashboard/CoworkingDashboard.tsx
git commit -m "feat: wire up awaiting_catering filter, dual banners, remove quick-approve"
```

---

## Task 5: Remove Dead `approveOrder` Service Method

**Files:**
- Modify: `services/api/coworking-dashboard.api.ts`

The `approveOrder` method calls an endpoint that no longer exists. Approval is now done via `setVenueHireFee`.

- [ ] **Step 1: Remove `approveOrder` from the service**

Delete the entire `approveOrder` method (lines ~145–165 in the file):
```typescript
// DELETE this entire method:
// async approveOrder(
//   spaceId: string,
//   orderId: string,
//   depositAmount?: number,
// ): Promise<DashboardOrderDetailResponse> { ... }
```

- [ ] **Step 2: Verify no remaining references to `approveOrder`**

```bash
grep -r "approveOrder" /Users/arnavvaish/Code/Swift/halkinsWebsite/lib /Users/arnavvaish/Code/Swift/halkinsWebsite/services /Users/arnavvaish/Code/Swift/halkinsWebsite/types
```

Expected: no results.

- [ ] **Step 3: Check TypeScript compiles cleanly**

```bash
npx tsc --noEmit 2>&1 | head -40
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add services/api/coworking-dashboard.api.ts
git commit -m "chore: remove dead approveOrder service method"
```

---

## Task 6: Manual Verification

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Verify `deposit_paid` orders**
  - Log into the dashboard
  - Switch to "Awaiting Catering" tab — confirm only `deposit_paid` orders appear
  - Open a `deposit_paid` order detail modal — confirm:
    - Blue "Date Hold" badge
    - Deposit info card is shown
    - No venue hire fee section
    - Only "Reject Order" button is visible (no approve)

- [ ] **Step 3: Verify `pending_admin_review` orders**
  - Switch to "Needs Review" tab — confirm only catering orders appear
  - Open a `pending_admin_review` order detail modal — confirm:
    - Amber "Review Required" badge
    - Deposit info card is shown
    - Venue hire fee input with "Approve & Send Quote" button
    - "Reject Order" button
    - No "Approve Order" button, no deposit amount input

- [ ] **Step 4: Verify banners**
  - On "All" tab, if there are `pending_admin_review` orders → amber banner shows
  - On "All" tab, if there are `deposit_paid` orders → blue banner shows
  - Clicking a banner navigates to the correct tab

- [ ] **Step 5: Verify tab badges**
  - "Awaiting Catering" tab shows blue count badge when `deposit_paid` orders exist
  - "Needs Review" tab shows amber count badge when `pending_admin_review` orders exist
