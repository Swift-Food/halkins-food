# Coworking Stripe Payments Dashboard Design

## Context

The coworking partner dashboard needs a Payments section with: Stripe onboarding, balance display, self-serve withdrawals, and transaction history. Stripe onboarding backend + basic frontend already exist. This design covers what's new.

## What Exists

**Backend (complete):**
- `GET/POST /:spaceId/stripe/status|setup|refresh` — onboarding flow
- `PaymentService` with `getAccountBalance()`, `createPayout()`, `checkAccountStatus()`
- `WithdrawalService` for restaurants/drivers (reusable pattern)
- `CoworkingSpace` entity has `stripeAccountId`, `stripeOnboardingComplete`
- `CoworkingOrder` entity has `venueHireTransferDetails` JSONB (stores transferId, amount, transferredAt)

**Frontend (complete):**
- `StripeSettings.tsx` — 3-state onboarding UI (not connected / incomplete / connected)
- API service methods for Stripe setup/status/refresh
- Dashboard with stats cards + orders list

## Design

### Navigation Change

Replace the current Settings toggle button with a **tab bar** below the header:

```
[ Orders ]  [ Payments ]
```

- "Orders" tab shows the existing stats + orders list
- "Payments" tab shows the new payments section
- Active tab: pink underline + bold text (matching existing pink theme)
- Default tab: Orders

### Payments Tab — Two States

**State 1: Not onboarded (no Stripe account or onboarding incomplete)**
- Shows the existing `StripeSettings` onboarding component (unchanged)

**State 2: Onboarded**

```
┌─────────────────────────────────────────────────┐
│  Balance                                         │
│                                                   │
│  £1,234.56           £200.00                     │
│  Available           Pending                      │
│                                                   │
│  [ Withdraw Funds ]          ✓ Stripe Connected  │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  Transaction History                              │
│                                                   │
│  ┌─ Filters: [ All | Transfers | Withdrawals ] ─┐│
│  │                                               ││
│  │  9 Mar   Venue hire - #ORD-ABC123   +£45.00  ││
│  │  8 Mar   Withdrawal to bank         -£500.00 ││
│  │  8 Mar   Venue hire - #ORD-DEF456   +£32.50  ││
│  │  7 Mar   Venue hire - #ORD-GHI789   +£28.00  ││
│  │  ...                                          ││
│  └───────────────────────────────────────────────┘│
└─────────────────────────────────────────────────┘
```

**Balance Card:**
- White card, same border/shadow as stats cards
- Available balance: large bold number (2xl/3xl)
- Pending balance: smaller, gray text
- "Withdraw Funds" button: pink primary style
- Green "Stripe Connected" badge bottom-right
- If balance is 0: withdraw button is disabled

**Withdraw Flow:**
- Click "Withdraw Funds" -> modal with amount input (pre-filled with available balance)
- Confirm button creates payout directly to their bank (no admin approval)
- Success: toast/banner, refresh balance
- Error: show error message in modal

**Transaction History:**
- Filter tabs: All | Transfers (venue hire fees in) | Withdrawals (money out)
- Each row: date, description, amount (green +/red -)
- Transfers sourced from `CoworkingOrder.venueHireTransferDetails`
- Withdrawals sourced from withdrawal requests table
- Paginated, most recent first

### Backend — New Endpoints

**CoworkingDashboardController** (3 new endpoints):

1. `GET /:spaceId/stripe/balance`
   - Calls `PaymentService.getAccountBalance(stripeAccountId)`
   - Returns `{ available: number, pending: number, currency: string }`

2. `POST /:spaceId/stripe/withdraw`
   - Body: `{ amount: number }`
   - Validates: amount > 0, amount <= available balance
   - Calls `PaymentService.createPayout()` directly (self-serve, no approval)
   - Stores record in `withdrawal_requests` table with status COMPLETED
   - Returns `{ success: true, amount, payoutId }`

3. `GET /:spaceId/stripe/transactions`
   - Query params: `type` (all|transfers|withdrawals), `page`, `limit`
   - Merges two data sources:
     - Venue hire transfers: query `CoworkingOrder` where `venueHireTransferDetails IS NOT NULL` and order's space matches
     - Withdrawals: query `withdrawal_requests` where userId = spaceId and userType = COWORKING
   - Returns unified list sorted by date desc
   - Each item: `{ date, type, description, amount, status, reference }`

**WithdrawalRequest entity:**
- Add `COWORKING` to the `UserType` enum (alongside RESTAURANT, DRIVER, EVENT_ORGANIZER)

### Frontend — New Files

1. **`PaymentsTab.tsx`** — orchestrates the payments section
   - Fetches Stripe status on mount
   - If not onboarded: renders existing `StripeSettings`
   - If onboarded: renders `BalanceCard` + `TransactionHistory`

2. **`BalanceCard.tsx`** — balance display + withdraw button
   - Fetches balance from new endpoint
   - Shows available/pending
   - Withdraw button opens modal

3. **`WithdrawModal.tsx`** — withdrawal confirmation modal
   - Amount input (pre-filled with available)
   - Confirm/cancel
   - Loading + success/error states

4. **`TransactionHistory.tsx`** — filterable transaction list
   - Filter tabs (all/transfers/withdrawals)
   - Paginated list
   - Each row styled with green/red amounts

### Frontend — Modified Files

1. **`CoworkingDashboard.tsx`** — replace Settings toggle with tab bar
2. **`coworking-dashboard.api.ts`** — add 3 new API methods
3. **`api.ts` constants** — add 3 new endpoint constants

### Styling

- Matches existing pink/gray theme
- White rounded-xl cards with gray-100 borders
- Pink-500 for primary buttons and active states
- Green for positive amounts/connected status
- Red for negative amounts/errors
- Lucide icons throughout (consistent with existing)
