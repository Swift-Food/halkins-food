import { useState } from "react";
import { ContactInfo } from "@/types/catering.types";

interface ValidationErrors {
  organization?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  billingAddress?: {
    line1?: string;
    city?: string;
    postalCode?: string;
  };
}

interface ContactInfoFormProps {
  formData: ContactInfo;
  errors: ValidationErrors;
  onFieldChange: (field: keyof ContactInfo, value: string) => void;
  onBlur: (field: keyof ContactInfo) => void;
  onBillingBlur: (field: keyof NonNullable<ContactInfo["billingAddress"]>) => void;
  ccEmails: string[];
  onAddCcEmail: (email: string) => void;
  onRemoveCcEmail: (email: string) => void;
}

export default function ContactInfoForm({
  formData,
  errors,
  onFieldChange,
  onBlur,
  onBillingBlur,
  ccEmails,
  onAddCcEmail,
  onRemoveCcEmail,
}: ContactInfoFormProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [ccEmailInput, setCcEmailInput] = useState("");
  const [showBillingAddress, setShowBillingAddress] = useState(
    !!formData.billingAddress?.line1
  );

  const handleBillingFieldChange = (
    field: keyof NonNullable<ContactInfo["billingAddress"]>,
    value: string
  ) => {
    const currentBilling = formData.billingAddress || {
      line1: "",
      line2: "",
      city: "",
      postalCode: "",
      country: "GB",
    };
    onFieldChange("billingAddress", {
      ...currentBilling,
      [field]: value,
    } as any);
  };

  const handleAddCcEmail = () => {
    const trimmedEmail = ccEmailInput.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!trimmedEmail) return;

    if (!emailRegex.test(trimmedEmail)) {
      alert("Please enter a valid email address");
      return;
    }

    if (ccEmails.includes(trimmedEmail)) {
      alert("This email is already added");
      return;
    }

    onAddCcEmail(trimmedEmail);
    setCcEmailInput("");
  };

  // Check if section is complete
  const isComplete =
    formData.fullName &&
    formData.email &&
    formData.phone &&
    !errors.fullName &&
    !errors.email &&
    !errors.phone;

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between mb-3 group"
      >
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-bold text-base-content">
            Contact Details
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
          {/* Organization */}
          <div>
            <label className="block text-sm font-semibold mb-2 text-base-content">
              Organization (Optional)
            </label>
            <input
              type="text"
              name="organization"
              value={formData.organization}
              onChange={(e) => onFieldChange("organization", e.target.value)}
              onBlur={() => onBlur("organization")}
              placeholder="Your Organization Name"
              className="w-full px-3 py-2 text-sm bg-base-200/50 border border-base-300 rounded-lg focus:ring-2 focus:ring-dark-pink focus:border-transparent transition-all"
            />
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-semibold mb-2 text-base-content">
              Name*
            </label>
            <input
              type="text"
              name="fullName"
              required
              value={formData.fullName}
              onChange={(e) => onFieldChange("fullName", e.target.value)}
              onBlur={() => onBlur("fullName")}
              placeholder="Your Name"
              className={`w-full px-3 py-2 text-sm bg-base-200/50 border ${
                errors.fullName ? "border-error" : "border-base-300"
              } rounded-lg focus:ring-2 focus:ring-dark-pink focus:border-transparent transition-all`}
            />
            {errors.fullName && (
              <p className="mt-1 text-xs text-error">✗ {errors.fullName}</p>
            )}
          </div>

          {/* Telephone */}
          <div>
            <label className="block text-sm font-semibold mb-2 text-base-content">
              Telephone*
            </label>
            <input
              type="tel"
              name="phone"
              required
              value={formData.phone}
              onChange={(e) => onFieldChange("phone", e.target.value)}
              onBlur={() => onBlur("phone")}
              placeholder="Your Number"
              className={`w-full px-3 py-2 text-sm bg-base-200/50 border ${
                errors.phone ? "border-error" : "border-base-300"
              } rounded-lg focus:ring-2 focus:ring-dark-pink focus:border-transparent transition-all`}
            />
            {errors.phone && (
              <p className="mt-1 text-xs text-error">✗ {errors.phone}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-semibold mb-2 text-base-content">
              Email*
            </label>
            <input
              type="email"
              name="email"
              required
              value={formData.email}
              onChange={(e) => onFieldChange("email", e.target.value)}
              onBlur={() => onBlur("email")}
              placeholder="Your Email"
              className={`w-full px-3 py-2 text-sm bg-base-200/50 border ${
                errors.email ? "border-error" : "border-base-300"
              } rounded-lg focus:ring-2 focus:ring-dark-pink focus:border-transparent transition-all`}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-error">✗ {errors.email}</p>
            )}
          </div>

          {/* CC Additional Emails */}
          <div>
            <label className="block text-sm font-semibold mb-2 text-base-content">
              CC Additional Emails (Optional)
            </label>
            <p className="text-xs text-base-content/60 mb-3">
              Add additional email addresses to receive order updates
            </p>

            <div className="flex gap-2 mb-3">
              <input
                type="email"
                value={ccEmailInput}
                onChange={(e) => setCcEmailInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddCcEmail();
                  }
                }}
                placeholder="additional@email.com"
                className="flex-1 px-3 py-2 text-sm bg-base-200/50 border border-base-300 rounded-lg focus:ring-2 focus:ring-dark-pink focus:border-transparent transition-all"
              />
              <button
                type="button"
                onClick={handleAddCcEmail}
                className="px-4 py-2 bg-dark-pink text-white rounded-lg font-medium hover:opacity-90 transition-all text-sm"
              >
                Add
              </button>
            </div>

            {ccEmails.length > 0 && (
              <div className="space-y-2">
                {ccEmails.map((email, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-base-100 p-2 rounded-lg border border-base-300"
                  >
                    <span className="text-sm text-base-content">{email}</span>
                    <button
                      type="button"
                      onClick={() => onRemoveCcEmail(email)}
                      className="text-error hover:opacity-80 text-xs font-medium"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Billing Address (Optional) */}
          <div className="pt-4 mt-4 border-t border-base-300">
            <button
              type="button"
              onClick={() => setShowBillingAddress(!showBillingAddress)}
              className="w-full flex items-center justify-between text-sm font-medium text-base-content hover:text-base-content/80"
            >
              <div className="flex items-center gap-2">
                <span>Billing Address</span>
                <span className="text-xs font-normal text-base-content/50">(Optional)</span>
              </div>
              <svg
                className={`w-4 h-4 transition-transform ${showBillingAddress ? "rotate-180" : ""}`}
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
            <p className="text-xs text-base-content/50 mt-1">
              For invoice purposes if different from delivery address
            </p>

            {showBillingAddress && (
              <div className="mt-3 space-y-3 pt-3 border-t border-base-300">
                {/* Billing Line 1 */}
                <div>
                  <label className="block text-sm font-semibold mb-2 text-base-content">
                    Address Line 1*
                  </label>
                  <input
                    type="text"
                    value={formData.billingAddress?.line1 || ""}
                    onChange={(e) =>
                      handleBillingFieldChange("line1", e.target.value)
                    }
                    onBlur={() => onBillingBlur("line1")}
                    placeholder="Street address"
                    className={`w-full px-3 py-2 text-sm bg-base-200/50 border ${
                      errors.billingAddress?.line1 ? "border-error" : "border-base-300"
                    } rounded-lg focus:ring-2 focus:ring-dark-pink focus:border-transparent transition-all`}
                  />
                  {errors.billingAddress?.line1 && (
                    <p className="mt-1 text-xs text-error">
                      {errors.billingAddress.line1}
                    </p>
                  )}
                </div>

                {/* Billing Line 2 */}
                <div>
                  <label className="block text-sm font-semibold mb-2 text-base-content">
                    Address Line 2 (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.billingAddress?.line2 || ""}
                    onChange={(e) =>
                      handleBillingFieldChange("line2", e.target.value)
                    }
                    placeholder="Apartment, suite, etc."
                    className="w-full px-3 py-2 text-sm bg-base-200/50 border border-base-300 rounded-lg focus:ring-2 focus:ring-dark-pink focus:border-transparent transition-all"
                  />
                </div>

                {/* City and Postcode row */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-base-content">
                      City*
                    </label>
                    <input
                      type="text"
                      value={formData.billingAddress?.city || ""}
                      onChange={(e) =>
                        handleBillingFieldChange("city", e.target.value)
                      }
                      onBlur={() => onBillingBlur("city")}
                      placeholder="City"
                      className={`w-full px-3 py-2 text-sm bg-base-200/50 border ${
                        errors.billingAddress?.city ? "border-error" : "border-base-300"
                      } rounded-lg focus:ring-2 focus:ring-dark-pink focus:border-transparent transition-all`}
                    />
                    {errors.billingAddress?.city && (
                      <p className="mt-1 text-xs text-error">
                        {errors.billingAddress.city}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-base-content">
                      Postcode*
                    </label>
                    <input
                      type="text"
                      value={formData.billingAddress?.postalCode || ""}
                      onChange={(e) =>
                        handleBillingFieldChange("postalCode", e.target.value)
                      }
                      onBlur={() => onBillingBlur("postalCode")}
                      placeholder="Postcode"
                      className={`w-full px-3 py-2 text-sm bg-base-200/50 border ${
                        errors.billingAddress?.postalCode ? "border-error" : "border-base-300"
                      } rounded-lg focus:ring-2 focus:ring-dark-pink focus:border-transparent transition-all`}
                    />
                    {errors.billingAddress?.postalCode && (
                      <p className="mt-1 text-xs text-error">
                        {errors.billingAddress.postalCode}
                      </p>
                    )}
                  </div>
                </div>

                {/* Country - defaulted to UK */}
                <div>
                  <label className="block text-sm font-semibold mb-2 text-base-content">
                    Country
                  </label>
                  <select
                    value={formData.billingAddress?.country || "GB"}
                    onChange={(e) =>
                      handleBillingFieldChange("country", e.target.value)
                    }
                    className="w-full px-3 py-2 text-sm bg-base-200/50 border border-base-300 rounded-lg focus:ring-2 focus:ring-dark-pink focus:border-transparent transition-all"
                  >
                    <option value="GB">United Kingdom</option>
                    <option value="IE">Ireland</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
