"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect } from "react";
import { ArrowLeft, CreditCard, RefreshCw, ShieldCheck } from "lucide-react";
import { restoreCateringStorageSnapshot } from "@/context/CateringContext";
import { restoreCoworkingSessionSnapshot } from "@/context/CoworkingContext";

export default function CoworkingDepositCancelPage() {
  const params = useParams<{ spaceSlug: string }>();
  const spaceSlug = params.spaceSlug;

  useEffect(() => {
    restoreCoworkingSessionSnapshot();
    restoreCateringStorageSnapshot();
  }, []);

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] px-4 py-16">
      <div className="mx-auto max-w-3xl overflow-hidden rounded-[2rem] border border-white/70 bg-white shadow-xl">
        <div className="px-8 py-10 text-center">
          <CreditCard className="mx-auto h-10 w-10 text-[#bd2429]" />
          <h1 className="mt-5 text-2xl font-bold text-slate-900">Payment was not completed</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600 sm:text-base">
            Your booking details are still saved, so you can return and try payment again whenever
            you&apos;re ready.
          </p>
        </div>

        <div className="grid gap-4 px-8 py-8 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <ShieldCheck className="h-5 w-5 text-slate-700" />
            <p className="mt-3 text-sm font-semibold text-slate-900">Details kept safe</p>
            <p className="mt-1 text-sm text-slate-600">
              Your form and booking choices remain in place.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <RefreshCw className="h-5 w-5 text-slate-700" />
            <p className="mt-3 text-sm font-semibold text-slate-900">Try again later</p>
            <p className="mt-1 text-sm text-slate-600">
              You can restart payment without rebuilding the booking.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <ArrowLeft className="h-5 w-5 text-slate-700" />
            <p className="mt-3 text-sm font-semibold text-slate-900">Back to the flow</p>
            <p className="mt-1 text-sm text-slate-600">
              Return to the booking page whenever you want to continue.
            </p>
          </div>
        </div>

        <div className="px-8 pb-8">
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/coworking/${spaceSlug}`}
              className="rounded-full bg-[#bd2429] px-5 py-3 text-sm font-semibold text-white"
            >
              Return to booking
            </Link>
            <Link
              href={`/coworking/${spaceSlug}`}
              className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700"
            >
              Review details first
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
