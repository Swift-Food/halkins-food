import { useState, useRef, useEffect } from "react";
import { DietaryFilter, Allergens } from "@/types/menuItem";
import { useCateringFilters, PricePerPersonRange } from "@/context/CateringFilterContext";

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CateringFilterModal({
  isOpen,
  onClose,
}: FilterModalProps) {
  const mobileModalRef = useRef<HTMLDivElement>(null);
  const desktopDropdownRef = useRef<HTMLDivElement>(null);
  const { filters, setFilters } = useCateringFilters();

  // Local state for temporary selections (before Apply)
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>(
    filters.allergens
  );
  const [selectedDietaryRestrictions, setSelectedDietaryRestrictions] =
    useState<DietaryFilter[]>(filters.dietaryRestrictions);
  const [selectedPriceRange, setSelectedPriceRange] = useState<PricePerPersonRange | null>(
    filters.pricePerPersonRange
  );

  // Sync local state with context when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedAllergens(filters.allergens);
      setSelectedDietaryRestrictions(filters.dietaryRestrictions);
      setSelectedPriceRange(filters.pricePerPersonRange);
    }
  }, [isOpen, filters]);

  // Prevent body scroll on mobile when modal is open
  useEffect(() => {
    if (isOpen && window.innerWidth < 768) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleNoSaveClose = () => {
    setSelectedAllergens([]);
    setSelectedDietaryRestrictions([]);
    setSelectedPriceRange(null);
    onClose();
  };

  // Official Big 14 Allergens
  const allergenOptions: Allergens[] = [
    Allergens.CELERY,
    Allergens.CEREALS_CONTAINING_GLUTEN,
    Allergens.CRUSTACEANS,
    Allergens.EGGS,
    Allergens.FISH,
    Allergens.LUPIN,
    Allergens.MILK,
    Allergens.MOLLUSCS,
    Allergens.MUSTARD,
    Allergens.PEANUTS,
    Allergens.SESAME_SEEDS,
    Allergens.SOYBEANS,
    Allergens.SULPHUR_DIOXIDE,
    Allergens.TREE_NUTS,
  ];

  const ALLERGEN_LABELS: Record<Allergens, string> = {
    // Official (Big 14 Allergens)
    [Allergens.CELERY]: "Celery",
    [Allergens.CEREALS_CONTAINING_GLUTEN]: "Cereals containing gluten",
    [Allergens.CRUSTACEANS]: "Crustaceans",
    [Allergens.EGGS]: "Eggs",
    [Allergens.FISH]: "Fish",
    [Allergens.LUPIN]: "Lupin",
    [Allergens.MILK]: "Milk",
    [Allergens.MOLLUSCS]: "Molluscs",
    [Allergens.MUSTARD]: "Mustard",
    [Allergens.PEANUTS]: "Peanuts",
    [Allergens.SESAME_SEEDS]: "Sesame seeds",
    [Allergens.SOYBEANS]: "Soybeans",
    [Allergens.SULPHUR_DIOXIDE]: "Sulphur dioxide",
    [Allergens.TREE_NUTS]: "Tree nuts",
    // Common Sensitivities / Additions
    [Allergens.WHEAT]: "Wheat",
    [Allergens.BARLEY]: "Barley",
    [Allergens.RYE]: "Rye",
    [Allergens.OATS]: "Oats",
    [Allergens.CORN]: "Corn",
    [Allergens.GELATIN]: "Gelatin",
    [Allergens.GARLIC]: "Garlic",
    [Allergens.ONION]: "Onion",
    [Allergens.ALCOHOL]: "Alcohol",
    [Allergens.PORK]: "Pork",
    [Allergens.BEEF]: "Beef",
    [Allergens.CHICKEN]: "Chicken",
    [Allergens.LAMB]: "Lamb",
    [Allergens.LEGUMES]: "Legumes",
    [Allergens.CAFFEINE]: "Caffeine",
    [Allergens.COCOA]: "Cocoa",
    [Allergens.COLORANTS]: "Colorants",
    [Allergens.PRESERVATIVES]: "Preservatives",
    // Legacy
    [Allergens.GLUTEN]: "Gluten",
    [Allergens.MEAT]: "Meat",
    [Allergens.NUTS]: "Nuts",
    [Allergens.MOLUSCS]: "Moluscs (legacy)",
    [Allergens.SOYA]: "Soya",
  };

  // Dietary filters based on enum
  const dietaryFilterOptions: DietaryFilter[] = [
    DietaryFilter.HALAL,
    DietaryFilter.VEGETARIAN,

    DietaryFilter.VEGAN,
    DietaryFilter.PESCATERIAN,

  ];

  const DIETARY_LABELS: Record<DietaryFilter, string> = {
    [DietaryFilter.HALAL]: "Halal",
    [DietaryFilter.VEGETARIAN]: "Vegetarian",
    [DietaryFilter.VEGAN]: "Vegan",
    [DietaryFilter.PESCATERIAN]: "Pescatarian",

  };

  // Price per person range options
  const priceRangeOptions: { value: PricePerPersonRange; label: string }[] = [
    { value: "under5", label: "Under £5" },
    { value: "5to10", label: "£5 - £10" },
    { value: "10to15", label: "£10 - £15" },
    { value: "over15", label: "Over £15" },
  ];

  const toggleAllergen = (item: Allergens) => {
    setSelectedAllergens((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  // Clear all filters
  const clearFiltersLocal = () => {
    setSelectedAllergens([]);
    setSelectedDietaryRestrictions([]);
    setSelectedPriceRange(null);
  };

  const clearAllergens = () => {
    setSelectedAllergens([]);
  };

  const clearDietaryRestrictions = () => {
    setSelectedDietaryRestrictions([]);
  };

  const clearPriceRange = () => {
    setSelectedPriceRange(null);
  };

  const togglePriceRange = (range: PricePerPersonRange) => {
    setSelectedPriceRange((prev) => (prev === range ? null : range));
  };

  const toggleDietary = (item: DietaryFilter) => {
    setSelectedDietaryRestrictions((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const handleApply = () => {
    setFilters({
      dietaryRestrictions: selectedDietaryRestrictions,
      allergens: selectedAllergens as Allergens[],
      pricePerPersonRange: selectedPriceRange,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Mobile Modal (fixed overlay) */}
      <div
        className="md:hidden fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        onClick={(e) => {
          // Close if clicking the backdrop (not the modal content)
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        <div
          ref={mobileModalRef}
          className="bg-white rounded-3xl shadow-2xl max-h-[85vh] overflow-y-auto p-6 w-full max-w-md"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-base-content">Filters</h2>
            <button
              onClick={handleNoSaveClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Allergens */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-semibold text-base-content">
                Allergens
              </h3>
              {selectedAllergens.length > 0 && (
                <button
                  onClick={clearAllergens}
                  className="text-xs text-primary hover:text-primary/80 font-medium"
                >
                  Clear
                </button>
              )}
            </div>
            <p className="text-sm text-gray-500 mb-2">
              Select allergens to exclude from results
            </p>
            <div className="flex flex-wrap gap-2">
              {allergenOptions.map((item) => (
                <button
                  key={item}
                  onClick={() => toggleAllergen(item)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    selectedAllergens.includes(item)
                      ? "bg-primary text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {ALLERGEN_LABELS[item]}
                </button>
              ))}
            </div>
          </div>

          {/* Dietary Restrictions */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-semibold text-base-content">
                Dietary Restrictions
              </h3>
              {selectedDietaryRestrictions.length > 0 && (
                <button
                  onClick={clearDietaryRestrictions}
                  className="text-xs text-primary hover:text-primary/80 font-medium"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {dietaryFilterOptions.map((item) => (
                <button
                  key={item}
                  onClick={() => toggleDietary(item)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    selectedDietaryRestrictions.includes(item)
                      ? "bg-primary text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {DIETARY_LABELS[item]}
                </button>
              ))}
            </div>
          </div>

          {/* Price Per Person */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-semibold text-base-content">
                Price Per Person
              </h3>
              {selectedPriceRange && (
                <button
                  onClick={clearPriceRange}
                  className="text-xs text-primary hover:text-primary/80 font-medium"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {priceRangeOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => togglePriceRange(option.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    selectedPriceRange === option.value
                      ? "bg-primary text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          {/* Clear Filter Button (mobile) */}
          {(selectedAllergens.length > 0 ||
            selectedDietaryRestrictions.length > 0 ||
            selectedPriceRange) && (
            <button
              onClick={clearFiltersLocal}
              className="mb-4 w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 rounded-full text-sm transition-colors"
            >
              Clear Filter
            </button>
          )}
          {/* Apply Button */}
          <button
            onClick={handleApply}
            className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3 rounded-full text-base transition-colors"
          >
            APPLY
          </button>
        </div>
      </div>

      {/* Desktop Dropdown (fixed positioning below sticky row) */}
      <div
        ref={desktopDropdownRef}
        className="hidden md:block fixed top-[190px] left-0 right-0 bg-white rounded-3xl shadow-2xl max-h-[calc(100vh-215px)] overflow-y-auto p-6 z-[45] max-w-4xl mx-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-base-content">Filters</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Allergens */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-base font-semibold text-base-content">
              Allergens
            </h3>
            {selectedAllergens.length > 0 && (
              <button
                onClick={clearAllergens}
                className="text-xs text-primary hover:text-primary/80 font-medium"
              >
                Clear
              </button>
            )}
          </div>
          <p className="text-sm text-gray-500 mb-2">
            Select allergens to exclude from results
          </p>
          <div className="flex flex-wrap gap-2">
            {allergenOptions.map((item) => (
              <button
                key={item}
                onClick={() => toggleAllergen(item)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  selectedAllergens.includes(item)
                    ? "bg-primary text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {ALLERGEN_LABELS[item]}
              </button>
            ))}
          </div>
        </div>

        {/* Dietary Restrictions */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-base font-semibold text-base-content">
              Dietary Restrictions
            </h3>
            {selectedDietaryRestrictions.length > 0 && (
              <button
                onClick={clearDietaryRestrictions}
                className="text-xs text-primary hover:text-primary/80 font-medium"
              >
                Clear
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {dietaryFilterOptions.map((item) => (
              <button
                key={item}
                onClick={() => toggleDietary(item)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  selectedDietaryRestrictions.includes(item)
                    ? "bg-primary text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {DIETARY_LABELS[item]}
              </button>
            ))}
          </div>
        </div>

        {/* Price Per Person */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-base font-semibold text-base-content">
              Price Per Person
            </h3>
            {selectedPriceRange && (
              <button
                onClick={clearPriceRange}
                className="text-xs text-primary hover:text-primary/80 font-medium"
              >
                Clear
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {priceRangeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => togglePriceRange(option.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  selectedPriceRange === option.value
                    ? "bg-primary text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Clear Filter Button (desktop) */}
        {(selectedAllergens.length > 0 ||
          selectedDietaryRestrictions.length > 0 ||
          selectedPriceRange) && (
          <button
            onClick={clearFiltersLocal}
            className="mb-4 w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 rounded-full text-sm transition-colors"
          >
            Clear Filter
          </button>
        )}

        {/* Apply Button */}
        <button
          onClick={handleApply}
          className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3 rounded-full text-base transition-colors"
        >
          APPLY
        </button>
      </div>
    </>
  );
}
