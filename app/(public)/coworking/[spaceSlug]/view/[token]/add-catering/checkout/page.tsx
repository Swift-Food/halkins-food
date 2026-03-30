"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Loader2, MapPin, Phone, TicketPercent } from "lucide-react";
import { CoworkingProvider, useCoworking } from "@/context/CoworkingContext";
import {
  clearCoworkingAddCateringStorage,
  CoworkingAddCateringProvider,
  useCoworkingAddCatering,
} from "@/context/CoworkingAddCateringContext";
import CoworkingAddCateringSessionGate from "@/lib/components/coworking/CoworkingAddCateringSessionGate";
import AllMealSessionsItems from "@/lib/components/catering/AllMealSessionsItems";
import { cateringService } from "@/services/api/catering.api";
import { coworkingService } from "@/services/api";
import type {
  CoworkingMealSessionRequest,
  CoworkingOrderViewResponse,
  CoworkingRestaurantOrder,
  CoworkingVenue,
} from "@/types/api";
import type { MealSessionState } from "@/types/catering.types";

const fieldLabelClass =
  "block text-[10px] font-bold text-base-content/60 uppercase tracking-widest mb-1.5";
const fieldClass =
  "w-full bg-gray-50 border border-base-300 rounded-xl px-4 py-3 text-sm text-base-content placeholder:text-base-content/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all";

function buildMealSessionRequests(mealSessions: MealSessionState[]): CoworkingMealSessionRequest[] {
  return mealSessions
    .filter((session) => session.orderItems.length > 0)
    .map((session) => {
      const groupedByRestaurant = session.orderItems.reduce<Record<string, CoworkingRestaurantOrder>>(
        (acc, { item, quantity }) => {
          const restaurantId = item.restaurantId || "unknown";
          if (!acc[restaurantId]) {
            acc[restaurantId] = {
              restaurantId,
              menuItems: [],
              specialInstructions: "",
            };
          }
          acc[restaurantId].menuItems.push({
            menuItemId: item.id,
            quantity,
            selectedAddons: item.selectedAddons,
          });
          return acc;
        },
        {}
      );

      return {
        sessionName: session.sessionName,
        sessionDate: session.sessionDate,
        eventTime: session.eventTime,
        guestCount: session.guestCount,
        specialRequirements: session.specialRequirements,
        orderItems: Object.values(groupedByRestaurant),
      };
    });
}

function AddCateringCheckoutContent() {
  const params = useParams<{ spaceSlug: string; token: string }>();
  const router = useRouter();
  const { member } = useCoworking();
  const {
    mealSessions,
    promoCodes,
    setPromoCodes,
    orderMeta,
    setOrderMeta,
    setEventDetails,
    contactInfo,
    setContactInfo,
  } = useCoworkingAddCatering();
  const [order, setOrder] = useState<CoworkingOrderViewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [phone, setPhone] = useState(contactInfo?.phone || "");
  const [specialInstructions, setSpecialInstructions] = useState(
    contactInfo?.specialInstructions || ""
  );
  const [promoInput, setPromoInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [pricing, setPricing] = useState<{
    subtotal: number;
    deliveryFee: number;
    total: number;
    error?: string;
  } | null>(null);

  const spaceSlug = params.spaceSlug;
  const token = params.token;
  const appliedPromoCodes = promoCodes ?? [];

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const orderView = await coworkingService.getOrderViewByToken(spaceSlug, token);
        if (cancelled) return;
        setOrder(orderView);

        if (!orderMeta || orderMeta.orderId !== orderView.orderId || !orderMeta.deliveryLocation) {
          const spaceInfo = await coworkingService.getSpaceInfo(spaceSlug);
          const venues = await coworkingService.getVenues(spaceInfo.id);
          if (cancelled) return;

          const matchedVenue = venues.find((venue: CoworkingVenue) => venue.id === orderView.venueId);
          setOrderMeta({
            orderId: orderView.orderId,
            token,
            spaceSlug,
            venueName: orderView.venueName,
            deliveryAddress: orderView.venueName || orderView.roomLocationDetails || "",
            deliveryLocation: matchedVenue
              ? { latitude: matchedVenue.latitude, longitude: matchedVenue.longitude }
              : null,
            bookingStartTime: orderView.bookingStartTime,
            bookingEndTime: orderView.bookingEndTime,
            ownerEmail: orderView.memberEmail || null,
          });
          setEventDetails({
            eventType: "Coworking booking",
            eventDate: orderView.bookingStartTime?.slice(0, 10) || "",
            eventTime: orderView.bookingStartTime ? new Date(orderView.bookingStartTime).toISOString().slice(11, 16) : "",
            guestCount: 1,
            specialRequests: "",
            address: orderView.roomLocationDetails || orderView.venueName || "",
            userType: "guest",
          });
        }
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
  }, [orderMeta, setEventDetails, setOrderMeta, spaceSlug, token]);

  useEffect(() => {
    const nextContactInfo = {
      organization: contactInfo?.organization || member?.name || "",
      fullName: contactInfo?.fullName || member?.name || "",
      email: contactInfo?.email || member?.email || "",
      phone,
      addressLine1: contactInfo?.addressLine1 || "",
      addressLine2: contactInfo?.addressLine2 || "",
      city: contactInfo?.city || "",
      zipcode: contactInfo?.zipcode || "",
      billingAddress: contactInfo?.billingAddress,
      ccEmails: contactInfo?.ccEmails || [],
      specialInstructions,
    };

    const currentSnapshot = JSON.stringify({
      organization: contactInfo?.organization || "",
      fullName: contactInfo?.fullName || "",
      email: contactInfo?.email || "",
      phone: contactInfo?.phone || "",
      addressLine1: contactInfo?.addressLine1 || "",
      addressLine2: contactInfo?.addressLine2 || "",
      city: contactInfo?.city || "",
      zipcode: contactInfo?.zipcode || "",
      billingAddress: contactInfo?.billingAddress,
      ccEmails: contactInfo?.ccEmails || [],
      specialInstructions: contactInfo?.specialInstructions || "",
    });

    const nextSnapshot = JSON.stringify(nextContactInfo);
    if (currentSnapshot !== nextSnapshot) {
      setContactInfo(nextContactInfo);
    }
  }, [contactInfo, member?.email, member?.name, phone, setContactInfo, specialInstructions]);

  const bookingOwnerLoggedIn =
    !!member?.email &&
    !!order?.memberEmail &&
    member.email.toLowerCase() === order.memberEmail.toLowerCase();

  const mealSessionRequests = useMemo(() => buildMealSessionRequests(mealSessions), [mealSessions]);
  const totalItems = useMemo(
    () =>
      mealSessions.reduce(
        (sum, session) => sum + session.orderItems.reduce((itemSum, item) => itemSum + item.quantity, 0),
        0
      ),
    [mealSessions]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadPricing() {
      if (!orderMeta?.deliveryLocation || mealSessionRequests.length === 0) {
        setPricing(null);
        return;
      }

      setPricingLoading(true);
      const result = await cateringService.calculateCateringPricingWithMealSessions(
        mealSessions,
        appliedPromoCodes,
        orderMeta.deliveryLocation
      );

      if (!cancelled) {
        setPricing({
          subtotal: result.subtotal || 0,
          deliveryFee: result.deliveryFee || 0,
          total: result.total || 0,
          error: result.error,
        });
        setPricingLoading(false);
      }
    }

    void loadPricing();
    return () => {
      cancelled = true;
    };
  }, [appliedPromoCodes, mealSessions, mealSessionRequests.length, orderMeta?.deliveryLocation]);

  const handleAddPromo = () => {
    const code = promoInput.trim().toUpperCase();
    if (!code || appliedPromoCodes.includes(code)) return;
    setPromoCodes([...appliedPromoCodes, code]);
    setPromoInput("");
  };

  const handleRemovePromo = (code: string) => {
    setPromoCodes(appliedPromoCodes.filter((promo) => promo !== code));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!orderMeta?.deliveryLocation) {
      setError("We couldn't resolve the event location for this booking.");
      return;
    }

    if (mealSessionRequests.length === 0) {
      setError("Add at least one catering item before checking out.");
      return;
    }

    if (!phone.trim()) {
      setError("Enter a contact phone number before submitting.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await coworkingService.addCateringToOrder(spaceSlug, orderMeta.orderId, {
        mealSessions: mealSessionRequests,
        specialInstructions: specialInstructions.trim() || undefined,
        customerPhone: phone.trim() || undefined,
        promoCodes: appliedPromoCodes.length > 0 ? appliedPromoCodes : undefined,
        deliveryLocation: orderMeta.deliveryLocation,
      });

      clearCoworkingAddCateringStorage();
      router.replace(`/coworking/${spaceSlug}/view/${token}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit catering request");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] px-4 py-16">
        <div className="mx-auto max-w-2xl rounded-[2rem] border border-white/70 bg-white/90 p-10 text-center shadow-xl">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-[#bd2429]" />
          <h1 className="mt-5 text-2xl font-bold text-slate-900">Preparing checkout</h1>
        </div>
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] px-4 py-16">
        <div className="mx-auto max-w-2xl rounded-[2rem] border border-red-200 bg-white p-10 text-center shadow-xl">
          <h1 className="text-2xl font-bold text-slate-900">We couldn't load this booking</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">{error}</p>
        </div>
      </div>
    );
  }

  if (!order) return null;

  if (!order.requiresCatering) {
    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] px-4 py-16">
        <div className="mx-auto max-w-2xl rounded-[2rem] border border-white/70 bg-white p-10 shadow-xl">
          <h1 className="text-2xl font-bold text-slate-900">Catering has already been added</h1>
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

  if (mealSessionRequests.length === 0) {
    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] px-4 py-16">
        <div className="mx-auto max-w-2xl rounded-[2rem] border border-white/70 bg-white p-10 shadow-xl">
          <h1 className="text-2xl font-bold text-slate-900">No catering selected yet</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
            Add your menu items first, then come back here to submit the catering request.
          </p>
          <Link
            href={`/coworking/${spaceSlug}/view/${token}/add-catering`}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#bd2429] px-5 py-3 text-sm font-semibold text-white"
          >
            Back to builder
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-100">
      <div className="w-full bg-base-100 h-2">
        <div className="h-2 transition-all duration-300" style={{ width: "100%" }}></div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-4 md:py-12">
        <Link
          href={`/coworking/${spaceSlug}/view/${token}/add-catering`}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to builder
        </Link>

        <div className="mt-4 mb-5 md:mb-8">
          <h2 className="text-3xl md:text-4xl font-bold mb-3 text-base-content">
            Checkout details
          </h2>
          <p className="text-base-content/70">
            Confirm the final details needed to attach this catering order to the venue booking.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8">
          <div className="lg:col-span-3 order-2 lg:order-1 pb-24 lg:pb-0">
            <AllMealSessionsItems showActions={false} />
          </div>

          <div className="lg:col-span-2 order-1 lg:order-2">
            <div className="bg-base-200/40 rounded-3xl p-4 md:p-8">
              <h3 className="text-xl font-bold mb-8 flex items-center gap-3 text-base-content">
                <span className="w-1.5 h-6 bg-primary/80 rounded-full"></span>
                Contact & Delivery Details
              </h3>

              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="rounded-2xl border border-base-300 bg-base-100/80 px-4 py-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-base-content/45 mb-2">
                    Event location
                  </p>
                  <div className="space-y-2 text-sm text-base-content">
                    <div className="flex items-start gap-2">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <p className="font-semibold">
                        {orderMeta?.deliveryAddress || order.roomLocationDetails || order.venueName}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      <Phone className="h-[18px] w-[18px]" />
                    </div>
                    <h4 className="font-bold text-sm tracking-tight text-base-content">
                      Contact Details
                    </h4>
                  </div>
                  <label className={fieldLabelClass}>
                    Telephone<span className="text-primary ml-0.5">*</span>
                  </label>
                  <input
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    className={fieldClass}
                    placeholder="Your phone number"
                    type="tel"
                    autoComplete="tel"
                    required
                  />
                </div>

                <div>
                  <div className="py-4 border-y border-base-300">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-gray-200 border border-gray-300 flex items-center justify-center text-base-content/70">
                        <TicketPercent className="h-[18px] w-[18px]" />
                      </div>
                      <h4 className="font-bold text-sm text-base-content">Discount Code</h4>
                      {appliedPromoCodes.length > 0 && (
                        <span className="text-xs bg-success/10 text-success px-2 py-0.5 rounded-full">
                          {appliedPromoCodes.length} applied
                        </span>
                      )}
                    </div>

                    <div className="flex gap-2 mb-3">
                      <input
                        value={promoInput}
                        onChange={(event) => setPromoInput(event.target.value.toUpperCase())}
                        className={`${fieldClass} uppercase`}
                        placeholder="Add discount code or voucher"
                        type="text"
                      />
                      <button
                        type="button"
                        onClick={handleAddPromo}
                        disabled={!promoInput.trim()}
                        className="px-4 py-2 rounded-lg font-medium text-sm transition-all bg-primary text-white hover:bg-primary/90 disabled:bg-primary/15 disabled:text-primary/50 disabled:cursor-not-allowed"
                      >
                        Apply
                      </button>
                    </div>

                    {appliedPromoCodes.length > 0 && (
                      <div className="space-y-2 mb-3">
                        {appliedPromoCodes.map((code) => (
                          <div
                            key={code}
                            className="flex items-center justify-between bg-base-100 p-2 rounded-lg border border-base-300"
                          >
                            <span className="font-mono text-xs font-medium text-primary">
                              {code}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemovePromo(code)}
                              className="text-error hover:opacity-80 text-xs font-medium"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <p className="text-xs text-base-content/60">
                      If your organisation is partnered with us, please contact us for vouchers before payment.
                    </p>
                  </div>
                </div>

                <div className="-mt-2">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-gray-200 border border-gray-300 flex items-center justify-center text-base-content/70">
                      <svg
                        className="w-[18px] h-[18px]"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9 12h6m-6 4h6M7 4h10a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2z"
                        />
                      </svg>
                    </div>
                    <h4 className="font-bold text-sm text-base-content">Special Instructions</h4>
                    <span className="text-[9px] font-bold text-base-content/40 uppercase tracking-widest ml-2">
                      (Optional)
                    </span>
                  </div>
                  <textarea
                    value={specialInstructions}
                    onChange={(event) => setSpecialInstructions(event.target.value)}
                    className="w-full bg-gray-50 border border-base-300 rounded-xl px-4 py-3 text-sm text-base-content placeholder:text-base-content/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all min-h-[100px] resize-none"
                    placeholder="Optional notes for the catering request"
                  />
                </div>

                <div className="rounded-2xl border border-base-300 bg-base-100 px-4 py-4">
                  <div className="flex justify-between text-sm text-base-content/70">
                    <span>Meal sessions</span>
                    <span>{mealSessionRequests.length}</span>
                  </div>
                  <div className="mt-2 flex justify-between text-sm text-base-content/70">
                    <span>Total portions selected</span>
                    <span>{totalItems}</span>
                  </div>
                  <div className="mt-2 flex justify-between text-sm text-base-content/70">
                    <span>Food subtotal</span>
                    <span>£{pricing?.subtotal.toFixed(2) ?? "0.00"}</span>
                  </div>
                  <div className="mt-2 flex justify-between text-sm text-base-content/70">
                    <span>Delivery</span>
                    <span>
                      {pricingLoading ? (
                        <span className="inline-flex items-center gap-2">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Calculating
                        </span>
                      ) : (
                        `£${pricing?.deliveryFee.toFixed(2) ?? "0.00"}`
                      )}
                    </span>
                  </div>
                  <div className="mt-4 flex justify-between border-t border-base-300 pt-3 text-lg font-bold text-base-content">
                    <span>Catering total</span>
                    <span>£{pricing?.total.toFixed(2) ?? "0.00"}</span>
                  </div>
                  {pricing?.error ? (
                    <p className="mt-3 text-xs text-warning-content bg-warning/10 border border-warning/30 rounded-lg p-2">
                      {pricing.error}
                    </p>
                  ) : null}
                </div>

                <div className="-mt-1">
                  <div className="w-full bg-orange-50/50 border border-orange-200 rounded-xl p-4">
                    <span className="text-xs font-bold uppercase tracking-widest text-orange-700">
                      Important Notes
                    </span>
                    <div className="mt-3 text-xs text-base-content/80 leading-relaxed space-y-1">
                      <p>Only the booking owner can submit this catering request.</p>
                      <p>The venue location comes from the existing coworking booking.</p>
                    </div>
                  </div>
                </div>

                {error ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-3">
                  <Link
                    href={`/coworking/${spaceSlug}/view/${token}/add-catering`}
                    className="inline-flex items-center justify-center rounded-2xl border border-base-300 bg-base-100 px-5 py-3 text-sm font-semibold text-base-content"
                  >
                    Back
                  </Link>
                  <button
                    type="submit"
                    disabled={submitting || !orderMeta?.deliveryLocation}
                    className="flex-1 bg-primary text-white py-4 rounded-2xl font-bold uppercase tracking-[0.2em] text-sm hover:bg-primary/90 transition-all disabled:bg-base-300 disabled:cursor-not-allowed disabled:tracking-[0.08em]"
                  >
                    {submitting ? "Submitting..." : "Submit catering request"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CoworkingAddCateringCheckoutPage() {
  return (
    <CoworkingProvider>
      <CoworkingAddCateringProvider>
        <AddCateringCheckoutContent />
      </CoworkingAddCateringProvider>
    </CoworkingProvider>
  );
}
