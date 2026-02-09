"use client";

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
import { LogOut, Building2 } from "lucide-react";

interface CoworkingDashboardProps {
  spaceId: string;
}

export default function CoworkingDashboard({ spaceId }: CoworkingDashboardProps) {
  const [authenticated, setAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [me, setMe] = useState<DashboardMeResponse | null>(null);
  const [stats, setStats] = useState<DashboardStatsResponse | null>(null);
  const [orders, setOrders] = useState<DashboardOrderSummary[]>([]);
  const [activeStatus, setActiveStatus] = useState<DashboardOrderStatusFilter>("all");
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const [error, setError] = useState("");

  // Check if user is already logged in
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (token) {
      setAuthenticated(true);
    }
    setCheckingAuth(false);
  }, []);

  // Fetch dashboard data once authenticated
  const fetchDashboardData = useCallback(async () => {
    try {
      setError("");
      const [meData, statsData] = await Promise.all([
        coworkingDashboardService.getMe(spaceId),
        coworkingDashboardService.getStats(spaceId),
      ]);
      setMe(meData);
      setStats(statsData);
    } catch (err: any) {
      if (err.message?.includes("access")) {
        // Token invalid or no access — force re-login
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        setAuthenticated(false);
      }
      setError(err.message || "Failed to load dashboard");
    }
  }, [spaceId]);

  useEffect(() => {
    if (authenticated) {
      fetchDashboardData();
    }
  }, [authenticated, fetchDashboardData]);

  // Fetch orders when status filter changes
  const fetchOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const data = await coworkingDashboardService.getOrders(spaceId, {
        status: activeStatus,
        limit: 50,
      });
      setOrders(data.orders);
    } catch (err: any) {
      console.error("Failed to fetch orders:", err);
    } finally {
      setOrdersLoading(false);
    }
  }, [spaceId, activeStatus]);

  useEffect(() => {
    if (authenticated && me) {
      fetchOrders();
    }
  }, [authenticated, me, fetchOrders]);

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
      <div className="flex items-center justify-center min-h-[60vh]">
        <span className="loading loading-spinner loading-lg text-pink-500" />
      </div>
    );
  }

  // Not authenticated — show login
  if (!authenticated) {
    return <DashboardLogin onLoginSuccess={() => setAuthenticated(true)} />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="h-7 w-7 text-pink-500" />
            {me?.space.name || "Dashboard"}
          </h1>
          {me && (
            <p className="text-sm text-gray-500 mt-1">
              Signed in as {me.user.name} ({me.user.email})
            </p>
          )}
        </div>
        <button
          onClick={handleLogout}
          className="btn btn-ghost btn-sm gap-2 text-gray-600"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Stats Cards */}
      {stats && <StatsCards stats={stats} />}

      {/* Orders */}
      <OrdersList
        orders={orders}
        activeStatus={activeStatus}
        onStatusChange={setActiveStatus}
        onOrderClick={setSelectedOrderId}
        loading={ordersLoading}
      />

      {/* Order Detail Modal */}
      {selectedOrderId && (
        <OrderDetailModal
          spaceId={spaceId}
          orderId={selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
        />
      )}
    </div>
  );
}
