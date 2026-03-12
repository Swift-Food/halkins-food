"use client";

import { useCallback, useEffect, useState } from "react";
import { coworkingDashboardService } from "@/services/api/coworking-dashboard.api";
import { CoworkingVenueAdmin } from "@/types/api";
import {
  Plus,
  Trash2,
  Tag,
  Percent,
  Hash,
  Calendar,
  Users,
  ChevronDown,
  ChevronUp,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

interface PromoCodesTabProps {
  spaceId: string;
}

interface PromoCode {
  code: string;
  name?: string;
  discountAmount: number;
  discountType: "fixed" | "percentage";
  maxDiscount?: number;
  minOrderValue?: number;
  venueIds?: string[];
  venues?: Array<{ id: string; name: string }>;
  maxUses?: number;
  maxUsesPerUser?: number;
  usageCount?: number;
  validFrom?: string;
  expiresAt?: string;
  active?: boolean;
}

interface CreateForm {
  code: string;
  name: string;
  discountAmount: string;
  discountType: "fixed" | "percentage";
  maxDiscount: string;
  minOrderValue: string;
  venueIds: string[];
  maxUses: string;
  maxUsesPerUser: string;
  validFrom: string;
  expiresAt: string;
}

const emptyForm: CreateForm = {
  code: "",
  name: "",
  discountAmount: "",
  discountType: "fixed",
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
  const [form, setForm] = useState<CreateForm>(emptyForm);
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

  const openForm = () => {
    setForm(emptyForm);
    setShowForm(true);
    setError("");
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    if (
      form.discountType === "percentage" &&
      Number(form.discountAmount) > 100
    ) {
      setError("Percentage discount cannot exceed 100%.");
      setSaving(false);
      return;
    }

    try {
      const dto: Record<string, unknown> = {
        code: form.code.toUpperCase().trim(),
        discountAmount: Number(form.discountAmount),
        discountType: form.discountType,
      };
      if (form.name.trim()) dto.name = form.name.trim();
      if (form.discountType === "percentage" && form.maxDiscount) {
        dto.maxDiscount = Number(form.maxDiscount);
      }
      if (form.minOrderValue) dto.minOrderValue = Number(form.minOrderValue);
      if (form.venueIds.length > 0) dto.venueIds = form.venueIds;
      if (form.maxUses) dto.maxUses = Number(form.maxUses);
      if (form.maxUsesPerUser) dto.maxUsesPerUser = Number(form.maxUsesPerUser);
      if (form.validFrom) dto.validFrom = form.validFrom;
      if (form.expiresAt) dto.expiresAt = form.expiresAt;

      await coworkingDashboardService.createPromoCode(spaceId, dto);
      await fetchPromoCodes();
      setShowForm(false);
      setForm(emptyForm);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to create promo code"));
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
    if (promo.discountType === "percentage") {
      const base = `${promo.discountAmount}%`;
      return promo.maxDiscount ? `${base} (max £${promo.maxDiscount})` : base;
    }
    return `£${promo.discountAmount.toFixed(2)}`;
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
            New Promo Code
          </h3>
          <form onSubmit={handleCreate} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Code */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
                  Code
                </label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={form.code}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        code: e.target.value.toUpperCase(),
                      }))
                    }
                    placeholder="SUMMER20"
                    className="input h-11 w-full rounded-lg border border-gray-300 pl-10 pr-3 text-sm uppercase focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
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
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
                  Discount Type
                </label>
                <select
                  value={form.discountType}
                  onChange={(e) => {
                    const next = e.target.value as "fixed" | "percentage";
                    setForm((f) => ({
                      ...f,
                      discountType: next,
                      discountAmount:
                        next === "percentage" && Number(f.discountAmount) > 100
                          ? "100"
                          : f.discountAmount,
                    }));
                  }}
                  className="select h-11 w-full rounded-lg border border-gray-300 px-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="fixed">Fixed (£)</option>
                  <option value="percentage">Percentage (%)</option>
                </select>
              </div>

              {/* Discount Amount */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
                  Discount Amount
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                    {form.discountType === "fixed" ? "£" : "%"}
                  </span>
                  <input
                    type="number"
                    required
                    min="0"
                    {...(form.discountType === "percentage" ? { max: 100 } : {})}
                    step="0.01"
                    value={form.discountAmount}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, discountAmount: e.target.value }))
                    }
                    placeholder="10"
                    className="input h-11 w-full rounded-lg border border-gray-300 pl-8 pr-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Max Discount (percentage only) */}
              {form.discountType === "percentage" && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
                    Max Discount Cap{" "}
                    <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                      £
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.maxDiscount}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, maxDiscount: e.target.value }))
                      }
                      placeholder="50"
                      className="input h-11 w-full rounded-lg border border-gray-300 pl-8 pr-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
              )}

              {/* Min Order Value */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
                  Min Order Value{" "}
                  <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                    £
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.minOrderValue}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, minOrderValue: e.target.value }))
                    }
                    placeholder="20"
                    className="input h-11 w-full rounded-lg border border-gray-300 pl-8 pr-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Max Uses */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
                  Max Uses{" "}
                  <span className="text-gray-400 font-normal">(optional)</span>
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
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
                  Max Uses Per User{" "}
                  <span className="text-gray-400 font-normal">(optional)</span>
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
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
                  Valid From{" "}
                  <span className="text-gray-400 font-normal">(optional)</span>
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
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
                  Expires At{" "}
                  <span className="text-gray-400 font-normal">(optional)</span>
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
                Create Code
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
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
                    expired || atLimit || promo.active === false
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
                        ) : promo.active === false ? (
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

                    {/* Right: toggle + delete */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleToggle(promo.code)}
                        disabled={toggling === promo.code}
                        className={`btn btn-sm rounded-full shadow-none gap-1.5 ${
                          promo.active === false
                            ? "border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300 hover:bg-gray-100"
                            : "border-green-200 bg-green-50 text-green-700 hover:border-green-300 hover:bg-green-100"
                        }`}
                      >
                        {toggling === promo.code ? (
                          <span className="loading loading-spinner loading-xs" />
                        ) : promo.active === false ? (
                          <ToggleLeft className="h-4 w-4" />
                        ) : (
                          <ToggleRight className="h-4 w-4" />
                        )}
                        {promo.active === false ? "Enable" : "Disable"}
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
