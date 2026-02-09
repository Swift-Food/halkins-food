"use client";

import { useState } from "react";
import { useCoworking } from "@/context/CoworkingContext";
import { coworkingService } from "@/services/api/coworking.api";
import { Mail, Building2 } from "lucide-react";

interface CoworkingAuthFormProps {
  spaceSlug: string;
}

export default function CoworkingAuthForm({
  spaceSlug,
}: CoworkingAuthFormProps) {
  const { setSession, spaceInfo } = useCoworking();

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    const trimmedName = name.trim();

    if (!trimmedEmail || !trimmedName) {
      setError("Please fill in all fields.");
      return;
    }

    if (trimmedName.length < 2 || trimmedName.length > 100) {
      setError("Company name must be between 2 and 100 characters.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await coworkingService.startSession(spaceSlug, {
        email: trimmedEmail,
        name: trimmedName,
      });

      // Tokens are already stored by coworkingService.startSession
      // Just update context with member info
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
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold">Welcome</h2>
          {spaceInfo && (
            <p className="text-gray-500 mt-1">
              Order food at {spaceInfo.name}
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label" htmlFor="coworking-name">
              <span className="label-text font-medium">Company Name</span>
            </label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                id="coworking-name"
                type="text"
                placeholder="Enter your company name"
                className="input input-bordered w-full pl-10"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isSubmitting}
                minLength={2}
                maxLength={100}
                required
              />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="coworking-email">
              <span className="label-text font-medium">Email Address</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                id="coworking-email"
                type="email"
                placeholder="you@example.com"
                className="input input-bordered w-full pl-10"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>
          </div>

          {error && (
            <div className="alert alert-error text-sm">
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span className="loading loading-spinner loading-sm"></span>
            ) : (
              "Continue"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
