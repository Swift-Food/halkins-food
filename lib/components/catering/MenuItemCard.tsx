import { useState } from "react";
import Image from "next/image";
import { MenuItem } from "@/types/restaurant.types";
import MenuItemModal from "./MenuItemModal";

interface MenuItemCardProps {
  item: MenuItem;
  quantity?: number;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  onAddItem?: (item: MenuItem) => void;
  onUpdateQuantity?: (itemId: string, quantity: number) => void;
  onAddOrderPress?: (item: MenuItem) => void;
  viewOnly?: boolean;
  onAddToOrder?: (item: MenuItem) => void;
  showRestaurantName?: boolean;
}

export default function MenuItemCard({
  item,
  quantity = 0,
  isExpanded = false,
  onToggleExpand = () => {},
  onAddItem,
  onUpdateQuantity,
  onAddOrderPress,
  viewOnly = false,
  onAddToOrder,
  showRestaurantName = false,
}: MenuItemCardProps) {
  const price = parseFloat(item.price?.toString() || "0");
  const discountPrice = parseFloat(item.discountPrice?.toString() || "0");
  const BACKEND_QUANTITY_UNIT = item.cateringQuantityUnit || 1;
  const DISPLAY_FEEDS_PER_UNIT = item.feedsPerUnit || 1;

  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  return (
    <>
      <div
        key={item.id}
        className="bg-white rounded-lg border border-gray-200 transition-shadow overflow-hidden cursor-pointer h-[158px]"
        onClick={() => {
          setActiveTooltip(null);
          onToggleExpand();
        }}
      >
        <div className="flex flex-row h-full">
          {/* Left Side - Content */}
          <div className="flex-1 px-3 pt-2 pb-3">
            <div className="flex flex-col h-full justify-between">
              <div>
                <div className="flex items-start justify-between mb-0.5">
                  <h3 className="font-bold text-sm text-gray-900 flex-1 line-clamp-1">
                    {item.menuItemName}
                  </h3>
                  {item.minOrderQuantity && item.minOrderQuantity > 1 && (
                    <span className="text-[9px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-medium whitespace-nowrap ml-1">
                      Min {item.minOrderQuantity}
                    </span>
                  )}
                </div>

                {showRestaurantName && item.restaurantName && (
                  <p className="text-[10px] text-primary font-medium mb-0.5 line-clamp-1">
                    {item.restaurantName}
                  </p>
                )}

                {item.description && (
                  <p className="text-gray-600 text-xs mt-1.5 mb-1 leading-relaxed line-clamp-3">
                    {item.description}
                  </p>
                )}
              </div>

              {/* Price / dietary / feeds */}
              <div className="flex flex-col gap-0.5">
                {/* Row 1: price + dietary icons */}
                <div className="flex items-center gap-2">
                  {item.isDiscount && discountPrice > 0 ? (
                    <>
                      <p className="text-gray-500 text-[10px] line-through">
                        £{(price * BACKEND_QUANTITY_UNIT).toFixed(2)}
                      </p>
                      <p className="text-primary font-bold text-sm">
                        £{(discountPrice * BACKEND_QUANTITY_UNIT).toFixed(2)}
                      </p>
                    </>
                  ) : (
                    <p className="text-primary font-bold text-sm">
                      £{(price * BACKEND_QUANTITY_UNIT).toFixed(2)}
                    </p>
                  )}
                  {item.dietaryFilters && item.dietaryFilters.length > 0 && (
                    <div className="flex gap-0.5 items-center">
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
                        <span className="text-[9px] text-gray-500">+{item.dietaryFilters.length - 4}</span>
                      )}
                    </div>
                  )}
                </div>
                {/* Row 2: £/pp · Feeds up to X */}
                {DISPLAY_FEEDS_PER_UNIT > 1 && (
                  <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                    <span>£{((item.isDiscount && discountPrice > 0 ? discountPrice : price) * BACKEND_QUANTITY_UNIT / DISPLAY_FEEDS_PER_UNIT).toFixed(2)}/pp</span>
                    <span>·</span>
                    <span>Feeds up to {DISPLAY_FEEDS_PER_UNIT}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Side - Image */}
          {item.image && (
            <div className="w-[130px] h-full bg-gray-200 flex-shrink-0">
              <img
                src={item.image}
                alt={item.menuItemName}
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </div>
      </div>

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
    </>
  );
}
