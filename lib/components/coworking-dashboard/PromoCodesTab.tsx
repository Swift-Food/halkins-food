"use client";

import { useCallback, useEffect, useState } from "react";
import { coworkingDashboardService } from "@/services/api/coworking-dashboard.api";
import { CoworkingVenueAdmin } from "@/types/api";
import {
  Plus,
  Trash2,
  Tag,
  Percent,

  Calendar,
  Users,
  ChevronDown,
  ChevronUp,
  ToggleLeft,
  ToggleRight,
  Pencil,
  HelpCircle,
} from "lucide-react";

function Hint({ text }: { text: string }) {
  return (
    <span className="relative inline-flex ml-1.5 group/hint shrink-0">
      <HelpCircle className="h-4 w-4 text-gray-400 cursor-help hover:text-gray-500" />
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 rounded-lg bg-gray-900 px-3 py-2 text-xs font-normal normal-case tracking-normal text-white shadow-lg opacity-0 transition-opacity group-hover/hint:opacity-100 z-50">
        {text}
        <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-gray-900" />
      </span>
    </span>
  );
}

interface PromoCodesTabProps {
  spaceId: string;
}

interface PromoCode {
  code: string;
  name?: string;
  discountAmount: number;
  discountType: string; // DB returns "FIXED" | "PERCENT"
  maxDiscount?: number;
  minOrderValue?: number;
  venueIds?: string[];
  coworkingVenueIds?: string[];
  venues?: Array<{ id: string; name: string }>;
  maxUses?: number;
  maxUsesPerUser?: number;
  usageCount?: number;
  validFrom?: string;
  expiresAt?: string;
  active?: boolean;
  isActive?: boolean;
}

type FormDiscountType = "FIXED" | "PERCENT";

interface PromoForm {
  code: string;
  name: string;
  discountAmount: string;
  discountType: FormDiscountType;
  maxDiscount: string;
  minOrderValue: string;
  venueIds: string[];
  maxUses: string;
  maxUsesPerUser: string;
  validFrom: string;
  expiresAt: string;
}

const emptyForm: PromoForm = {
  code: "",
  name: "",
  discountAmount: "",
  discountType: "FIXED",
  maxDiscount: "",
  minOrderValue: "",
  venueIds: [],
  maxUses: "",
  maxUsesPerUser: "",
  validFrom: "",
  expiresAt: "",
};

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function PromoCodesTab({ spaceId }: PromoCodesTabProps) {
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [venues, setVenues] = useState<CoworkingVenueAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingCode, setEditingCode] = useState<string | null>(null); // null = creating, string = editing
  const [form, setForm] = useState<PromoForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [venuesExpanded, setVenuesExpanded] = useState(false);

  const fetchPromoCodes = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await coworkingDashboardService.listPromoCodes(spaceId);
      setPromoCodes(data);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to load promo codes"));
    } finally {
      setLoading(false);
    }
  }, [spaceId]);

  const fetchVenues = useCallback(async () => {
    try {
      const data = await coworkingDashboardService.listVenues(spaceId);
      setVenues(data);
    } catch {
      // Non-critical — venue multi-select just won't show
    }
  }, [spaceId]);

  useEffect(() => {
    fetchPromoCodes();
    fetchVenues();
  }, [fetchPromoCodes, fetchVenues]);

  const isPercent = (type: string) => type === "PERCENT" || type === "percentage";

  const openForm = () => {
    setForm(emptyForm);
    setEditingCode(null);
    setShowForm(true);
    setError("");
  };

  const openEdit = (promo: PromoCode) => {
    const dt: FormDiscountType = isPercent(promo.discountType) ? "PERCENT" : "FIXED";
    setForm({
      code: promo.code,
      name: promo.name || "",
      discountAmount: String(promo.discountAmount),
      discountType: dt,
      maxDiscount: promo.maxDiscount != null ? String(promo.maxDiscount) : "",
      minOrderValue: promo.minOrderValue != null ? String(promo.minOrderValue) : "",
      venueIds: promo.coworkingVenueIds || [],
      maxUses: promo.maxUses != null ? String(promo.maxUses) : "",
      maxUsesPerUser: promo.maxUsesPerUser != null ? String(promo.maxUsesPerUser) : "",
      validFrom: promo.validFrom ? promo.validFrom.slice(0, 10) : "",
      expiresAt: promo.expiresAt ? promo.expiresAt.slice(0, 10) : "",
    });
    setEditingCode(promo.code);
    setShowForm(true);
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    if (
      form.discountType === "PERCENT" &&
      Number(form.discountAmount) > 100
    ) {
      setError("Percentage discount cannot exceed 100%.");
      setSaving(false);
      return;
    }

    try {
      const dto: Record<string, unknown> = {
        discountAmount: Number(form.discountAmount),
        discountType: form.discountType,
      };
      if (!editingCode) {
        dto.code = form.code.toUpperCase().trim();
      }
      if (form.name.trim()) dto.name = form.name.trim();
      if (form.discountType === "PERCENT" && form.maxDiscount) {
        dto.maxDiscount = Number(form.maxDiscount);
      }
      if (form.minOrderValue) dto.minOrderValue = Number(form.minOrderValue);
      if (form.venueIds.length > 0) dto.coworkingVenueIds = form.venueIds;
      if (form.maxUses) dto.maxUses = Number(form.maxUses);
      if (form.maxUsesPerUser) dto.maxUsesPerUser = Number(form.maxUsesPerUser);
      if (form.validFrom) dto.validFrom = form.validFrom;
      if (form.expiresAt) dto.expiresAt = form.expiresAt;

      if (editingCode) {
        await coworkingDashboardService.updatePromoCode(spaceId, editingCode, dto);
      } else {
        await coworkingDashboardService.createPromoCode(spaceId, dto);
      }
      await fetchPromoCodes();
      setShowForm(false);
      setEditingCode(null);
      setForm(emptyForm);
    } catch (err: unknown) {
      setError(getErrorMessage(err, editingCode ? "Failed to update promo code" : "Failed to create promo code"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (code: string) => {
    if (!confirm(`Delete promo code "${code}"?`)) return;
    setDeleting(code);
    setError("");
    try {
      await coworkingDashboardService.deletePromoCode(spaceId, code);
      setPromoCodes((prev) => prev.filter((p) => p.code !== code));
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to delete promo code"));
    } finally {
      setDeleting(null);
    }
  };

  const handleToggle = async (code: string) => {
    setToggling(code);
    setError("");
    try {
      await coworkingDashboardService.togglePromoCode(spaceId, code);
      await fetchPromoCodes();
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to toggle promo code"));
    } finally {
      setToggling(null);
    }
  };

  const toggleVenue = (venueId: string) => {
    setForm((f) => ({
      ...f,
      venueIds: f.venueIds.includes(venueId)
        ? f.venueIds.filter((id) => id !== venueId)
        : [...f.venueIds, venueId],
    }));
  };

  const formatDiscount = (promo: PromoCode) => {
    if (isPercent(promo.discountType)) {
      const base = `${Number(promo.discountAmount)}%`;
      return promo.maxDiscount ? `${base} (max £${Number(promo.maxDiscount).toFixed(2)})` : base;
    }
    return `£${Number(promo.discountAmount).toFixed(2)}`;
  };

  const formatDate = (iso?: string) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const isExpired = (promo: PromoCode) => {
    if (!promo.expiresAt) return false;
    return new Date(promo.expiresAt) < new Date();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Header + create button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Promo Codes</h2>
          <p className="text-sm text-gray-500 mt-1">
            Create and manage discount codes for your members.
          </p>
        </div>
        {!showForm && (
          <button
            onClick={openForm}
            className="btn btn-sm border-none bg-primary px-4 text-white shadow-sm hover:bg-primary/90 gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Promo Code
          </button>
        )}
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">
            {editingCode ? `Edit ${editingCode}` : "New Promo Code"}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Code */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
                  Code
                </label>
                <input
                  type="text"
                  required
                  disabled={!!editingCode}
                  value={form.code}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      code: e.target.value.toUpperCase(),
                    }))
                  }
                  placeholder="SUMMER20"
                  className={`input h-11 w-full rounded-lg border border-gray-300 px-3 text-sm uppercase focus:border-primary focus:ring-1 focus:ring-primary ${editingCode ? "bg-gray-100 text-gray-500" : ""}`}
                />
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
                  Name <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Summer campaign"
                  className="input h-11 w-full rounded-lg border border-gray-300 px-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Discount Type */}
              <div>
                <label className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
                  Discount Type
                  <Hint text="Fixed gives a set £ amount off. Percentage takes a % off the venue hire fee." />
                </label>
                <select
                  value={form.discountType}
                  onChange={(e) => {
                    const next = e.target.value as FormDiscountType;
                    setForm((f) => ({
                      ...f,
                      discountType: next,
                      discountAmount:
                        next === "PERCENT" && Number(f.discountAmount) > 100
                          ? "100"
                          : f.discountAmount,
                    }));
                  }}
                  className="select h-11 w-full rounded-lg border border-gray-300 px-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="FIXED">Fixed (£)</option>
                  <option value="PERCENT">Percentage (%)</option>
                </select>
              </div>

              {/* Discount Amount */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
                  Discount Amount {form.discountType === "FIXED" ? "(£)" : "(%)"}
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  {...(form.discountType === "PERCENT" ? { max: 100 } : {})}
                  step="0.01"
                  value={form.discountAmount}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, discountAmount: e.target.value }))
                  }
                  placeholder="10"
                  className="input h-11 w-full rounded-lg border border-gray-300 px-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Max Discount (percentage only) */}
              {form.discountType === "PERCENT" && (
                <div>
                  <label className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
                    Max Discount Cap (£){" "}
                    <span className="text-gray-400 font-normal">(optional)</span>
                    <Hint text="Caps the maximum £ amount off. E.g. 20% with a £50 cap means a £400 order gets £50 off, not £80." />
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.maxDiscount}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, maxDiscount: e.target.value }))
                    }
                    placeholder="50"
                    className="input h-11 w-full rounded-lg border border-gray-300 px-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
              )}

              {/* Min Order Value */}
              <div>
                <label className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
                  Min Order Value (£){" "}
                  <span className="text-gray-400 font-normal">(optional)</span>
                  <Hint text="The food subtotal must be at least this amount for the code to work." />
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.minOrderValue}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, minOrderValue: e.target.value }))
                  }
                  placeholder="20"
                  className="input h-11 w-full rounded-lg border border-gray-300 px-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Max Uses */}
              <div>
                <label className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
                  Max Uses{" "}
                  <span className="text-gray-400 font-normal">(optional)</span>
                  <Hint text="Total number of times this code can be redeemed across all members. Leave empty for unlimited." />
                </label>
                <input
                  type="number"
                  min="1"
                  value={form.maxUses}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, maxUses: e.target.value }))
                  }
                  placeholder="100"
                  className="input h-11 w-full rounded-lg border border-gray-300 px-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Max Uses Per User */}
              <div>
                <label className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
                  Max Uses Per User{" "}
                  <span className="text-gray-400 font-normal">(optional)</span>
                  <Hint text="How many times a single member can use this code. Leave empty for unlimited." />
                </label>
                <input
                  type="number"
                  min="1"
                  value={form.maxUsesPerUser}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, maxUsesPerUser: e.target.value }))
                  }
                  placeholder="1"
                  className="input h-11 w-full rounded-lg border border-gray-300 px-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Valid From */}
              <div>
                <label className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
                  Valid From{" "}
                  <span className="text-gray-400 font-normal">(optional)</span>
                  <Hint text="Code won't work before this date. Leave empty to activate immediately." />
                </label>
                <input
                  type="date"
                  value={form.validFrom}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, validFrom: e.target.value }))
                  }
                  className="input h-11 w-full rounded-lg border border-gray-300 px-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Expires At */}
              <div>
                <label className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
                  Expires At{" "}
                  <span className="text-gray-400 font-normal">(optional)</span>
                  <Hint text="Code stops working after this date. Leave empty for no expiry." />
                </label>
                <input
                  type="date"
                  value={form.expiresAt}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, expiresAt: e.target.value }))
                  }
                  className="input h-11 w-full rounded-lg border border-gray-300 px-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {/* Venue Selection */}
            {venues.length > 0 && (
              <div>
                <button
                  type="button"
                  onClick={() => setVenuesExpanded((v) => !v)}
                  className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2"
                >
                  Venues{" "}
                  <span className="text-gray-400 font-normal">(optional)</span>
                  <Hint text="Restrict this code to specific venues. Leave empty to apply to all venues." />
                  {venuesExpanded ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                  {form.venueIds.length > 0 && (
                    <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary normal-case tracking-normal">
                      {form.venueIds.length} selected
                    </span>
                  )}
                </button>
                {venuesExpanded && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                    {venues.map((venue) => (
                      <label
                        key={venue.id}
                        className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${
                          form.venueIds.includes(venue.id)
                            ? "border-primary bg-primary/5"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={form.venueIds.includes(venue.id)}
                          onChange={() => toggleVenue(venue.id)}
                          className="checkbox checkbox-sm checkbox-primary"
                        />
                        <span className="text-sm text-gray-700">{venue.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Form actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="btn btn-sm border-none bg-primary px-5 text-white shadow-sm hover:bg-primary/90 gap-2"
              >
                {saving && <span className="loading loading-spinner loading-xs" />}
                {editingCode ? "Save Changes" : "Create Code"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingCode(null);
                  setError("");
                }}
                className="btn btn-sm btn-ghost text-gray-600"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Promo Codes List */}
      {promoCodes.length === 0 && !showForm ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
            <Tag className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-gray-900">
            No promo codes yet
          </h3>
          <p className="mt-1 text-sm text-gray-500 max-w-sm mx-auto">
            Create your first promo code to offer discounts to your members.
          </p>
          <button
            onClick={openForm}
            className="btn btn-sm border-none bg-primary px-5 text-white shadow-sm hover:bg-primary/90 gap-2 mt-5"
          >
            <Plus className="h-4 w-4" />
            Create Your First Code
          </button>
        </div>
      ) : (
        promoCodes.length > 0 && (
          <div className="space-y-3">
            {promoCodes.map((promo) => {
              const expired = isExpired(promo);
              const atLimit =
                promo.maxUses != null &&
                promo.usageCount != null &&
                promo.usageCount >= promo.maxUses;

              return (
                <div
                  key={promo.code}
                  className={`bg-white rounded-xl border shadow-sm p-5 ${
                    expired || atLimit || (promo.active ?? promo.isActive) === false
                      ? "border-gray-200 opacity-60"
                      : "border-gray-100"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    {/* Left: info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <code className="text-base font-bold text-gray-900 tracking-wider">
                          {promo.code}
                        </code>
                        {/* Status badge */}
                        {expired ? (
                          <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">
                            Expired
                          </span>
                        ) : atLimit ? (
                          <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                            Limit reached
                          </span>
                        ) : (promo.active ?? promo.isActive) === false ? (
                          <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                            Inactive
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
                            Active
                          </span>
                        )}
                      </div>
                      {promo.name && (
                        <p className="text-sm text-gray-500 mb-2">{promo.name}</p>
                      )}

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Percent className="h-3.5 w-3.5 text-gray-400" />
                          {formatDiscount(promo)}
                        </span>
                        {promo.minOrderValue != null && promo.minOrderValue > 0 && (
                          <span className="text-gray-400">
                            Min order £{promo.minOrderValue}
                          </span>
                        )}
                        {promo.maxUses != null && (
                          <span className="flex items-center gap-1">
                            <Users className="h-3.5 w-3.5 text-gray-400" />
                            {promo.usageCount ?? 0}/{promo.maxUses} uses
                          </span>
                        )}
                        {promo.maxUsesPerUser != null && (
                          <span className="text-gray-400">
                            {promo.maxUsesPerUser}/user
                          </span>
                        )}
                      </div>

                      {/* Venues */}
                      {promo.venues && promo.venues.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {promo.venues.map((v) => (
                            <span
                              key={v.id}
                              className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600"
                            >
                              {v.name}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Dates */}
                      {(promo.validFrom || promo.expiresAt) && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
                          <Calendar className="h-3.5 w-3.5" />
                          {promo.validFrom && (
                            <span>From {formatDate(promo.validFrom)}</span>
                          )}
                          {promo.validFrom && promo.expiresAt && <span>—</span>}
                          {promo.expiresAt && (
                            <span>Until {formatDate(promo.expiresAt)}</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right: edit + toggle + delete */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => openEdit(promo)}
                        className="btn btn-sm rounded-full border-blue-200 bg-blue-50 text-blue-600 shadow-none hover:border-blue-300 hover:bg-blue-100 gap-1.5"
                      >
                        <Pencil className="h-4 w-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleToggle(promo.code)}
                        disabled={toggling === promo.code}
                        className={`btn btn-sm rounded-full shadow-none gap-1.5 ${
                          (promo.active ?? promo.isActive) === false
                            ? "border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300 hover:bg-gray-100"
                            : "border-green-200 bg-green-50 text-green-700 hover:border-green-300 hover:bg-green-100"
                        }`}
                      >
                        {toggling === promo.code ? (
                          <span className="loading loading-spinner loading-xs" />
                        ) : (promo.active ?? promo.isActive) === false ? (
                          <ToggleLeft className="h-4 w-4" />
                        ) : (
                          <ToggleRight className="h-4 w-4" />
                        )}
                        {(promo.active ?? promo.isActive) === false ? "Enable" : "Disable"}
                      </button>
                      <button
                        onClick={() => handleDelete(promo.code)}
                        disabled={deleting === promo.code}
                        className="btn btn-sm rounded-full border-red-200 bg-red-50 text-red-600 shadow-none hover:border-red-300 hover:bg-red-100 gap-1.5"
                      >
                        {deleting === promo.code ? (
                          <span className="loading loading-spinner loading-xs" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
