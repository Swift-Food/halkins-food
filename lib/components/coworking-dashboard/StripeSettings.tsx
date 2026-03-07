"use client";

import { useCallback, useEffect, useState } from "react";
import { coworkingDashboardService } from "@/services/api/coworking-dashboard.api";
import { CreditCard, CheckCircle, AlertCircle, ExternalLink } from "lucide-react";

interface StripeSettingsProps {
  spaceId: string;
}

export default function StripeSettings({ spaceId }: StripeSettingsProps) {
  const [status, setStatus] = useState<{
    connected: boolean;
    onboardingComplete: boolean;
    accountId: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchStatus = useCallback(async () => {
    try {
      setError("");
      const data = await coworkingDashboardService.getStripeStatus(spaceId);
      setStatus(data);
    } catch (err: any) {
      setError(err.message || "Failed to fetch Stripe status");
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
      // Re-check status after returning from Stripe
      fetchStatus();
      // Clean up URL
      const url = new URL(window.location.href);
      url.searchParams.delete("stripe");
      window.history.replaceState({}, "", url.toString());
    }
  }, [fetchStatus]);

  const handleSetup = async () => {
    setActionLoading(true);
    setError("");
    try {
      const { onboardingUrl } = await coworkingDashboardService.setupStripeAccount(spaceId);
      window.location.href = onboardingUrl;
    } catch (err: any) {
      setError(err.message || "Failed to start Stripe setup");
      setActionLoading(false);
    }
  };

  const handleRefresh = async () => {
    setActionLoading(true);
    setError("");
    try {
      const { onboardingUrl } = await coworkingDashboardService.refreshStripeOnboardingLink(spaceId);
      window.location.href = onboardingUrl;
    } catch (err: any) {
      setError(err.message || "Failed to refresh onboarding link");
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="h-5 w-5 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900">Payment Settings</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <span className="loading loading-spinner loading-md text-pink-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <CreditCard className="h-5 w-5 text-pink-500" />
        <h3 className="text-lg font-semibold text-gray-900">Payment Settings</h3>
      </div>

      <p className="text-sm text-gray-500 mb-6">
        Connect a Stripe account to receive venue hire fee payouts from orders placed at your space.
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 mb-4">
          {error}
        </div>
      )}

      {/* Not connected */}
      {status && !status.connected && (
        <div className="bg-gray-50 rounded-lg p-5 text-center">
          <AlertCircle className="h-10 w-10 text-gray-400 mx-auto mb-3" />
          <p className="text-sm text-gray-600 mb-4">
            No Stripe account connected. Set up a Stripe account to start receiving venue hire fee payouts.
          </p>
          <button
            onClick={handleSetup}
            disabled={actionLoading}
            className="btn btn-primary bg-pink-500 hover:bg-pink-600 border-none text-white gap-2"
          >
            {actionLoading ? (
              <span className="loading loading-spinner loading-sm" />
            ) : (
              <ExternalLink className="h-4 w-4" />
            )}
            Connect Stripe Account
          </button>
        </div>
      )}

      {/* Connected but onboarding incomplete */}
      {status && status.connected && !status.onboardingComplete && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-5 text-center">
          <AlertCircle className="h-10 w-10 text-yellow-500 mx-auto mb-3" />
          <p className="text-sm text-yellow-800 mb-1 font-medium">
            Stripe setup incomplete
          </p>
          <p className="text-sm text-yellow-700 mb-4">
            Your Stripe account has been created but onboarding is not yet complete. Please finish the setup to receive payouts.
          </p>
          <button
            onClick={handleRefresh}
            disabled={actionLoading}
            className="btn btn-warning gap-2"
          >
            {actionLoading ? (
              <span className="loading loading-spinner loading-sm" />
            ) : (
              <ExternalLink className="h-4 w-4" />
            )}
            Continue Stripe Setup
          </button>
        </div>
      )}

      {/* Fully connected */}
      {status && status.connected && status.onboardingComplete && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-5 flex items-center gap-4">
          <CheckCircle className="h-8 w-8 text-green-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-green-800">
              Stripe account connected
            </p>
            <p className="text-sm text-green-700">
              Your venue hire fee payouts will be transferred to your connected Stripe account automatically.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
