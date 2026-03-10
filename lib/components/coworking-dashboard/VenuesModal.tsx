"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { CoworkingVenueAdmin, CreateCoworkingVenueRequest, UpdateCoworkingVenueRequest } from "@/types/api";
import { coworkingDashboardService } from "@/services/api/coworking-dashboard.api";
import { fetchWithAuth, API_BASE_URL } from "@/lib/api-client/auth-client";
import { API_ENDPOINTS } from "@/lib/constants";
import { X, Plus, Pencil, Trash2, MapPin, Upload, ImageIcon } from "lucide-react";

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchVenues = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await coworkingDashboardService.listVenues(spaceId);
      console.log("data is")
      setVenues(data);
    } catch (err: any) {
      setError(err.message || "Failed to load venues");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVenues();
  }, [spaceId]);

  const openCreate = () => {
    setForm(emptyForm);
    setEditingVenue(null);
    setImagePreview(null);
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
    } catch (err: any) {
      setError(err.message || "Failed to save venue");
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
    } catch (err: any) {
      setError(err.message || "Failed to delete venue");
    } finally {
      setDeleting(null);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

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
    } catch (err: any) {
      setError(err.message || "Failed to upload image");
      setImagePreview(null);
      URL.revokeObjectURL(localPreview);
    } finally {
      setImageUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-gray-900">
              {mode === "list" ? "Venues" : mode === "create" ? "New Venue" : "Edit Venue"}
            </h2>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm btn-circle">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {mode === "list" && (
            <>
              <div className="flex justify-end mb-4">
                <button onClick={openCreate} className="btn btn-sm btn-primary gap-2">
                  <Plus className="h-4 w-4" />
                  Add Venue
                </button>
              </div>

              {loading ? (
                <div className="flex justify-center py-12">
                  <span className="loading loading-spinner loading-md text-primary" />
                </div>
              ) : !venues || venues.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm">
                  No venues yet. Add one to get started.
                </div>
              ) : (
                <div className="space-y-3">
                  {venues.map((venue) => (
                    <div key={venue.id} className="flex items-start justify-between bg-gray-50 rounded-xl px-4 py-3 gap-4">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{venue.name}</p>
                        {venue.description && <p className="text-sm text-gray-500 truncate">{venue.description}</p>}
                        <p className="text-xs text-gray-400 mt-0.5">Capacity: {venue.capacity}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => openEdit(venue)}
                          className="btn btn-ghost btn-xs gap-1"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(venue.id)}
                          disabled={deleting === venue.id}
                          className="btn btn-ghost btn-xs text-red-500 hover:text-red-700 gap-1"
                        >
                          {deleting === venue.id ? (
                            <span className="loading loading-spinner loading-xs" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {(mode === "create" || mode === "edit") && (
            <form id="venue-form" onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="label label-text text-xs font-medium text-gray-600">Name *</label>
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    required
                    className="input input-bordered input-sm w-full"
                    placeholder="Paris Garden"
                  />
                </div>
                <div>
                  <label className="label label-text text-xs font-medium text-gray-600">Capacity *</label>
                  <input
                    name="capacity"
                    type="number"
                    value={form.capacity}
                    onChange={handleChange}
                    required
                    min={1}
                    className="input input-bordered input-sm w-full"
                    placeholder="80"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="label label-text text-xs font-medium text-gray-600">Description</label>
                  <input
                    name="description"
                    value={form.description ?? ""}
                    onChange={handleChange}
                    className="input input-bordered input-sm w-full"
                    placeholder="Rooftop space with great views"
                  />
                </div>
                <div>
                  <label className="label label-text text-xs font-medium text-gray-600">Latitude *</label>
                  <input
                    name="latitude"
                    type="number"
                    step="any"
                    value={form.latitude}
                    onChange={handleChange}
                    required
                    className="input input-bordered input-sm w-full"
                    placeholder="51.5066"
                  />
                </div>
                <div>
                  <label className="label label-text text-xs font-medium text-gray-600">Longitude *</label>
                  <input
                    name="longitude"
                    type="number"
                    step="any"
                    value={form.longitude}
                    onChange={handleChange}
                    required
                    className="input input-bordered input-sm w-full"
                    placeholder="-0.1063"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="label label-text text-xs font-medium text-gray-600">Image</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                  {(imagePreview || form.image) ? (
                    <div className="relative w-full h-40 rounded-xl overflow-hidden border border-gray-200 group">
                      <Image src={imagePreview ?? form.image!} alt="Venue" fill className="object-cover" />
                      {imageUploading && (
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                          <span className="loading loading-spinner loading-md text-white" />
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => { setForm((f) => ({ ...f, image: "" })); setImagePreview(null); }}
                        className="absolute top-2 right-2 btn btn-xs btn-circle bg-white/80 hover:bg-white border-none shadow"
                      >
                        <X className="h-3 w-3 text-gray-700" />
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute bottom-2 right-2 btn btn-xs bg-white/80 hover:bg-white border-none shadow gap-1 text-gray-700"
                      >
                        <Upload className="h-3 w-3" />
                        Replace
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={imageUploading}
                      className="w-full h-32 rounded-xl border-2 border-dashed border-gray-200 hover:border-primary hover:bg-primary/5 transition-colors flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-primary"
                    >
                      {imageUploading ? (
                        <span className="loading loading-spinner loading-sm text-primary" />
                      ) : (
                        <>
                          <ImageIcon className="h-6 w-6" />
                          <span className="text-xs font-medium">Click to upload image</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        {(mode === "create" || mode === "edit") && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t">
            <button
              type="button"
              onClick={() => { setMode("list"); setError(""); }}
              className="btn btn-ghost btn-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="venue-form"
              disabled={saving}
              className="btn btn-sm btn-primary"
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
