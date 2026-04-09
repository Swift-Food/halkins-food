"use client";

import { createRef, useEffect, useState } from "react";
import { X, Clock, Tag, Pencil, ShoppingBag, AlertTriangle, ChevronUp } from "lucide-react";
import { ViewOrderModalProps } from "./types";
import SelectedItemsByCategory from "./SelectedItemsByCategory";
import DateSessionNav from "./DateSessionNav";
import PricingSummary from "./contact/PricingSummary";

type PromotionTier = {
  minQuantity: number;
  discountPercentage: number | string;
};

export default function ViewOrderModal({
  isOpen,
  onClose,
  mealSessions,
  activeSessionIndex,
  onSessionChange,
  getSessionTotal,
  getSessionDiscount,
  validationErrors,
  onEditSession,
  onRemoveSession,
  onEditItem,
  onRemoveItem,
  onSwapItem,
  onRemoveBundle,
  collapsedCategories,
  onToggleCategory,
  onViewMenu,
  generatingPdf,
  isCurrentSessionValid,
  totalPrice,
  onCheckout,
  canRemoveSession,
  formatTimeDisplay,
  navMode,
  dayGroups,
  selectedDayDate,
  currentDayGroup,
  onDateClick,
  onBackToDates,
  onAddDay,
  onAddSessionToDay,
  restaurants,
  pricing,
  calculatingPricing = false,
}: ViewOrderModalProps) {
  const [showPricing, setShowPricing] = useState(false);

  // Lock body scroll while the modal is open so the page behind doesn't scroll
  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const activeSession = mealSessions[activeSessionIndex];
  if (!activeSession) return null;

  const { discount, promotion } = getSessionDiscount(activeSessionIndex);
  const sessionTotal = getSessionTotal(activeSessionIndex);
  const validationError = validationErrors[activeSessionIndex] || null;
  const isUnscheduled = !activeSession.sessionDate;
  const totalItemCount = activeSession.orderItems.reduce((sum, oi) => sum + oi.quantity, 0);

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
    promotion?.promotionType === "BUY_MORE_SAVE_MORE" && Array.isArray(promotion.discountTiers)
      ? (() => {
          const totalQty = activeSession.orderItems.reduce(
            (sum, orderItem) => sum + orderItem.quantity,
            0
          );
          const tiers = [...(promotion.discountTiers as PromotionTier[])].sort(
            (a, b) => b.minQuantity - a.minQuantity
          );
          const tier = tiers.find((entry) => totalQty >= entry.minQuantity);
          return tier ? `${Number(tier.discountPercentage)}% off` : "";
        })()
      : promotion?.promotionType === "BOGO"
        ? "Buy One Get One"
        : promotion?.discountPercentage != null
          ? `${Number(promotion.discountPercentage)}% off`
          : "";

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      <div className="flex items-center justify-between border-b border-base-200 bg-white px-4 py-3">
        <h2 className="text-lg font-bold text-gray-900">Your Order</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={onViewMenu}
            disabled={generatingPdf}
            className="flex items-center gap-1.5 rounded-lg border border-primary px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {generatingPdf ? (
              <span className="loading loading-spinner loading-xs" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            )}
            {generatingPdf ? "Generating..." : "Download PDF"}
          </button>
          <button
            onClick={onClose}
            className="rounded-full p-2 transition-colors hover:bg-base-200"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>
      </div>

      <DateSessionNav
        navMode={navMode}
        dayGroups={dayGroups}
        selectedDayDate={selectedDayDate}
        currentDayGroup={currentDayGroup}
        expandedSessionIndex={activeSessionIndex}
        isNavSticky={false}
        onDateClick={onDateClick}
        onBackToDates={onBackToDates}
        onSessionPillClick={onSessionChange}
        onAddDay={onAddDay}
        onAddSessionToDay={onAddSessionToDay}
        formatTimeDisplay={formatTimeDisplay}
        addDayNavButtonRef={createRef()}
        backButtonRef={createRef()}
        firstDayTabRef={createRef()}
        firstSessionPillRef={createRef()}
        addSessionNavButtonRef={createRef()}
      />

      <div className="flex-1 overflow-y-auto">
        {validationError && (
          <div className="flex items-start gap-3 border-b-2 border-red-500 bg-red-50 p-4">
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
              <p className="mb-1 text-sm font-semibold text-red-800">Catering Hours Conflict</p>
              <p className="text-sm text-red-700">{validationError}</p>
              <button
                onClick={() => onEditSession(activeSessionIndex)}
                className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
              >
                Edit Session Time
              </button>
            </div>
          </div>
        )}

        {isUnscheduled && (
          <div className="flex items-start gap-3 border-b border-amber-200 bg-amber-50 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-800">Set date & time to continue</p>
              <button
                onClick={() => onEditSession(activeSessionIndex)}
                className="mt-2 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-amber-600"
              >
                Edit Session
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between border-b border-base-200 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary">
              <Clock className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">{activeSession.sessionName}</p>
              <p className="text-xs text-gray-500">{formatDate(activeSession.sessionDate)}</p>
              <p className="text-xs text-gray-500">{formatTime(activeSession.eventTime)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="mr-2 text-right">
              <span className="text-sm font-semibold text-primary">
                £{sessionTotal.toFixed(2)}
              </span>
              <p className="text-[10px] text-gray-500">{totalItemCount} items</p>
              {discount != null && discount > 0 && (
                <p className="text-[10px] font-semibold text-green-600">
                  -£{discount.toFixed(2)} off
                </p>
              )}
            </div>
            <button
              onClick={() => onEditSession(activeSessionIndex)}
              className="rounded-full p-2 text-primary transition-colors hover:bg-base-200"
              title="Edit Session"
            >
              <Pencil className="h-4 w-4" />
            </button>
            {canRemoveSession(activeSessionIndex) && (
              <button
                onClick={(e) => onRemoveSession(activeSessionIndex, e)}
                className="rounded-full p-2 text-red-500 transition-colors hover:bg-red-50"
                title="Remove Session"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {discount != null && discount > 0 && promotion && (
          <div className="mx-4 mt-3 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2">
            <Tag className="h-4 w-4 flex-shrink-0 text-green-600" />
            <div className="min-w-0 flex-1">
              <span className="text-xs font-semibold text-green-700">
                {promotion.name || "Restaurant Promotion"}
              </span>
              <span className="ml-1.5 text-xs text-green-600">{promotionLabel}</span>
            </div>
            <span className="flex-shrink-0 text-sm font-bold text-green-700">
              -£{discount.toFixed(2)}
            </span>
          </div>
        )}

        <div className="p-4">
          {activeSession.orderItems.length > 0 ? (
            <div className="min-w-0 overflow-hidden">
              <SelectedItemsByCategory
                sessionIndex={activeSessionIndex}
                onEdit={onEditItem}
                onRemove={onRemoveItem}
                onSwapItem={onSwapItem}
                onRemoveBundle={onRemoveBundle}
                collapsedCategories={collapsedCategories}
                onToggleCategory={onToggleCategory}
                onViewMenu={onViewMenu}
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
      </div>

      <div className="relative flex-shrink-0">
        {/* Floating session detail pill + chevron button */}
        <div className="pointer-events-none absolute -top-14 left-0 right-0 z-10 flex items-center justify-center gap-2">
          <div className="pointer-events-auto flex flex-col items-center rounded-2xl border border-base-200 bg-white/50 px-3 py-1.5 shadow-sm backdrop-blur-sm">
            <span className="text-xs font-semibold text-gray-800">{activeSession.sessionName}</span>
            <span className="text-[10px] text-gray-500">
              {activeSession.sessionDate
                ? new Date(activeSession.sessionDate).toLocaleDateString("en-GB", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })
                : "Date not set"}
              {activeSession.eventTime && ` · ${formatTimeDisplay(activeSession.eventTime)}`}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowPricing((v) => !v)}
            className="pointer-events-auto flex h-8 w-8 items-center justify-center rounded-full border border-base-200 bg-white/50 shadow-sm backdrop-blur-sm transition-colors hover:bg-white/80"
            aria-label={showPricing ? "Hide pricing" : "Show pricing"}
          >
            <ChevronUp className={`h-4 w-4 text-gray-600 transition-transform duration-200 ${showPricing ? "rotate-180" : ""}`} />
          </button>
        </div>

        {/* Expandable pricing summary */}
        {showPricing && (
          <div className="border-t border-base-200 bg-white px-4 pb-3 pt-2">
            <PricingSummary
              pricing={pricing ?? null}
              calculatingPricing={calculatingPricing}
              compact
            />
          </div>
        )}

        <div className="bg-primary p-4">
          <button
            onClick={onCheckout}
            className="flex w-full items-center justify-between text-white"
          >
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              <span className="font-semibold">
                {isCurrentSessionValid ? "Checkout" : "Min. Order Not Met"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold">£{totalPrice.toFixed(2)}</span>
              <span className="text-sm opacity-80">{totalItemCount} items</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
