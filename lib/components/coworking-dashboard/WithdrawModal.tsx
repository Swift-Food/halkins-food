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
