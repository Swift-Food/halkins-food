"use client";

import Link from "next/link";
import { Readex_Pro } from "next/font/google";
import { useCallback, useEffect, useState } from "react";
import { coworkingDashboardService } from "@/services/api/coworking-dashboard.api";
import {
  DashboardMeResponse,
  DashboardStatsResponse,
  DashboardOrderSummary,
  DashboardOrderStatusFilter,
} from "@/types/api";
import DashboardLogin from "./DashboardLogin";
import StatsCards from "./StatsCards";
import OrdersList from "./OrdersList";
import OrderDetailModal from "./OrderDetailModal";
import VenuesModal from "./VenuesModal";
import PaymentsTab from "./PaymentsTab";
import CalendarTab from "./CalendarTab";
import PromoCodesTab from "./PromoCodesTab";
import {
  LogOut,
  Building2,
  MapPin,
  ShoppingBag,
  CreditCard,
  AlertTriangle,
  CalendarDays,
  Tag,
} from "lucide-react";
import StripeReturnPage from "./StripeReturnPage";

const readexPro = Readex_Pro({
  subsets: ["latin"],
  display: "swap",
});

interface CoworkingDashboardProps {
  spaceSlug: string;
  activeTab?: DashboardTab;
}

type DashboardTab = "orders" | "calendar" | "payment" | "promos";

function isStripeReturnTab() {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  return (
    params.get("stripe") === "complete" || params.get("stripe") === "refresh"
  );
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function CoworkingDashboard({
  spaceSlug,
  activeTab = "orders",
}: CoworkingDashboardProps) {
  // If this tab was opened by Stripe redirect, show a "close this tab" screen
  if (isStripeReturnTab()) {
    return (
      <div className={readexPro.className}>
        <StripeReturnPage spaceSlug={spaceSlug} />
      </div>
    );
  }

  return (
    <CoworkingDashboardInner spaceSlug={spaceSlug} activeTab={activeTab} />
  );
}

function CoworkingDashboardInner({
  spaceSlug,
  activeTab,
}: Required<CoworkingDashboardProps>) {
  const [authenticated, setAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [me, setMe] = useState<DashboardMeResponse | null>(null);
  const [stats, setStats] = useState<DashboardStatsResponse | null>(null);
  const [orders, setOrders] = useState<DashboardOrderSummary[]>([]);
  const [activeStatus, setActiveStatus] =
    useState<DashboardOrderStatusFilter>("all");
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [showVenues, setShowVenues] = useState(false);
  const [error, setError] = useState("");
  const tabs: Array<{
    id: DashboardTab;
    href: string;
    label: string;
    icon: typeof ShoppingBag;
  }> = [
      {
        id: "orders",
        href: `/coworking-dashboard/${spaceSlug}/orders`,
        label: "Orders",
        icon: ShoppingBag,
      },
      {
        id: "calendar",
        href: `/coworking-dashboard/${spaceSlug}/calendar`,
        label: "Calendar",
        icon: CalendarDays,
      },
      {
        id: "payment",
        href: `/coworking-dashboard/${spaceSlug}/payment`,
        label: "Payment",
        icon: CreditCard,
      },
      {
        id: "promos",
        href: `/coworking-dashboard/${spaceSlug}/promos`,
        label: "Promo Codes",
        icon: Tag,
      },
    ];

  // The resolved space ID from the getMe response
  const spaceId = me?.space.id ?? null;

  // Check if user is already logged in
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (token) {
      setAuthenticated(true);
    }
    setCheckingAuth(false);
  }, []);

  // Step 1: Resolve slug → spaceId via getMeBySlug
  const fetchMe = useCallback(async () => {
    try {
      setError("");
      const meData = await coworkingDashboardService.getMeBySlug(spaceSlug);
      setMe(meData);
    } catch (err: unknown) {
      const message = getErrorMessage(err, "Failed to load dashboard");
      if (message.includes("access")) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        setAuthenticated(false);
      }
      setError(message);
    }
  }, [spaceSlug]);

  useEffect(() => {
    if (authenticated) {
      fetchMe();
    }
  }, [authenticated, fetchMe]);

  // Step 2: Once we have spaceId, fetch stats
  useEffect(() => {
    if (!spaceId) return;
    const fetchStats = async () => {
      try {
        const statsData = await coworkingDashboardService.getStats(spaceId);
        setStats(statsData);
      } catch (err: unknown) {
        console.error("Failed to fetch stats:", err);
      }
    };
    fetchStats();
  }, [spaceId]);

  // Step 3: Fetch orders when spaceId or status filter changes
  const fetchOrders = useCallback(async () => {
    if (!spaceId) return;
    setOrdersLoading(true);
    try {
      // "needs_review" is a frontend pseudo-filter: fetch all, then filter client-side
      const apiStatus = activeStatus === "needs_review" ? "all" : activeStatus;
      const data = await coworkingDashboardService.getOrders(spaceId, {
        status: apiStatus,
        limit: 50,
      });
      const filtered =
        activeStatus === "needs_review"
          ? data.orders.filter(
            (o) =>
              o.adminReviewStatus === "pending_admin_review",
          )
          : data.orders;
      setOrders(filtered);
    } catch (err: unknown) {
      console.error("Failed to fetch orders:", err);
    } finally {
      setOrdersLoading(false);
    }
  }, [spaceId, activeStatus]);

  const handleQuickApprove = useCallback(
    async (orderId: string) => {
      if (!spaceId) return;
      await coworkingDashboardService.approveOrder(spaceId, orderId);
      await fetchOrders();
    },
    [spaceId, fetchOrders],
  );

  // Count of pending-review orders across all loaded orders (or from a separate fetch)
  const pendingCount = orders.filter(
    (o) => o.adminReviewStatus === "pending" && o.status == "pending_review",
  ).length;

  useEffect(() => {
    if (spaceId) {
      fetchOrders();
    }
  }, [spaceId, fetchOrders]);

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    setAuthenticated(false);
    setMe(null);
    setStats(null);
    setOrders([]);
  };

  // Checking auth state
  if (checkingAuth) {
    return (
      <div
        className={`${readexPro.className} flex items-center justify-center min-h-[60vh]`}
      >
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  // Not authenticated — show login
  if (!authenticated) {
    return (
      <div className={readexPro.className}>
        <DashboardLogin onLoginSuccess={() => setAuthenticated(true)} />
      </div>
    );
  }

  return (
    <div
      className={`${readexPro.className} max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="h-7 w-7 text-primary" />
            {me?.space.name || "Dashboard"}
          </h1>
          {me && (
            <p className="text-sm text-gray-500 mt-1">
              Signed in as {me.user.name} ({me.user.email})
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowVenues(true)}
            className="btn btn-sm btn-primary gap-2"
          >
            <MapPin className="h-4 w-4" />
            Venues
          </button>
          <button
            onClick={handleLogout}
            className="btn btn-ghost btn-sm gap-2 text-gray-600"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Loading state while resolving spaceId */}
      {!spaceId && !error && (
        <div className="flex items-center justify-center py-16">
          <span className="loading loading-spinner loading-lg text-primary" />
        </div>
      )}

      {/* Tab Bar */}
      {spaceId && (
        <div className="-mx-4 overflow-x-auto border-b border-gray-200 px-4 sm:mx-0 sm:px-0">
          <div className="flex min-w-max gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;

              return (
                <Link
                  key={tab.id}
                  href={tab.href}
                  aria-current={activeTab === tab.id ? "page" : undefined}
                  className={`flex shrink-0 items-center gap-2 whitespace-nowrap px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Orders Tab */}
      {activeTab === "orders" && (
        <>
          {stats && <StatsCards stats={stats} />}

          {/* Pending approval banner */}
          {spaceId && pendingCount > 0 && activeStatus !== "needs_review" && (
            <button
              onClick={() => setActiveStatus("needs_review")}
              className="w-full flex items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3.5 text-left hover:bg-amber-100 transition-colors"
            >
              <span className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
                <span className="text-sm font-semibold text-amber-800">
                  {pendingCount} order{pendingCount !== 1 ? "s" : ""} need
                  {pendingCount === 1 ? "s" : ""} your approval
                </span>
              </span>
              <span className="text-xs font-semibold text-amber-700 underline underline-offset-2">
                Review now
              </span>
            </button>
          )}

          {spaceId && (
            <OrdersList
              orders={orders}
              activeStatus={activeStatus}
              pendingCount={pendingCount}
              onStatusChange={setActiveStatus}
              onOrderClick={setSelectedOrderId}
              onQuickApprove={handleQuickApprove}
              loading={ordersLoading}
            />
          )}
          {selectedOrderId && spaceId && (
            <OrderDetailModal
              spaceId={spaceId}
              orderId={selectedOrderId}
              onClose={() => setSelectedOrderId(null)}
              onOrderUpdated={fetchOrders}
            />
          )}
        </>
      )}

      {/* Calendar Tab */}
      {activeTab === "calendar" && spaceId && <CalendarTab spaceId={spaceId} />}

      {/* Payments Tab */}
      {activeTab === "payment" && spaceId && <PaymentsTab spaceId={spaceId} />}

      {/* Promo Codes Tab */}
      {activeTab === "promos" && spaceId && <PromoCodesTab spaceId={spaceId} />}

      {/* Venues Modal */}
      {showVenues && spaceId && (
        <VenuesModal spaceId={spaceId} onClose={() => setShowVenues(false)} />
      )}
    </div>
  );
}
