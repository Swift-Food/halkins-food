"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { CoworkingProvider, useCoworking } from "@/context/CoworkingContext";
import {
  CoworkingAddCateringProvider,
  useCoworkingAddCatering,
} from "@/context/CoworkingAddCateringContext";
import { CateringFilterProvider } from "@/context/CateringFilterContext";
import CateringOrderBuilder from "@/lib/components/catering/CateringOrderBuilder";
import CoworkingAddCateringSessionGate from "@/lib/components/coworking/CoworkingAddCateringSessionGate";
import { coworkingService } from "@/services/api";
import type { CoworkingOrderViewResponse, CoworkingVenue } from "@/types/api";

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

function toDateInput(value?: string | null) {
  if (!value) return "";
  return value.slice(0, 10);
}

function toTimeInput(value?: string | null) {
  if (!value) return "";
  return new Date(value).toISOString().slice(11, 16);
}

function AddCateringPageContent() {
  const params = useParams<{ spaceSlug: string; token: string }>();
  const router = useRouter();
  const { member } = useCoworking();
  const {
    mealSessions,
    updateMealSession,
    setEventDetails,
    setOrderMeta,
    orderMeta,
  } = useCoworkingAddCatering();
  const [order, setOrder] = useState<CoworkingOrderViewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const spaceSlug = params.spaceSlug;
  const token = params.token;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const orderView = await coworkingService.getOrderViewByToken(spaceSlug, token);
        if (cancelled) return;
        setOrder(orderView);

        const spaceInfo = await coworkingService.getSpaceInfo(spaceSlug);
        const venues = await coworkingService.getVenues(spaceInfo.id);
        if (cancelled) return;

        const matchedVenue = venues.find((venue: CoworkingVenue) => venue.id === orderView.venueId);
        setOrderMeta({
          orderId: orderView.orderId,
          token,
          spaceSlug,
          venueName: orderView.venueName,
          deliveryAddress: orderView.roomLocationDetails || orderView.venueName || "",
          deliveryLocation: matchedVenue
            ? {
                latitude: matchedVenue.latitude,
                longitude: matchedVenue.longitude,
              }
            : null,
          bookingStartTime: orderView.bookingStartTime,
          bookingEndTime: orderView.bookingEndTime,
          ownerEmail: orderView.memberEmail || null,
        });

        setEventDetails({
          eventType: "Coworking booking",
          eventDate: toDateInput(orderView.bookingStartTime),
          eventTime: toTimeInput(orderView.bookingStartTime),
          guestCount: 1,
          specialRequests: "",
          address: orderView.roomLocationDetails || orderView.venueName || "",
          userType: "guest",
        });
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load booking");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [setEventDetails, setOrderMeta, spaceSlug, token]);

  useEffect(() => {
    if (!order?.bookingStartTime || mealSessions.length === 0) return;
    const firstSession = mealSessions[0];
    const updates: Record<string, string> = {};
    if (!firstSession.sessionDate) {
      updates.sessionDate = toDateInput(order.bookingStartTime);
    }
    if (!firstSession.eventTime) {
      updates.eventTime = toTimeInput(order.bookingStartTime);
    }
    if (Object.keys(updates).length > 0) {
      updateMealSession(0, updates);
    }
  }, [mealSessions, order?.bookingStartTime, updateMealSession]);

  const bookingOwnerLoggedIn =
    !!member?.email &&
    !!order?.memberEmail &&
    member.email.toLowerCase() === order.memberEmail.toLowerCase();

  if (loading) {
    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] px-4 py-16">
        <div className="mx-auto max-w-2xl rounded-[2rem] border border-white/70 bg-white/90 p-10 text-center shadow-xl">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-[#bd2429]" />
          <h1 className="mt-5 text-2xl font-bold text-slate-900">Preparing the catering builder</h1>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] px-4 py-16">
        <div className="mx-auto max-w-2xl rounded-[2rem] border border-red-200 bg-white p-10 text-center shadow-xl">
          <h1 className="text-2xl font-bold text-slate-900">We couldn't load this booking</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">{error}</p>
        </div>
      </div>
    );
  }

  if (!order.requiresCatering) {
    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] px-4 py-16">
        <div className="mx-auto max-w-2xl rounded-[2rem] border border-white/70 bg-white p-10 shadow-xl">
          <h1 className="text-2xl font-bold text-slate-900">Catering has already been added</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
            This booking already has a catering order attached, so there is nothing else to add
            here.
          </p>
          <Link
            href={`/coworking/${spaceSlug}/view/${token}`}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#bd2429] px-5 py-3 text-sm font-semibold text-white"
          >
            Back to booking
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  if (!bookingOwnerLoggedIn) {
    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] px-4 py-10 sm:py-16">
        <CoworkingAddCateringSessionGate
          spaceSlug={spaceSlug}
          ownerEmail={order.memberEmail ?? null}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#f3f4f6_42%,#eef2f7_100%)] pb-10">
      <div className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <Link
              href={`/coworking/${spaceSlug}/view/${token}`}
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-600"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to booking
            </Link>
            <h1 className="mt-3 text-2xl font-bold text-slate-900">Add catering</h1>
            <p className="mt-1 text-sm text-slate-600">
              Build the food order first, then continue to the checkout details page.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <p className="font-semibold text-slate-900">{orderMeta?.venueName || order.venueName}</p>
            <p className="mt-1">{formatDateTime(order.bookingStartTime)}</p>
          </div>
        </div>
      </div>

      <div className="py-6">
        <CateringOrderBuilder
          disableCheckoutWhenEmpty
          eventWindow={{
            startDate: toDateInput(order.bookingStartTime),
            startTime: toTimeInput(order.bookingStartTime),
            endDate: toDateInput(order.bookingEndTime),
            endTime: toTimeInput(order.bookingEndTime),
          }}
          onContinue={() => router.push(`/coworking/${spaceSlug}/view/${token}/add-catering/checkout`)}
        />
      </div>
    </div>
  );
}

export default function CoworkingAddCateringPage() {
  return (
    <CoworkingProvider>
      <CoworkingAddCateringProvider>
        <CateringFilterProvider>
          <AddCateringPageContent />
        </CateringFilterProvider>
      </CoworkingAddCateringProvider>
    </CoworkingProvider>
  );
}
