"use client";

import React, { useState } from "react";
import {
  DeliveryTrackingDto,
  CustomerDeliveryStatus,
  MealSessionResponse,
} from "@/types/api";
import {
  Truck,
  Package,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Star,
  User,
  ChevronDown,
} from "lucide-react";

interface DeliveryTrackingProps {
  sessions: MealSessionResponse[];
  trackingData: Record<string, DeliveryTrackingDto>;
}

const STATUS_CONFIG: Record<CustomerDeliveryStatus, {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
  border: string;
  progressBg: string;
  progressFill: string;
  step: number;
}> = {
  awaiting_pickup: {
    label: "Driver picking up from restaurants",
    icon: Package,
    color: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-200",
    progressBg: "bg-blue-100",
    progressFill: "bg-blue-500",
    step: 1,
  },
  out_for_delivery: {
    label: "Out for delivery",
    icon: Truck,
    color: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-200",
    progressBg: "bg-blue-100",
    progressFill: "bg-blue-500",
    step: 2,
  },
  at_collection_point: {
    label: "Driver has arrived",
    icon: MapPin,
    color: "text-purple-700",
    bg: "bg-purple-50",
    border: "border-purple-200",
    progressBg: "bg-purple-100",
    progressFill: "bg-purple-500",
    step: 3,
  },
  delivered: {
    label: "Delivered",
    icon: CheckCircle2,
    color: "text-green-700",
    bg: "bg-green-50",
    border: "border-green-200",
    progressBg: "bg-green-100",
    progressFill: "bg-green-500",
    step: 4,
  },
};

function formatWindowTime(date: string | Date): string {
  return new Date(date).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function SessionStatus({
  session,
  tracking,
}: {
  session: MealSessionResponse;
  tracking: DeliveryTrackingDto;
}) {
  const [expanded, setExpanded] = useState(false);
  const customerStatus = tracking.customerStatus;
  if (!customerStatus) return null;

  const config = STATUS_CONFIG[customerStatus];
  const Icon = config.icon;
  const isDelivered = customerStatus === "delivered";
  const hasDetails = !!(tracking.driverInfo || (tracking.isDelayed && tracking.delayMessage));

  return (
    <div className={`rounded-xl border ${config.border} ${config.bg} overflow-hidden transition-all`}>
      {/* Collapsed bar — always visible */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3 sm:px-4 py-2.5 sm:py-3 flex items-center gap-3 text-left"
      >
        <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${config.color} flex-shrink-0`} />

        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${config.color} truncate`}>
            {config.label}
          </p>
          <p className="text-[11px] text-gray-500 truncate">{session.sessionName}</p>
        </div>

        {/* ETA or delivered time */}
        {tracking.estimatedDeliveryWindow && !isDelivered && (
          <span className="text-xs font-semibold text-gray-700 flex-shrink-0">
            {formatWindowTime(tracking.estimatedDeliveryWindow.earliest)}
            {" – "}
            {formatWindowTime(tracking.estimatedDeliveryWindow.latest)}
          </span>
        )}
        {isDelivered && tracking.estimatedDeliveryTime && (
          <span className="text-xs font-medium text-green-700 flex-shrink-0">
            {new Date(tracking.estimatedDeliveryTime).toLocaleString("en-GB", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        )}

        {hasDetails && (
          <ChevronDown
            className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${
              expanded ? "rotate-180" : ""
            }`}
          />
        )}
      </button>

      {/* Progress bar — always visible, sits below the button */}
      <div className="px-3 sm:px-4 pb-2.5 sm:pb-3">
        <div className={`flex gap-1 h-1 rounded-full overflow-hidden`}>
          {[1, 2, 3, 4].map((step) => (
            <div
              key={step}
              className={`flex-1 rounded-full ${
                step <= config.step ? config.progressFill : config.progressBg
              }`}
            />
          ))}
        </div>
      </div>

      {/* Expanded details */}
      {expanded && hasDetails && (
        <div className="px-3 sm:px-4 pb-3 sm:pb-4 space-y-2">
          {/* Delay warning */}
          {tracking.isDelayed && tracking.delayMessage && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-3.5 w-3.5 text-amber-600 flex-shrink-0" />
                <p className="text-xs text-amber-800">{tracking.delayMessage}</p>
              </div>
            </div>
          )}

          {/* Driver info */}
          {tracking.driverInfo && (
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-7 h-7 rounded-full bg-white border border-gray-200">
                <User className="w-3.5 h-3.5 text-gray-500" />
              </div>
              <span className="text-xs font-medium text-gray-700">{tracking.driverInfo.name}</span>
              <div className="flex items-center gap-0.5">
                <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                <span className="text-xs text-gray-500">{tracking.driverInfo.rating.toFixed(1)}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function DeliveryTracking({
  sessions,
  trackingData,
}: DeliveryTrackingProps) {
  const activeSessions = sessions.filter((session) => {
    const tracking = trackingData[session.id];
    return tracking && tracking.customerStatus !== null;
  });

  if (activeSessions.length === 0) return null;

  return (
    <div className="space-y-2">
      {activeSessions.map((session) => (
        <SessionStatus
          key={session.id}
          session={session}
          tracking={trackingData[session.id]}
        />
      ))}
    </div>
  );
}
