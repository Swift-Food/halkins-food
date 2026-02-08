import { useEffect, useRef, useState } from "react";
import { GOOGLE_MAPS_CONFIG } from "@/lib/constants/google-maps";
import { loadGoogleMapsScript } from "@/lib/utils/google-maps-loader";

interface AddressAutocompleteProps {
  onPlaceSelect: (place: google.maps.places.PlaceResult) => void;
  onClearAddress?: () => void;
  error?: string;
  hasValidAddress?: boolean;
}

export default function AddressAutocomplete({
  onPlaceSelect,
  onClearAddress,
  error,
  hasValidAddress,
}: AddressAutocompleteProps) {
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const onPlaceSelectRef = useRef(onPlaceSelect);
  const [inputValue, setInputValue] = useState("");

  useEffect(() => {
    onPlaceSelectRef.current = onPlaceSelect;
  }, [onPlaceSelect]);

  useEffect(() => {
    const initAutocomplete = () => {
      if (!inputRef.current || !window.google?.maps?.places) {
        console.error("Google Maps Places not available");
        return;
      }

      autocompleteRef.current = new google.maps.places.Autocomplete(
        inputRef.current,
        {
          componentRestrictions: {
            country: GOOGLE_MAPS_CONFIG.COUNTRY_RESTRICTION,
          },
          fields: GOOGLE_MAPS_CONFIG.FIELDS,
        }
      );

      autocompleteRef.current.addListener("place_changed", () => {
        const place = autocompleteRef.current?.getPlace();
        if (place && place.geometry) {
          onPlaceSelectRef.current(place);
          setInputValue(inputRef.current?.value || "");
        }
      });
    };

    loadGoogleMapsScript().then(initAutocomplete);

    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, []);

  const handleClear = () => {
    if (inputRef.current) {
      inputRef.current.value = "";
      setInputValue("");
    }
    if (onClearAddress) {
      onClearAddress();
    }
  };

  return (
    <div className="mb-3">
      <label className="block text-sm font-semibold mb-2 text-base-content">
        Search Address*
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          placeholder="Start typing an address..."
          onChange={(e) => setInputValue(e.target.value)}
          className={`w-full px-3 py-2 text-sm bg-base-200/50 border rounded-lg focus:ring-2 focus:ring-dark-pink focus:border-transparent transition-all ${
            error ? "border-error" : hasValidAddress ? "border-success" : "border-base-300"
          }`}
        />
        {hasValidAddress && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-primary hover:text-primary/80 font-medium"
          >
            Change
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-error">✗ {error}</p>}
      {hasValidAddress && !error && (
        <p className="mt-1 text-xs text-success">✓ Address selected from Google</p>
      )}
      {!hasValidAddress && !error && (
        <p className="mt-1 text-xs text-base-content/60">
          Please select an address from the dropdown
        </p>
      )}
    </div>
  );
}
