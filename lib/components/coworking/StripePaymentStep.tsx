// "use client";

// import { useState } from "react";
// import { useRouter } from "next/navigation";
// import { loadStripe } from "@stripe/stripe-js";
// import {
//   Elements,
//   PaymentElement,
//   useStripe,
//   useElements,
// } from "@stripe/react-stripe-js";
// import { STRIPE_PUBLISHABLE_KEY } from "@/lib/constants/stripe";
// import { coworkingService } from "@/services/api/coworking.api";
// import { CreateOrderResponse } from "@/types/api";

// const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);

// interface StripePaymentStepProps {
//   orderResult: CreateOrderResponse;
//   spaceSlug: string;
// }

// function PaymentForm({
//   orderResult,
//   spaceSlug,
// }: StripePaymentStepProps) {
//   const router = useRouter();
//   const stripe = useStripe();
//   const elements = useElements();
//   const [error, setError] = useState<string | null>(null);
//   const [processing, setProcessing] = useState(false);

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();

//     if (!stripe || !elements) return;

//     setProcessing(true);
//     setError(null);

//     try {
//       const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
//         elements,
//         redirect: "if_required",
//       });

//       if (stripeError) {
//         setError(stripeError.message || "Payment failed. Please try again.");
//         setProcessing(false);
//         return;
//       }

//       if (paymentIntent && paymentIntent.status === "succeeded") {
//         // Confirm payment on our backend
//         await coworkingService.confirmPayment(
//           spaceSlug,
//           orderResult.orderId,
//           orderResult.paymentIntentId
//         );

//         // Redirect to order confirmation
//         if (orderResult.accessToken) {
//           router.push(`/event-order/view/${orderResult.accessToken}`);
//         }
//       }
//     } catch (err: any) {
//       setError(err?.message || "Something went wrong. Please try again.");
//       setProcessing(false);
//     }
//   };

//   return (
//     <form onSubmit={handleSubmit} className="space-y-6">
//       <PaymentElement />

//       {error && (
//         <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
//           <svg
//             xmlns="http://www.w3.org/2000/svg"
//             className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5"
//             viewBox="0 0 20 20"
//             fill="currentColor"
//           >
//             <path
//               fillRule="evenodd"
//               d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
//               clipRule="evenodd"
//             />
//           </svg>
//           <p className="text-sm text-red-700">{error}</p>
//         </div>
//       )}

//       <button
//         type="submit"
//         disabled={!stripe || processing}
//         className="w-full bg-dark-pink hover:opacity-90 text-white py-4 rounded-xl font-bold text-lg transition-all disabled:bg-base-300 disabled:cursor-not-allowed"
//       >
//         {processing ? "Processing..." : `Pay £${orderResult.total.total.toFixed(2)}`}
//       </button>
//     </form>
//   );
// }

// export default function StripePaymentStep({
//   orderResult,
//   spaceSlug,
// }: StripePaymentStepProps) {
//   return (
//     <div className="min-h-screen bg-base-100">
//       <div className="max-w-lg mx-auto px-4 py-8 md:py-12">
//         <div className="mb-8">
//           <h2 className="text-3xl font-bold mb-3 text-base-content">
//             Complete Payment
//           </h2>
//           <p className="text-base-content/70">
//             Enter your payment details to complete your order.
//           </p>
//         </div>

//         {/* Order Summary */}
//         <div className="bg-base-200/30 rounded-2xl p-6 border border-base-300 mb-6">
//           <h3 className="text-sm font-semibold text-base-content/60 mb-3">
//             Order Summary
//           </h3>
//           <div className="space-y-2 text-sm">
//             <div className="flex justify-between">
//               <span className="text-base-content/70">Subtotal</span>
//               <span>£{orderResult.total.subtotal.toFixed(2)}</span>
//             </div>
//             <div className="flex justify-between">
//               <span className="text-base-content/70">Delivery Fee</span>
//               <span>£{orderResult.total.deliveryFee.toFixed(2)}</span>
//             </div>
//             {orderResult.total.serviceFee > 0 && (
//               <div className="flex justify-between">
//                 <span className="text-base-content/70">Service Fee</span>
//                 <span>£{orderResult.total.serviceFee.toFixed(2)}</span>
//               </div>
//             )}
//             <div className="flex justify-between text-lg font-bold pt-3 border-t border-base-300">
//               <span>Total</span>
//               <span>£{orderResult.total.total.toFixed(2)}</span>
//             </div>
//           </div>
//         </div>

//         {/* Stripe Payment Form */}
//         <div className="bg-white rounded-2xl p-6 border border-base-300">
//           <Elements
//             stripe={stripePromise}
//             options={{
//               clientSecret: orderResult.clientSecret,
//               appearance: {
//                 theme: "stripe",
//                 variables: {
//                   borderRadius: "12px",
//                 },
//               },
//             }}
//           >
//             <PaymentForm orderResult={orderResult} spaceSlug={spaceSlug} />
//           </Elements>
//         </div>
//       </div>
//     </div>
//   );
// }
