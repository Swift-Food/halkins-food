"use client";

import { CheckoutBarProps } from "./types";

export default function CheckoutBar({
  isCurrentSessionValid,
  totalPrice,
  onCheckout,
}: CheckoutBarProps) {
  return (
    <>
      {/* Mobile (fixed bottom bar) */}
      <div
        className={`fixed bottom-0 left-0 right-0 md:hidden p-4 shadow-lg z-50 ${
          isCurrentSessionValid ? "bg-primary" : "bg-warning"
        }`}
      >
        <button
          onClick={onCheckout}
          className="w-full flex items-center justify-between text-white"
        >
          <div className="flex flex-row justify-center items-center">
            <span className="text-lg font-semibold mr-2">Total:</span>
            <span className="text-xl font-bold">£{totalPrice.toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-2">
            {!isCurrentSessionValid && (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            )}
            <span className="font-semibold">
              {isCurrentSessionValid ? "Checkout" : "Min. Order Not Met"}
            </span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>
        </button>
      </div>

      {/* Desktop (fixed bottom right) */}
      <button
        onClick={onCheckout}
        className={`hidden md:flex fixed bottom-8 right-8 items-center gap-3 text-white px-4 py-2 rounded-xl shadow-lg transition-all z-50 ${
          isCurrentSessionValid
            ? "bg-primary hover:bg-primary/90"
            : "bg-warning hover:bg-warning/90"
        }`}
      >
        <div className="flex flex-col items-start">
          <span className="text-sm opacity-90">Total</span>
          <span className="text-lg font-bold">£{totalPrice.toFixed(2)}</span>
        </div>
        <div className="w-px h-10 bg-white/30" />
        <div className="flex items-center gap-2">
          {!isCurrentSessionValid && (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          )}
          <span className="font-semibold text-lg">
            {isCurrentSessionValid ? "Checkout" : "Min. Order Not Met"}
          </span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </div>
      </button>
    </>
  );
}
