import { useState } from "react";
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

  // Tooltip state for dietary icons
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

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

              {/* Price */}
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
