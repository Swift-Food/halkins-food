import { useState } from "react";
import { ContactInfo } from "@/types/catering.types";
import AddressAutocomplete from "./AddressAutocomplete";

interface ValidationErrors {
  addressLine1?: string;
  city?: string;
  zipcode?: string;
}

interface DeliveryAddressFormProps {
  formData: ContactInfo;
  errors: ValidationErrors;
  onFieldChange: (field: keyof ContactInfo, value: string) => void;
  onPlaceSelect: (place: google.maps.places.PlaceResult) => void;
  onClearAddress?: () => void;
  hasValidAddress?: boolean;
}

const UK_POSTCODE_REGEX = /^([A-Z]{1,2}\d{1,2}[A-Z]?)\s?(\d[A-Z]{2})$/i;

const validateUKPostcode = (postcode: string): boolean => {
  if (!postcode) return false;
  return UK_POSTCODE_REGEX.test(postcode.trim());
};

export default function DeliveryAddressForm({
  formData,
  errors,
  onFieldChange,
  onPlaceSelect,
  onClearAddress,
  hasValidAddress,
}: DeliveryAddressFormProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Check if section is complete
  const isComplete =
    formData.addressLine1 &&
    formData.city &&
    formData.zipcode &&
    validateUKPostcode(formData.zipcode) &&
    !errors.addressLine1 &&
    !errors.city &&
    !errors.zipcode;

  return (
    <div className="pb-4 mb-4 border-b border-base-300">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between mb-3 group"
      >
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-bold text-base-content">
            Delivery Address
          </h4>
          {isComplete && (
            <span className="text-xs text-success">✓ Complete</span>
          )}
        </div>
        <svg
          className={`w-5 h-5 text-base-content/60 transition-transform ${
            isExpanded ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isExpanded && (
        <div className="space-y-3 p-4 rounded-xl border border-base-300">
          <AddressAutocomplete
            onPlaceSelect={onPlaceSelect}
            onClearAddress={onClearAddress}
            error={
              errors.addressLine1?.includes("United Kingdom") ||
              errors.addressLine1?.includes("London")
                ? errors.addressLine1
                : undefined
            }
            hasValidAddress={hasValidAddress}
          />

          {/* Address Line 1 - Read Only */}
          <div>
            <label className="block text-sm font-semibold mb-2 text-base-content">
              Address Line 1*
            </label>
            <input
              type="text"
              name="addressLine1"
              required
              value={formData.addressLine1 || ""}
              readOnly
              placeholder="Select from search above"
              className={`w-full px-3 py-2 text-sm bg-base-300/30 border rounded-lg cursor-not-allowed outline-none ${
                errors.addressLine1 &&
                !errors.addressLine1.includes("United Kingdom") &&
                !errors.addressLine1.includes("London")
                  ? "border-error"
                  : "border-base-300"
              }`}
            />
            {errors.addressLine1 &&
              !errors.addressLine1.includes("United Kingdom") &&
              !errors.addressLine1.includes("London") && (
                <p className="mt-1 text-xs text-error">
                  ✗ {errors.addressLine1}
                </p>
              )}
          </div>

          {/* Address Line 2 */}
          <div>
            <label className="block text-sm font-semibold mb-2 text-base-content">
              Address Line 2 (Optional)
            </label>
            <input
              type="text"
              name="addressLine2"
              value={formData.addressLine2 || ""}
              onChange={(e) => onFieldChange("addressLine2", e.target.value)}
              placeholder="Apartment, suite, etc."
              className="w-full px-3 py-2 text-sm bg-base-200/50 border border-base-300 rounded-lg focus:ring-2 focus:ring-dark-pink focus:border-transparent transition-all"
            />
          </div>

          {/* City and Postcode - Read Only */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold mb-2 text-base-content">
                City*
              </label>
              <input
                type="text"
                name="city"
                required
                value={formData.city || ""}
                readOnly
                placeholder="Auto-filled"
                className={`w-full px-3 py-2 text-sm bg-base-300/30 border rounded-lg cursor-not-allowed outline-none ${
                  errors.city ? "border-error" : "border-base-300"
                }`}
              />
              {errors.city && (
                <p className="mt-1 text-xs text-error">✗ {errors.city}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2 text-base-content">
                Postcode*
              </label>
              <input
                type="text"
                name="zipcode"
                required
                value={formData.zipcode || ""}
                readOnly
                placeholder="Auto-filled"
                className={`w-full px-3 py-2 text-sm bg-base-300/30 border rounded-lg cursor-not-allowed outline-none ${
                  errors.zipcode ? "border-error" : "border-base-300"
                }`}
              />
              {errors.zipcode && (
                <p className="mt-1 text-xs text-error">✗ {errors.zipcode}</p>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
