"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

export default function CoworkingDepositCancelPage() {
  const params = useParams<{ spaceSlug: string }>();
  const spaceSlug = params.spaceSlug;

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] px-4 py-16">
      <div className="mx-auto max-w-xl rounded-[2rem] border border-white/70 bg-white p-10 text-center shadow-xl">
        <h1 className="text-2xl font-bold text-slate-900">Deposit checkout cancelled</h1>
        <p className="mt-3 text-sm text-slate-600">
          Your booking details are still in place. You can return to the coworking flow whenever
          you&apos;re ready to try payment again.
        </p>
        <div className="mt-8">
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
