"use client";

import { Clock, ChevronDown, ChevronUp, ShoppingBag, X } from "lucide-react";
import { SessionAccordionProps } from "./types";

export default function SessionAccordion({
  session,
  isExpanded,
  onToggle,
  sessionTotal,
  accordionRef,
  onEditSession,
  onRemoveSession,
  canRemove,
  children,
}: SessionAccordionProps) {
  // Total quantity of all items (not just unique items)
  const totalItemCount = session.orderItems.reduce(
    (sum, oi) => sum + oi.quantity,
    0
  );

  // Format time for display
  const formatTime = (eventTime: string | undefined) => {
    if (!eventTime) return "Time not set";
    const [hours, minutes] = eventTime.split(":");
    const hour = parseInt(hours);
    const period = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${period}`;
  };

  return (
    <div
      ref={accordionRef}
      className="bg-white rounded-xl shadow-sm border border-base-200"
    >
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full px-3 py-3 md:px-5 md:py-4 flex items-center justify-between hover:bg-base-50 transition-colors"
      >
        <div className="flex items-center gap-2 md:gap-4">
          <div
            className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center ${
              isExpanded ? "bg-primary" : "bg-base-200"
            }`}
          >
            <Clock
              className={`w-4 h-4 md:w-5 md:h-5 ${
                isExpanded ? "text-white" : "text-gray-500"
              }`}
            />
          </div>
          <div className="text-left">
            <p className="text-sm md:text-base font-semibold text-gray-800">
              {session.sessionName}
            </p>
            <p className="text-xs md:text-sm text-gray-500">
              {formatTime(session.eventTime)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          {/* Desktop: items shown inline */}
          <div className="hidden md:flex items-center gap-2 text-gray-500">
            <ShoppingBag className="w-4 h-4" />
            <span className="text-sm">{totalItemCount} items</span>
          </div>
          {/* Price and items (mobile: stacked, desktop: inline) */}
          <div className="text-right">
            <span className="text-sm md:text-base font-semibold text-primary">
              £{sessionTotal.toFixed(2)}
            </span>
            {/* Mobile: items shown below price */}
            <p className="md:hidden text-[10px] text-gray-500">
              {totalItemCount} items
            </p>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 md:w-5 md:h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 md:w-5 md:h-5 text-gray-400" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-3 pb-3 md:px-5 md:pb-5 border-t border-base-200">
          <div className="flex items-center justify-between py-2 md:py-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEditSession();
              }}
              className="flex items-center gap-1 md:gap-2 text-xs md:text-sm text-gray-600 hover:text-primary transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-3 w-3 md:h-4 md:w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                />
              </svg>
              <span className="hidden sm:inline">Edit Session Details</span>
              <span className="sm:hidden">Edit</span>
            </button>
            {canRemove && (
              <button
                onClick={onRemoveSession}
                className="flex items-center gap-1 md:gap-2 text-xs md:text-sm text-red-500 hover:text-red-600 transition-colors"
              >
                <X className="w-3 h-3 md:w-4 md:h-4" />
                <span className="hidden sm:inline">Remove Session</span>
                <span className="sm:hidden">Remove</span>
              </button>
            )}
          </div>

          {/* Children content (selected items, categories, menu items) */}
          {children}
        </div>
      )}
    </div>
  );
}
