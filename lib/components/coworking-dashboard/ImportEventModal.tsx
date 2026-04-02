"use client";

import { useCallback, useEffect, useState } from "react";
import { coworkingDashboardService } from "@/services/api/coworking-dashboard.api";
import {
  CoworkingVenueAdmin,
  CreateAdminEventRequest,
  DashboardOrderDetailResponse,
} from "@/types/api";
import {
  CalendarPlus,
  MapPin,
  X,
} from "lucide-react";

interface ImportEventModalProps {
  spaceId: string;
  onClose: () => void;
  onImported?: (order: DashboardOrderDetailResponse) => void | Promise<void>;
}

const emptyForm = {
  memberName: "",
  memberEmail: "",
  venueId: "",
  bookingStartTime: "",
  bookingEndTime: "",
  notes: "",
};

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function ImportEventModal({
  spaceId,
  onClose,
  onImported,
}: ImportEventModalProps) {
  const [venues, setVenues] = useState<CoworkingVenueAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm);

  const fetchVenues = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await coworkingDashboardService.listVenues(spaceId);
      setVenues(data);
      setForm((current) => ({
        ...current,
        venueId: current.venueId || data[0]?.id || "",
      }));
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to load venues"));
    } finally {
      setLoading(false);
    }
  }, [spaceId]);

  useEffect(() => {
    fetchVenues();
  }, [fetchVenues]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const payload: CreateAdminEventRequest = {
        memberName: form.memberName.trim(),
        memberEmail: form.memberEmail.trim(),
        venueId: form.venueId,
        bookingStartTime: new Date(form.bookingStartTime).toISOString(),
        bookingEndTime: new Date(form.bookingEndTime).toISOString(),
        notes: form.notes.trim() || undefined,
      };

      const order = await coworkingDashboardService.createAdminEvent(spaceId, payload);
      await onImported?.(order);
      onClose();
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to import event"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center sm:items-center p-0 sm:p-6">
      <div
        className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative flex h-full w-full flex-col overflow-hidden bg-white sm:h-auto sm:max-h-[90vh] sm:max-w-3xl sm:rounded-[30px] sm:shadow-[0_28px_90px_rgba(15,23,42,0.28)]">
        <div className="border-b border-slate-200 bg-white/95 px-5 py-4 sm:px-6 sm:py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <CalendarPlus className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-xl font-semibold text-slate-900">Import Event</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Add an already-confirmed booking to the dashboard calendar and orders list.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
          {error && (
            <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-16">
              <span className="loading loading-spinner loading-md text-primary" />
            </div>
          ) : venues.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-slate-300 bg-white px-6 py-14 text-center shadow-sm">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 text-slate-500">
                <MapPin className="h-7 w-7" />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-slate-900">Add a venue first</h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                Imported events must be attached to one of your venues, so create a venue before adding manual bookings.
              </p>
            </div>
          ) : (
            <form id="import-event-form" onSubmit={handleSubmit} className="space-y-5">
              <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-5">
                  <h3 className="text-base font-semibold text-slate-900">Event details</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    This creates an approved admin booking only. No payment, catering flow, or email is sent.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Member name
                    </label>
                    <input
                      name="memberName"
                      value={form.memberName}
                      onChange={handleChange}
                      required
                      className="input h-12 w-full rounded-2xl border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 shadow-none focus:border-primary focus:bg-white"
                      placeholder="John Smith"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Member email
                    </label>
                    <input
                      name="memberEmail"
                      type="email"
                      value={form.memberEmail}
                      onChange={handleChange}
                      required
                      className="input h-12 w-full rounded-2xl border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 shadow-none focus:border-primary focus:bg-white"
                      placeholder="john@example.com"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Venue
                    </label>
                    <select
                      name="venueId"
                      value={form.venueId}
                      onChange={handleChange}
                      required
                      className="select h-12 w-full rounded-2xl border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 shadow-none focus:border-primary focus:bg-white"
                    >
                      {venues.map((venue) => (
                        <option key={venue.id} value={venue.id}>
                          {venue.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Start time
                    </label>
                    <input
                      name="bookingStartTime"
                      type="datetime-local"
                      value={form.bookingStartTime}
                      onChange={handleChange}
                      required
                      className="input h-12 w-full rounded-2xl border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 shadow-none focus:border-primary focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      End time
                    </label>
                    <input
                      name="bookingEndTime"
                      type="datetime-local"
                      value={form.bookingEndTime}
                      onChange={handleChange}
                      required
                      className="input h-12 w-full rounded-2xl border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 shadow-none focus:border-primary focus:bg-white"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Notes
                    </label>
                    <textarea
                      name="notes"
                      value={form.notes}
                      onChange={handleChange}
                      rows={4}
                      className="textarea min-h-28 w-full rounded-2xl border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 shadow-none focus:border-primary focus:bg-white"
                      placeholder="Optional context for your team, such as imported from another system or VIP client notes."
                    />
                  </div>
                </div>
              </section>
            </form>
          )}
        </div>

        <div className="border-t border-slate-200 bg-white px-5 py-4 sm:px-6">
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-ghost rounded-full px-5"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="import-event-form"
              disabled={saving || loading || venues.length === 0}
              className="btn rounded-full border-none bg-primary px-6 text-white shadow-sm hover:bg-primary/90 disabled:bg-slate-300"
            >
              {saving ? (
                <span className="loading loading-spinner loading-xs" />
              ) : (
                <CalendarPlus className="h-4 w-4" />
              )}
              Import Event
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
