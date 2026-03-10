import { useState } from "react";
import { Building2 } from "lucide-react";
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
  onFieldChange: (
    field: keyof ContactInfo,
    value: string | NonNullable<ContactInfo["billingAddress"]>
  ) => void;
  onBlur: (field: keyof ContactInfo) => void;
  onBillingBlur: (field: keyof NonNullable<ContactInfo["billingAddress"]>) => void;
  ccEmails: string[];
  onAddCcEmail: (email: string) => void;
  onRemoveCcEmail: (email: string) => void;
}

const fieldLabelClass =
  "block text-[10px] font-bold text-base-content/60 uppercase tracking-widest mb-1.5";
const fieldClass =
  "w-full bg-gray-50 border border-base-300 rounded-lg px-4 py-2.5 text-sm text-base-content placeholder:text-base-content/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all";

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
    });
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

  return (
    <div className="mb-8 last:mb-0">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <svg
              className="w-[18px] h-[18px]"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5.121 17.804A4 4 0 017 16h10a4 4 0 011.879.468M15 10a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
          <h4 className="font-bold text-sm tracking-tight text-base-content">
            Contact Details
          </h4>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="col-span-full">
          <label className={fieldLabelClass}>
            Organization
            <span className="text-[9px] text-base-content/40 ml-2">
              (Optional)
            </span>
          </label>
          <input
            type="text"
            name="organization"
            value={formData.organization}
            onChange={(e) => onFieldChange("organization", e.target.value)}
            onBlur={() => onBlur("organization")}
            placeholder="Your Organization Name"
            className={fieldClass}
          />
        </div>

        <div>
          <label className={fieldLabelClass}>
            Name<span className="text-primary ml-0.5">*</span>
          </label>
          <input
            type="text"
            name="fullName"
            required
            value={formData.fullName}
            onChange={(e) => onFieldChange("fullName", e.target.value)}
            onBlur={() => onBlur("fullName")}
            placeholder="Your Name"
            className={`${fieldClass} ${
              errors.fullName ? "border-error" : ""
            }`}
          />
          {errors.fullName && (
            <p className="mt-1 text-xs text-error">{errors.fullName}</p>
          )}
        </div>

        <div>
          <label className={fieldLabelClass}>
            Telephone<span className="text-primary ml-0.5">*</span>
          </label>
          <input
            type="tel"
            name="phone"
            required
            value={formData.phone}
            onChange={(e) => onFieldChange("phone", e.target.value)}
            onBlur={() => onBlur("phone")}
            placeholder="Your Number"
            className={`${fieldClass} ${errors.phone ? "border-error" : ""}`}
          />
          {errors.phone && (
            <p className="mt-1 text-xs text-error">{errors.phone}</p>
          )}
        </div>

        <div className="col-span-full">
          <label className={fieldLabelClass}>
            Email<span className="text-primary ml-0.5">*</span>
          </label>
          <input
            type="email"
            name="email"
            required
            value={formData.email}
            onChange={(e) => onFieldChange("email", e.target.value)}
            onBlur={() => onBlur("email")}
            placeholder="Your Email"
            className={`${fieldClass} ${errors.email ? "border-error" : ""}`}
          />
          {errors.email && (
            <p className="mt-1 text-xs text-error">{errors.email}</p>
          )}
        </div>

        <div className="col-span-full">
          <label className={fieldLabelClass}>
            CC Additional Emails (Optional)
          </label>
          <p className="text-[10px] text-base-content/50 mb-3">
            Add additional email addresses to receive order updates
          </p>

          <div className="flex gap-2">
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
              className={fieldClass}
            />
            <button
              type="button"
              onClick={handleAddCcEmail}
              className="bg-primary text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-primary/90 transition-all"
            >
              Add
            </button>
          </div>

          {ccEmails.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {ccEmails.map((email, index) => (
                <span
                  key={index}
                  className="bg-base-200 text-base-content/70 px-2 py-1 rounded text-[10px] font-medium flex items-center gap-1"
                >
                  {email}
                  <button
                    type="button"
                    onClick={() => onRemoveCcEmail(email)}
                    className="hover:text-primary"
                  >
                    x
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-base-300 pt-8 mt-8">
        <button
          type="button"
          onClick={() => setShowBillingAddress(!showBillingAddress)}
          className="w-full flex items-center justify-between group"
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gray-200 border border-gray-300 flex items-center justify-center text-base-content/70 transition-colors">
              <Building2 size={18} />
            </div>
            <span className="font-bold text-sm text-base-content">
              Billing Address
            </span>
            <span className="text-[9px] font-bold text-base-content/40 uppercase tracking-widest ml-2">
              (Optional)
            </span>
          </div>
          <svg
            className={`w-5 h-5 text-base-content/60 transition-transform ${
              showBillingAddress ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {showBillingAddress && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="col-span-full">
              <label className={fieldLabelClass}>
                Address Line 1<span className="text-primary ml-0.5">*</span>
              </label>
              <input
                type="text"
                value={formData.billingAddress?.line1 || ""}
                onChange={(e) =>
                  handleBillingFieldChange("line1", e.target.value)
                }
                onBlur={() => onBillingBlur("line1")}
                placeholder="Street address"
                className={`${fieldClass} ${
                  errors.billingAddress?.line1 ? "border-error" : ""
                }`}
              />
              {errors.billingAddress?.line1 && (
                <p className="mt-1 text-xs text-error">
                  {errors.billingAddress.line1}
                </p>
              )}
            </div>

            <div className="col-span-full">
              <label className={fieldLabelClass}>
                Address Line 2
                <span className="text-[9px] text-base-content/40 ml-2">
                  (Optional)
                </span>
              </label>
              <input
                type="text"
                value={formData.billingAddress?.line2 || ""}
                onChange={(e) =>
                  handleBillingFieldChange("line2", e.target.value)
                }
                placeholder="Apartment, suite, etc."
                className={fieldClass}
              />
            </div>

            <div>
              <label className={fieldLabelClass}>
                City<span className="text-primary ml-0.5">*</span>
              </label>
              <input
                type="text"
                value={formData.billingAddress?.city || ""}
                onChange={(e) =>
                  handleBillingFieldChange("city", e.target.value)
                }
                onBlur={() => onBillingBlur("city")}
                placeholder="City"
                className={`${fieldClass} ${
                  errors.billingAddress?.city ? "border-error" : ""
                }`}
              />
              {errors.billingAddress?.city && (
                <p className="mt-1 text-xs text-error">
                  {errors.billingAddress.city}
                </p>
              )}
            </div>

            <div>
              <label className={fieldLabelClass}>
                Postcode<span className="text-primary ml-0.5">*</span>
              </label>
              <input
                type="text"
                value={formData.billingAddress?.postalCode || ""}
                onChange={(e) =>
                  handleBillingFieldChange(
                    "postalCode",
                    e.target.value.toUpperCase(),
                  )
                }
                onBlur={() => onBillingBlur("postalCode")}
                placeholder="SW1A 1AA"
                className={`${fieldClass} ${
                  errors.billingAddress?.postalCode ? "border-error" : ""
                }`}
              />
              {errors.billingAddress?.postalCode && (
                <p className="mt-1 text-xs text-error">
                  {errors.billingAddress.postalCode}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
