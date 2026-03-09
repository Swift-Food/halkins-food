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
