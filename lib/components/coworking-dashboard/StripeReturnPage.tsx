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

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 max-w-md w-full text-center">
        <Building2 className="h-8 w-8 text-pink-500 mx-auto mb-4" />

        {checking ? (
          <>
            <span className="loading loading-spinner loading-md text-pink-500 mb-4" />
            <p className="text-sm text-gray-600">Checking your Stripe setup status...</p>
          </>
        ) : error ? (
          <>
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-3" />
            <p className="text-sm text-red-700 mb-4">{error}</p>
            <p className="text-xs text-gray-500">You can close this tab and return to your dashboard.</p>
          </>
        ) : complete ? (
          <>
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <p className="text-lg font-semibold text-gray-900 mb-1">Stripe setup complete!</p>
            <p className="text-sm text-gray-500">
              You can close this tab and click &quot;Check Status&quot; on your dashboard.
            </p>
          </>
        ) : (
          <>
            <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-3" />
            <p className="text-lg font-semibold text-gray-900 mb-1">Setup not finished yet</p>
            <p className="text-sm text-gray-500">
              Your Stripe onboarding isn&apos;t complete. Close this tab and click &quot;Check Status&quot; on your dashboard to try again.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
