"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { CoworkingVenueAdmin, CreateCoworkingVenueRequest, UpdateCoworkingVenueRequest } from "@/types/api";
import { coworkingDashboardService } from "@/services/api/coworking-dashboard.api";
import { fetchWithAuth, API_BASE_URL } from "@/lib/api-client/auth-client";
import { API_ENDPOINTS } from "@/lib/constants";
import AddressAutocomplete from "@/lib/components/catering/contact/AddressAutocomplete";
import {
  X,
  Plus,
  Pencil,
  Trash2,
  MapPin,
  Upload,
  ImageIcon,
  ArrowLeft,
  Users,
} from "lucide-react";

interface VenuesModalProps {
  spaceId: string;
  onClose: () => void;
}

const emptyForm: CreateCoworkingVenueRequest = {
  name: "",
  capacity: 0,
  latitude: 0,
  longitude: 0,
  image: "",
  description: "",
};

type FormMode = "list" | "create" | "edit";

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function VenuesModal({ spaceId, onClose }: VenuesModalProps) {
  const [venues, setVenues] = useState<CoworkingVenueAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<FormMode>("list");
  const [editingVenue, setEditingVenue] = useState<CoworkingVenueAdmin | null>(null);
  const [form, setForm] = useState<CreateCoworkingVenueRequest>(emptyForm);
  const [imageUploading, setImageUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [hasSelectedAddress, setHasSelectedAddress] = useState(false);
  const [addressSearchError, setAddressSearchError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchVenues = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await coworkingDashboardService.listVenues(spaceId);
      setVenues(data);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to load venues"));
    } finally {
      setLoading(false);
    }
  }, [spaceId]);

  useEffect(() => {
    fetchVenues();
  }, [fetchVenues]);

  const openCreate = () => {
    setForm(emptyForm);
    setEditingVenue(null);
    setImagePreview(null);
    setHasSelectedAddress(false);
    setAddressSearchError("");
    setError("");
    setMode("create");
  };

  const openEdit = (venue: CoworkingVenueAdmin) => {
    setEditingVenue(venue);
    setImagePreview(null);
    setForm({
      name: venue.name,
      capacity: venue.capacity,
      latitude: Number(venue.latitude),
      longitude: Number(venue.longitude),
      image: venue.image ?? "",
      description: venue.description ?? "",
    });
    setHasSelectedAddress(false);
    setAddressSearchError("");
    setError("");
    setMode("edit");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...form,
        capacity: Number(form.capacity),
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        image: form.image || undefined,
        description: form.description || undefined,
      };
      if (mode === "create") {
        await coworkingDashboardService.createVenue(spaceId, payload);
      } else if (mode === "edit" && editingVenue) {
        const updatePayload: UpdateCoworkingVenueRequest = payload;
        await coworkingDashboardService.updateVenue(spaceId, editingVenue.id, updatePayload);
      }
      await fetchVenues();
      setMode("list");
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to save venue"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (venueId: string) => {
    if (!confirm("Delete this venue?")) return;
    setDeleting(venueId);
    setError("");
    try {
      await coworkingDashboardService.deleteVenue(spaceId, venueId);
      setVenues((v) => v.filter((x) => x.id !== venueId));
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to delete venue"));
    } finally {
      setDeleting(null);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handlePlaceSelect = useCallback((place: google.maps.places.PlaceResult) => {
    const location = place.geometry?.location;

    if (!location) {
      setHasSelectedAddress(false);
      setAddressSearchError("Selected address does not include coordinates.");
      return;
    }

    setForm((currentForm) => ({
      ...currentForm,
      latitude: Number(location.lat().toFixed(6)),
      longitude: Number(location.lng().toFixed(6)),
    }));
    setHasSelectedAddress(true);
    setAddressSearchError("");
  }, []);

  const handleClearAddress = useCallback(() => {
    setHasSelectedAddress(false);
    setAddressSearchError("");
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const localPreview = URL.createObjectURL(file);
    setImagePreview(localPreview);
    setImageUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("upload", file);
      const response = await fetchWithAuth(
        `${API_BASE_URL}${API_ENDPOINTS.IMAGE_UPLOAD}`,
        { method: "POST", body: formData }
      );
      if (!response.ok) throw new Error("Failed to upload image");
      const url: string = await response.json();
      setForm((f) => ({ ...f, image: url }));
      URL.revokeObjectURL(localPreview);
      setImagePreview(null);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to upload image"));
      setImagePreview(null);
      URL.revokeObjectURL(localPreview);
    } finally {
      setImageUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div
        className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-[28px] bg-white shadow-[0_28px_90px_rgba(15,23,42,0.28)] flex flex-col">
        {/* Header */}
        <div className="border-b border-slate-200 bg-white/95 px-6 py-5 backdrop-blur">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <MapPin className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-xl font-semibold text-slate-900">
                  {mode === "list" ? "Venues" : mode === "create" ? "Create Venue" : "Edit Venue"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {mode === "list"
                    ? "Manage the spaces members can book for meetings, events, and food service."
                    : "Add the details members and admins need to identify this venue."}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <button
                onClick={onClose}
                className="flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto bg-white px-6 py-6">
          {error && (
            <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
              {error}
            </div>
          )}

          {mode === "list" && (
            <>
              {loading ? (
                <div className="flex justify-center py-16">
                  <span className="loading loading-spinner loading-md text-primary" />
                </div>
              ) : !venues || venues.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-slate-300 bg-white px-6 py-14 text-center shadow-sm">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 text-slate-500">
                    <MapPin className="h-7 w-7" />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-slate-900">No venues yet</h3>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                    Add your first venue to start organizing bookings by location and give members a clearer picture of where each order belongs.
                  </p>
                  <button
                    onClick={openCreate}
                    className="btn mt-6 border-none bg-primary px-5 text-white shadow-sm hover:bg-primary/90"
                  >
                    <Plus className="h-4 w-4" />
                    Add Your First Venue
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {venues.map((venue) => (
                    <div
                      key={venue.id}
                      className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
                    >
                      <div className="flex flex-col lg:flex-row">
                        <div
                          className="relative aspect-[16/10] w-full shrink-0 overflow-hidden bg-slate-100 lg:w-64"
                        >
                          {venue.image ? (
                            <Image
                              src={venue.image}
                              alt={venue.name}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center bg-slate-100 text-slate-400">
                              <ImageIcon className="h-10 w-10" />
                            </div>
                          )}
                        </div>

                        <div className="flex min-w-0 flex-1 flex-col justify-between gap-5 p-5 sm:p-6">
                          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-xl font-semibold text-slate-900">
                                  {venue.name}
                                </h3>
                                <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                                  <Users className="mr-1.5 h-3.5 w-3.5" />
                                  Capacity {venue.capacity}
                                </span>
                              </div>
                              <p className="mt-3 text-sm leading-6 text-slate-500">
                                {venue.description || "No description yet. Add context so members can quickly tell this venue apart from the others."}
                              </p>
                            </div>

                            <div className="flex shrink-0 flex-wrap gap-2">
                              <button
                                onClick={() => openEdit(venue)}
                                className="btn btn-sm rounded-full border-slate-200 bg-white text-slate-700 shadow-none hover:border-slate-300 hover:bg-slate-50"
                              >
                                <Pencil className="h-4 w-4" />
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(venue.id)}
                                disabled={deleting === venue.id}
                                className="btn btn-sm rounded-full border-red-200 bg-red-50 text-red-600 shadow-none hover:border-red-300 hover:bg-red-100"
                              >
                                {deleting === venue.id ? (
                                  <span className="loading loading-spinner loading-xs" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                                Delete
                              </button>
                            </div>
                          </div>

                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {(mode === "create" || mode === "edit") && (
            <form id="venue-form" onSubmit={handleSubmit} className="space-y-4">
              <button
                type="button"
                onClick={() => {
                  setMode("list");
                  setError("");
                }}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to venues
              </button>

              <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_340px]">
                <div className="space-y-5">
                  <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-5">
                      <h3 className="text-base font-semibold text-slate-900">Venue details</h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Set the name, description, and practical details members see across the dashboard.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Name
                        </label>
                        <input
                          name="name"
                          value={form.name}
                          onChange={handleChange}
                          required
                          className="input h-12 w-full rounded-2xl border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 shadow-none focus:border-primary focus:bg-white"
                          placeholder="Paris Garden"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Capacity
                        </label>
                        <input
                          name="capacity"
                          type="number"
                          value={form.capacity}
                          onChange={handleChange}
                          required
                          min={1}
                          className="input h-12 w-full rounded-2xl border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 shadow-none focus:border-primary focus:bg-white"
                          placeholder="80"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Description
                        </label>
                        <textarea
                          name="description"
                          value={form.description ?? ""}
                          onChange={handleChange}
                          rows={4}
                          className="textarea min-h-28 w-full rounded-2xl border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 shadow-none focus:border-primary focus:bg-white"
                          placeholder="Rooftop space with great views and easy access for lunch setup."
                        />
                      </div>
                    </div>
                  </section>

                  <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-5">
                      <h3 className="text-base font-semibold text-slate-900">Map coordinates</h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Use precise coordinates so bookings, venue matching, and internal operations stay accurate.
                      </p>
                    </div>

                    <AddressAutocomplete
                      onPlaceSelect={handlePlaceSelect}
                      onClearAddress={handleClearAddress}
                      error={addressSearchError}
                      hasValidAddress={hasSelectedAddress}
                    />

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Latitude
                        </label>
                        <input
                          name="latitude"
                          type="number"
                          step="any"
                          value={form.latitude}
                          onChange={handleChange}
                          required
                          className="input h-12 w-full rounded-2xl border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 shadow-none focus:border-primary focus:bg-white"
                          placeholder="51.5066"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Longitude
                        </label>
                        <input
                          name="longitude"
                          type="number"
                          step="any"
                          value={form.longitude}
                          onChange={handleChange}
                          required
                          className="input h-12 w-full rounded-2xl border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 shadow-none focus:border-primary focus:bg-white"
                          placeholder="-0.1063"
                        />
                      </div>
                    </div>
                  </section>
                </div>

                <div className="space-y-5">
                  <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-5">
                      <h3 className="text-base font-semibold text-slate-900">Venue image</h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Add a photo so this venue is immediately recognizable in the dashboard.
                      </p>
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                    />

                    {(imagePreview || form.image) ? (
                      <div className="relative h-64 overflow-hidden rounded-[22px] border border-slate-200 bg-slate-100 group">
                        <Image
                          src={imagePreview ?? form.image!}
                          alt="Venue preview"
                          fill
                          className="object-cover"
                        />
                        {imageUploading && (
                          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/35">
                            <span className="loading loading-spinner loading-md text-white" />
                          </div>
                        )}
                        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-gradient-to-t from-slate-950/70 via-slate-950/20 to-transparent p-4">
                          <div>
                            <p className="text-sm font-semibold text-white">
                              {form.name || "Venue preview"}
                            </p>
                            <p className="text-xs text-white/80">
                              {Number(form.capacity) > 0
                                ? `Capacity ${Number(form.capacity)}`
                                : "Add capacity details"}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setForm((f) => ({ ...f, image: "" }));
                                setImagePreview(null);
                              }}
                              className="btn btn-sm rounded-full border-none bg-white/85 text-slate-700 shadow-sm hover:bg-white"
                            >
                              <X className="h-4 w-4" />
                              Remove
                            </button>
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="btn btn-sm rounded-full border-none bg-white/85 text-slate-700 shadow-sm hover:bg-white"
                            >
                              <Upload className="h-4 w-4" />
                              Replace
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={imageUploading}
                        className="flex h-64 w-full flex-col items-center justify-center gap-3 rounded-[22px] border-2 border-dashed border-slate-300 bg-slate-50 text-slate-400 transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary"
                      >
                        {imageUploading ? (
                          <span className="loading loading-spinner loading-sm text-primary" />
                        ) : (
                          <>
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm">
                              <ImageIcon className="h-6 w-6" />
                            </div>
                            <div className="space-y-1 text-center">
                              <p className="text-sm font-semibold text-slate-700">Upload venue image</p>
                              <p className="text-xs text-slate-500">PNG or JPG, used as the primary visual for this venue.</p>
                            </div>
                          </>
                        )}
                      </button>
                    )}
                  </section>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        {mode === "list" && (
          <div className="flex items-center justify-end border-t border-slate-200 bg-white px-6 py-4">
            <button
              type="button"
              onClick={openCreate}
              className="btn rounded-full border-none bg-primary px-5 text-white shadow-sm hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Add Venue
            </button>
          </div>
        )}

        {(mode === "create" || mode === "edit") && (
          <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-white px-6 py-4">
            <button
              type="button"
              onClick={() => {
                setMode("list");
                setError("");
              }}
              className="btn btn-ghost btn-sm rounded-full px-5"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="venue-form"
              disabled={saving}
              className="btn btn-sm rounded-full border-none bg-primary px-5 text-white shadow-sm hover:bg-primary/90"
            >
              {saving ? <span className="loading loading-spinner loading-xs" /> : null}
              {mode === "create" ? "Create Venue" : "Save Changes"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
