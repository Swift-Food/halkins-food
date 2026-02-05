// components/catering/PaymentMethodSelector.tsx
"use client";

import { useState, useEffect } from "react";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { API_BASE_URL, API_ENDPOINTS } from "@/lib/constants/api";
import { fetchWithAuth } from "@/lib/api-client/auth-client";
import { STRIPE_PUBLISHABLE_KEY } from "@/lib/constants/stripe";

const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);

interface PaymentMethodSelectorProps {
  organizationId: string;
  managerId: string;
  amount: number;
  onPaymentComplete: (paymentMethodId: string, paymentIntentId: string) => void;
  onCancel?: () => void;
}

// Inner component that uses Stripe hooks
function PaymentForm({
  amount,
  onPaymentComplete,
}: PaymentMethodSelectorProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        setError(submitError.message || "Payment failed");
        setIsLoading(false);
        return;
      }

      const { error: confirmError, paymentIntent } =
        await stripe.confirmPayment({
          elements,
          confirmParams: {
            return_url: window.location.href,
          },
          redirect: "if_required",
        });

      if (confirmError) {
        setError(confirmError.message || "Payment failed");
        setIsLoading(false);
        return;
      }

      if (paymentIntent && paymentIntent.status === "succeeded") {
        const paymentMethodId = paymentIntent.payment_method as string;
        onPaymentComplete(paymentMethodId, paymentIntent.id);
      }
    } catch (err: any) {
      setError(err.message || "Payment failed");
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-base-200/30 rounded-lg p-4 border border-base-300">
        <PaymentElement
          options={{
            layout: "tabs",
          }}
        />
      </div>

      {error && (
        <div className="bg-error/10 border border-error/30 rounded-lg p-3">
          <p className="text-sm text-error">✗ {error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || isLoading}
        className="w-full px-6 py-3 bg-dark-pink text-white rounded-xl hover:opacity-90 transition-all font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            Processing Payment...
          </>
        ) : (
          `Pay £${amount.toFixed(2)}`
        )}
      </button>
    </form>
  );
}

// Outer component that fetches clientSecret and wraps with Elements
export function PaymentMethodSelector(props: PaymentMethodSelectorProps) {
  const [clientSecret, setClientSecret] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    createPaymentIntent();
  }, []);

  const createPaymentIntent = async () => {
    try {
      setIsLoading(true);
      setError("");

      const response = await fetchWithAuth(
        `${API_BASE_URL}${API_ENDPOINTS.CORPORATE_WALLET_PAYMENT_INTENT(
          props.organizationId
        )}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: props.amount,
            // No orderId needed here
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to create payment intent");
      }

      const data = await response.json();
      setClientSecret(data.clientSecret);
    } catch (err: any) {
      console.error("Payment intent creation error:", err);
      setError(err.message || "Failed to initialize payment");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary/20 border-t-primary"></div>
        <p className="text-base-content/60 mt-4 text-sm">
          Initializing payment...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-error/10 border border-error/30 rounded-lg p-4">
        <p className="text-sm text-error mb-3">{error}</p>
        <button
          onClick={createPaymentIntent}
          className="text-sm text-primary hover:text-primary/80 font-medium"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!clientSecret) {
    return null;
  }

  const options = {
    clientSecret,
    appearance: {
      theme: "stripe" as const,
      variables: {
        colorPrimary: "#FA43AD",
        colorBackground: "#ffffff",
        colorText: "#1a1a1a",
        colorDanger: "#ef4444",
        fontFamily: "system-ui, sans-serif",
        spacingUnit: "4px",
        borderRadius: "12px",
      },
    },
  };

  return (
    <Elements stripe={stripePromise} options={options}>
      <PaymentForm {...props} />
    </Elements>
  );
}
