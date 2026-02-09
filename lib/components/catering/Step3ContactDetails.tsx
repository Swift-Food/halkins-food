// components/catering/Step3ContactInfo.tsx

"use client";

import { useState, FormEvent, useEffect, useMemo } from "react";
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
import { CateringMenuPdf } from "@/lib/components/pdf/CateringMenuPdf";
import PdfDownloadModal from "./modals/PdfDownloadModal";
import DeliveryAddressForm from "./contact/DeliveryAddressForm";
import ContactInfoForm from "./contact/ContactInfoForm";
import PromoCodeSection from "./contact/PromoCodeSection";
import PricingSummary from "./contact/PricingSummary";
import { coworkingService } from "@/services/api";
import { CreateCoworkingOrderRequest } from "@/types/api";

interface ValidationErrors {
  organization?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  zipcode?: string;
  ccEmail?: string;
  latitude?: number;
  longitude?: number;
  billingAddress?: {
    line1?: string;
    city?: string;
    postalCode?: string;
  };
}

export default function Step3ContactInfo() {
  const router = useRouter();
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

  // Get all items from all sessions for pricing calculations
  const selectedItems = getAllItems();

  const [formData, setFormData] = useState<ContactInfo>({
    organization: contactInfo?.organization || "",
    fullName: contactInfo?.fullName || "",
    email: contactInfo?.email || "",
    phone: contactInfo?.phone || "",
    addressLine1: contactInfo?.addressLine1 || "",
    addressLine2: contactInfo?.addressLine2 || "",
    city: contactInfo?.city || "",
    zipcode: contactInfo?.zipcode || "",
    latitude: contactInfo?.latitude,
    longitude: contactInfo?.longitude,
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


  const [importantNotesOpen, setImportantNotesOpen] = useState(false);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);

  // PDF generation state
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);

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

    // Validate address fields for guest users
    if (eventDetails?.userType === "guest") {
      if (!formData.addressLine1?.trim()) {
        newErrors.addressLine1 = "Address Line 1 is required";
      }
      if (!formData.city?.trim()) {
        newErrors.city = "City is required";
      }
      if (!formData.zipcode?.trim()) {
        newErrors.zipcode = "Postcode is required";
      } else if (!validateUKPostcode(formData.zipcode)) {
        newErrors.zipcode = "Please enter a valid UK postcode (e.g., SW1A 1AA)";
      }

      // Validate that latitude and longitude are present (ensures Google autocomplete selection)
      if (!formData.latitude || !formData.longitude) {
        newErrors.addressLine1 = "Please select an address from the Google autocomplete dropdown";
      }
    }

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
    // Group order items by restaurant
    const orderItemsByRestaurant = new Map<string, { menuItemId: string; quantity: number; selectedAddons?: { name: string; quantity: number }[] }[]>();
    mealSessions.forEach(session => {
      session.orderItems.forEach(({ item, quantity }) => {
        const restaurantId = item.restaurantId;
        if (!orderItemsByRestaurant.has(restaurantId)) {
          orderItemsByRestaurant.set(restaurantId, []);
        }
        orderItemsByRestaurant.get(restaurantId)!.push({
          menuItemId: item.id,
          quantity,
          selectedAddons: item.selectedAddons?.map(addon => ({
            name: addon.name,
            quantity: addon.quantity,
          })),
        });
      });
    });

    const SPACE_SLUG = 'testi';

    return {
      spaceSlug: SPACE_SLUG,
      orderData: {
        deliveryAddress: [formData.addressLine1, formData.addressLine2, formData.city, formData.zipcode].filter(Boolean).join(', '),
        deliveryLocation: {
          latitude: formData.latitude || 0,
          longitude: formData.longitude || 0,
        },
        customerPhone: formData.phone,
        orderItems: Array.from(orderItemsByRestaurant.entries()).map(([restaurantId, menuItems]) => ({
          restaurantId,
          menuItems,
        })),
        specialInstructions: specialInstructions || undefined,
        scheduledFor: mealSessions[0]?.sessionDate,
        scheduledTime: mealSessions[0]?.eventTime || eventDetails?.eventTime || '',
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

      setContactInfo(formData);

      
      const { spaceSlug, orderData } = buildCoworkingOrderData();
      const createOrderResponse = await coworkingService.createOrder(spaceSlug, orderData);

      markOrderAsSubmitted();


      const accessToken = createOrderResponse?.accessToken;
      if (accessToken) {
        router.push(`/event-order/view/${accessToken}`);
      } else {
        setSuccess(true);
      }
    } catch (error: any) {
      console.error("=== SUBMIT ORDER ERROR ===");
      console.error("Error Type:", error?.name);
      console.error("Error Message:", error?.message);
      console.error("Error Stack:", error?.stack);
      console.error("Full Error Object:", JSON.stringify(error, null, 2));

      // Session expired — the event dispatch in coworkingService already
      // triggers the auth screen redirect, so just bail out here.
      if (error instanceof SessionExpiredError) {
        console.error("=== END ERROR LOG ===");
        return;
      }

      // Handle London delivery validation error - show inline instead of alert
      if (error?.message?.includes("London")) {
        setErrors((prev) => ({
          ...prev,
          addressLine1: error.message,
        }));

        console.error("=== END ERROR LOG ===");
        return;
      }

      // Check if it's a network error
      if (
        error?.message?.includes("fetch") ||
        error?.message?.includes("network")
      ) {
        console.error("Network Error Detected");
        alert(
          "Network error: Please check your internet connection and try again."
        );
      }
      // Check if it's an API error with response
      else if (error?.response) {
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
          `Failed to submit order: ${error?.message || "Please try again."}`
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
      const deliveryLocation =
        formData.latitude && formData.longitude
          ? { latitude: formData.latitude, longitude: formData.longitude }
          : undefined;

      const pricingResult = await cateringService.calculateCateringPricingWithMealSessions(
        mealSessions,
        promoCodes,
        deliveryLocation
      );

      if (!pricingResult.isValid) {
        // Show London delivery error inline
        if (pricingResult.error?.includes("London")) {
          setErrors((prev) => ({ ...prev, addressLine1: pricingResult.error }));
        }
        setPricing(null);
        return;
      }

      // Clear any previous London error on successful pricing
      if (errors.addressLine1?.includes("London")) {
        setErrors((prev) => ({ ...prev, addressLine1: undefined }));
      }
      setPricing(pricingResult);
    } catch (error: any) {
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
    calculatePricing();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promoCodes, mealSessions, formData.latitude, formData.longitude]);

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

  const handlePlaceSelect = (place: google.maps.places.PlaceResult) => {
    if (!place || !place.address_components) {
      console.error("No place data received");
      return;
    }

    // Store place_id for validation
    if (place.place_id) {
      setSelectedPlaceId(place.place_id);
    }

    let addressLine1 = "";
    let city = "";
    let zipcode = "";
    let country = "";
    const latitude = place.geometry?.location?.lat() || 0;
    const longitude = place.geometry?.location?.lng() || 0;

    place.address_components.forEach((component) => {
      const types = component.types;

      if (types.includes("street_number")) {
        addressLine1 = component.long_name + " ";
      }
      if (types.includes("route")) {
        addressLine1 += component.long_name;
      }
      if (types.includes("postal_town") || types.includes("locality")) {
        city = component.long_name;
      }
      if (types.includes("postal_code")) {
        zipcode = component.long_name;
      }
      if (types.includes("country")) {
        country = component.short_name;
      }
    });

    // Validate if address is in UK
    if (country && country !== "GB") {
      setErrors((prev) => ({
        ...prev,
        addressLine1: "Sorry, we only deliver to addresses within the United Kingdom.",
      }));
    } else {
      // Clear client-side address errors only (not server-side London validation errors)
      // The London error will be set/cleared by calculatePricing based on API response
      setErrors((prev) => ({
        ...prev,
        addressLine1: prev.addressLine1?.includes("London") ? prev.addressLine1 : undefined,
        city: undefined,
        zipcode: undefined,
      }));
    }

    setFormData((prev) => ({
      ...prev,
      addressLine1: addressLine1.trim(),
      city,
      zipcode,
      latitude,
      longitude,
    }));
  };

  const handleClearAddress = () => {
    setSelectedPlaceId(null);
    setFormData((prev) => ({
      ...prev,
      addressLine1: "",
      city: "",
      zipcode: "",
      latitude: undefined,
      longitude: undefined,
    }));
    // Clear any address-related errors
    setErrors((prev) => ({
      ...prev,
      addressLine1: undefined,
      city: undefined,
      zipcode: undefined,
    }));
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
            description: (orderItem.item as any).description,
            allergens: (orderItem.item as any).allergens,
            dietaryFilters: (orderItem.item as any).dietaryFilters,
          },
          quantity: orderItem.quantity,
        })),
      }));

      // Transform to PDF data format (now async to fetch images)
      // Don't pass delivery fee - show as TBC (same as CateringOrderBuilder)
      const pdfData = await transformLocalSessionsToPdfData(
        sessionsForPreview,
        withPrices
      );
      // Generate and download PDF
      const blob = await pdf(
        <CateringMenuPdf
          sessions={pdfData.sessions}
          showPrices={pdfData.showPrices}
          deliveryCharge={pdfData.deliveryCharge}
          totalPrice={pdfData.totalPrice}
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
              We'll get back to you within 24 hours via your preferred contact
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

      <div className="max-w-6xl mx-auto px-4 py-8 md:py-12">
        {/* Header */}
        <div className="mb-8">
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
              onClick={() => setCurrentStep(1)}
              className="text-primary hover:opacity-80 font-medium flex items-center gap-1"
            >
              ← Back
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Selected Items - Left Side */}
          <div className="lg:col-span-2 order-2 lg:order-1">
            <AllMealSessionsItems showActions={false} onViewMenu={handleViewMenu} isGeneratingPdf={generatingPdf} />
          </div>

          {/* Contact Form Card - Right Side */}
          <div className="lg:col-span-1 order-1 lg:order-2">
            <div className="bg-base-200/30 rounded-2xl p-6 border border-base-300">
              <h3 className="text-xl font-bold mb-6 text-base-content">
                Contact & Delivery Details
              </h3>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Delivery Address Section - Only for guest users */}
       
                <DeliveryAddressForm
                  formData={formData}
                  errors={errors}
                  onFieldChange={handleChange}
                  onPlaceSelect={handlePlaceSelect}
                  onClearAddress={handleClearAddress}
                  hasValidAddress={selectedPlaceId !== null && formData.addressLine1 !== ""}
                />
     

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
                <div className="pt-4">
                  <label
                    htmlFor="specialInstructions"
                    className="block text-sm font-medium text-base-content mb-2"
                  >
                    Special Instructions (Optional)
                  </label>
                  <textarea
                    id="specialInstructions"
                    name="specialInstructions"
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                    placeholder="Any special requests or instructions for your order..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-base-300 bg-base-100 text-base-content placeholder:text-base-content/50 focus:outline-none focus:ring-2 focus:ring-dark-pink/50 resize-none"
                  />
                </div>

                {/* Pricing Summary */}
                <PricingSummary
                  pricing={pricing}
                  calculatingPricing={calculatingPricing}
                  estimatedTotal={estimatedTotal}
                />

                {/* Important Notes */}
                <div className="pt-4">
                  <button
                    type="button"
                    className="w-full bg-warning/10 border border-warning/30 rounded-xl p-4 flex items-center justify-between focus:outline-none group"
                    onClick={() => setImportantNotesOpen((open) => !open)}
                    aria-expanded={importantNotesOpen}
                    aria-controls="important-notes-content"
                  >
                    <span className="text-xs font-semibold text-warning">
                      Important Notes
                    </span>
                    <span className="ml-2 text-warning group-hover:underline flex items-center">
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
                      className="mt-2 text-xs text-base-content/80 leading-relaxed"
                    >
                      <p>
                        For accurate allergen information, please contact restaurants directly.
                      </p>
                      <p>
                        For any last-minute changes, please contact us at least
                        two days before your event.
                      </p>
                    </div>
                  )}
                </div>

                {/* Terms and Conditions */}
                <div className="pt-4">
                  <div className="flex items-start gap-3 mb-4">
                    <input
                      type="checkbox"
                      id="terms"
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      className="w-5 h-5 mt-0.5 rounded border-base-300 text-dark-pink focus:ring-2 focus:ring-dark-pink cursor-pointer"
                    />
                    <label
                      htmlFor="terms"
                      className="text-sm text-base-content/80 cursor-pointer"
                    >
                      I accept the{" "}
                      <a
                        href="/terms"
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
                  className="w-full bg-dark-pink hover:opacity-90 text-white py-4 rounded-xl font-bold text-lg transition-all disabled:bg-base-300 disabled:cursor-not-allowed"
                >
                  {submitting ? "Submitting..." : "Submit"}
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
