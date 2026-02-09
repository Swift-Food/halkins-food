import { useState, useEffect } from "react";
import Image from "next/image";
import { MenuItem, Addon } from "@/types/restaurant.types";
import { ALLERGENS } from "@/lib/constants/allergens";

// Dietary icon mapping
const DIETARY_ICON_MAP: Record<string, { file: string; label: string }> = {
  vegetarian: { file: "vegetarian.png", label: "Vegetarian" },
  vegan: { file: "vegan.png", label: "Vegan" },
  halal: { file: "halal.png", label: "Halal" },
  pescatarian: { file: "pescatarian.png", label: "Pescatarian" },
  no_nut: { file: "no_nut.png", label: "Nut-Free" },
  no_dairy: { file: "no_dairy.png", label: "Dairy-Free" },
};

// Utility function to format allergen enum values into human-readable labels
const formatAllergen = (allergen: string): string => {
  const allergenObj = ALLERGENS.find((a) => a.value === allergen);
  return allergenObj?.label || allergen
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

interface MenuItemModalProps {
  item: MenuItem;
  isOpen: boolean;
  onClose: () => void;
  quantity?: number;
  onAddItem?: (item: MenuItem) => void;
  onUpdateQuantity?: (itemId: string, quantity: number) => void;
  isEditMode?: boolean;
  onRemoveItem?: (index: number) => void;
  editingIndex?: number | null;
  viewOnly?: boolean; // When true, shows menu item details without add/edit functionality
  onAddToOrder?: (item: MenuItem) => void; // Callback for viewOnly mode to redirect to order builder
}

interface AddonGroup {
  items: Addon[];
  isRequired: boolean;
  selectionType: "single" | "multiple";
}

export default function MenuItemModal({
  item,
  isOpen,
  onClose,
  quantity = 0,
  onAddItem,
  onUpdateQuantity,
  isEditMode = false,
  onRemoveItem,
  editingIndex = null,
  viewOnly = false,
  onAddToOrder,
}: MenuItemModalProps) {
  // console.log("Item: ", item);
  const [itemQuantity, setItemQuantity] = useState(1);
  const [itemQuantityInput, setItemQuantityInput] = useState("1"); // String for input field
  const [selectedAddons, setSelectedAddons] = useState<
    Record<string, Record<string, boolean>>
  >({});
  const [addonQuantities, setAddonQuantities] = useState<
    Record<string, Record<string, number>>
  >({}); // For single-selection groups: tracks quantity per addon
  const [addonQuantityInputs, setAddonQuantityInputs] = useState<
    Record<string, Record<string, string>>
  >({}); // String values for input fields
  const [addonGroups, setAddonGroups] = useState<Record<string, AddonGroup>>(
    {}
  );
  const [totalPrice, setTotalPrice] = useState(0);
  const [isAllergenExpanded, setIsAllergenExpanded] = useState(false);

  const price = parseFloat(item.price?.toString() || "0");
  const discountPrice = parseFloat(item.discountPrice?.toString() || "0");
  const displayPrice =
    item.isDiscount && discountPrice > 0 ? discountPrice : price;
  const BACKEND_QUANTITY_UNIT = item.cateringQuantityUnit || 1;
  const DISPLAY_FEEDS_PER_UNIT = item.feedsPerUnit || 1;

  // const numUnits = quantity / BACKEND_QUANTITY_UNIT;
  // const displayQuantity = numUnits * DISPLAY_FEEDS_PER_UNIT;

  // Track if user has modified the quantity for items without addons
  const [hasModifiedQuantity, setHasModifiedQuantity] = useState(false);
  const [initialModalQuantity, setInitialModalQuantity] = useState(0);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      console.log("[MenuItemModal] Modal opened with data:", {
        item,
        addons: item.addons,
        selectedAddons: item.selectedAddons,
        isEditMode,
        quantity,
      });
      // Calculate initial quantity in portions
      const initialPortions =
        quantity > 0 ? quantity / BACKEND_QUANTITY_UNIT : 1;
      setItemQuantity(initialPortions);
      setItemQuantityInput(initialPortions.toString());
      setInitialModalQuantity(initialPortions);
      setHasModifiedQuantity(false);
      setIsAllergenExpanded(false);

      // If in edit mode, pre-populate the selected addons
      if (isEditMode && item.selectedAddons && item.selectedAddons.length > 0) {
        // We'll set these after addon groups are initialized
        // This is handled in the next useEffect
      } else {
        setSelectedAddons({});
        setAddonQuantities({});
        setAddonQuantityInputs({});
      }
    }
  }, [
    isOpen,
    quantity,
    BACKEND_QUANTITY_UNIT,
    isEditMode,
    item.selectedAddons,
  ]);

  // Group addons and initialize selections
  useEffect(() => {

    if (!item?.addons || item.addons.length === 0) {
      setAddonGroups({});
      setSelectedAddons({});
      return;
    }


    // Group addons by groupTitle
    const grouped = item.addons.reduce((acc, addon) => {
      // console.log("Processing addon:", addon);
      const groupTitle = addon.groupTitle || "Default";
      if (!acc[groupTitle]) {
        acc[groupTitle] = {
          items: [],
          isRequired: addon.isRequired,
          selectionType: addon.selectionType,
        };
      }
      acc[groupTitle].items.push(addon);
      return acc;
    }, {} as Record<string, AddonGroup>);

    // console.log("Grouped addons:", grouped);
    setAddonGroups(grouped);

    // Initialize selected addons state
    const initialSelections: Record<string, Record<string, boolean>> = {};
    const initialQuantities: Record<string, Record<string, number>> = {};
    const initialQuantityInputs: Record<string, Record<string, string>> = {};

    Object.keys(grouped).forEach((groupTitle) => {
      initialSelections[groupTitle] = {};
      initialQuantities[groupTitle] = {};
      initialQuantityInputs[groupTitle] = {};
      grouped[groupTitle].items.forEach((addon) => {
        initialSelections[groupTitle][addon.name] = false;
        initialQuantities[groupTitle][addon.name] = 0;
        initialQuantityInputs[groupTitle][addon.name] = "0";
      });
    });

    // If in edit mode, pre-populate with existing selections
    if (isEditMode && item.selectedAddons && item.selectedAddons.length > 0) {
      item.selectedAddons.forEach((selectedAddon) => {
        const groupTitle = selectedAddon.groupTitle;
        const addonName = selectedAddon.name;

        if (
          initialSelections[groupTitle] &&
          initialSelections[groupTitle][addonName] !== undefined
        ) {
          initialSelections[groupTitle][addonName] = true;
          initialQuantities[groupTitle][addonName] =
            selectedAddon.quantity || 0;
          initialQuantityInputs[groupTitle][addonName] = (
            selectedAddon.quantity || 0
          ).toString();
        }
      });
    }

    // console.log("Initial selections:", initialSelections);
    // console.log("Initial quantities:", initialQuantities);
    setSelectedAddons(initialSelections);
    setAddonQuantities(initialQuantities);
    setAddonQuantityInputs(initialQuantityInputs);
  }, [item, isEditMode]);

  // Calculate total price when quantity or selected addons change
  useEffect(() => {
    if (!item) return;

    // Get base price (use discount price if available)
    let basePrice =
      BACKEND_QUANTITY_UNIT *
      (item.isDiscount
        ? parseFloat(item.discountPrice || "0")
        : parseFloat(item.price || "0"));

    if (isNaN(basePrice)) basePrice = 0;

    // Calculate addon costs
    // Addon total = sum of (addonPrice × addonQuantity) - no scaling multipliers
    let addonCost = 0;
    Object.entries(addonGroups).forEach(([groupTitle, group]) => {
      group.items.forEach((addon) => {
        if (selectedAddons[groupTitle]?.[addon.name]) {
          const addonPrice = parseFloat(addon.price) || 0;
          if (group.selectionType === "single") {
            // For single selection: use the specific addon quantity
            const qty = addonQuantities[groupTitle]?.[addon.name] || 0;
            addonCost += addonPrice * qty;
          } else {
            // For multiple selection: use itemQuantity as the addon quantity
            addonCost += addonPrice * itemQuantity;
          }
        }
      });
    });
    setTotalPrice(basePrice * itemQuantity + addonCost);
  }, [
    item,
    itemQuantity,
    selectedAddons,
    addonQuantities,
    addonGroups,
    BACKEND_QUANTITY_UNIT,
  ]);

  // Handle quantity change for single-selection addons
  const updateAddonQuantity = (
    groupTitle: string,
    addonName: string,
    change: number
  ) => {
    setAddonQuantities((prev) => {
      const newQuantities: Record<string, Record<string, number>> = {};
      Object.keys(prev).forEach((key) => {
        newQuantities[key] = { ...prev[key] };
      });

      if (!newQuantities[groupTitle]) {
        newQuantities[groupTitle] = {};
      }

      const currentQty = newQuantities[groupTitle][addonName] || 0;
      const newQty = Math.max(0, currentQty + change);

      newQuantities[groupTitle][addonName] = newQty;

      // Update input string to match
      setAddonQuantityInputs((prevInputs) => {
        const newInputs: Record<string, Record<string, string>> = {};
        Object.keys(prevInputs).forEach((key) => {
          newInputs[key] = { ...prevInputs[key] };
        });
        if (!newInputs[groupTitle]) {
          newInputs[groupTitle] = {};
        }
        newInputs[groupTitle][addonName] = newQty.toString();
        return newInputs;
      });

      // Update selected state based on quantity
      setSelectedAddons((prevSelected) => {
        const newSelections: Record<string, Record<string, boolean>> = {};
        Object.keys(prevSelected).forEach((key) => {
          newSelections[key] = { ...prevSelected[key] };
        });
        if (!newSelections[groupTitle]) {
          newSelections[groupTitle] = {};
        }
        newSelections[groupTitle][addonName] = newQty > 0;
        return newSelections;
      });

      return newQuantities;
    });
  };

  // Set addon quantity directly (for text input or click-to-fill)
  const setAddonQuantityDirect = (
    groupTitle: string,
    addonName: string,
    newQty: number
  ) => {
    const validQty = Math.max(0, Math.floor(newQty));

    setAddonQuantities((prev) => {
      const newQuantities: Record<string, Record<string, number>> = {};
      Object.keys(prev).forEach((key) => {
        newQuantities[key] = { ...prev[key] };
      });

      if (!newQuantities[groupTitle]) {
        newQuantities[groupTitle] = {};
      }

      newQuantities[groupTitle][addonName] = validQty;

      // Update input value to match
      setAddonQuantityInputs((prevInputs) => {
        const newInputs: Record<string, Record<string, string>> = {};
        Object.keys(prevInputs).forEach((key) => {
          newInputs[key] = { ...prevInputs[key] };
        });
        if (!newInputs[groupTitle]) {
          newInputs[groupTitle] = {};
        }
        newInputs[groupTitle][addonName] = validQty.toString();
        return newInputs;
      });

      // Update selected state based on quantity
      setSelectedAddons((prevSelected) => {
        const newSelections: Record<string, Record<string, boolean>> = {};
        Object.keys(prevSelected).forEach((key) => {
          newSelections[key] = { ...prevSelected[key] };
        });
        if (!newSelections[groupTitle]) {
          newSelections[groupTitle] = {};
        }
        newSelections[groupTitle][addonName] = validQty > 0;
        return newSelections;
      });

      return newQuantities;
    });
  };

  // Handle clicking on the addon row to set it to all portions and reset others in group
  const handleAddonRowClick = (groupTitle: string, addonName: string) => {
    setAddonQuantities((prev) => {
      const newQuantities: Record<string, Record<string, number>> = {};
      Object.keys(prev).forEach((key) => {
        newQuantities[key] = { ...prev[key] };
      });

      if (!newQuantities[groupTitle]) {
        newQuantities[groupTitle] = {};
      }

      // Reset all addons in this group to 0
      Object.keys(newQuantities[groupTitle]).forEach((addon) => {
        newQuantities[groupTitle][addon] = 0;
      });

      // Set the clicked addon to itemQuantity
      newQuantities[groupTitle][addonName] = itemQuantity;

      // Update input strings
      setAddonQuantityInputs((prevInputs) => {
        const newInputs: Record<string, Record<string, string>> = {};
        Object.keys(prevInputs).forEach((key) => {
          newInputs[key] = { ...prevInputs[key] };
        });
        if (!newInputs[groupTitle]) {
          newInputs[groupTitle] = {};
        }
        // Reset all addon inputs in this group to "0"
        Object.keys(newInputs[groupTitle]).forEach((addon) => {
          newInputs[groupTitle][addon] = "0";
        });
        // Set the clicked addon input to itemQuantity
        newInputs[groupTitle][addonName] = itemQuantity.toString();
        return newInputs;
      });

      // Update selected state
      setSelectedAddons((prevSelected) => {
        const newSelections: Record<string, Record<string, boolean>> = {};
        Object.keys(prevSelected).forEach((key) => {
          newSelections[key] = { ...prevSelected[key] };
        });
        if (!newSelections[groupTitle]) {
          newSelections[groupTitle] = {};
        }
        // Reset all selections in this group
        Object.keys(newSelections[groupTitle]).forEach((addon) => {
          newSelections[groupTitle][addon] = false;
        });
        // Only the clicked addon is selected
        newSelections[groupTitle][addonName] = true;
        return newSelections;
      });

      return newQuantities;
    });
  };

  const toggleAddon = (groupTitle: string, addonName: string) => {
    const group = addonGroups[groupTitle];

    // For single-selection groups, we don't toggle - we use quantity controls
    if (group.selectionType === "single") {
      return; // Quantity controls handle this
    }

    // For multiple selection, toggle the clicked addon
    setSelectedAddons((prev) => {
      const newSelections: Record<string, Record<string, boolean>> = {};
      Object.keys(prev).forEach((key) => {
        newSelections[key] = { ...prev[key] };
      });

      if (!newSelections[groupTitle]) {
        newSelections[groupTitle] = {};
      }

      const currentValue = prev[groupTitle]?.[addonName] || false;
      newSelections[groupTitle][addonName] = !currentValue;

      return newSelections;
    });
  };

  // Helper to get total selected quantity for a single-selection group
  const getSingleSelectionTotal = (groupTitle: string) => {
    const quantities = addonQuantities[groupTitle] || {};
    return Object.values(quantities).reduce((sum, qty) => sum + qty, 0);
  };

  const validateRequiredAddons = () => {
    return Object.entries(addonGroups).every(([groupTitle, group]) => {
      if (!group.isRequired) return true;

      // Check if at least one addon is selected in required groups
      return Object.values(selectedAddons[groupTitle] || {}).some(
        (isSelected) => isSelected
      );
    });
  };

  const validateSingleSelectionTotals = () => {
    // Check that all single-selection groups have quantities that add up to itemQuantity
    const errors: string[] = [];

    Object.entries(addonGroups).forEach(([groupTitle, group]) => {
      if (group.selectionType === "single") {
        const total = getSingleSelectionTotal(groupTitle);
        const hasAnySelection = Object.values(
          selectedAddons[groupTitle] || {}
        ).some((isSelected) => isSelected);

        if (hasAnySelection && total !== itemQuantity) {
          errors.push(
            `${groupTitle}: Please select exactly ${itemQuantity} portion${
              itemQuantity > 1 ? "s" : ""
            } (currently ${total})`
          );
        }
      }
    });

    return errors;
  };

  const handleAddToCart = () => {
    if (!item) return;

    // Validate required addons
    if (!validateRequiredAddons()) {
      alert("Please select all required options before adding to cart.");
      return;
    }

    // Validate single-selection totals
    const validationErrors = validateSingleSelectionTotals();
    if (validationErrors.length > 0) {
      alert("Please adjust your selections:\n\n" + validationErrors.join("\n"));
      return;
    }

    // Collect selected addons with their quantities and prices
    const addonsForCart: {
      name: string;
      price: number;
      quantity: number;
      groupTitle: string;
      allergens?: string | string[];
      dietaryRestrictions?: string[];
    }[] = [];

    let totalAddonPrice = 0;

    Object.entries(addonGroups).forEach(([groupTitle, group]) => {
      group.items.forEach((addon) => {
        if (selectedAddons[groupTitle]?.[addon.name]) {
          const addonPrice = Number(addon.price) || 0;

          if (group.selectionType === "single") {
            // For single selection: use the specific quantity
            const qty = addonQuantities[groupTitle]?.[addon.name] || 0;
            if (qty > 0) {
              addonsForCart.push({
                name: addon.name,
                price: addonPrice,
                quantity: qty,
                groupTitle: groupTitle,
                allergens: addon.allergens,
                dietaryRestrictions: addon.dietaryRestrictions,
              });
              totalAddonPrice += addonPrice * qty;
            }
          } else {
            // For multiple selection: quantity is always equal to itemQuantity
            addonsForCart.push({
              name: addon.name,
              price: addonPrice,
              quantity: itemQuantity,
              groupTitle: groupTitle,
              allergens: addon.allergens,
              dietaryRestrictions: addon.dietaryRestrictions,
            });
            totalAddonPrice += addonPrice * itemQuantity;
          }
        }
      });
    });

    // Create item with selected addons
    const itemWithAddons = {
      ...item,
      selectedAddons: addonsForCart,
      addonPrice: totalAddonPrice,
      // Store the portion quantity for the parent to use
      portionQuantity: itemQuantity,
    };

    onAddItem?.(itemWithAddons);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Modal Content */}
      <div
        className="relative bg-base-100 rounded-xl max-w-lg w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-secondary hover:bg-primary transition-colors z-30"
          aria-label="Close modal"
        >
          ✕
        </button>

        {/* Scrollable Modal Body */}
        <div className="p-4 md:p-6 overflow-y-auto flex-1">
          {item.image && (
            <div
              className="w-full flex-shrink-0 mb-3 overflow-hidden rounded-2xl"
              style={{ maxHeight: '50vh', aspectRatio: '5/4' }}
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              <img
                src={item.image}
                alt={item.menuItemName}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <h2 className="font-bold text-lg md:text-2xl text-base-content mb-1 pr-8">
            {item.menuItemName}
          </h2>
          {item.restaurantName && (
            <p className="text-xs md:text-sm text-primary font-medium mb-3 md:mb-4">
              From {item.restaurantName}
            </p>
          )}

          <div className="space-y-3 md:space-y-4 mt-2">
            {item.description && (
              <div>
                <p className="text-base-content/70 text-xs md:text-sm leading-relaxed">
                  {item.description}
                </p>
              </div>
            )}

            {item.allergens && item.allergens.length > 0 && (
              <div className="bg-warning/5 border border-warning/20 rounded-lg p-3 md:p-4">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsAllergenExpanded(!isAllergenExpanded);
                  }}
                  className="w-full text-left hover:opacity-80 transition-opacity"
                >
                  <h3 className="font-semibold text-xs md:text-sm text-base-content flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <span className="text-warning text-sm md:text-base">⚠️</span>
                      Allergens
                    </span>
                    <span className="text-[10px] md:text-xs text-base-content/60 font-normal">
                      {isAllergenExpanded ? "▲ Hide" : "▼ Show"}
                    </span>
                  </h3>
                </button>
                {isAllergenExpanded && (
                  <>
                    <div className="flex flex-wrap gap-1.5 md:gap-2 my-2 md:my-3">
                      {item.allergens.map((allergen: string, index: number) => (
                        <span
                          key={index}
                          className="bg-warning text-warning-content px-2 md:px-3 py-1 md:py-1.5 rounded-full text-[10px] md:text-xs font-semibold shadow-sm"
                        >
                          {formatAllergen(allergen)}
                        </span>
                      ))}
                    </div>
                    <p className="text-[10px] md:text-xs text-base-content/60 italic leading-relaxed">
                      This is approximate. For full allergen information, please
                      contact the restaurant.
                    </p>
                  </>
                )}
              </div>
            )}
            {(!item.allergens || item.allergens.length === 0) && (
              <div className="bg-base-200 border border-base-300 rounded-lg p-2 md:p-3">
                <p className="text-[10px] md:text-xs text-base-content/60 italic">
                  ⚠️ Allergen information not available. Please contact the
                  restaurant directly.
                </p>
              </div>
            )}

            {/* Pricing */}
            <div className="pt-1 md:pt-2">
              <div className="flex items-center gap-2 mb-1">
                {item.isDiscount && discountPrice > 0 ? (
                  <>
                    <span className="text-xl md:text-2xl font-bold text-primary">
                      £{(discountPrice * BACKEND_QUANTITY_UNIT).toFixed(2)}
                    </span>
                    <span className="text-lg md:text-xl text-base-content/50 line-through">
                      £{(price * BACKEND_QUANTITY_UNIT).toFixed(2)}
                    </span>
                  </>
                ) : (
                  <span className="text-xl md:text-2xl font-bold text-primary">
                    £{(displayPrice * BACKEND_QUANTITY_UNIT).toFixed(2)}
                  </span>
                )}
              </div>
              <p className="text-xs md:text-sm text-base-content/60 mb-3 md:mb-4">
                Feeds up to {DISPLAY_FEEDS_PER_UNIT} people
              </p>

              {/* Quantity Selector - Hidden in viewOnly mode */}
              {!viewOnly && (
                <div className="bg-base-200 p-3 md:p-4 rounded-lg">
                  <h3 className="font-semibold text-xs md:text-sm text-base-content mb-2 md:mb-3">
                    Number of Portions
                  </h3>
                  <div className="flex items-center justify-between gap-3">
                    <button
                      onClick={() => {
                        const newQty = Math.max(1, itemQuantity - 1);
                        setItemQuantity(newQty);
                        setItemQuantityInput(newQty.toString());
                        if (
                          quantity > 0 &&
                          (!item.addons || item.addons.length === 0)
                        ) {
                          setHasModifiedQuantity(newQty !== initialModalQuantity);
                        }
                      }}
                      className="w-8 h-8 md:w-10 md:h-10 bg-base-100 border border-base-300 rounded-lg hover:bg-base-200 flex items-center justify-center text-base md:text-lg font-medium flex-shrink-0"
                    >
                      −
                    </button>
                    <div className="flex flex-col items-center gap-1 flex-1">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={itemQuantityInput}
                        onChange={(e) => {
                          const val = e.target.value;
                          // Allow empty or numeric input only
                          if (val === "" || /^\d+$/.test(val)) {
                            setItemQuantityInput(val);
                            if (val !== "" && !isNaN(parseInt(val))) {
                              const newQty = Math.max(1, parseInt(val));
                              setItemQuantity(newQty);
                              if (
                                quantity > 0 &&
                                (!item.addons || item.addons.length === 0)
                              ) {
                                setHasModifiedQuantity(
                                  newQty !== initialModalQuantity
                                );
                              }
                            }
                          }
                        }}
                        onBlur={(e) => {
                          if (
                            e.target.value === "" ||
                            parseInt(e.target.value) < 1
                          ) {
                            setItemQuantity(1);
                            setItemQuantityInput("1");
                            if (
                              quantity > 0 &&
                              (!item.addons || item.addons.length === 0)
                            ) {
                              setHasModifiedQuantity(1 !== initialModalQuantity);
                            }
                          }
                        }}
                        className="w-16 md:w-20 text-center font-bold text-base md:text-lg text-base-content bg-base-100 border border-base-300 rounded px-2 py-1"
                      />
                      {/* <p className="text-xs text-base-content/60">
                        Feeds {itemQuantity * DISPLAY_FEEDS_PER_UNIT} people
                      </p> */}
                    </div>
                    <button
                      onClick={() => {
                        const newQty = itemQuantity + 1;
                        setItemQuantity(newQty);
                        setItemQuantityInput(newQty.toString());
                        if (
                          quantity > 0 &&
                          (!item.addons || item.addons.length === 0)
                        ) {
                          setHasModifiedQuantity(newQty !== initialModalQuantity);
                        }
                      }}
                      className="w-8 h-8 md:w-10 md:h-10 bg-base-100 border border-base-300 rounded-lg hover:bg-base-200 flex items-center justify-center text-base md:text-lg font-medium flex-shrink-0"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Addons section */}
            {Object.keys(addonGroups).length > 0 && (
              <div className="pt-4">
                <h3 className="font-semibold text-base text-base-content mb-3">
                  {viewOnly ? "Available Add-ons" : "Customize Your Order"}
                </h3>
                {Object.entries(addonGroups).map(([groupTitle, group]) => (
                  <div key={groupTitle} className="mb-4">
                    <div className="mb-2">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-0.5 md:gap-2">
                        <h4 className="font-medium text-xs md:text-sm text-base-content">
                          {groupTitle}
                          {!viewOnly && group.isRequired && (
                            <span className="text-error ml-1">*</span>
                          )}
                        </h4>
                        {!viewOnly && (
                          <span className="text-[10px] md:text-xs text-base-content/60 italic">
                            {group.selectionType === "single"
                              ? `Select portions (total: ${getSingleSelectionTotal(
                                  groupTitle
                                )}/${itemQuantity})`
                              : "Choose multiple (applies to all portions)"}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      {group.items.map((addon, index) => {
                        const addonQty =
                          addonQuantities[groupTitle]?.[addon.name] || 0;
                        const addonQtyInput =
                          addonQuantityInputs[groupTitle]?.[addon.name] || "0";

                        // View-only mode: Simple list display
                        if (viewOnly) {
                          return (
                            <div
                              key={index}
                              className="w-full flex items-center justify-between p-3 rounded-lg border border-base-300 bg-base-100"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-base-content">
                                  {addon.name}
                                </span>
                                {addon.dietaryRestrictions && addon.dietaryRestrictions.length > 0 && (
                                  <div className="flex items-center gap-0.5">
                                    {addon.dietaryRestrictions.map((restriction) => {
                                      const iconInfo = DIETARY_ICON_MAP[restriction];
                                      if (!iconInfo) return null;
                                      return (
                                        <div
                                          key={restriction}
                                          className="relative w-4 h-4"
                                          title={iconInfo.label}
                                        >
                                          <Image
                                            src={`/dietary-icons/unfilled/${iconInfo.file}`}
                                            alt={iconInfo.label}
                                            fill
                                            className="object-contain"
                                          />
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                              {parseFloat(addon.price) > 0 && (
                                <span className="text-sm font-medium text-primary">
                                  +£{parseFloat(addon.price).toFixed(2)}
                                </span>
                              )}
                            </div>
                          );
                        }

                        return group.selectionType === "single" ? (
                          // Single selection: Show quantity controls
                          <div
                            key={index}
                            className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer ${
                              addonQty > 0
                                ? "border-primary bg-primary/5"
                                : "border-base-300 bg-base-100 hover:border-primary/30"
                            }`}
                            onClick={() =>
                              handleAddonRowClick(groupTitle, addon.name)
                            }
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-base-content">
                                  {addon.name}
                                </span>
                                {addon.dietaryRestrictions && addon.dietaryRestrictions.length > 0 && (
                                  <div className="flex items-center gap-0.5">
                                    {addon.dietaryRestrictions.map((restriction) => {
                                      const iconInfo = DIETARY_ICON_MAP[restriction];
                                      if (!iconInfo) return null;
                                      return (
                                        <div
                                          key={restriction}
                                          className="relative w-4 h-4"
                                          title={iconInfo.label}
                                        >
                                          <Image
                                            src={`/dietary-icons/unfilled/${iconInfo.file}`}
                                            alt={iconInfo.label}
                                            fill
                                            className="object-contain"
                                          />
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                              {parseFloat(addon.price) > 0 && (
                                <span className="text-xs font-medium text-primary">
                                  +£{parseFloat(addon.price).toFixed(2)}
                                </span>
                              )}
                            </div>
                            <div
                              className="flex items-center gap-2"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={() =>
                                  updateAddonQuantity(
                                    groupTitle,
                                    addon.name,
                                    -1
                                  )
                                }
                                disabled={addonQty === 0}
                                className="w-7 h-7 bg-base-100 border border-base-300 rounded hover:bg-base-200 flex items-center justify-center text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-base-100"
                              >
                                −
                              </button>
                              <input
                                type="text"
                                inputMode="numeric"
                                value={addonQtyInput}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  // Allow empty or numeric input only
                                  if (val === "" || /^\d+$/.test(val)) {
                                    // Update input string
                                    setAddonQuantityInputs((prev) => {
                                      const newInputs: Record<
                                        string,
                                        Record<string, string>
                                      > = {};
                                      Object.keys(prev).forEach((key) => {
                                        newInputs[key] = { ...prev[key] };
                                      });
                                      if (!newInputs[groupTitle]) {
                                        newInputs[groupTitle] = {};
                                      }
                                      newInputs[groupTitle][addon.name] = val;
                                      return newInputs;
                                    });

                                    // Update actual quantity with validation
                                    if (val !== "" && !isNaN(parseInt(val))) {
                                      const currentTotal =
                                        getSingleSelectionTotal(groupTitle);
                                      const requestedQty = parseInt(val);
                                      const otherAddonsTotal =
                                        currentTotal - addonQty;
                                      const maxAllowed =
                                        itemQuantity - otherAddonsTotal;
                                      const finalQty = Math.min(
                                        requestedQty,
                                        Math.max(0, maxAllowed)
                                      );

                                      setAddonQuantityDirect(
                                        groupTitle,
                                        addon.name,
                                        finalQty
                                      );
                                    }
                                  }
                                }}
                                onBlur={(e) => {
                                  if (
                                    e.target.value === "" ||
                                    parseInt(e.target.value) < 0
                                  ) {
                                    setAddonQuantityDirect(
                                      groupTitle,
                                      addon.name,
                                      0
                                    );
                                  }
                                }}
                                className="w-12 text-center text-sm font-medium text-base-content bg-base-100 border border-base-300 rounded px-1 py-0.5"
                                onClick={(e) => e.stopPropagation()}
                              />
                              <button
                                onClick={() =>
                                  updateAddonQuantity(groupTitle, addon.name, 1)
                                }
                                disabled={
                                  getSingleSelectionTotal(groupTitle) >=
                                  itemQuantity
                                }
                                className="w-7 h-7 bg-base-100 border border-base-300 rounded hover:bg-base-200 flex items-center justify-center text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-base-100"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        ) : (
                          // Multiple selection: Show checkbox
                          <button
                            key={index}
                            onClick={() => toggleAddon(groupTitle, addon.name)}
                            className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${
                              selectedAddons[groupTitle]?.[addon.name]
                                ? "border-primary bg-primary/5"
                                : "border-base-300 bg-base-100 hover:border-primary/50"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                                  selectedAddons[groupTitle]?.[addon.name]
                                    ? "border-primary bg-primary"
                                    : "border-base-300"
                                }`}
                              >
                                {selectedAddons[groupTitle]?.[addon.name] && (
                                  <svg
                                    className="w-3 h-3 text-white"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={3}
                                      d="M5 13l4 4L19 7"
                                    />
                                  </svg>
                                )}
                              </div>
                              <span className="text-sm text-base-content">
                                {addon.name}
                              </span>
                              {addon.dietaryRestrictions && addon.dietaryRestrictions.length > 0 && (
                                <div className="flex items-center gap-0.5">
                                  {addon.dietaryRestrictions.map((restriction) => {
                                    const iconInfo = DIETARY_ICON_MAP[restriction];
                                    if (!iconInfo) return null;
                                    return (
                                      <div
                                        key={restriction}
                                        className="relative w-4 h-4"
                                        title={iconInfo.label}
                                      >
                                        <Image
                                          src={`/dietary-icons/unfilled/${iconInfo.file}`}
                                          alt={iconInfo.label}
                                          fill
                                          className="object-contain"
                                        />
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                            {parseFloat(addon.price) > 0 && (
                              <span className="text-sm font-medium text-primary">
                                +£{(parseFloat(addon.price) * itemQuantity).toFixed(2)}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {/* Total - Hidden in viewOnly mode */}
            {!viewOnly && (
              <div className="pt-2 border-t border-base-300">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-base-content/70">
                    Total {itemQuantity > 1 ? `(${itemQuantity} portions)` : ""}:
                  </span>
                  <span className="text-lg font-bold text-primary">
                    £{totalPrice.toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sticky Action Buttons */}
        {viewOnly ? (
          onAddToOrder && (
            <div className="sticky bottom-0 p-4 pt-3 md:p-6 md:pt-4 bg-base-100 border-t border-base-300 rounded-b-xl">
              <button
                onClick={() => onAddToOrder(item)}
                className="w-full bg-primary hover:opacity-90 text-white py-2 md:py-3 rounded-lg font-medium transition-all text-sm md:text-base"
              >
                Add to Order
              </button>
            </div>
          )
        ) : (
          <div className="sticky bottom-0 p-4 pt-3 md:p-6 md:pt-4 bg-base-100 border-t border-base-300 rounded-b-xl">
            {isEditMode ? (
              <div className="space-y-1.5 md:space-y-2">
                <button
                  onClick={handleAddToCart}
                  className="w-full bg-primary hover:opacity-90 text-white py-2 md:py-3 rounded-lg font-medium transition-all text-sm md:text-base"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => {
                    if (onRemoveItem && editingIndex !== null) {
                      onRemoveItem(editingIndex);
                      onClose();
                    }
                  }}
                  className="w-full bg-error hover:opacity-90 text-white py-2 md:py-3 rounded-lg font-medium transition-all text-sm md:text-base"
                >
                  Remove from Order
                </button>
              </div>
            ) : quantity > 0 && (!item.addons || item.addons.length === 0) ? (
              <div className="space-y-1.5 md:space-y-2">
                {hasModifiedQuantity && (
                  <button
                    onClick={() => {
                      const newBackendQty = itemQuantity * BACKEND_QUANTITY_UNIT;
                      onUpdateQuantity?.(item.id, newBackendQty);
                      onClose();
                    }}
                    className="w-full bg-primary hover:opacity-90 text-white py-2 md:py-3 rounded-lg font-medium transition-all text-sm md:text-base"
                  >
                    Save Order
                  </button>
                )}
                <button
                  onClick={() => {
                    onUpdateQuantity?.(item.id, 0);
                    onClose();
                  }}
                  className="w-full bg-error hover:opacity-90 text-white py-2 md:py-3 rounded-lg font-medium transition-all text-sm md:text-base"
                >
                  Remove from Order
                </button>
              </div>
            ) : (
              <button
                onClick={handleAddToCart}
                className="w-full bg-primary hover:opacity-90 text-white py-2 md:py-3 rounded-lg font-medium transition-all text-sm md:text-base"
              >
                Add to Order
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
