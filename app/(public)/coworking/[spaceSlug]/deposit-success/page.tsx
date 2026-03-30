"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Loader2,
  MapPin,
  ReceiptPoundSterling,
} from "lucide-react";
import {
  clearCateringStorageSnapshot,
} from "@/context/CateringContext";
import { coworkingService } from "@/services/api/coworking.api";
import { clearCoworkingSessionSnapshot } from "@/context/CoworkingContext";
import { ConfirmCoworkingCheckoutResponse } from "@/types/api";

function formatDateTime(value?: string | null) {
  if (!value) return null;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  return parsed.toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CoworkingDepositSuccessPage() {
  const params = useParams<{ spaceSlug: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const spaceSlug = params.spaceSlug;
  const sessionId =
    searchParams.get("session_id") || searchParams.get("sessionId") || "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orderView, setOrderView] =
    useState<ConfirmCoworkingCheckoutResponse | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function confirmCheckout() {
      if (!sessionId) {
        setError("Missing checkout session. Please return to the booking flow and try again.");
        setLoading(false);
        return;
      }

      try {
        const result = await coworkingService.confirmCheckout(spaceSlug, sessionId);

        if (cancelled) return;

        clearCoworkingSessionSnapshot();
        clearCateringStorageSnapshot();

        if (result.accessToken) {
          router.replace(`/coworking/${spaceSlug}/view/${result.accessToken}`);
          return;
        }

        setOrderView(result);
      } catch (err) {
        if (cancelled) return;

        const message =
          err instanceof Error
            ? err.message
            : "We couldn't confirm your deposit payment.";
        setError(message);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void confirmCheckout();

    return () => {
      cancelled = true;
    };
  }, [router, sessionId, spaceSlug]);

  const bookingStartLabel = formatDateTime(orderView?.bookingStartTime);
  const bookingEndLabel = formatDateTime(orderView?.bookingEndTime);

  if (loading) {
    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] px-4 py-16">
        <div className="mx-auto max-w-2xl rounded-[2rem] border border-white/70 bg-white/90 p-10 text-center shadow-xl">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-[#bd2429]" />
          <h1 className="mt-5 text-2xl font-bold text-slate-900">Confirming your payment</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
            We&apos;re checking Stripe and preparing the next step for your booking.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] px-4 py-16">
        <div className="mx-auto max-w-2xl rounded-[2rem] border border-red-200 bg-white p-10 text-center shadow-xl">
          <h1 className="text-2xl font-bold text-slate-900">We couldn&apos;t confirm your payment</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">{error}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href={`/coworking/${spaceSlug}`}
              className="rounded-full bg-[#bd2429] px-5 py-3 text-sm font-semibold text-white"
            >
              Back to booking
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const requiresCatering = Boolean(orderView?.requiresCatering);

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] px-4 py-10 sm:py-16">
      <div className="mx-auto max-w-4xl overflow-hidden rounded-[2rem] border border-white/70 bg-white shadow-2xl">
        <div className="bg-[linear-gradient(135deg,#bd2429_0%,#8f1d21_100%)] px-6 py-10 text-white sm:px-10">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <CheckCircle2 className="h-12 w-12" />
              <h1 className="mt-4 text-3xl font-bold">
                {requiresCatering ? "Deposit paid, catering still needed" : "Deposit confirmed"}
              </h1>
              <p className="mt-3 max-w-2xl text-sm text-white/85 sm:text-base">
                {requiresCatering
                  ? "Your venue hold is secured. Add catering next so the booking can move into review."
                  : "Your payment was received and your order details are ready."}
              </p>
            </div>

            <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-4 sm:min-w-[220px]">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/65">
                Deposit Received
              </p>
              <p className="mt-2 text-3xl font-bold">
                £{Number(orderView?.depositAmount || 0).toFixed(2)}
              </p>
              <p className="mt-1 text-sm text-white/75">
                Status: {orderView?.depositStatus || "paid"}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-8 px-6 py-8 sm:px-10">
          <div className="grid gap-4 lg:grid-cols-[1.3fr_0.9fr]">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <MapPin className="h-4 w-4" />
                Booking Summary
              </div>
              <div className="space-y-3 text-sm text-slate-600">
                <div>
                  <p className="font-semibold text-slate-900">
                    {orderView?.venueName || "Venue confirmed"}
                  </p>
                  {orderView?.roomLocationDetails ? (
                    <p className="mt-1 text-slate-500">{orderView.roomLocationDetails}</p>
                  ) : null}
                </div>

                {(bookingStartLabel || bookingEndLabel) && (
                  <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                    <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      <CalendarDays className="h-4 w-4 normal-case" />
                      Event Window
                    </div>
                    <div className="space-y-1">
                      {bookingStartLabel ? <p>Start: {bookingStartLabel}</p> : null}
                      {bookingEndLabel ? <p>End: {bookingEndLabel}</p> : null}
                      {orderView?.bookingReference ? (
                        <p>Booking reference: {orderView.bookingReference}</p>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <ReceiptPoundSterling className="h-4 w-4" />
                What Happens Next
              </div>
              <div className="space-y-3 text-sm text-slate-600">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="font-semibold text-slate-900">1. Deposit is secured</p>
                  <p className="mt-1 text-slate-500">Your booking hold is now protected in the system.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="font-semibold text-slate-900">
                    {requiresCatering ? "2. Add catering next" : "2. Review your order"}
                  </p>
                  <p className="mt-1 text-slate-500">
                    {requiresCatering
                      ? "Return to the coworking flow to add food before the booking can move into review."
                      : "You can now move through to the order view and track the booking from there."}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {requiresCatering ? (
              <Link
                href={`/coworking/${spaceSlug}`}
                className="inline-flex items-center gap-2 rounded-full bg-[#bd2429] px-5 py-3 text-sm font-semibold text-white"
              >
                Add catering now
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <Link
                href={`/coworking/${spaceSlug}`}
                className="inline-flex items-center gap-2 rounded-full bg-[#bd2429] px-5 py-3 text-sm font-semibold text-white"
              >
                Back to coworking
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}

            <Link
              href={`/coworking/${spaceSlug}`}
              className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700"
            >
              Return to booking flow
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
