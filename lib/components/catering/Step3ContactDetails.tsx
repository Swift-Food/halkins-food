// components/catering/Step3ContactInfo.tsx

"use client";

import { useState, FormEvent, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useCatering } from "@/context/CateringContext";
import { cateringService } from "@/services/api/catering.api";
import { SessionExpiredError } from "@/services/api/coworking.api";
import { CateringPricingResult, ContactInfo } from "@/types/catering.types";
import AllMealSessionsItems from "./AllMealSessionsItems";
import {
  LocalMealSession,
  transformLocalSessionsToPdfData,
} from "@/lib/utils/menuPdfUtils";  
import { pdf } from "@react-pdf/renderer";
import { ArrowDown, FileText } from "lucide-react";
import { CateringMenuPdf } from "@/lib/components/pdf/CateringMenuPdf";
import PdfDownloadModal from "./modals/PdfDownloadModal";
import ContactInfoForm from "./contact/ContactInfoForm";
import PromoCodeSection from "./contact/PromoCodeSection";
import PricingSummary from "./contact/PricingSummary";
import { coworkingService } from "@/services/api";
import { CreateCoworkingOrderRequest } from "@/types/api";
import {
  clearCoworkingSessionStorage,
  useCoworking,
} from "@/context/CoworkingContext";
import CoworkingAuthForm from "@/lib/components/coworking/CoworkingAuthForm";

const FALLBACK_DELIVERY_ADDRESS = "1-2 Paris Gardens, London";
const FALLBACK_DELIVERY_LAT = 51.50664530535029;
const FALLBACK_DELIVERY_LNG = -0.10636436057400264;

interface ValidationErrors {
  organization?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  ccEmail?: string;
  billingAddress?: {
    line1?: string;
    city?: string;
    postalCode?: string;
  };
}

type PdfPreviewItem = LocalMealSession["orderItems"][number]["item"];
type ApiErrorWithResponse = {
  response: {
    status?: number;
    statusText?: string;
    data?: {
      message?: string;
    };
  };
};

export default function Step3ContactInfo() {
  const router = useRouter();
  const topSectionRef = useRef<HTMLDivElement | null>(null);
  const orderDetailsRef = useRef<HTMLDivElement | null>(null);
  const {
    contactInfo,
    setContactInfo,
    setCurrentStep,
    eventDetails,
    mealSessions,
    getAllItems,
    resetOrder,
    markOrderAsSubmitted,

  } = useCatering();

  const {
    isAuthenticated,
    isLoading: authLoading,
    selectedVenue,
    eventEndTime,
    spaceSlug: coworkingSpaceSlug,
  } = useCoworking();

  const deliveryAddress = selectedVenue?.name ?? FALLBACK_DELIVERY_ADDRESS;
  const deliveryLat = selectedVenue?.latitude ?? FALLBACK_DELIVERY_LAT;
  const deliveryLng = selectedVenue?.longitude ?? FALLBACK_DELIVERY_LNG;

  // Get all items from all sessions for pricing calculations
  const selectedItems = getAllItems();

  const [formData, setFormData] = useState<ContactInfo>({
    organization: contactInfo?.organization || "",
    fullName: contactInfo?.fullName || "",
    email: contactInfo?.email || "",
    phone: contactInfo?.phone || "",
    addressLine1: "",
    city: "",
    zipcode: "",
    billingAddress: contactInfo?.billingAddress,
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [promoCodes, setPromoCodes] = useState<string[]>([]);
  const [validatingPromo, setValidatingPromo] = useState(false);
  const [promoError, setPromoError] = useState("");
  const [promoSuccess, setPromoSuccess] = useState("");
  const [pricing, setPricing] = useState<CateringPricingResult | null>(null);
  const [calculatingPricing, setCalculatingPricing] = useState(false);

  const [ccEmails, setCcEmails] = useState<string[]>([]);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [specialInstructions, setSpecialInstructions] = useState<string>("");
  const [showBackToTopButton, setShowBackToTopButton] = useState(false);

  const [importantNotesOpen, setImportantNotesOpen] = useState(false);

  // PDF generation state
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const hasRestoredDraft = useRef(false);

  // Calculate estimated total without triggering state updates
  const estimatedTotal = useMemo(() => {
    return selectedItems.reduce((total, { item, quantity }) => {
      const price = parseFloat(item.price?.toString() || "0");
      const discountPrice = parseFloat(item.discountPrice?.toString() || "0");
      const unitPrice =
        item.isDiscount && discountPrice > 0 ? discountPrice : price;

      // Addon total = sum of (addonPrice × addonQuantity) - no scaling multipliers
      const addonTotal = (item.selectedAddons || []).reduce(
        (sum, { price, quantity }) => {
          return sum + (price || 0) * (quantity || 0);
        },
        0
      );

      return total + unitPrice * quantity + addonTotal;
    }, 0);
  }, [selectedItems]);

  useEffect(() => {
    if (!contactInfo) {
      hasRestoredDraft.current = true;
      return;
    }

    setFormData({
      organization: contactInfo.organization || "",
      fullName: contactInfo.fullName || "",
      email: contactInfo.email || "",
      phone: contactInfo.phone || "",
      addressLine1: contactInfo.addressLine1 || "",
      addressLine2: contactInfo.addressLine2 || "",
      city: contactInfo.city || "",
      zipcode: contactInfo.zipcode || "",
      billingAddress: contactInfo.billingAddress,
      ccEmails: contactInfo.ccEmails || [],
      specialInstructions: contactInfo.specialInstructions || "",
    });
    setCcEmails(contactInfo.ccEmails || []);
    setSpecialInstructions(contactInfo.specialInstructions || "");
    hasRestoredDraft.current = true;
  }, [contactInfo]);

  useEffect(() => {
    if (!hasRestoredDraft.current) return;

    const draftContactInfo: ContactInfo = {
      ...formData,
      ccEmails,
      specialInstructions,
    };

    if (JSON.stringify(contactInfo) === JSON.stringify(draftContactInfo)) {
      return;
    }

    setContactInfo(draftContactInfo);
  }, [ccEmails, contactInfo, formData, setContactInfo, specialInstructions]);

  const validateEmail = (email: string): string | undefined => {
    if (!email.trim()) {
      return "Email is required";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return "Please enter a valid email address";
    }
    return undefined;
  };

  const hasApiErrorResponse = (error: unknown): error is ApiErrorWithResponse => {
    if (!error || typeof error !== "object" || !("response" in error)) {
      return false;
    }

    const response = (error as { response?: unknown }).response;
    return typeof response === "object" && response !== null;
  };

  

  const validatePhone = (phone: string): string | undefined => {
    if (!phone.trim()) {
      return "Phone number is required";
    }
    // UK phone number validation (accepts various formats)
    const cleanPhone = phone.replace(/[\s()-]/g, "");
    if (cleanPhone.length < 10 || cleanPhone.length > 11) {
      return "Please enter a valid UK phone number";
    }
    return undefined;
  };
  const validateFullName = (name: string): string | undefined => {
    if (!name.trim()) {
      return "Full name is required";
    }
    if (name.trim().length < 2) {
      return "Name must be at least 2 characters";
    }
    return undefined;
  };

  const handleBlur = (field: keyof ContactInfo) => {
    let error: string | undefined;

    switch (field) {
      case "fullName":
        error = validateFullName(formData.fullName);
        break;
      case "email":
        error = validateEmail(formData.email);
        break;
      case "phone":
        error = validatePhone(formData.phone);
        break;
    }

    setErrors((prev) => ({
      ...prev,
      [field]: error,
    }));
  };

  const handleBillingBlur = (field: keyof NonNullable<ContactInfo["billingAddress"]>) => {
    // Only validate if user has started filling in billing address
    if (!hasBillingAddressData()) return;

    const billing = formData.billingAddress;
    let error: string | undefined;

    switch (field) {
      case "line1":
        if (!billing?.line1?.trim()) {
          error = "Address line 1 is required";
        }
        break;
      case "city":
        if (!billing?.city?.trim()) {
          error = "City is required";
        }
        break;
      case "postalCode":
        if (!billing?.postalCode?.trim()) {
          error = "Postcode is required";
        } else if (!validateUKPostcode(billing.postalCode)) {
          error = "Please enter a valid UK postcode (e.g., SW1A 1AA)";
        }
        break;
    }

    setErrors((prev) => ({
      ...prev,
      billingAddress: {
        ...prev.billingAddress,
        [field]: error,
      },
    }));
  };

  // Clear error when user starts typing
  const handleChange = (field: keyof ContactInfo, value: string | ContactInfo["billingAddress"]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (field in errors) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  // UK Postcode validation regex
  const UK_POSTCODE_REGEX = /^([A-Z]{1,2}\d{1,2}[A-Z]?)\s?(\d[A-Z]{2})$/i;

  const validateUKPostcode = (postcode: string): boolean => {
    if (!postcode) return false;
    return UK_POSTCODE_REGEX.test(postcode.trim());
  };

  // Check if billing address has any data entered
  const hasBillingAddressData = (): boolean => {
    const billing = formData.billingAddress;
    if (!billing) return false;
    return !!(billing.line1?.trim() || billing.city?.trim() || billing.postalCode?.trim());
  };

  // Validate billing address fields - only required if user has started filling it in
  const validateBillingAddress = (): ValidationErrors["billingAddress"] => {
    // Skip validation if user hasn't entered any billing data
    if (!hasBillingAddressData()) return undefined;

    const billing = formData.billingAddress;
    const billingErrors: ValidationErrors["billingAddress"] = {};

    if (!billing?.line1?.trim()) {
      billingErrors.line1 = "Address line 1 is required";
    }
    if (!billing?.city?.trim()) {
      billingErrors.city = "City is required";
    }
    if (!billing?.postalCode?.trim()) {
      billingErrors.postalCode = "Postcode is required";
    } else if (!validateUKPostcode(billing.postalCode)) {
      billingErrors.postalCode = "Please enter a valid UK postcode (e.g., SW1A 1AA)";
    }

    // Return undefined if no errors, otherwise return the errors object
    return Object.keys(billingErrors).length > 0 ? billingErrors : undefined;
  };

  // Validate all fields
  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {
      fullName: validateFullName(formData.fullName),
      email: validateEmail(formData.email),
      phone: validatePhone(formData.phone),
    };

    // Validate billing address if user has entered any data
    newErrors.billingAddress = validateBillingAddress();

    setErrors(newErrors);

    // Return true if no errors (check billingAddress separately as it's an object)
    const hasBasicErrors = Object.entries(newErrors)
      .filter(([key]) => key !== "billingAddress")
      .some(([, error]) => error !== undefined);
    const hasBillingErrors = newErrors.billingAddress !== undefined;

    return !hasBasicErrors && !hasBillingErrors;
  };

  const handleAddCcEmail = (email: string) => {
    setCcEmails([...ccEmails, email]);
  };

  const handleRemoveCcEmail = (emailToRemove: string) => {
    setCcEmails(ccEmails.filter((email) => email !== emailToRemove));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!termsAccepted) {
      alert("Please accept the Terms and Conditions to continue");
      return;
    }

    if (!validateForm()) {
      // Scroll to first error - improved version
      setTimeout(() => {
        const firstErrorField = Object.keys(errors).find(
          (key) => errors[key as keyof ValidationErrors]
        );

        if (firstErrorField) {
          // Try multiple selectors
          const element =
            document.querySelector(`[name="${firstErrorField}"]`) ||
            document.getElementById(firstErrorField) ||
            document.querySelector(`input[name="${firstErrorField}"]`);

          if (element) {
            element.scrollIntoView({
              behavior: "smooth",
              block: "center",
            });
            // Focus the input to draw attention
            (element as HTMLInputElement).focus();
          } else {
            // Fallback: scroll to top of form
            window.scrollTo({ top: 0, behavior: "smooth" });
          }
        }
      }, 100); // Small delay to ensure errors are rendered

      return;
    }


    await submitOrder();
  };

  const buildCoworkingOrderData = (): { spaceSlug: string; orderData: CreateCoworkingOrderRequest } => {
    const slug = coworkingSpaceSlug || 'testi';
    const firstSession = mealSessions[0];
    const sessionDate = firstSession?.sessionDate || '';
    const sessionTime = firstSession?.eventTime || eventDetails?.eventTime || '';

    // Build per-session meal sessions with items grouped by restaurant
    const builtMealSessions = mealSessions
      .filter(session => session.orderItems.length > 0)
      .map(session => {
        const itemsByRestaurant = new Map<string, { menuItemId: string; quantity: number; selectedAddons?: { name: string; quantity: number }[] }[]>();
        session.orderItems.forEach(({ item, quantity }) => {
          const restaurantId = item.restaurantId;
          if (!itemsByRestaurant.has(restaurantId)) {
            itemsByRestaurant.set(restaurantId, []);
          }
          itemsByRestaurant.get(restaurantId)!.push({
            menuItemId: item.id,
            quantity,
            selectedAddons: item.selectedAddons?.map(addon => ({
              name: addon.name,
              quantity: addon.quantity,
            })),
          });
        });

        return {
          sessionName: session.sessionName,
          sessionDate: session.sessionDate,
          eventTime: session.eventTime,
          orderItems: Array.from(itemsByRestaurant.entries()).map(([restaurantId, menuItems]) => ({
            restaurantId,
            menuItems,
          })),
        };
      });

    return {
      spaceSlug: slug,
      orderData: {
        deliveryAddress,
        deliveryLocation: {
          latitude: deliveryLat,
          longitude: deliveryLng,
        },
        customerPhone: formData.phone,
        mealSessions: builtMealSessions,
        specialInstructions: specialInstructions || undefined,
        scheduledFor: sessionDate,
        scheduledTime: sessionTime,
        ...(sessionDate && sessionTime && {
          eventStartDateTime: `${sessionDate}T${sessionTime}:00`,
          deliveryDate: sessionDate,
          deliveryTime: sessionTime,
        }),
        ...(sessionDate && eventEndTime && {
          eventEndDateTime: `${sessionDate}T${eventEndTime}:00`,
        }),
      },
    };
  };

  const submitOrder = async () => {
    setSubmitting(true);

    try {
      if (!pricing) {
        console.error("ERROR: Pricing not available");
        alert("Please wait for pricing calculation to complete");
        setSubmitting(false);
        return;
      }

      setContactInfo({
        ...formData,
        ccEmails,
        specialInstructions,
      });

      
      const { spaceSlug, orderData } = buildCoworkingOrderData();
      const createOrderResponse = await coworkingService.createOrder(spaceSlug, orderData);

      markOrderAsSubmitted();
      clearCoworkingSessionStorage();


      const accessToken = createOrderResponse?.accessToken;
      if (accessToken) {
        router.push(`/coworking/${spaceSlug}/view/${accessToken}`);
      } else {
        setSuccess(true);
      }
    } catch (error: unknown) {
      console.error("=== SUBMIT ORDER ERROR ===");
      const errorDetails =
        error instanceof Error
          ? error
          : new Error(typeof error === "string" ? error : "Unknown error");
      console.error("Error Type:", errorDetails.name);
      console.error("Error Message:", errorDetails.message);
      console.error("Error Stack:", errorDetails.stack);
      console.error("Full Error Object:", JSON.stringify(error, null, 2));

      // Session expired — the event dispatch in coworkingService already
      // triggers the auth screen redirect, so just bail out here.
      if (error instanceof SessionExpiredError) {
        console.error("=== END ERROR LOG ===");
        return;
      }

      // Handle catering portions limit error
      if (
        errorDetails.message.includes("catering capacity") ||
        errorDetails.message.includes("catering portions limit")
      ) {
        alert(errorDetails.message);
        console.error("=== END ERROR LOG ===");
        return;
      }

      // Check if it's a network error
      if (
        errorDetails.message.includes("fetch") ||
        errorDetails.message.includes("network")
      ) {
        console.error("Network Error Detected");
        alert(
          "Network error: Please check your internet connection and try again."
        );
      }
      // Check if it's an API error with response
      else if (hasApiErrorResponse(error)) {
        console.error(
          "API Response Error:",
          JSON.stringify(error.response, null, 2)
        );
        console.error("Status Code:", error.response.status);
        console.error("Status Text:", error.response.statusText);
        console.error(
          "Response Data:",
          JSON.stringify(error.response.data, null, 2)
        );
        alert(
          `Failed to submit order: ${
            error.response.data?.message ||
            error.response.statusText ||
            "Unknown error"
          }`
        );
      }
      // Generic error
      else {
        console.error("Unknown Error Type");
        alert(
          `Failed to submit order: ${errorDetails.message || "Please try again."}`
        );
      }

      console.error("=== END ERROR LOG ===");
    } finally {
      setSubmitting(false);
    }
  };


  const calculatePricing = async () => {
    setCalculatingPricing(true);
    try {
      const slug = coworkingSpaceSlug || 'testi';
      console.log("calculating")
      const pricingResult = await coworkingService.calculateCartPricing(
        slug,
        mealSessions,
        { latitude: deliveryLat, longitude: deliveryLng },
        promoCodes,
      );

      if (!pricingResult.isValid) {
        setPricing(null);
        return;
      }

      setPricing(pricingResult);
    } catch (error: unknown) {
      console.error("Error calculating pricing:", error);
      setPricing(null);
    } finally {
      setCalculatingPricing(false);
    }
  };

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    const updateBackToTopVisibility = () => {
      if (window.innerWidth >= 1024) {
        setShowBackToTopButton(false);
        return;
      }

      const menuTop = orderDetailsRef.current?.getBoundingClientRect().top;
      setShowBackToTopButton(menuTop !== undefined && menuTop <= 120);
    };

    updateBackToTopVisibility();
    window.addEventListener("scroll", updateBackToTopVisibility, {
      passive: true,
    });
    window.addEventListener("resize", updateBackToTopVisibility);

    return () => {
      window.removeEventListener("scroll", updateBackToTopVisibility);
      window.removeEventListener("resize", updateBackToTopVisibility);
    };
  }, []);


  useEffect(() => {
    calculatePricing();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promoCodes, mealSessions]);

  const handleApplyPromoCode = async (code: string) => {
    setValidatingPromo(true);
    setPromoError("");
    setPromoSuccess("");

    try {
      // Use meal sessions format for promo validation
      const validation = await cateringService.validatePromoCodeWithMealSessions(
        code,
        mealSessions
      );

      if (validation.valid) {
        if (!promoCodes.includes(code)) {
          setPromoCodes([...promoCodes, code]);
          setPromoSuccess(`Promo code "${code}" applied!`);
        } else {
          setPromoError("This promo code has already been applied");
        }
      } else {
        setPromoError(validation.reason || "Invalid promo code");
      }
    } catch (error) {
      console.error("Promo validation error:", error);
      setPromoError("Failed to validate promo code");
    } finally {
      setValidatingPromo(false);
    }
  };

  const handleRemovePromoCode = (codeToRemove: string) => {
    const updatedCodes = promoCodes.filter((code) => code !== codeToRemove);
    setPromoCodes(updatedCodes);
    setPromoSuccess("");
    setPromoError("");
   
  };

  // Handle view menu - opens modal to choose with/without prices
  const handleViewMenu = () => {
    setShowPdfModal(true);
  };

  // Handle PDF download with selected price option
  const handlePdfDownload = async (withPrices: boolean) => {
    if (generatingPdf) return;
    setGeneratingPdf(true);
    try {
      // Convert mealSessions to LocalMealSession format
      const sessionsForPreview: LocalMealSession[] = mealSessions.map((session) => ({
        sessionName: session.sessionName,
        sessionDate: session.sessionDate,
        eventTime: session.eventTime,
        orderItems: session.orderItems.map((orderItem) => ({
          item: {
            id: orderItem.item.id,
            menuItemName: orderItem.item.menuItemName,
            price: orderItem.item.price,
            discountPrice: orderItem.item.discountPrice,
            isDiscount: orderItem.item.isDiscount,
            image: orderItem.item.image,
            restaurantId: orderItem.item.restaurantId,
            cateringQuantityUnit: orderItem.item.cateringQuantityUnit,
            feedsPerUnit: orderItem.item.feedsPerUnit,
            categoryName: orderItem.item.categoryName,
            subcategoryName: orderItem.item.subcategoryName,
            selectedAddons: orderItem.item.selectedAddons,
            description: (orderItem.item as PdfPreviewItem).description,
            allergens: (orderItem.item as PdfPreviewItem).allergens,
            dietaryFilters: (orderItem.item as PdfPreviewItem).dietaryFilters,
          } satisfies PdfPreviewItem,
          quantity: orderItem.quantity,
        })),
      }));

      // Transform to PDF data format with the latest priced totals from Step 3
      const pdfData = await transformLocalSessionsToPdfData(
        sessionsForPreview,
        withPrices,
        pricing?.deliveryFee
      );
      // Generate and download PDF
      const blob = await pdf(
        <CateringMenuPdf
          sessions={pdfData.sessions}
          showPrices={pdfData.showPrices}
          deliveryCharge={pdfData.deliveryCharge}
          venueHireCharge={pricing?.venueHireFee}
          totalPrice={pricing?.total ?? pdfData.totalPrice}
          logoUrl={pdfData.logoUrl}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = withPrices ? "catering-menu-with-prices.pdf" : "catering-menu.pdf";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setShowPdfModal(false);
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setGeneratingPdf(false);
    }
  };

  const scrollToSection = (ref: { current: HTMLDivElement | null }) => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen">
        <CoworkingAuthForm spaceSlug={coworkingSpaceSlug || "testi"} />
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-base-100 py-8 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="mb-8">
            <div className="w-20 h-20 bg-success/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-10 h-10 text-success"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-3 text-base-content">
              Thank you! Your event order request has been submitted.
            </h2>
            <p className="text-base-content/70 text-lg">
              We&apos;ll get back to you within 24 hours via your preferred contact
              method. You will receive a payment link once the order is confirmed by the restaurants. Trusted by 90+ London university societies.
            </p>
          </div>

          <div className="bg-base-200/50 rounded-2xl p-6 md:p-8 mb-8 text-left border border-base-300">
            <h3 className="text-xl font-bold mb-6 text-base-content">
              Event & Order Summary
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 pb-6 border-b border-base-300">
              <div>
                <p className="text-xs text-base-content/60 mb-1">
                  Event Date & Time
                </p>
                <p className="font-semibold text-base-content">
                  {eventDetails?.eventDate}
                </p>
                <p className="text-sm text-base-content/80">
                  {eventDetails?.eventTime}
                </p>
              </div>
              <div>
                <p className="text-xs text-base-content/60 mb-1">
                  Type of Event
                </p>
                <p className="font-semibold text-base-content capitalize">
                  {eventDetails?.eventType}
                </p>
              </div>
              {/* <div> */}
              {/* <p className="text-xs text-base-content/60 mb-1">Guest Count</p>
                <p className="font-semibold text-base-content">
                  {(eventDetails?.guestCount || 10) - 10} -{" "}
                  {(eventDetails?.guestCount || 10) + 10}{" "}
                </p>
              </div> */}
            </div>

            <h4 className="font-bold mb-4 text-base-content">Your List</h4>

            {promoCodes.length > 0 && (
              <div className="mb-4 p-3 bg-success/10 border border-success/30 rounded-xl">
                <p className="text-sm text-success font-medium">
                  ✓ Promo codes applied: {promoCodes.join(", ")}
                </p>
              </div>
            )}

            <div className="space-y-3 mb-6">
              {selectedItems.map(({ item, quantity }, index) => {
                const price = parseFloat(item.price?.toString() || "0");
                const discountPrice = parseFloat(
                  item.discountPrice?.toString() || "0"
                );
                const itemPrice =
                  item.isDiscount && discountPrice > 0 ? discountPrice : price;

                // USE ITEM'S OWN VALUES:
                const BACKEND_QUANTITY_UNIT = item.cateringQuantityUnit || 7;
                const displayFeeds = quantity / BACKEND_QUANTITY_UNIT;

                // Addon total = sum of (addonPrice × addonQuantity) - no scaling multipliers
                const addonTotal = (item.selectedAddons || []).reduce(
                  (sum, { price, quantity }) => {
                    return sum + (price || 0) * (quantity || 0);
                  },
                  0
                );

                const subtotal = itemPrice * quantity + addonTotal;

                return (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 bg-base-100 rounded-xl"
                  >
                    {item.image && (
                      <img
                        src={item.image}
                        alt={item.menuItemName}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-base-content truncate">
                        {item.menuItemName}
                      </p>
                      {item.selectedAddons &&
                        item.selectedAddons.length > 0 && (
                          <p className="text-xs text-base-content/50 mb-1">
                            {item.selectedAddons.map((addon, idx) => (
                              <span key={idx}>
                                + {addon.name}
                                {addon.quantity > 1 && ` (×${addon.quantity})`}
                                {idx < item.selectedAddons!.length - 1
                                  ? ", "
                                  : ""}
                              </span>
                            ))}
                          </p>
                        )}
                      <p className="text-sm text-base-content/60">
                        {displayFeeds} portions
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary">
                        £{subtotal.toFixed(2)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {pricing && (
              <div className="space-y-2 pt-4 border-t border-base-300">
                {/* Subtotal */}
                <div className="flex justify-between text-sm text-base-content/70">
                  <span>Subtotal</span>
                  <span>£{pricing.subtotal.toFixed(2)}</span>
                </div>

                {/* Restaurant Promotion Discount - FROM BACKEND */}
                {(pricing.restaurantPromotionDiscount ?? 0) > 0 && (
                  <div className="flex justify-between text-sm text-green-600 font-semibold">
                    <span>Restaurant Promotion</span>
                    <span>
                      -£{pricing.restaurantPromotionDiscount!.toFixed(2)}
                    </span>
                  </div>
                )}

                {/* Delivery fee */}
                <div className="flex justify-between text-sm text-base-content/70">
                  <span>Delivery Cost</span>
                  <span>£{pricing.deliveryFee}</span>
                </div>

                {/* Promo code discount */}
                {(pricing.promoDiscount ?? 0) > 2 && (
                  <div className="flex justify-between text-sm text-success font-medium">
                    <span>Promo Code Discount</span>
                    <span>-£{pricing.promoDiscount!.toFixed(2)}</span>
                  </div>
                )}

                {/* Total - Now correct from backend */}
                <div className="flex justify-between text-lg font-bold text-base-content pt-3 border-t border-base-300">
                  <span>Total</span>
                  <div className="text-right">
                    <p className="">£{pricing.total.toFixed(2)}</p>
                    {(pricing.totalDiscount ?? 0) > 0 && (
                      <p className="text-xs line-through text-base-content/50">
                        £{(pricing.subtotal + pricing.deliveryFee).toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={resetOrder}
              className="bg-base-300 hover:opacity-90 text-base-content px-8 py-4 rounded-xl font-bold text-lg transition-all"
            >
              Back to Home
            </button>
            <a
              href="https://www.instagram.com/swiftfood_uk?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw=="
              target="_blank"
              rel="noopener noreferrer"
              className="bg-dark-pink hover:bg-base-content/10 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all inline-block text-center"
            >
              Follow us on Instagram
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-100">
      {/* Progress Bar */}
      <div className="w-full bg-base-100 h-2">
        <div
          className="h-2 transition-all duration-300"
          style={{ width: "100%" }}
        ></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
        {/* Header */}
        <div ref={topSectionRef} className="mb-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              {/* <p className="text-sm text-base-content/60 mb-2">
                Step 3 of 3 - Contact & Confirmation
              </p> */}
              <h2 className="text-3xl md:text-4xl font-bold mb-3 text-base-content">
                Your Contact Details
              </h2>
              <p className="text-base-content/70">
                Please provide your contact details so we can confirm your event
                order request.
              </p>
            </div>
            <button
              onClick={() => {
                setContactInfo({
                  ...formData,
                  ccEmails,
                  specialInstructions,
                });
                setCurrentStep(1);
              }}
              className="text-primary hover:opacity-80 font-medium flex items-center gap-1"
            >
              ← Back
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8">
          {/* Selected Items - Left Side */}
          <div
            ref={orderDetailsRef}
            className="lg:col-span-3 order-2 lg:order-1 pb-24 lg:pb-0"
          >
            <AllMealSessionsItems
              showActions={false}
              onViewMenu={handleViewMenu}
              isGeneratingPdf={generatingPdf}
            />
            <div
              className={`lg:hidden fixed inset-x-4 bottom-4 z-30 transition-all duration-200 ${
                showBackToTopButton
                  ? "pointer-events-auto opacity-100 translate-y-0"
                  : "pointer-events-none opacity-0 translate-y-4"
              }`}
            >
              <button
                type="button"
                onClick={() => scrollToSection(topSectionRef)}
                className="w-full rounded-2xl border border-base-300 bg-base-100/95 px-4 py-3 text-sm font-semibold text-base-content shadow-lg backdrop-blur transition-all hover:bg-base-100"
              >
                Back to top
              </button>
            </div>
          </div>

          {/* Contact Form Card - Right Side */}
          <div className="lg:col-span-2 order-1 lg:order-2">
            <button
              type="button"
              onClick={() => scrollToSection(orderDetailsRef)}
              className="lg:hidden mb-4 flex w-full items-center justify-between rounded-2xl border border-base-300 bg-base-100/80 px-4 py-3 text-left shadow-sm transition-all hover:border-dark-pink/30 hover:bg-base-100"
            >
              <span className="min-w-0">
                <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-base-content/45">
                  Quick jump
                </span>
                <span className="mt-1 block text-sm font-semibold text-base-content">
                  Review order details
                </span>
                <span className="mt-0.5 block text-xs text-base-content/60">
                  Check the menu and quantities before submitting
                </span>
              </span>
              <span className="ml-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-dark-pink/10 text-dark-pink">
                <ArrowDown size={18} />
              </span>
            </button>

            <div className="bg-base-200/40 rounded-3xl p-4 md:p-8">
              <h3 className="text-xl font-bold mb-8 flex items-center gap-3 text-base-content">
                <span className="w-1.5 h-6 bg-dark-pink rounded-full"></span>
                Contact & Delivery Details
              </h3>

              <form onSubmit={handleSubmit} className="space-y-10">
                {/* Delivery Address */}
                <div>
                  <div className="rounded-2xl border border-base-300 bg-base-100/80 px-4 py-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-base-content/45 mb-2">
                      Delivering to
                    </p>
                    <p className="text-sm font-semibold text-base-content">
                      {deliveryAddress}
                    </p>
                  </div>
                </div>
     

                {/* Contact Details Section */}
                <ContactInfoForm
                  formData={formData}
                  errors={errors}
                  onFieldChange={handleChange}
                  onBlur={handleBlur}
                  onBillingBlur={handleBillingBlur}
                  ccEmails={ccEmails}
                  onAddCcEmail={handleAddCcEmail}
                  onRemoveCcEmail={handleRemoveCcEmail}
                />

                {/* Promo Code Section */}
                <PromoCodeSection
                  promoCodes={promoCodes}
                  onApplyPromoCode={handleApplyPromoCode}
                  onRemovePromoCode={handleRemovePromoCode}
                  validatingPromo={validatingPromo}
                  promoError={promoError}
                  promoSuccess={promoSuccess}
                  promoDiscount={pricing?.promoDiscount}
                />

                {/* Special Instructions */}
                <div className="-mt-4 pt-2">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-gray-200 border border-gray-300 flex items-center justify-center text-base-content/70">
                      <FileText size={18} />
                    </div>
                    <h4 className="font-bold text-sm text-base-content">
                      Special Instructions
                    </h4>
                    <span className="text-[9px] font-bold text-base-content/40 uppercase tracking-widest ml-2">
                      (Optional)
                    </span>
                  </div>
                  <textarea
                    id="specialInstructions"
                    name="specialInstructions"
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                    placeholder="Any special requests or instructions for your order..."
                    className="w-full bg-gray-50 border border-base-300 rounded-xl px-4 py-3 text-sm text-base-content placeholder:text-base-content/50 focus:outline-none focus:ring-2 focus:ring-dark-pink/20 focus:border-dark-pink transition-all min-h-[100px] resize-none"
                  />
                </div>

                {/* Pricing Summary */}
                <PricingSummary
                  pricing={pricing}
                  calculatingPricing={calculatingPricing}
                  estimatedTotal={estimatedTotal}
                  hasDeliveryAddress={Boolean(deliveryAddress)}
                />

                {/* Important Notes */}
                <div>
                  <div className="w-full bg-orange-50/50 border border-orange-200 rounded-xl p-4">
                    <button
                      type="button"
                      className="w-full flex items-center justify-between focus:outline-none group"
                      onClick={() => setImportantNotesOpen((open) => !open)}
                      aria-expanded={importantNotesOpen}
                      aria-controls="important-notes-content"
                    >
                      <span className="text-xs font-bold uppercase tracking-widest text-orange-700">
                        Important Notes
                      </span>
                      <span className="ml-2 text-orange-500 group-hover:underline flex items-center">
                        <svg
                          className={`transition-transform duration-200 w-4 h-4 ${
                            importantNotesOpen ? "rotate-180" : "rotate-0"
                          }`}
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </span>
                    </button>
                    {importantNotesOpen && (
                      <div
                        id="important-notes-content"
                        className="mt-3 text-xs text-base-content/80 leading-relaxed space-y-1"
                      >
                        <p>
                          For accurate allergen information, please contact
                          restaurants directly.
                        </p>
                        <p>
                          For any last-minute changes, please contact us at
                          least two days before your event.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Terms and Conditions */}
                <div className="space-y-6 pt-2">
                  <div className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      id="terms"
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      className="h-5 w-5 shrink-0 cursor-pointer rounded border-base-300 bg-base-100 text-dark-pink focus:outline-none focus:ring-0 focus:ring-offset-0"
                    />
                    <label
                      htmlFor="terms"
                      className="text-[11px] text-base-content/70 leading-relaxed cursor-pointer"
                    >
                      I accept the{" "}
                      <a
                        href="https://swiftfood.uk/terms"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-dark-pink hover:underline font-medium"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Terms and Conditions
                      </a>
                      *
                    </label>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={submitting || !termsAccepted}
                  className="w-full bg-dark-pink text-white py-4 rounded-2xl font-bold uppercase tracking-[0.2em] text-sm hover:opacity-90 transition-all disabled:bg-base-300 disabled:cursor-not-allowed disabled:tracking-[0.08em]"
                >
                  {submitting ? "Submitting..." : "Submit Order"}
                </button>
              </form>
            </div>
          </div>
        </div>
        {/* PDF Download Modal */}
        {showPdfModal && (
          <PdfDownloadModal
            onDownload={handlePdfDownload}
            onClose={() => setShowPdfModal(false)}
            isGenerating={generatingPdf}
          />
        )}



      </div>
    </div>
  );
}
