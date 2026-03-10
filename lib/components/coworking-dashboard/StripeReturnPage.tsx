"use client";

import { useCallback, useEffect, useState } from "react";
import { coworkingDashboardService } from "@/services/api/coworking-dashboard.api";
import { CheckCircle, AlertCircle, Building2 } from "lucide-react";

interface StripeReturnPageProps {
  spaceSlug: string;
}

export default function StripeReturnPage({ spaceSlug }: StripeReturnPageProps) {
  const [checking, setChecking] = useState(true);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(5);

  const checkStatus = useCallback(async () => {
    try {
      const me = await coworkingDashboardService.getMeBySlug(spaceSlug);
      const status = await coworkingDashboardService.getStripeStatus(me.space.id);
      setComplete(status.connected && status.onboardingComplete);
    } catch (err: any) {
      setError(err.message || "Failed to check status");
    } finally {
      setChecking(false);
    }
  }, [spaceSlug]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // Auto-close countdown after status check completes
  useEffect(() => {
    if (checking) return;
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(interval);
          window.close();
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [checking]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 max-w-md w-full text-center">
        <Building2 className="h-8 w-8 text-primary mx-auto mb-4" />

        {checking ? (
          <>
            <span className="loading loading-spinner loading-md text-primary mb-4" />
            <p className="text-sm text-gray-600">Checking your Stripe setup status...</p>
          </>
        ) : error ? (
          <>
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-3" />
            <p className="text-sm text-red-700 mb-4">{error}</p>
            <p className="text-xs text-gray-500">This tab will close automatically in {countdown}s.</p>
          </>
        ) : complete ? (
          <>
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <p className="text-lg font-semibold text-gray-900 mb-1">Stripe setup complete!</p>
            <p className="text-sm text-gray-500 mb-2">
              Click &quot;Check Status&quot; on your dashboard to continue.
            </p>
            <p className="text-xs text-gray-400">This tab will close automatically in {countdown}s.</p>
          </>
        ) : (
          <>
            <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-3" />
            <p className="text-lg font-semibold text-gray-900 mb-1">Setup not finished yet</p>
            <p className="text-sm text-gray-500 mb-2">
              Your Stripe onboarding isn&apos;t complete. Click &quot;Check Status&quot; on your dashboard to try again.
            </p>
            <p className="text-xs text-gray-400">This tab will close automatically in {countdown}s.</p>
          </>
        )}
      </div>
    </div>
  );
}
