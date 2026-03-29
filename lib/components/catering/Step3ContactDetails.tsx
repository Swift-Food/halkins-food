// components/catering/Step3ContactInfo.tsx

"use client";

import { useState, FormEvent, useEffect, useMemo, useRef } from "react";
import { useParams } from "next/navigation";
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
import { ArrowDown, Calendar, Clock, FileText, MapPin } from "lucide-react";
import { CateringMenuPdf } from "@/lib/components/pdf/CateringMenuPdf";
import PdfDownloadModal from "./modals/PdfDownloadModal";
import ContactInfoForm from "./contact/ContactInfoForm";
import PromoCodeSection from "./contact/PromoCodeSection";
import PricingSummary from "./contact/PricingSummary";
import { coworkingService } from "@/services/api";
import { CreateCoworkingOrderRequest } from "@/types/api";
import {
  useCoworking,
} from "@/context/CoworkingContext";
import CoworkingAuthForm from "@/lib/components/coworking/CoworkingAuthForm";
import { isValidUKPhone } from "@/lib/utils/validation.utils";

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

function normalizeContactInfoDraft(contactInfo: ContactInfo | null | undefined) {
  return {
    organization: contactInfo?.organization || "",
    fullName: contactInfo?.fullName || "",
    email: contactInfo?.email || "",
    phone: contactInfo?.phone || "",
    addressLine1: contactInfo?.addressLine1 || "",
    addressLine2: contactInfo?.addressLine2 || "",
    city: contactInfo?.city || "",
    zipcode: contactInfo?.zipcode || "",
    billingAddress: contactInfo?.billingAddress
      ? {
          line1: contactInfo.billingAddress.line1 || "",
          line2: contactInfo.billingAddress.line2 || "",
          city: contactInfo.billingAddress.city || "",
          postalCode: contactInfo.billingAddress.postalCode || "",
          country: contactInfo.billingAddress.country || "GB",
        }
      : undefined,
    ccEmails: contactInfo?.ccEmails || [],
    specialInstructions: contactInfo?.specialInstructions || "",
  };
}

function formatEventDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatEventTime(time: string) {
  const [hours, minutes] = time.split(":");
  const hour = Number(hours);
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${period}`;
}


export default function Step3ContactInfo() {
  const params = useParams<{ spaceSlug?: string }>();
  const topSectionRef = useRef<HTMLDivElement | null>(null);
  const orderDetailsRef = useRef<HTMLDivElement | null>(null);
  const {
    contactInfo,
    setContactInfo,
    setCurrentStep,
    eventDetails,
    bookingQuestionnaire,
    mealSessions,
    getAllItems,
  } = useCatering();

  const {
    isAuthenticated,
    isLoading: authLoading,
    selectedVenue,
    eventStartDate,
    eventStartTime,
    eventEndDate,
    eventEndTime,
    spaceSlug: coworkingSpaceSlug,
  } = useCoworking();
  const resolvedSpaceSlug =
    coworkingSpaceSlug ||
    (typeof params?.spaceSlug === "string" ? params.spaceSlug : "");

  const deliveryAddress = selectedVenue?.name ?? FALLBACK_DELIVERY_ADDRESS;
  const deliveryLat = selectedVenue?.latitude ?? FALLBACK_DELIVERY_LAT;
  const deliveryLng = selectedVenue?.longitude ?? FALLBACK_DELIVERY_LNG;

  // Get all items from all sessions for pricing calculations
  const selectedItems = getAllItems();
  const normalizedContactInfo = useMemo(
    () => normalizeContactInfoDraft(contactInfo),
    [contactInfo]
  );
  const normalizedContactInfoSnapshot = useMemo(
    () => JSON.stringify(normalizedContactInfo),
    [normalizedContactInfo]
  );

  const [formData, setFormData] = useState<ContactInfo>({
    organization: normalizedContactInfo.organization,
    fullName: normalizedContactInfo.fullName,
    email: normalizedContactInfo.email,
    phone: normalizedContactInfo.phone,
    addressLine1: normalizedContactInfo.addressLine1,
    addressLine2: normalizedContactInfo.addressLine2,
    city: normalizedContactInfo.city,
    zipcode: normalizedContactInfo.zipcode,
    billingAddress: normalizedContactInfo.billingAddress,
  });
  const [submitting, setSubmitting] = useState(false);
  const [promoCodes, setPromoCodes] = useState<string[]>([]);
  const [validatingPromo, setValidatingPromo] = useState(false);
  const [promoError, setPromoError] = useState("");
  const [promoSuccess, setPromoSuccess] = useState("");
  const [pricing, setPricing] = useState<CateringPricingResult | null>(null);
  const [depositInfo, setDepositInfo] = useState<{
    amount: number;
    perDayRate: number;
    days: number;
  } | null>(null);
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
  const lastSyncedContactInfoSnapshot = useRef<string | null>(null);
  const lastDraftPushedSnapshot = useRef<string | null>(null);

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
  const hasSelectedCatering = selectedItems.length > 0;
  const pageTitle = hasSelectedCatering
    ? "Your Contact Details"
    : "Secure Your Venue";
  const pageDescription = hasSelectedCatering
    ? "Please provide your contact details so we can confirm your event order request."
    : "Provide your contact details to secure the venue with your deposit. Catering can be added later to finalise the booking.";
  const panelTitle = hasSelectedCatering
    ? "Contact & Delivery Details"
    : "Venue Hold Details";
  const bookingCardLabel = hasSelectedCatering
    ? "Event Details"
    : "Venue Hold Details";
  const specialInstructionsPlaceholder = hasSelectedCatering
    ? "Any special requests or instructions for your order..."
    : "Any notes for the venue team about this booking...";
  const quickJumpTitle = hasSelectedCatering
    ? "Review order details"
    : "Review venue hold";
  const quickJumpDescription = hasSelectedCatering
    ? "Check the menu and quantities before submitting"
    : "Review your venue and booking details before paying the deposit";

  useEffect(() => {
    if (!contactInfo) {
      hasRestoredDraft.current = true;
      return;
    }

    if (normalizedContactInfoSnapshot === lastDraftPushedSnapshot.current) {
      lastSyncedContactInfoSnapshot.current = normalizedContactInfoSnapshot;
      hasRestoredDraft.current = true;
      return;
    }

    if (normalizedContactInfoSnapshot === lastSyncedContactInfoSnapshot.current) {
      hasRestoredDraft.current = true;
      return;
    }

    setFormData({
      organization: normalizedContactInfo.organization,
      fullName: normalizedContactInfo.fullName,
      email: normalizedContactInfo.email,
      phone: normalizedContactInfo.phone,
      addressLine1: normalizedContactInfo.addressLine1,
      addressLine2: normalizedContactInfo.addressLine2,
      city: normalizedContactInfo.city,
      zipcode: normalizedContactInfo.zipcode,
      billingAddress: normalizedContactInfo.billingAddress,
    });
    setCcEmails(normalizedContactInfo.ccEmails);
    setSpecialInstructions(normalizedContactInfo.specialInstructions);
    lastSyncedContactInfoSnapshot.current = normalizedContactInfoSnapshot;
    hasRestoredDraft.current = true;
  }, [contactInfo, normalizedContactInfo, normalizedContactInfoSnapshot]);

  useEffect(() => {
    if (!hasRestoredDraft.current) return;

    const draftContactInfo = normalizeContactInfoDraft({
      ...formData,
      ccEmails,
      specialInstructions,
    });
    const draftSnapshot = JSON.stringify(draftContactInfo);

    if (
      draftSnapshot === normalizedContactInfoSnapshot ||
      draftSnapshot === lastDraftPushedSnapshot.current
    ) {
      return;
    }

    lastDraftPushedSnapshot.current = draftSnapshot;
    setContactInfo(draftContactInfo);
  }, [ccEmails, formData, normalizedContactInfoSnapshot, setContactInfo, specialInstructions]);

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
    if (!isValidUKPhone(phone)) {
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
    const slug = resolvedSpaceSlug;

    if (!slug) {
      throw new Error("Unable to determine coworking space for this order.");
    }

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

    const additionalAnswers = bookingQuestionnaire
      ? {
          eventUrl: bookingQuestionnaire.eventUrl,
          eventInformation: bookingQuestionnaire.eventInformation,
          invitedGuestCount: bookingQuestionnaire.invitedGuestCount,
          runsOvernight: bookingQuestionnaire.runsOvernight,
          specialEquipment: bookingQuestionnaire.specialEquipment,
          sponsors: bookingQuestionnaire.sponsors,
          outcomes: bookingQuestionnaire.outcomes,
          invoicingOrganisation: bookingQuestionnaire.invoicingOrganisation,
          invoiceEmailAddress: bookingQuestionnaire.invoiceEmailAddress,
          signature: bookingQuestionnaire.signature,
        }
      : undefined;

    return {
      spaceSlug: slug,
      orderData: {
        deliveryAddress,
        deliveryLocation: {
          latitude: deliveryLat,
          longitude: deliveryLng,
        },
        venueId: selectedVenue?.id,
        customerPhone: formData.phone,
        mealSessions: builtMealSessions,
        promoCodes:
          hasSelectedCatering && promoCodes.length > 0
            ? promoCodes
            : undefined,
        specialInstructions: specialInstructions || undefined,
        scheduledFor: sessionDate,
        scheduledTime: sessionTime,
        ...(sessionDate && sessionTime && {
          eventStartDateTime: `${sessionDate}T${sessionTime}:00`,
          deliveryDate: sessionDate,
          deliveryTime: sessionTime,
        }),
        ...(eventEndDate && eventEndTime && {
          eventEndDateTime: `${eventEndDate}T${eventEndTime}:00`,
        }),
        ...(additionalAnswers && { additionalAnswers }),
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
      const checkoutResponse = await coworkingService.createCheckoutSession(
        spaceSlug,
        orderData
      );

      if (typeof window !== "undefined") {
        window.location.assign(checkoutResponse.checkoutUrl);
        return;
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
      const slug = resolvedSpaceSlug;
      if (!slug) {
        setPricing(null);
        setDepositInfo(null);
        return;
      }

      const { spaceSlug, orderData } = buildCoworkingOrderData();
      const result = await coworkingService.getCartPricing(spaceSlug, orderData);

      if (!result.isValid) {
        setPricing(null);
        setDepositInfo(null);
        return;
      }

      setPricing(result as unknown as CateringPricingResult);
      setDepositInfo(result.deposit ?? null);

      // If promo codes are applied but resulted in no discount, warn the user
      if (promoCodes.length > 0) {
        const hasDiscount = (result.promoDiscount ?? 0) > 0 || (result.venueHireDiscount ?? 0) > 0;
        if (!hasDiscount) {
          setPromoSuccess("");
          setPromoError("Promo code may not apply to current items");
        } else {
          setPromoError((prev) =>
            prev === "Promo code may not apply to current items" ? "" : prev
          );
        }
      }
    } catch (error: unknown) {
      console.error("Error calculating pricing:", error);
      setPricing(null);
      setDepositInfo(null);
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
  }, [hasSelectedCatering, promoCodes, mealSessions]);

  const handleApplyPromoCode = async (code: string) => {
    setValidatingPromo(true);
    setPromoError("");
    setPromoSuccess("");

    try {
      // Use coworking validation endpoint for coworking orders,
      // otherwise use the standard catering validation endpoint
      const validation = coworkingSpaceSlug
        ? await coworkingService.validatePromoCodeWithMealSessions(code, mealSessions)
        : await cateringService.validatePromoCodeWithMealSessions(code, mealSessions);

      if (validation.valid) {
        if (!promoCodes.includes(code)) {
          setPromoCodes([...promoCodes, code]);
          if (validation.discountTarget === 'VENUE_HIRE_FEE') {
            setPromoSuccess(`Promo code "${code}" applied! Venue hire fee discount will be shown in pricing.`);
          } else {
            setPromoSuccess(`Promo code "${code}" applied!`);
          }
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
      const hasDeliveryQuote = Boolean(selectedVenue?.id);
      const pricingSessions = (
        pricing as CateringPricingResult & {
          mealSessions?: Array<{ deliveryFee?: number }>;
        }
      )?.mealSessions as
        | Array<{ deliveryFee?: number }>
        | undefined;

      // Convert mealSessions to LocalMealSession format
      const sessionsForPreview: LocalMealSession[] = mealSessions.map((session, index) => ({
        sessionName: session.sessionName,
        sessionDate: session.sessionDate,
        eventTime: session.eventTime,
        deliveryFee: hasDeliveryQuote
          ? pricingSessions?.[index]?.deliveryFee
          : undefined,
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
        hasDeliveryQuote ? pricing?.deliveryFee : undefined
      );
      // Generate and download PDF
      const blob = await pdf(
        <CateringMenuPdf
          sessions={pdfData.sessions}
          showPrices={pdfData.showPrices}
          deliveryCharge={pdfData.deliveryCharge}
          venueHireCharge={pricing?.venueHireFee}
          promoDiscount={pricing?.promoDiscount}
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
        <CoworkingAuthForm spaceSlug={resolvedSpaceSlug || "halkin"} />
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

      <div className="max-w-7xl mx-auto px-4 py-4 md:py-12">
        {/* Header */}
        <div ref={topSectionRef} className="mb-5 md:mb-8">
          <div className="flex justify-between items-start mb-3 md:mb-4">
            <div>
              {/* <p className="text-sm text-base-content/60 mb-2">
                Step 3 of 3 - Contact & Confirmation
              </p> */}
              <h2 className="text-3xl md:text-4xl font-bold mb-3 text-base-content">
                {pageTitle}
              </h2>
              <p className="text-base-content/70">
                {pageDescription}
              </p>
            </div>
            <button
              onClick={() => {
                setContactInfo({
                  ...formData,
                  ccEmails,
                  specialInstructions,
                });
                setCurrentStep(3);
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
            {hasSelectedCatering ? (
              <AllMealSessionsItems
                showActions={false}
                onViewMenu={handleViewMenu}
                isGeneratingPdf={generatingPdf}
              />
            ) : (
              <div className="rounded-3xl border border-sky-200 bg-[linear-gradient(180deg,#f8fdff_0%,#eef8ff_100%)] p-6 md:p-8">
                <div className="max-w-2xl">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-sky-700/70">
                    Venue Hold
                  </p>
                  <h3 className="mt-3 text-2xl font-bold text-slate-900">
                    Secure the space now, add catering later
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-slate-700">
                    Your deposit will hold the venue for the selected date and time.
                    To fully seal the booking, you&apos;ll still need to place your catering
                    order at a later point.
                  </p>
                  <div className="mt-6 rounded-2xl border border-sky-100 bg-white/80 p-5">
                    <p className="text-sm font-semibold text-slate-900">
                      What happens next
                    </p>
                    <div className="mt-3 space-y-2 text-sm text-slate-600">
                      <p>1. Pay the deposit to secure the venue first.</p>
                      <p>2. Return later to add catering for the event.</p>
                      <p>3. Once catering is added, the booking can move forward for review.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
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
              className="lg:hidden mb-4 flex w-full items-center justify-between rounded-2xl border border-base-300 bg-base-100/80 px-4 py-3 text-left shadow-sm transition-all hover:border-primary/30 hover:bg-base-100"
            >
              <span className="min-w-0">
                <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-base-content/45">
                  Quick jump
                </span>
                <span className="mt-1 block text-sm font-semibold text-base-content">
                  {quickJumpTitle}
                </span>
                <span className="mt-0.5 block text-xs text-base-content/60">
                  {quickJumpDescription}
                </span>
              </span>
              <span className="ml-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary/80">
                <ArrowDown size={18} />
              </span>
            </button>

            <div className="bg-base-200/40 rounded-3xl p-4 md:p-8">
              <h3 className="text-xl font-bold mb-8 flex items-center gap-3 text-base-content">
                <span className="w-1.5 h-6 bg-primary/80 rounded-full"></span>
                {panelTitle}
              </h3>

              <form onSubmit={handleSubmit} className="space-y-10">
                {/* Delivery Address */}
                <div>
                  <div className="rounded-2xl border border-base-300 bg-base-100/80 px-4 py-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-base-content/45 mb-2">
                      {bookingCardLabel}
                    </p>
                    <div className="space-y-2 text-sm text-base-content">
                      <div className="flex items-start gap-2">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <p className="font-semibold">{deliveryAddress}</p>
                      </div>
                      {eventStartDate && (
                        <div className="flex items-start gap-2 text-base-content/75">
                          <Calendar className="mt-0.5 h-4 w-4 shrink-0" />
                          <p>
                            {formatEventDate(eventStartDate)}
                            {eventEndDate && eventEndDate !== eventStartDate
                              ? ` - ${formatEventDate(eventEndDate)}`
                              : ""}
                          </p>
                        </div>
                      )}
                      {eventStartTime && (
                        <div className="flex items-start gap-2 text-base-content/75">
                          <Clock className="mt-0.5 h-4 w-4 shrink-0" />
                          <p>
                            {formatEventTime(eventStartTime)}
                            {eventEndTime
                              ? ` - ${formatEventTime(eventEndTime)}`
                              : ""}
                          </p>
                        </div>
                      )}
                    </div>
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
                {hasSelectedCatering && (
                  <PromoCodeSection
                    promoCodes={promoCodes}
                    onApplyPromoCode={handleApplyPromoCode}
                    onRemovePromoCode={handleRemovePromoCode}
                    validatingPromo={validatingPromo}
                    promoError={promoError}
                    promoSuccess={promoSuccess}
                    promoDiscount={pricing?.promoDiscount}
                    venueHireDiscount={pricing?.venueHireDiscount}
                  />
                )}

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
                    placeholder={specialInstructionsPlaceholder}
                    className="w-full bg-gray-50 border border-base-300 rounded-xl px-4 py-3 text-sm text-base-content placeholder:text-base-content/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all min-h-[100px] resize-none"
                  />
                </div>

                {depositInfo && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-amber-900">Deposit due now</p>
                        <p className="text-amber-700 mt-0.5">
                          £{depositInfo.perDayRate.toFixed(2)} × {depositInfo.days} day{depositInfo.days !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <p className="text-lg font-bold text-amber-900">
                        £{depositInfo.amount.toFixed(2)}
                      </p>
                    </div>
                  </div>
                )}

                {!hasSelectedCatering && (
                  <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-4 text-sm text-sky-900">
                    <p className="font-semibold">Venue-only checkout</p>
                    <p className="mt-1 text-sky-800/85">
                      You haven&apos;t added catering yet, so this checkout will secure the venue with a deposit only.
                    </p>
                  </div>
                )}

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
                          {hasSelectedCatering
                            ? "For accurate allergen information, please contact restaurants directly."
                            : "Your deposit secures the venue first, but the booking will only be fully sealed once catering is added later."}
                        </p>
                        <p>
                          {hasSelectedCatering
                            ? "For any last-minute changes, please contact us at least two days before your event."
                            : "If your booking details change, please let us know as early as possible before the event date."}
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
                      className="h-5 w-5 shrink-0 cursor-pointer rounded border-base-300 bg-base-100 text-primary focus:outline-none focus:ring-0 focus:ring-offset-0"
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
                        className="text-primary hover:underline font-medium"
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
                  className="w-full bg-primary text-white py-4 rounded-2xl font-bold uppercase tracking-[0.2em] text-sm hover:bg-primary/90 transition-all disabled:bg-base-300 disabled:cursor-not-allowed disabled:tracking-[0.08em]"
                >
                  {submitting
                    ? "Redirecting..."
                    : hasSelectedCatering
                      ? "Pay Deposit"
                      : "Secure Venue Deposit"}
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
