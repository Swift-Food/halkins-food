"use client";

import {
  Clock,
  X,
  Tag,
  Pencil,
  ShoppingBag,
  AlertTriangle,
} from "lucide-react";
import { ActiveSessionPanelProps } from "./types";
import SelectedItemsByCategory from "./SelectedItemsByCategory";

type PromotionTier = {
  minQuantity: number;
  discountPercentage: number | string;
};

export default function ActiveSessionPanel({
  session,
  sessionIndex,
  sessionTotal,
  sessionDiscount,
  sessionPromotion,
  validationError,
  isUnscheduled,
  canRemove,
  onEditSession,
  onRemoveSession,
  onEditItem,
  onRemoveItem,
  onSwapItem,
  onRemoveBundle,
  collapsedCategories,
  onToggleCategory,
  onViewMenu,
  restaurants,
  contentMaxHeightClass,
}: ActiveSessionPanelProps) {
  const hasItems = session.orderItems.length > 0;
  const totalItemCount = session.orderItems.reduce((sum, oi) => sum + oi.quantity, 0);

  const formatDate = (date: string | undefined) => {
    if (!date) return "Date not set";
    return new Date(date).toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (eventTime: string | undefined) => {
    if (!eventTime) return "Time not set";
    const [hours, minutes] = eventTime.split(":");
    const hour = parseInt(hours, 10);
    const minute = parseInt(minutes, 10);
    const period = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    const start = `${hour12}:${String(minute).padStart(2, "0")} ${period}`;
    const totalEnd = hour * 60 + minute + 30;
    const endHour = Math.floor(totalEnd / 60) % 24;
    const endMinute = totalEnd % 60;
    const endPeriod = endHour >= 12 ? "PM" : "AM";
    const endHour12 = endHour % 12 || 12;
    return `${start} – ${endHour12}:${String(endMinute).padStart(2, "0")} ${endPeriod}`;
  };

  const promotionLabel =
    sessionPromotion?.promotionType === "BUY_MORE_SAVE_MORE" &&
    Array.isArray(sessionPromotion.discountTiers)
      ? (() => {
          const totalQty = session.orderItems.reduce((sum, orderItem) => sum + orderItem.quantity, 0);
          const tiers = [...(sessionPromotion.discountTiers as PromotionTier[])].sort(
            (a, b) => b.minQuantity - a.minQuantity
          );
          const tier = tiers.find((entry) => totalQty >= entry.minQuantity);
          return tier ? `${Number(tier.discountPercentage)}% off` : "";
        })()
      : sessionPromotion?.promotionType === "BOGO"
        ? "Buy One Get One"
        : sessionPromotion?.discountPercentage != null
          ? `${Number(sessionPromotion.discountPercentage)}% off`
          : "";

  return (
    <div
      className={`flex flex-col rounded-xl border border-base-200 bg-white shadow-sm ${
        hasItems ? "overflow-hidden" : ""
      }`}
    >
      {isUnscheduled && (
        <div className="flex items-start gap-3 rounded-t-xl border-b border-amber-200 bg-amber-50 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800">Set date & time to continue</p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEditSession();
              }}
              className="mt-2 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-amber-600"
            >
              Edit Session
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between border-b border-base-200 px-4 py-3 md:px-5 md:py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary">
            <Clock className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800 md:text-base">
              {session.sessionName}
            </p>
            <p className="text-xs text-gray-500">{formatDate(session.sessionDate)}</p>
            <p className="text-xs text-gray-500">{formatTime(session.eventTime)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="mr-2 text-right">
            <span className="text-sm font-semibold text-primary md:text-base">
              £{sessionTotal.toFixed(2)}
            </span>
            <p className="text-[10px] text-gray-500">{totalItemCount} items</p>
            {sessionDiscount != null && sessionDiscount > 0 && (
              <p className="text-[10px] font-semibold text-green-600">
                -£{sessionDiscount.toFixed(2)} off
              </p>
            )}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEditSession();
            }}
            className="rounded-full p-2 text-primary transition-colors hover:bg-base-200"
            title="Edit Session"
          >
            <Pencil className="h-4 w-4" />
          </button>
          {canRemove && (
            <button
              onClick={onRemoveSession}
              className="rounded-full p-2 text-red-500 transition-colors hover:bg-red-50"
              title="Remove Session"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div
        className={
          hasItems
            ? ["overflow-y-auto", contentMaxHeightClass].filter(Boolean).join(" ")
            : ""
        }
      >
        {sessionDiscount != null && sessionDiscount > 0 && sessionPromotion && (
          <div className="mx-4 mt-3 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2">
            <Tag className="h-4 w-4 flex-shrink-0 text-green-600" />
            <div className="min-w-0 flex-1">
              <span className="text-xs font-semibold text-green-700 md:text-sm">
                {sessionPromotion.name || "Restaurant Promotion"}
              </span>
              <span className="ml-1.5 text-xs text-green-600">{promotionLabel}</span>
            </div>
            <span className="flex-shrink-0 text-sm font-bold text-green-700">
              -£{sessionDiscount.toFixed(2)}
            </span>
          </div>
        )}

        <div className="p-4 md:p-5">
          {hasItems ? (
            <div className="min-w-0 overflow-hidden">
              <SelectedItemsByCategory
                sessionIndex={sessionIndex}
                onEdit={onEditItem}
                onRemove={onRemoveItem}
                onSwapItem={onSwapItem}
                onRemoveBundle={onRemoveBundle}
                collapsedCategories={collapsedCategories}
                onToggleCategory={onToggleCategory}
                onViewMenu={onViewMenu}
                compactLayout
                restaurants={restaurants}
              />
            </div>
          ) : (
            <div className="py-12 text-center">
              <ShoppingBag className="mx-auto mb-3 h-12 w-12 text-gray-300" />
              <p className="text-sm text-gray-500">Browse the menu to add items</p>
            </div>
          )}
        </div>

        {validationError && (
          <div className="mx-4 mb-4 flex items-start gap-3 rounded-xl border-2 border-red-500 bg-red-50 p-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="mt-0.5 h-6 w-6 flex-shrink-0 text-red-500"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <div className="flex-1">
              <p className="mb-1 text-sm font-semibold text-red-800">
                Catering Hours Conflict
              </p>
              <p className="text-sm text-red-700">{validationError}</p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEditSession();
                }}
                className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
              >
                Edit Session Time
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
