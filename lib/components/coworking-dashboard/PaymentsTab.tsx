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
