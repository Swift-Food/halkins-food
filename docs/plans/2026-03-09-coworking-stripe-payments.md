# Coworking Stripe Payments Dashboard — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a Payments tab to the coworking partner dashboard with balance display, self-serve withdrawals, and transaction history.

**Architecture:** Extend the existing coworking dashboard (backend + halkins-food frontend). Backend adds 3 new endpoints to `CoworkingDashboardController` using the existing `PaymentService`. Frontend replaces Settings toggle with Orders/Payments tabs, and adds 4 new components for the Payments view.

**Tech Stack:** NestJS (backend), Next.js + React (frontend), TypeORM, Stripe API, Tailwind CSS + DaisyUI, Lucide icons.

---

### Task 1: Add COWORKING to UserType enum + DB migration

**Files:**
- Modify: `backend/src/shared/entities/payments/withdrawal-request.entity.ts`
- Create: `backend/src/migrations/<timestamp>-AddCoworkingUserType.ts`

**Step 1: Add COWORKING to the UserType enum**

In `backend/src/shared/entities/payments/withdrawal-request.entity.ts`, add to the `UserType` enum:

```typescript
export enum UserType {
    RESTAURANT = 'restaurant',
    DRIVER = 'driver',
    EVENT_ORGANIZER = 'event_organizer',
    COWORKING = 'coworking',
}
```

**Step 2: Create migration for the enum change**

Create `backend/src/migrations/1773200000000-AddCoworkingUserType.ts`:

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCoworkingUserType1773200000000 implements MigrationInterface {
  name = 'AddCoworkingUserType1773200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."withdrawal_requests_usertype_enum" ADD VALUE IF NOT EXISTS 'coworking'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL doesn't support removing enum values; no-op
  }
}
```

**Step 3: Verify build**

Run: `cd backend && npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add src/shared/entities/payments/withdrawal-request.entity.ts src/migrations/1773200000000-AddCoworkingUserType.ts
git commit -m "feat: add COWORKING to UserType enum with migration"
```

---

### Task 2: Backend — balance, withdraw, and transactions endpoints

**Files:**
- Modify: `backend/src/features/coworking/controllers/coworking-dashboard.controller.ts`
- Modify: `backend/src/features/coworking/services/coworking-dashboard.service.ts`
- Modify: `backend/src/features/coworking/dto/coworking-dashboard.dto.ts`
- Modify: `backend/src/features/coworking/coworking.module.ts`

**Step 1: Add WithdrawalRequest to module imports**

In `backend/src/features/coworking/coworking.module.ts`, add `WithdrawalRequest` to `TypeOrmModule.forFeature`:

```typescript
import { WithdrawalRequest } from 'src/shared/entities/payments/withdrawal-request.entity';

// In the imports array:
TypeOrmModule.forFeature([
  // ...existing entities...
  WithdrawalRequest,
]),
```

**Step 2: Add DTOs for new endpoints**

In `backend/src/features/coworking/dto/coworking-dashboard.dto.ts`, add:

```typescript
// Add these imports at top
import { IsNumber, IsOptional, IsEnum, Min, IsString } from 'class-validator';
import { Type } from 'class-transformer';

// Add at bottom of file:

export class WithdrawFundsDto {
  @IsNumber()
  @Min(0.50)
  @Type(() => Number)
  amount: number;
}

export class TransactionQueryDto {
  @IsOptional()
  @IsEnum(['all', 'transfers', 'withdrawals'])
  type?: 'all' | 'transfers' | 'withdrawals' = 'all';

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 20;
}
```

**Step 3: Add service methods**

In `backend/src/features/coworking/services/coworking-dashboard.service.ts`, add these imports and inject `WithdrawalRequest`:

```typescript
import { WithdrawalRequest, WithdrawalStatus, UserType } from 'src/shared/entities/payments/withdrawal-request.entity';
```

Add to constructor:

```typescript
@InjectRepository(WithdrawalRequest)
private readonly withdrawalRepo: Repository<WithdrawalRequest>,
```

Add these methods at the end of the class (before the closing `}`):

```typescript
  // =========================================================================
  // BALANCE, WITHDRAWALS & TRANSACTIONS
  // =========================================================================

  async getBalance(spaceId: string): Promise<{ available: number; pending: number; currency: string }> {
    const space = await this.spaceRepo.findOne({ where: { id: spaceId } });
    if (!space) throw new NotFoundException('Coworking space not found');
    if (!space.stripeAccountId || !space.stripeOnboardingComplete) {
      throw new BadRequestException('Stripe account not set up');
    }

    return this.paymentService.getAccountBalance(space.stripeAccountId);
  }

  async withdrawFunds(spaceId: string, amount: number): Promise<{ success: boolean; amount: number; payoutId: string }> {
    const space = await this.spaceRepo.findOne({ where: { id: spaceId } });
    if (!space) throw new NotFoundException('Coworking space not found');
    if (!space.stripeAccountId || !space.stripeOnboardingComplete) {
      throw new BadRequestException('Stripe account not set up');
    }

    // Check balance
    const balance = await this.paymentService.getAccountBalance(space.stripeAccountId);
    if (amount > balance.available) {
      throw new BadRequestException(`Insufficient balance. Available: £${balance.available.toFixed(2)}`);
    }

    // Create payout via Stripe
    const payout = await this.paymentService.createPayout({
      accountId: space.stripeAccountId,
      amount: Math.round(amount * 100), // Convert to pence
      currency: 'gbp',
      description: `Withdrawal - ${space.name}`,
      metadata: { spaceId, type: 'coworking_withdrawal' },
    });

    // Record in withdrawal_requests table
    const withdrawal = this.withdrawalRepo.create({
      userId: spaceId,
      userType: UserType.COWORKING,
      stripeAccountId: space.stripeAccountId,
      amount,
      feeCharged: 0,
      netAmount: amount,
      status: WithdrawalStatus.COMPLETED,
      stripePayoutId: payout.id,
      notes: 'Self-serve withdrawal from dashboard',
    });
    await this.withdrawalRepo.save(withdrawal);

    this.logger.log(`Withdrawal of £${amount.toFixed(2)} completed for space ${spaceId}, payout: ${payout.id}`);

    return { success: true, amount, payoutId: payout.id };
  }

  async getTransactions(
    spaceId: string,
    type: 'all' | 'transfers' | 'withdrawals' = 'all',
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    transactions: Array<{
      date: string;
      type: 'transfer' | 'withdrawal';
      description: string;
      amount: number;
      status: string;
      reference: string | null;
    }>;
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const transactions: Array<{
      date: string;
      type: 'transfer' | 'withdrawal';
      description: string;
      amount: number;
      status: string;
      reference: string | null;
    }> = [];

    // Venue hire transfers
    if (type === 'all' || type === 'transfers') {
      const transfers = await this.coworkingOrderRepo.find({
        where: {
          coworkingSpaceId: spaceId,
          venueHireTransferDetails: Not(IsNull()),
        },
        relations: ['cateringOrder'],
        order: { createdAt: 'DESC' },
      });

      for (const order of transfers) {
        const details = order.venueHireTransferDetails;
        if (details) {
          transactions.push({
            date: details.transferredAt,
            type: 'transfer',
            description: `Venue hire fee - Order #${order.cateringOrderId.slice(0, 8).toUpperCase()}`,
            amount: details.amount / 100, // Convert from pence
            status: 'completed',
            reference: details.transferId,
          });
        }
      }
    }

    // Withdrawals
    if (type === 'all' || type === 'withdrawals') {
      const withdrawals = await this.withdrawalRepo.find({
        where: {
          userId: spaceId,
          userType: UserType.COWORKING,
        },
        order: { requestedAt: 'DESC' },
      });

      for (const w of withdrawals) {
        transactions.push({
          date: w.requestedAt.toISOString(),
          type: 'withdrawal',
          description: 'Withdrawal to bank',
          amount: -Number(w.amount),
          status: w.status,
          reference: w.stripePayoutId || null,
        });
      }
    }

    // Sort by date descending
    transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Paginate
    const total = transactions.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const paginated = transactions.slice(start, start + limit);

    return {
      transactions: paginated,
      pagination: { page, limit, total, totalPages },
    };
  }
```

Note: You'll need to add these TypeORM imports at the top of the service file:

```typescript
import { Not, IsNull } from 'typeorm';
```

**Step 4: Add controller endpoints**

In `backend/src/features/coworking/controllers/coworking-dashboard.controller.ts`, add the import for the new DTOs:

```typescript
import {
  // ...existing imports...
  WithdrawFundsDto,
  TransactionQueryDto,
} from '../dto/coworking-dashboard.dto';
```

Add these endpoints at the bottom of the class (before closing `}`):

```typescript
  // =========================================================================
  // BALANCE, WITHDRAWALS & TRANSACTIONS
  // =========================================================================

  @Get(':spaceId/stripe/balance')
  async getBalance(
    @Param('spaceId', ParseUUIDPipe) spaceId: string,
  ) {
    return this.dashboardService.getBalance(spaceId);
  }

  @Post(':spaceId/stripe/withdraw')
  @HttpCode(HttpStatus.OK)
  async withdrawFunds(
    @Param('spaceId', ParseUUIDPipe) spaceId: string,
    @Body() dto: WithdrawFundsDto,
  ) {
    return this.dashboardService.withdrawFunds(spaceId, dto.amount);
  }

  @Get(':spaceId/stripe/transactions')
  async getTransactions(
    @Param('spaceId', ParseUUIDPipe) spaceId: string,
    @Query() query: TransactionQueryDto,
  ) {
    return this.dashboardService.getTransactions(
      spaceId,
      query.type,
      query.page,
      query.limit,
    );
  }
```

**Step 5: Verify build**

Run: `cd backend && npx tsc --noEmit`
Expected: No errors

**Step 6: Commit**

```bash
git add src/features/coworking/
git commit -m "feat: add balance, withdraw, and transactions endpoints for coworking dashboard"
```

---

### Task 3: Frontend — API constants, service methods, and types

**Files:**
- Modify: `halkins-food/lib/constants/api.ts`
- Modify: `halkins-food/services/api/coworking-dashboard.api.ts`
- Modify: `halkins-food/types/api/coworking-dashboard.api.types.ts`

**Step 1: Add API endpoint constants**

In `halkins-food/lib/constants/api.ts`, add after the existing Stripe constants:

```typescript
  COWORKING_DASHBOARD_STRIPE_BALANCE: (spaceId: string) =>
    `/coworking-dashboard/${spaceId}/stripe/balance`,
  COWORKING_DASHBOARD_STRIPE_WITHDRAW: (spaceId: string) =>
    `/coworking-dashboard/${spaceId}/stripe/withdraw`,
  COWORKING_DASHBOARD_STRIPE_TRANSACTIONS: (spaceId: string) =>
    `/coworking-dashboard/${spaceId}/stripe/transactions`,
```

**Step 2: Add types**

In `halkins-food/types/api/coworking-dashboard.api.types.ts`, add at the bottom:

```typescript
// ============================================================================
// PAYMENTS & TRANSACTIONS
// ============================================================================

export interface StripeBalance {
  available: number;
  pending: number;
  currency: string;
}

export interface WithdrawResponse {
  success: boolean;
  amount: number;
  payoutId: string;
}

export interface Transaction {
  date: string;
  type: 'transfer' | 'withdrawal';
  description: string;
  amount: number;
  status: string;
  reference: string | null;
}

export interface TransactionsResponse {
  transactions: Transaction[];
  pagination: PaginationInfo;
}

export type TransactionFilter = 'all' | 'transfers' | 'withdrawals';
```

**Step 3: Add API service methods**

In `halkins-food/services/api/coworking-dashboard.api.ts`, add these imports at the top:

```typescript
import type {
  StripeBalance,
  WithdrawResponse,
  TransactionsResponse,
  TransactionFilter,
} from '@/types/api';
```

Note: These types may need to be re-exported from the `@/types/api` barrel file. Check if `halkins-food/types/api/index.ts` exists and exports from `coworking-dashboard.api.types.ts`. If so, add the new types to the export.

Add these methods to the `CoworkingDashboardService` class, inside the STRIPE ACCOUNT MANAGEMENT section:

```typescript
  async getBalance(spaceId: string): Promise<StripeBalance> {
    const response = await fetchWithAuth(
      `${API_BASE_URL}${API_ENDPOINTS.COWORKING_DASHBOARD_STRIPE_BALANCE(spaceId)}`
    );
    if (!response.ok) {
      throw new Error('Failed to fetch balance');
    }
    return response.json();
  }

  async withdrawFunds(spaceId: string, amount: number): Promise<WithdrawResponse> {
    const response = await fetchWithAuth(
      `${API_BASE_URL}${API_ENDPOINTS.COWORKING_DASHBOARD_STRIPE_WITHDRAW(spaceId)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      }
    );
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Failed to withdraw funds');
    }
    return response.json();
  }

  async getTransactions(
    spaceId: string,
    type: TransactionFilter = 'all',
    page: number = 1,
    limit: number = 20,
  ): Promise<TransactionsResponse> {
    const params = new URLSearchParams();
    if (type !== 'all') params.append('type', type);
    if (page > 1) params.append('page', page.toString());
    params.append('limit', limit.toString());

    const queryString = params.toString();
    const url = `${API_BASE_URL}${API_ENDPOINTS.COWORKING_DASHBOARD_STRIPE_TRANSACTIONS(spaceId)}${
      queryString ? `?${queryString}` : ''
    }`;

    const response = await fetchWithAuth(url);
    if (!response.ok) {
      throw new Error('Failed to fetch transactions');
    }
    return response.json();
  }
```

**Step 4: Verify build**

Run: `cd halkins-food && npx tsc --noEmit`
Expected: No errors

**Step 5: Commit**

```bash
git add lib/constants/api.ts services/api/coworking-dashboard.api.ts types/
git commit -m "feat: add balance, withdraw, and transactions API methods"
```

---

### Task 4: Frontend — BalanceCard component

**Files:**
- Create: `halkins-food/lib/components/coworking-dashboard/BalanceCard.tsx`

**Step 1: Create BalanceCard component**

Create `halkins-food/lib/components/coworking-dashboard/BalanceCard.tsx`:

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { coworkingDashboardService } from "@/services/api/coworking-dashboard.api";
import { Wallet, CheckCircle, ArrowUpRight } from "lucide-react";
import type { StripeBalance } from "@/types/api";

interface BalanceCardProps {
  spaceId: string;
  onWithdrawClick: () => void;
}

export default function BalanceCard({ spaceId, onWithdrawClick }: BalanceCardProps) {
  const [balance, setBalance] = useState<StripeBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchBalance = useCallback(async () => {
    try {
      setError("");
      const data = await coworkingDashboardService.getBalance(spaceId);
      setBalance(data);
    } catch (err: any) {
      setError(err.message || "Failed to fetch balance");
    } finally {
      setLoading(false);
    }
  }, [spaceId]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-center py-8">
          <span className="loading loading-spinner loading-md text-pink-500" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-pink-50 text-pink-600">
            <Wallet className="h-5 w-5" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Balance</h3>
        </div>
        <div className="flex items-center gap-1.5 text-sm text-green-600">
          <CheckCircle className="h-4 w-4" />
          <span>Stripe Connected</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="flex gap-8">
          <div>
            <p className="text-3xl font-bold text-gray-900">
              £{(balance?.available ?? 0).toFixed(2)}
            </p>
            <p className="text-sm text-gray-500 mt-1">Available</p>
          </div>
          <div>
            <p className="text-xl font-semibold text-gray-400">
              £{(balance?.pending ?? 0).toFixed(2)}
            </p>
            <p className="text-sm text-gray-500 mt-1">Pending</p>
          </div>
        </div>

        <button
          onClick={onWithdrawClick}
          disabled={!balance || balance.available <= 0}
          className="btn bg-pink-500 hover:bg-pink-600 border-none text-white gap-2 disabled:bg-gray-300 disabled:text-gray-500"
        >
          <ArrowUpRight className="h-4 w-4" />
          Withdraw Funds
        </button>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add lib/components/coworking-dashboard/BalanceCard.tsx
git commit -m "feat: add BalanceCard component for coworking dashboard"
```

---

### Task 5: Frontend — WithdrawModal component

**Files:**
- Create: `halkins-food/lib/components/coworking-dashboard/WithdrawModal.tsx`

**Step 1: Create WithdrawModal component**

Create `halkins-food/lib/components/coworking-dashboard/WithdrawModal.tsx`:

```tsx
"use client";

import { useState } from "react";
import { coworkingDashboardService } from "@/services/api/coworking-dashboard.api";
import { X, ArrowUpRight, CheckCircle } from "lucide-react";

interface WithdrawModalProps {
  spaceId: string;
  availableBalance: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function WithdrawModal({
  spaceId,
  availableBalance,
  onClose,
  onSuccess,
}: WithdrawModalProps) {
  const [amount, setAmount] = useState(availableBalance.toFixed(2));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleWithdraw = async () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 0.5) {
      setError("Minimum withdrawal is £0.50");
      return;
    }
    if (numAmount > availableBalance) {
      setError(`Maximum withdrawal is £${availableBalance.toFixed(2)}`);
      return;
    }

    setLoading(true);
    setError("");
    try {
      await coworkingDashboardService.withdrawFunds(spaceId, numAmount);
      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Withdrawal failed");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Withdraw Funds</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {success ? (
          <div className="text-center py-6">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <p className="text-lg font-medium text-gray-900">Withdrawal successful!</p>
            <p className="text-sm text-gray-500 mt-1">
              £{parseFloat(amount).toFixed(2)} is on its way to your bank account.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount (GBP)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">£</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.50"
                  max={availableBalance}
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setError("");
                  }}
                  className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Available: £{availableBalance.toFixed(2)}
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 mb-4">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="btn btn-ghost flex-1"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleWithdraw}
                disabled={loading}
                className="btn bg-pink-500 hover:bg-pink-600 border-none text-white flex-1 gap-2"
              >
                {loading ? (
                  <span className="loading loading-spinner loading-sm" />
                ) : (
                  <ArrowUpRight className="h-4 w-4" />
                )}
                Confirm Withdrawal
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add lib/components/coworking-dashboard/WithdrawModal.tsx
git commit -m "feat: add WithdrawModal component for coworking dashboard"
```

---

### Task 6: Frontend — TransactionHistory component

**Files:**
- Create: `halkins-food/lib/components/coworking-dashboard/TransactionHistory.tsx`

**Step 1: Create TransactionHistory component**

Create `halkins-food/lib/components/coworking-dashboard/TransactionHistory.tsx`:

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { coworkingDashboardService } from "@/services/api/coworking-dashboard.api";
import { ArrowDownLeft, ArrowUpRight, History } from "lucide-react";
import type { Transaction, TransactionFilter, PaginationInfo } from "@/types/api";

interface TransactionHistoryProps {
  spaceId: string;
  refreshKey?: number;
}

const FILTER_TABS: { label: string; value: TransactionFilter }[] = [
  { label: "All", value: "all" },
  { label: "Transfers", value: "transfers" },
  { label: "Withdrawals", value: "withdrawals" },
];

export default function TransactionHistory({ spaceId, refreshKey }: TransactionHistoryProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [filter, setFilter] = useState<TransactionFilter>("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await coworkingDashboardService.getTransactions(spaceId, filter, page, 15);
      setTransactions(data.transactions);
      setPagination(data.pagination);
    } catch (err: any) {
      setError(err.message || "Failed to fetch transactions");
    } finally {
      setLoading(false);
    }
  }, [spaceId, filter, page, refreshKey]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    setPage(1);
  }, [filter]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-lg bg-gray-50 text-gray-600">
          <History className="h-5 w-5" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">Transaction History</h3>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              filter === tab.value
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <span className="loading loading-spinner loading-md text-pink-500" />
        </div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-sm">No transactions yet</p>
        </div>
      ) : (
        <>
          <div className="divide-y divide-gray-100">
            {transactions.map((tx, i) => (
              <div key={`${tx.reference}-${i}`} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-1.5 rounded-full ${
                      tx.type === "transfer"
                        ? "bg-green-50 text-green-600"
                        : "bg-red-50 text-red-600"
                    }`}
                  >
                    {tx.type === "transfer" ? (
                      <ArrowDownLeft className="h-4 w-4" />
                    ) : (
                      <ArrowUpRight className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{tx.description}</p>
                    <p className="text-xs text-gray-500">{formatDate(tx.date)}</p>
                  </div>
                </div>
                <p
                  className={`text-sm font-semibold ${
                    tx.amount >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {tx.amount >= 0 ? "+" : ""}£{Math.abs(tx.amount).toFixed(2)}
                </p>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-500">
                Page {pagination.page} of {pagination.totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="btn btn-ghost btn-sm disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={page >= pagination.totalPages}
                  className="btn btn-ghost btn-sm disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add lib/components/coworking-dashboard/TransactionHistory.tsx
git commit -m "feat: add TransactionHistory component for coworking dashboard"
```

---

### Task 7: Frontend — PaymentsTab component

**Files:**
- Create: `halkins-food/lib/components/coworking-dashboard/PaymentsTab.tsx`

**Step 1: Create PaymentsTab component**

Create `halkins-food/lib/components/coworking-dashboard/PaymentsTab.tsx`:

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { coworkingDashboardService } from "@/services/api/coworking-dashboard.api";
import StripeSettings from "./StripeSettings";
import BalanceCard from "./BalanceCard";
import WithdrawModal from "./WithdrawModal";
import TransactionHistory from "./TransactionHistory";

interface PaymentsTabProps {
  spaceId: string;
}

export default function PaymentsTab({ spaceId }: PaymentsTabProps) {
  const [stripeStatus, setStripeStatus] = useState<{
    connected: boolean;
    onboardingComplete: boolean;
    accountId: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [availableBalance, setAvailableBalance] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchStatus = useCallback(async () => {
    try {
      const data = await coworkingDashboardService.getStripeStatus(spaceId);
      setStripeStatus(data);
    } catch (err) {
      console.error("Failed to fetch Stripe status:", err);
    } finally {
      setLoading(false);
    }
  }, [spaceId]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Handle return from Stripe onboarding
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("stripe") === "complete") {
      fetchStatus();
      const url = new URL(window.location.href);
      url.searchParams.delete("stripe");
      window.history.replaceState({}, "", url.toString());
    }
  }, [fetchStatus]);

  const handleWithdrawClick = async () => {
    try {
      const balance = await coworkingDashboardService.getBalance(spaceId);
      setAvailableBalance(balance.available);
      setShowWithdrawModal(true);
    } catch (err) {
      console.error("Failed to fetch balance for withdrawal:", err);
    }
  };

  const handleWithdrawSuccess = () => {
    setRefreshKey((k) => k + 1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <span className="loading loading-spinner loading-lg text-pink-500" />
      </div>
    );
  }

  // Not onboarded — show the onboarding flow
  if (!stripeStatus?.connected || !stripeStatus?.onboardingComplete) {
    return <StripeSettings spaceId={spaceId} />;
  }

  // Onboarded — show balance + transactions
  return (
    <div className="space-y-6">
      <BalanceCard
        key={refreshKey}
        spaceId={spaceId}
        onWithdrawClick={handleWithdrawClick}
      />

      <TransactionHistory
        spaceId={spaceId}
        refreshKey={refreshKey}
      />

      {showWithdrawModal && (
        <WithdrawModal
          spaceId={spaceId}
          availableBalance={availableBalance}
          onClose={() => setShowWithdrawModal(false)}
          onSuccess={handleWithdrawSuccess}
        />
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add lib/components/coworking-dashboard/PaymentsTab.tsx
git commit -m "feat: add PaymentsTab orchestrator component"
```

---

### Task 8: Frontend — Update CoworkingDashboard with tab navigation

**Files:**
- Modify: `halkins-food/lib/components/coworking-dashboard/CoworkingDashboard.tsx`

**Step 1: Replace Settings toggle with tab bar**

In `CoworkingDashboard.tsx`:

1. Add import for `PaymentsTab`:
```typescript
import PaymentsTab from "./PaymentsTab";
```

2. Replace `import { LogOut, Building2, Settings } from "lucide-react"` with:
```typescript
import { LogOut, Building2, ShoppingBag, CreditCard } from "lucide-react";
```

3. Replace the `showSettings` state with tab state:
```typescript
// Remove: const [showSettings, setShowSettings] = useState(false);
// Add:
const [activeTab, setActiveTab] = useState<"orders" | "payments">("orders");
```

4. In the header, replace the Settings button with just Sign Out (remove the Settings button entirely):

Replace this block:
```tsx
<div className="flex items-center gap-2">
  <button
    onClick={() => setShowSettings(!showSettings)}
    className={`btn btn-ghost btn-sm gap-2 ${showSettings ? "text-pink-600" : "text-gray-600"}`}
  >
    <Settings className="h-4 w-4" />
    Settings
  </button>
  <button
    onClick={handleLogout}
    className="btn btn-ghost btn-sm gap-2 text-gray-600"
  >
    <LogOut className="h-4 w-4" />
    Sign Out
  </button>
</div>
```

With:
```tsx
<button
  onClick={handleLogout}
  className="btn btn-ghost btn-sm gap-2 text-gray-600"
>
  <LogOut className="h-4 w-4" />
  Sign Out
</button>
```

5. Replace the body content (everything after the Error section and "Loading state while resolving spaceId" section). Replace from `{/* Settings */}` through the end of the return's closing `</div>`:

Remove:
```tsx
{/* Settings */}
{showSettings && spaceId && <StripeSettings spaceId={spaceId} />}

{/* Stats Cards */}
{stats && <StatsCards stats={stats} />}

{/* Orders */}
{spaceId && (
  <OrdersList ... />
)}

{/* Order Detail Modal */}
{selectedOrderId && spaceId && (
  <OrderDetailModal ... />
)}
```

Replace with:
```tsx
      {/* Tab Bar */}
      {spaceId && (
        <div className="flex gap-1 border-b border-gray-200">
          <button
            onClick={() => setActiveTab("orders")}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "orders"
                ? "border-pink-500 text-pink-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <ShoppingBag className="h-4 w-4" />
            Orders
          </button>
          <button
            onClick={() => setActiveTab("payments")}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "payments"
                ? "border-pink-500 text-pink-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <CreditCard className="h-4 w-4" />
            Payments
          </button>
        </div>
      )}

      {/* Orders Tab */}
      {activeTab === "orders" && (
        <>
          {stats && <StatsCards stats={stats} />}
          {spaceId && (
            <OrdersList
              orders={orders}
              activeStatus={activeStatus}
              onStatusChange={setActiveStatus}
              onOrderClick={setSelectedOrderId}
              loading={ordersLoading}
            />
          )}
          {selectedOrderId && spaceId && (
            <OrderDetailModal
              spaceId={spaceId}
              orderId={selectedOrderId}
              onClose={() => setSelectedOrderId(null)}
              onOrderUpdated={fetchOrders}
            />
          )}
        </>
      )}

      {/* Payments Tab */}
      {activeTab === "payments" && spaceId && (
        <PaymentsTab spaceId={spaceId} />
      )}
```

6. Remove the unused `StripeSettings` import since it's now used through `PaymentsTab`:
```typescript
// Remove: import StripeSettings from "./StripeSettings";
```

**Step 2: Verify build**

Run: `cd halkins-food && npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add lib/components/coworking-dashboard/CoworkingDashboard.tsx
git commit -m "feat: replace Settings toggle with Orders/Payments tab navigation"
```

---

### Task 9: Deploy and verify

**Step 1: Push backend and run migration**

```bash
cd backend
git push origin main
git push heroku main
heroku run 'npm run migration:run' --app swiftfoods
```

**Step 2: Push frontend**

```bash
cd halkins-food
git push origin main
```

Wait for Netlify deployment.

**Step 3: Verify**

1. Log in to the coworking dashboard
2. Check tab navigation works (Orders / Payments)
3. Orders tab shows stats + orders (unchanged)
4. Payments tab shows:
   - If no Stripe account: onboarding flow
   - If onboarded: balance card + transaction history
5. Test withdrawal flow (if balance available)

**Step 4: Final commit**

```bash
git commit --allow-empty -m "chore: coworking stripe payments dashboard complete"
```
