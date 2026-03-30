"use client";

import { FormEvent, useMemo, useState } from "react";
import { useCoworking } from "@/context/CoworkingContext";
import { coworkingService } from "@/services/api/coworking.api";

interface CoworkingAddCateringSessionGateProps {
  spaceSlug: string;
  ownerEmail: string | null;
}

function maskEmail(email: string | null) {
  if (!email || !email.includes("@")) return "the booking owner's email";
  const [local, domain] = email.split("@");
  return `${local.slice(0, 2)}***@${domain}`;
}

export default function CoworkingAddCateringSessionGate({
  spaceSlug,
  ownerEmail,
}: CoworkingAddCateringSessionGateProps) {
  const { isAuthenticated, member, setSession, logout } = useCoworking();
  const [email, setEmail] = useState(member?.email ?? "");
  const [name, setName] = useState(member?.name ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOwner =
    !!member?.email &&
    !!ownerEmail &&
    member.email.toLowerCase() === ownerEmail.toLowerCase();

  const helperText = useMemo(() => {
    if (!isAuthenticated) {
      return "Only the booking owner can add catering to this venue booking.";
    }
    if (!isOwner) {
      return `This session does not match the booking owner. Sign in with ${maskEmail(
        ownerEmail
      )} to continue.`;
    }
    return null;
  }, [isAuthenticated, isOwner, ownerEmail]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();

    if (!trimmedName || trimmedName.length < 2) {
      setError("Enter the booking owner's name to continue.");
      return;
    }

    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setError("Enter the booking owner's email to continue.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await coworkingService.startSession(spaceSlug, {
        email: trimmedEmail,
        name: trimmedName,
      });
      setSession({
        member: {
          email: result.email,
          name: result.name,
          memberId: "",
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start session.");
    } finally {
      setSubmitting(false);
    }
  };

  if (isOwner) return null;

  return (
    <div className="mx-auto max-w-2xl rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
      <h1 className="text-2xl font-bold text-slate-900">Log in to add catering</h1>
      <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">{helperText}</p>

      {!isAuthenticated ? (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Booking owner email
            </label>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#bd2429]"
              placeholder="name@company.com"
              type="email"
              autoComplete="email"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Booking owner name
            </label>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#bd2429]"
              placeholder="Your name"
              type="text"
              autoComplete="name"
            />
          </div>

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex w-full items-center justify-center rounded-full bg-[#bd2429] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Checking access..." : "Continue"}
          </button>
        </form>
      ) : (
        <div className="mt-6 space-y-4">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Signed in as <span className="font-semibold">{member?.email}</span>. Only the
            booking owner can add catering.
          </div>
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center justify-center rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700"
          >
            Log out and try another email
          </button>
        </div>
      )}
    </div>
  );
}
