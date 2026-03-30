"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, Eye, ArrowRight, CalendarDays, MapPin, UtensilsCrossed } from "lucide-react";
import { CoworkingProvider, useCoworking } from "@/context/CoworkingContext";
import { cateringService } from "@/services/api/catering.api";
import { CateringOrderResponse, CoworkingOrderViewResponse } from "@/types/api";
import OrderStatusBadge from "@/lib/components/catering/dashboard/OrderStatusBadge";
import OrderDetails from "@/lib/components/catering/dashboard/OrderDetails";
import OrderItemsByCategory from "@/lib/components/catering/dashboard/OrderItemsByCategory";
import DeliveryInfo from "@/lib/components/catering/dashboard/DeliveryInfo";
import SharedAccessManager from "@/lib/components/catering/dashboard/SharedAccessManager";
import PickupContactManager from "@/lib/components/catering/dashboard/PickupContactManager";
import DeliveryTimeManager from "@/lib/components/catering/dashboard/DeliveryTimeManager";
import RefundRequestButton from "@/lib/components/catering/dashboard/RefundRequestButton";
import { transformOrderToPdfData } from "@/lib/utils/menuPdfUtils";
import { pdf } from "@react-pdf/renderer";
import { CateringMenuPdf } from "@/lib/components/pdf/CateringMenuPdf";
import PdfDownloadModal from "@/lib/components/catering/modals/PdfDownloadModal";
import { RefundRequest } from "@/types/refund.types";
import { refundService } from "@/services/api/refund.api";
import RefundsList from "@/lib/components/catering/dashboard/refundList";
import OrderSummary from "@/lib/components/catering/dashboard/OrderSummary";
import { OrderStatusTimeline } from "@/lib/components/catering/dashboard/OrderStatusTimeline";
import DeliveryTracking from "@/lib/components/catering/dashboard/DeliveryTracking";
import { DeliveryTrackingDto } from "@/types/api";
import { coworkingService } from "@/services/api";

const getOrderIdentifier = (order: Partial<CoworkingOrderViewResponse> | null) =>
  order?.id || order?.cateringOrderId || order?.orderId || order?.coworkingOrderId || null;

const getOrderReference = (order: Partial<CoworkingOrderViewResponse> | null) =>
  order?.orderReference ||
  order?.bookingReference ||
  getOrderIdentifier(order)?.substring(0, 4).toUpperCase() ||
  "ORDER";

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

function getDisplayOrder(order: CoworkingOrderViewResponse): CoworkingOrderViewResponse {
  return {
    ...order,
    eventDate: order.eventDate || order.bookingStartTime || "",
    deliveryAddress: order.venueName || order.deliveryAddress || order.roomLocationDetails || "",
    customerName: order.customerName || "Booking owner",
    customerEmail: order.customerEmail || order.memberEmail || "",
    customerPhone: order.customerPhone || "",
  };
}

function CoworkingOrderViewPageContent() {
  const params = useParams();
  const spaceSlug = params.spaceSlug as string;
  const token = params.token as string;
  const { isAuthenticated, member } = useCoworking();
  const [refunds, setRefunds] = useState<RefundRequest[]>([]);
  const [, setLoadingRefunds] = useState(false);
  const [order, setOrder] = useState<CoworkingOrderViewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<
    "viewer" | "editor" | "manager" | null
  >(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [deliveryTracking, setDeliveryTracking] = useState<
    Record<string, DeliveryTrackingDto>
  >({});

  const loadOrder = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await coworkingService.getOrderViewByToken(spaceSlug, token);
      setOrder(data);

      setCurrentUserRole(
        data.currentUserRole ||
          data.sharedAccessUsers?.find((u) => u.accessToken === token)?.role ||
          null
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load order");
    } finally {
      setLoading(false);
    }
  }, [spaceSlug, token]);

  const loadRefunds = useCallback(async () => {
    if (!order) return;
    const refundOrderId = getOrderIdentifier(order);
    if (!refundOrderId) return;
    setLoadingRefunds(true);
    try {
      const data = await refundService.getOrderRefunds(refundOrderId);
      setRefunds(data);
    } catch (err) {
      console.error("Failed to load refunds:", err);
    } finally {
      setLoadingRefunds(false);
    }
  }, [order]);

  const loadDeliveryTracking = useCallback(async (orderData: CateringOrderResponse) => {
    const trackableStatuses = [
      "restaurant_reviewed",
      "paid",
      "confirmed",
      "completed",
    ];
    const sessions = orderData.mealSessions ?? [];
    if (!trackableStatuses.includes(orderData.status) || sessions.length === 0) return;

    try {
      const results = await Promise.allSettled(
        sessions.map((session) => cateringService.getDeliveryTracking(session.id))
      );

      const data: Record<string, DeliveryTrackingDto> = {};
      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          data[sessions[index].id] = result.value;
        }
      });
      setDeliveryTracking(data);
    } catch (err) {
      console.error("Failed to load delivery tracking:", err);
    }
  }, []);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  useEffect(() => {
    if (order && order.mealSessions && order.mealSessions.length > 0) {
      loadRefunds();
      loadDeliveryTracking(order);
    }
  }, [loadDeliveryTracking, loadRefunds, order]);

  const handleDownloadPdf = () => {
    if (!order) return;
    setShowPdfModal(true);
  };

  const handlePdfDownloadWithChoice = async (withPrices: boolean) => {
    if (!order || generatingPdf) return;

    setGeneratingPdf(true);
    try {
      const pdfData = await transformOrderToPdfData(order, withPrices);
      const blob = await pdf(
        <CateringMenuPdf
          sessions={pdfData.sessions}
          showPrices={pdfData.showPrices}
          deliveryCharge={pdfData.deliveryCharge}
          promoDiscount={pdfData.promoDiscount}
          totalPrice={pdfData.totalPrice}
          logoUrl={pdfData.logoUrl}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const suffix = withPrices ? "-with-prices" : "";
      link.download = `order-${getOrderReference(order)}${suffix}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setShowPdfModal(false);
    } catch (downloadError) {
      console.error("Failed to generate PDF:", downloadError);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setGeneratingPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="h-10 w-10 sm:h-12 sm:w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-gray-600 text-sm sm:text-base">Loading your order...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg p-6 sm:p-8 max-w-md w-full text-center">
          <div className="text-red-500 text-4xl sm:text-5xl mb-4">⚠️</div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Order Not Found</h2>
          <p className="text-gray-600 text-sm sm:text-base mb-4">
            {error || "We couldn't find this order. Please check your link and try again."}
          </p>
        </div>
      </div>
    );
  }

  const isManager = currentUserRole === "manager";
  const orderReference = getOrderReference(order);
  const orderIdentifier = getOrderIdentifier(order);
  const hasCatering = Boolean(order.mealSessions && order.mealSessions.length > 0);
  const displayOrder = getDisplayOrder(order);
  const bookingOwnerLoggedIn =
    !!member?.email &&
    !!order.memberEmail &&
    member.email.toLowerCase() === order.memberEmail.toLowerCase();
  const bookingStartLabel = formatDateTime(order.bookingStartTime);
  const bookingEndLabel = formatDateTime(order.bookingEndTime);

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8">
      {showPdfModal && (
        <PdfDownloadModal
          onDownload={handlePdfDownloadWithChoice}
          onClose={() => setShowPdfModal(false)}
          isGenerating={generatingPdf}
        />
      )}

      <div className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-8">
        <div className="bg-gradient-to-r from-primary to-primary/80 rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 mb-4 sm:mb-6 lg:mb-8 text-white">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-1 sm:mb-1">
                Your Order
              </h1>
              <p className="text-white/80 text-sm sm:text-base">
                Reference: <span className="font-mono font-bold">#{orderReference}</span>
              </p>
            </div>
            <div className="flex flex-col items-start sm:items-end gap-2">
              <OrderStatusBadge status={order.status} />
            </div>
          </div>
        </div>

        {!hasCatering && order.requiresCatering ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            <div className="lg:col-span-2 space-y-4 sm:space-y-6">
              <OrderStatusTimeline status={order.status} />
              <OrderDetails order={displayOrder} />
              <div className="bg-white rounded-xl p-6 sm:p-8 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="rounded-2xl bg-[#bd2429]/10 p-3">
                    <UtensilsCrossed className="h-6 w-6 text-[#bd2429]" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-slate-900">
                      Catering still needs to be added
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">
                      This booking has a venue hold but no catering order yet. Once the catering
                      order is placed, it will appear here.
                    </p>

                    <div className="mt-6 flex flex-wrap gap-3">
                      {bookingOwnerLoggedIn || !isAuthenticated ? (
                        <Link
                          href={`/coworking/${spaceSlug}/view/${token}/add-catering`}
                          className="inline-flex items-center gap-2 rounded-full bg-[#bd2429] px-5 py-3 text-sm font-semibold text-white"
                        >
                          {bookingOwnerLoggedIn ? "Add catering" : "Log in to add catering"}
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      ) : null}
                    </div>

                    {isAuthenticated && !bookingOwnerLoggedIn ? (
                      <p className="mt-4 text-sm text-slate-600">
                        Only the booking owner can add catering for this booking.
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4 sm:space-y-6">
              <DeliveryInfo order={displayOrder} />
              <OrderSummary order={displayOrder} depositOnly />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            <div className="lg:col-span-2 space-y-4 sm:space-y-6">
              <OrderStatusTimeline status={order.status} />
              {order.mealSessions && order.mealSessions.length > 0 && (
                <DeliveryTracking sessions={order.mealSessions} trackingData={deliveryTracking} />
              )}
              <OrderDetails order={displayOrder} />
              {isManager && (
                <DeliveryTimeManager order={order} onUpdate={loadOrder} accessToken={token} />
              )}
              <OrderItemsByCategory
                order={order}
                onViewMenu={handleDownloadPdf}
                isGeneratingPdf={generatingPdf}
              />
            </div>

            <div className="space-y-4 sm:space-y-6">
              <DeliveryInfo order={displayOrder} />
              <OrderSummary order={order} />

              {refunds.length > 0 && <RefundsList refunds={refunds} />}
              {order.status === "completed" && orderIdentifier && (
                <div className="bg-white rounded-xl p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Need a Refund?</h3>
                  <RefundRequestButton
                    orderId={orderIdentifier}
                    orderType="catering"
                    orderCompletedAt={
                      typeof order.updatedAt === "string"
                        ? order.updatedAt
                        : order.updatedAt?.toISOString() ??
                          (typeof order.createdAt === "string"
                            ? order.createdAt
                            : order.createdAt?.toISOString() ?? new Date().toISOString())
                    }
                    totalAmount={order.finalTotal ?? 0}
                    orderItems={order.restaurants || order.orderItems || []}
                    canRequestRefund={true}
                    onRefundRequested={loadOrder}
                    userId={order.userId ?? ""}
                  />
                </div>
              )}

              {isManager ? (
                <>
                  <PickupContactManager order={order} onUpdate={loadOrder} accessToken={token} />
                  <SharedAccessManager
                    order={order}
                    onUpdate={loadOrder}
                    currentUserRole={currentUserRole}
                  />
                </>
              ) : (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 sm:p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <Eye className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                    <h3 className="text-base sm:text-lg font-bold text-blue-900">
                      View Only Access
                    </h3>
                  </div>
                  <p className="text-xs sm:text-sm text-blue-800">
                    You have view-only access to this order. Contact the order owner if you need
                    to make changes.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CoworkingOrderViewPage() {
  return (
    <CoworkingProvider>
      <CoworkingOrderViewPageContent />
    </CoworkingProvider>
  );
}
