import { useState, useEffect } from "react";
import Image from "next/image";
import { MenuItem } from "@/types/restaurant.types";
import MenuItemModal from "./MenuItemModal";

interface MenuItemCardProps {
  item: MenuItem;
  quantity?: number;
  isExpanded?: boolean;
  // isSearching: boolean;
  onToggleExpand?: () => void;
  onAddItem?: (item: MenuItem) => void;
  onUpdateQuantity?: (itemId: string, quantity: number) => void;
  onAddOrderPress?: (item: MenuItem) => void;
  viewOnly?: boolean;
  onAddToOrder?: (item: MenuItem) => void;
}

export default function MenuItemCard({
  item,
  quantity = 0,
  isExpanded = false,
  // isSearching,
  onToggleExpand = () => {},
  onAddItem,
  onUpdateQuantity,
  onAddOrderPress,
  viewOnly = false,
  onAddToOrder,
}: MenuItemCardProps) {
  // console.log("Item: ", JSON.stringify(item, null, 2));
  const price = parseFloat(item.price?.toString() || "0");
  const discountPrice = parseFloat(item.discountPrice?.toString() || "0");
  // const displayPrice =
  //   item.isDiscount && discountPrice > 0 ? discountPrice : price;
  const BACKEND_QUANTITY_UNIT = item.cateringQuantityUnit || 1;
  const DISPLAY_FEEDS_PER_UNIT = item.feedsPerUnit || 1;

  // Convert backend quantity to portions for display
  const portionQuantity = quantity > 0 ? quantity / BACKEND_QUANTITY_UNIT : 0;

  // Use simple quantity state
  const [quantityInput, setQuantityInput] = useState(
    portionQuantity.toString()
  );
  // Tooltip state for dietary icons
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  // Sync input with external quantity changes
  useEffect(() => {
    setQuantityInput(portionQuantity.toString());
  }, [portionQuantity]);

  const hasAddons = item.addons && item.addons.length > 0;

  const handleAddToOrder = () => {
    // Check if mobile (width < 768px which is md breakpoint)
    const isMobile = window.innerWidth < 768;

    if (isMobile || hasAddons) {
      // On mobile or if item has addons, open modal
      onAddOrderPress?.(item);
    } else {
      // On md and larger with no addons, directly add to cart with default quantity
      onAddItem?.({ ...item, portionQuantity: 1 });
    }
  };

  return (
    <>
      <div
        key={item.id}
        className="bg-white rounded-lg border border-gray-200 transition-shadow overflow-hidden cursor-pointer h-[120px]"
        onClick={() => {
          setActiveTooltip(null);
          onToggleExpand();
        }}
      >
        <div className="flex flex-row h-full">
          {/* Left Side - Content */}
          <div className="flex-1 px-3 py-2">
            {/* Header - Name */}
            <div className="flex flex-col h-full justify-between">
              <div>
                <div className="flex items-start justify-between mb-0.5">
                  <h3 className="font-bold text-sm text-gray-900 flex-1 line-clamp-1">
                    {item.menuItemName}
                  </h3>
                </div>

                {/* Restaurant Name */}
                {item.restaurantName && (
                  <p className="text-[10px] text-primary font-medium mb-0.5 line-clamp-1">
                    {item.restaurantName}
                  </p>
                )}

                {/* Description - 1 line */}
                {item.description && (
                  <p className="text-gray-600 text-[10px] mb-1 line-clamp-1">
                    {item.description}
                  </p>
                )}

                {/* Dietary Filters */}
                {item.dietaryFilters && item.dietaryFilters.length > 0 && (
                  <div className="flex flex-wrap gap-0.5 items-center">
                    {item.dietaryFilters.slice(0, 4).map((filter) => {
                      const iconMap: Record<string, string> = {
                        vegetarian: "vegetarian.png",
                        halal: "halal.png",
                        no_nut: "no_nut.png",
                        no_dairy: "no_dairy.png",
                        pescatarian: "pescatarian.png",
                        vegan: "vegan.png",
                      };
                      const labelMap: Record<string, string> = {
                        vegetarian: "Vegetarian",
                        halal: "Halal",
                        no_nut: "No Nuts",
                        no_dairy: "No Dairy",
                        pescatarian: "Pescatarian",
                        vegan: "Vegan",
                      };
                      const iconFile = iconMap[filter.toLowerCase()];
                      const label = labelMap[filter.toLowerCase()] || filter;
                      const tooltipKey = `${item.id}-${filter}`;
                      const isTooltipActive = activeTooltip === tooltipKey;

                      if (!iconFile) return null;

                      return (
                        <div
                          key={filter}
                          className="relative w-4 h-4 group cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveTooltip(isTooltipActive ? null : tooltipKey);
                          }}
                        >
                          <Image
                            src={`/dietary-icons/unfilled/${iconFile}`}
                            alt={label}
                            fill
                            className="object-contain"
                          />
                          {/* Tooltip */}
                          <div
                            className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-1.5 py-0.5 bg-gray-900 text-white text-[9px] rounded whitespace-nowrap transition-opacity z-10 ${
                              isTooltipActive
                                ? "opacity-100"
                                : "opacity-0 group-hover:opacity-100 pointer-events-none"
                            }`}
                          >
                            {label}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-[3px] border-transparent border-t-gray-900"></div>
                          </div>
                        </div>
                      );
                    })}
                    {item.dietaryFilters.length > 4 && (
                      <span className="text-[9px] text-gray-500">
                        +{item.dietaryFilters.length - 4}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Show restaurant name in search results */}
              {/* {isSearching && item.restaurant && (
              <p className="text-xs md:text-sm text-gray-500 mb-2">
                From: {item.restaurant.name}
              </p>
            )} */}

              {/* Price and Add to Order / Quantity */}
              <div className="flex items-end justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    {item.isDiscount && discountPrice > 0 ? (
                      <div className="flex flex-row items-center justify-start gap-2">
                        <p className="text-gray-500 text-[10px] line-through">
                          £{(price * BACKEND_QUANTITY_UNIT).toFixed(2)}
                        </p>
                        <p className="text-primary font-bold text-sm">
                          £{(discountPrice * BACKEND_QUANTITY_UNIT).toFixed(2)}
                        </p>
                      </div>
                    ) : (
                      <p className="text-primary font-bold text-sm">
                        £{(price * BACKEND_QUANTITY_UNIT).toFixed(2)}
                      </p>
                    )}
                    {/* Price per person */}
                    {DISPLAY_FEEDS_PER_UNIT > 1 && (
                      <span className="text-[10px] text-gray-500">
                        £{((item.isDiscount && discountPrice > 0 ? discountPrice : price) * BACKEND_QUANTITY_UNIT / DISPLAY_FEEDS_PER_UNIT).toFixed(2)}/pp
                      </span>
                    )}
                  </div>
                  {/* Feeds per unit */}
                  {DISPLAY_FEEDS_PER_UNIT > 1 && (
                    <p className="text-[9px] text-gray-600 mt-0.5">
                      Feeds up to {DISPLAY_FEEDS_PER_UNIT}
                    </p>
                  )}
                </div>

                {/* Add to order button / quantity controls - Hidden in viewOnly mode */}
                {!viewOnly && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="flex-shrink-0 flex items-center gap-2"
                  >
                    {quantity > 0 ? (
                      <>
                        {/* On md and smaller: show simple add button that opens modal */}
                        <button
                          onClick={() => onAddOrderPress?.(item)}
                          className="lg:hidden w-8 h-8 bg-primary hover:opacity-90 text-white rounded-full font-medium transition-all flex items-center justify-center"
                          aria-label="Add to Order"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-3 w-3"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M12 4v16m8-8H4"
                            />
                          </svg>
                        </button>

                        {/* On lg and larger: show quantity controls */}
                        <div className="hidden lg:flex bg-[#F5F1E8] p-1 rounded-md border border-[#F0ECE3] items-center gap-1">
                          <button
                            onClick={() => {
                              const newPortionQty = Math.max(
                                0,
                                portionQuantity - 1
                              );
                              const newBackendQty =
                                newPortionQty * BACKEND_QUANTITY_UNIT;
                              onUpdateQuantity?.(item.id, newBackendQty);
                            }}
                            className="w-6 h-6 bg-white border border-gray-300 rounded hover:bg-gray-100 flex items-center justify-center text-xs flex-shrink-0"
                          >
                            −
                          </button>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={quantityInput}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === "" || /^\d+$/.test(val)) {
                                setQuantityInput(val);
                                if (val !== "" && !isNaN(parseInt(val))) {
                                  const newPortionQty = parseInt(val);
                                  const newBackendQty =
                                    Math.max(0, newPortionQty) *
                                    BACKEND_QUANTITY_UNIT;
                                  onUpdateQuantity?.(item.id, newBackendQty);
                                }
                              }
                            }}
                            onBlur={(e) => {
                              if (
                                e.target.value === "" ||
                                parseInt(e.target.value) < 1
                              ) {
                                onUpdateQuantity?.(item.id, 0);
                                setQuantityInput("0");
                              }
                            }}
                            className="w-8 text-center font-medium text-xs text-gray-900 bg-white border border-gray-300 rounded px-0.5 py-0.5 flex-shrink-0"
                          />

                          <button
                            onClick={() => {
                              const newPortionQty = portionQuantity + 1;
                              const newBackendQty =
                                newPortionQty * BACKEND_QUANTITY_UNIT;
                              onUpdateQuantity?.(item.id, newBackendQty);
                            }}
                            className="w-6 h-6 bg-white border border-gray-300 rounded hover:bg-gray-100 flex items-center justify-center text-xs flex-shrink-0"
                          >
                            +
                          </button>
                        </div>
                      </>
                    ) : (
                      <button
                        onClick={handleAddToOrder}
                        className="w-7 h-7 bg-primary hover:opacity-90 text-white rounded-full font-medium transition-all flex items-center justify-center flex-shrink-0"
                        aria-label="Add to Order"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-3 w-3"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 4v16m8-8H4"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Side - Image */}
          {item.image && (
            <div className="w-[100px] h-full bg-gray-200 flex-shrink-0">
              <img
                src={item.image}
                alt={item.menuItemName}
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      <MenuItemModal
        item={item}
        isOpen={isExpanded}
        onClose={onToggleExpand}
        quantity={quantity}
        onAddItem={onAddItem}
        onUpdateQuantity={onUpdateQuantity}
        viewOnly={viewOnly}
        onAddToOrder={onAddToOrder}
      />

      {/* Image Lightbox */}
      {/* {isImageEnlarged && item.image && (
        <div
          className="fixed inset-0 bg-black/95 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setIsImageEnlarged(false)}
        >
          <button
            onClick={() => setIsImageEnlarged(false)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
            aria-label="Close"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
          <img
            src={item.image}
            alt={item.name}
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )} */}
    </>
  );
}
