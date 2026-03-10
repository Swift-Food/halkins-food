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
          <span className="loading loading-spinner loading-md text-primary" />
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
