import { useState } from "react";

interface PromoCodeSectionProps {
  promoCodes: string[];
  onApplyPromoCode: (code: string) => Promise<void>;
  onRemovePromoCode: (code: string) => void;
  validatingPromo: boolean;
  promoError: string;
  promoSuccess: string;
  promoDiscount?: number;
}

export default function PromoCodeSection({
  promoCodes,
  onApplyPromoCode,
  onRemovePromoCode,
  validatingPromo,
  promoError,
  promoSuccess,
  promoDiscount,
}: PromoCodeSectionProps) {
  const [promoInput, setPromoInput] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);

  const handleApply = async () => {
    if (promoInput.trim()) {
      await onApplyPromoCode(promoInput.toUpperCase());
      setPromoInput("");
    }
  };

  return (
    <div className="pt-4 border-t border-base-300">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between mb-3 group"
      >
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-bold text-base-content">Discount Code</h4>
          {promoCodes.length > 0 && (
            <span className="text-xs bg-success/10 text-success px-2 py-0.5 rounded-full">
              {promoCodes.length} applied
            </span>
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
        <div className="p-4 rounded-xl border border-base-300">
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={promoInput}
              onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleApply();
                }
              }}
              placeholder="Add discount code or voucher"
              className="flex-1 px-3 py-2 text-sm bg-base-100 border border-base-300 rounded-lg focus:ring-2 focus:ring-dark-pink focus:border-transparent transition-all"
            />
            <button
              type="button"
              onClick={handleApply}
              disabled={validatingPromo || !promoInput.trim()}
              className="px-4 py-2 bg-dark-pink text-white rounded-lg font-medium hover:opacity-90 transition-all disabled:bg-base-300 disabled:cursor-not-allowed text-sm"
            >
              {validatingPromo ? "..." : "Apply"}
            </button>
          </div>

          {promoError && (
            <div className="mb-3 p-2 bg-error/10 border border-error/30 rounded-lg">
              <p className="text-xs text-error">✗ {promoError}</p>
            </div>
          )}

          {promoSuccess && (
            <div className="mb-3 p-2 bg-success/10 border border-success/30 rounded-lg">
              <p className="text-xs text-success">
                ✓ {promoSuccess}
                {promoDiscount && promoDiscount > 0 && (
                  <> You saved £{promoDiscount.toFixed(2)}</>
                )}
              </p>
            </div>
          )}

          {promoCodes.length > 0 && (
            <div className="space-y-2 mb-3">
              {promoCodes.map((code) => (
                <div
                  key={code}
                  className="flex items-center justify-between bg-base-100 p-2 rounded-lg border border-base-300"
                >
                  <span className="font-mono text-xs font-medium text-primary">
                    {code}
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemovePromoCode(code)}
                    className="text-error hover:opacity-80 text-xs font-medium"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          <p className="text-xs text-base-content/60">
            If your organisation is partnered with us, please contact us for
            vouchers before payment.
          </p>
        </div>
      )}
    </div>
  );
}
