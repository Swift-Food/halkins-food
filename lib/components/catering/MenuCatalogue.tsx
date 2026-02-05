import { Restaurant, MenuItem } from "./Step2MenuItems";
import MenuItemCard from "./MenuItemCard";
import CateringFilterRow from "./CateringFilterRow";
import { useCateringFilters } from "@/context/CateringFilterContext";
import EventPhotosDisplay from "./EventPhotosDisplay";

interface MenuCatalogueProps {
  displayItems: MenuItem[];
  loading: boolean;
  isSearching: boolean;
  restaurants: Restaurant[];
  sortByRestaurant: (items: MenuItem[] | null) => MenuItem[];
  restaurantPromotions: Record<string, any[]>;
  expandedItemId: string | null;
  setExpandedItemId: (id: string | null) => void;
  getItemQuantity?: (itemId: string, item?: MenuItem) => number;
  handleAddItem?: (item: MenuItem) => void;
  updateItemQuantity?: (itemId: string, quantity: number) => void;
  handleOrderPress?: (item: MenuItem) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearch: (e?: React.FormEvent) => void;
  onClearSearch: () => void;
  deliveryDate?: string;
  deliveryTime?: string;
  eventBudget?: string;
  filterModalOpen: boolean;
  setFilterModalOpen: (open: boolean) => void;
  viewOnly?: boolean;
  hideDateTime?: boolean;
  showBackButton?: boolean;
  onBackClick?: () => void;
  onAddToOrder?: (item: MenuItem) => void;
}

const formatCateringHours = (
  cateringOperatingHours:
    | {
        day: string;
        open: string | null;
        close: string | null;
        enabled: boolean;
      }[]
    | null
): string => {
  if (!cateringOperatingHours) {
    return "Available anytime";
  }

  const enabledDays = cateringOperatingHours.filter(
    (schedule) => schedule.enabled
  );

  if (enabledDays.length === 0) {
    return "No Event Ordering hours set";
  }

  // Group consecutive days with same hours
  const grouped: { days: string[]; hours: string }[] = [];

  enabledDays.forEach((schedule) => {
    const dayName =
      schedule.day.charAt(0).toUpperCase() + schedule.day.slice(1, 3);
    const hours =
      schedule.open && schedule.close
        ? `${formatTime(schedule.open)} - ${formatTime(schedule.close)}`
        : "Closed";

    const lastGroup = grouped[grouped.length - 1];
    if (lastGroup && lastGroup.hours === hours) {
      lastGroup.days.push(dayName);
    } else {
      grouped.push({ days: [dayName], hours });
    }
  });

  return grouped
    .map((group) => {
      const dayRange =
        group.days.length > 1
          ? `${group.days[0]} - ${group.days[group.days.length - 1]}`
          : group.days[0];
      return `${dayRange}: ${group.hours}`;
    })
    .join("\n");
};

const formatTime = (time: string): string => {
  const [hours, minutes] = time.split(":").map(Number);
  const ampm = hours >= 12 ? "PM" : "AM";
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${displayHours}:${minutes.toString().padStart(2, "0")} ${ampm}`;
};

const PromotionDetailsCard = ({ promotions }: { promotions: any[] }) => {
  if (!promotions || promotions.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-lg font-bold text-gray-900">Active Offers</h3>
        <span className="bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
          {promotions.length}
        </span>
      </div>

      {/* Horizontal Scrollable Container */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
        {promotions.map((promo) => (
          <div
            key={promo.id}
            className="flex-shrink-0 snap-start bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-500 rounded-xl p-4 min-w-[280px] max-w-[350px]"
          >
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <h4 className="text-base font-bold text-green-900 mb-1 truncate">
                  {promo.name}
                </h4>
                <p className="text-green-800 font-bold text-lg mb-2">
                  {promo.discountPercentage}% OFF
                </p>
                {promo.description && (
                  <p className="text-green-700 text-xs mb-2 line-clamp-2">
                    {promo.description}
                  </p>
                )}
                <div className="flex flex-col gap-1.5 text-xs">
                  {promo.minOrderAmount > 0 && (
                    <div className="flex items-center gap-1.5">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                        className="w-3.5 h-3.5 text-green-700"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
                        />
                      </svg>
                      <span className="text-green-800 font-medium">
                        Min. £{promo.minOrderAmount}
                      </span>
                    </div>
                  )}
                  {promo.maxDiscountAmount && (
                    <div className="flex items-center gap-1.5">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                        className="w-3.5 h-3.5 text-green-700"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span className="text-green-800 font-medium">
                        Max. £{promo.maxDiscountAmount} off
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                      className="w-3.5 h-3.5 text-green-700"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
                      />
                    </svg>
                    <span className="text-green-700">
                      Until{" "}
                      {new Date(promo.endDate).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Scroll Indicator (optional) */}
      {promotions.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-3">
          {promotions.map((_, index) => (
            <div
              key={index}
              className="w-1.5 h-1.5 rounded-full bg-green-500/30"
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default function MenuCatalogue({
  displayItems,
  loading,
  isSearching,
  restaurants,
  sortByRestaurant,
  restaurantPromotions,
  expandedItemId,
  setExpandedItemId,
  getItemQuantity,
  handleAddItem,
  updateItemQuantity,
  handleOrderPress,
  searchQuery,
  onSearchChange,
  onSearch,
  onClearSearch,
  filterModalOpen,
  setFilterModalOpen,
  viewOnly = false,
  hideDateTime = false,
  showBackButton = false,
  onBackClick,
  onAddToOrder,
}: MenuCatalogueProps) {
  const { filters } = useCateringFilters();

  return (
    <div className="flex-1">
      <CateringFilterRow
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        onSearch={onSearch}
        onClearSearch={onClearSearch}
        hasActiveFilters={filters.dietaryRestrictions.length > 0 || filters.allergens.length > 0 || filters.pricePerPersonRange !== null}
        onFilterClick={() => setFilterModalOpen(!filterModalOpen)}
        filterModalOpen={filterModalOpen}
        hideDateTime={hideDateTime}
        showBackButton={showBackButton}
        onBackClick={onBackClick}
      />
      {loading ? (
        <div className="text-center py-12 text-base-content/60">
          Loading menu items...
        </div>
      ) : displayItems.length === 0 ? (
        <div className="text-center py-12 text-base-content/50 text-sm md:text-base">
          {isSearching
            ? "No menu items found matching your search."
            : "No menu items available."}
        </div>
      ) : (
        <>
          {/* Group items by restaurant */}
          {(() => {
            // Build map: restaurantId -> { restaurantName, items[] }
            const byRestaurant: Record<
              string,
              {
                restaurantId: string;
                restaurantName: string;
                items: MenuItem[];
              }
            > = {};

            const sorted = sortByRestaurant(displayItems);
            sorted.forEach((item) => {
              const rid =
                item.restaurantId ||
                item.restaurant?.id ||
                item.restaurant?.restaurantId ||
                "unknown";
              const rname =
                item.restaurant?.name ||
                restaurants.find((r) => r.id === rid)?.restaurant_name ||
                "Unknown Restaurant";

              if (!byRestaurant[rid]) {
                byRestaurant[rid] = {
                  restaurantId: rid,
                  restaurantName: rname,
                  items: [],
                };
              }
              byRestaurant[rid].items.push(item);
            });

            const restaurantList = Object.values(byRestaurant).sort((a, b) =>
              a.restaurantName.localeCompare(b.restaurantName)
            );

            return restaurantList.map((rest) => {
              // derive groups for this restaurant's items (fallback to groupTitle)
              const menuGroupSettings =
                rest.items[0]?.restaurant?.menuGroupSettings;
              const hasSettings =
                menuGroupSettings && Object.keys(menuGroupSettings).length > 0;

              let groupsForRest: string[] = [];
              if (hasSettings) {
                groupsForRest = Object.keys(menuGroupSettings!)
                  .sort((a, b) => {
                    const orderA =
                      menuGroupSettings![a]?.displayOrder ?? 999;
                    const orderB =
                      menuGroupSettings![b]?.displayOrder ?? 999;
                    return orderA - orderB;
                  });
              } else {
                groupsForRest = Array.from(
                  new Set(rest.items.map((i) => i.groupTitle || "Other"))
                ).sort((a, b) => a.localeCompare(b));
              }

              const groupItemsForRest: Record<string, MenuItem[]> = {};
              groupsForRest.forEach((g) => (groupItemsForRest[g] = []));
              rest.items.forEach((item) => {
                const group = item.groupTitle || "Other";
                if (!groupItemsForRest[group]) groupItemsForRest[group] = [];
                groupItemsForRest[group].push(item);
              });

              Object.keys(groupItemsForRest).forEach((groupName) => {
                groupItemsForRest[groupName].sort(
                  (a, b) =>
                    (a.itemDisplayOrder ?? 999) - (b.itemDisplayOrder ?? 999)
                );
              });

              return (
                <div key={rest.restaurantId} className="mb-12">
                  <div className="flex items-end justify-center gap-3 mb-6">
                    <h2 className="text-4xl font-bold text-primary">
                      {rest.restaurantName}
                    </h2>
                    {(() => {
                      const restaurant = restaurants.find(
                        (r) => r.id === rest.restaurantId
                      );
                      return (
                        (restaurant?.contactEmail ||
                          restaurant?.contactNumber ||
                          restaurant?.cateringOperatingHours) && (
                          <div className="group relative">
                            <button
                              type="button"
                              className="text-primary/60 hover:text-primary cursor-pointer touch-manipulation active:scale-95"
                              onClick={(e) => {
                                e.currentTarget.nextElementSibling?.classList.toggle(
                                  "hidden"
                                );
                              }}
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={1.5}
                                stroke="currentColor"
                                className="w-7 h-7 md:w-6 md:h-6"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
                                />
                              </svg>
                            </button>
                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 hidden md:group-hover:block z-10 w-56">
                              <div className="bg-base-content text-base-100 text-sm rounded-lg p-3">
                                <p className="font-semibold mb-2">
                                  Contact Restaurant:
                                </p>
                                {restaurant?.contactEmail && (
                                  <p className="mb-1 break-words">
                                    <span className="opacity-70">Email:</span>
                                    <br />
                                    <a
                                      href={`mailto:${restaurant.contactEmail}`}
                                      className="underline"
                                    >
                                      {restaurant.contactEmail}
                                    </a>
                                  </p>
                                )}
                                {restaurant?.contactNumber && (
                                  <p className="break-words">
                                    <span className="opacity-70">Phone:</span>
                                    <br />
                                    <a
                                      href={`tel:${restaurant.contactNumber}`}
                                      className="underline"
                                    >
                                      {restaurant.contactNumber}
                                    </a>
                                  </p>
                                )}
                                <div className="mv-2 text-xs">
                                  <p className="opacity-70 pt-2">
                                    Event Ordering Hours:
                                  </p>
                                  <div className="whitespace-pre-line text-xs mt-1">
                                    {formatCateringHours(
                                      restaurant.cateringOperatingHours ?? null
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      );
                    })()}
                  </div>
                  {/* Event Photos Gallery */}
                  {(() => {
                    const restaurant = restaurants.find(
                      (r) => r.id === rest.restaurantId
                    );
                    if (restaurant?.eventImages && restaurant.eventImages.length > 0) {
                      return (
                        <EventPhotosDisplay images={restaurant.eventImages} />
                      );
                    }
                    return null;
                  })()}
                  {restaurantPromotions[rest.restaurantId] && (
                    <PromotionDetailsCard
                      promotions={restaurantPromotions[rest.restaurantId]}
                    />
                  )}
                  {groupsForRest
                    .filter(
                      (groupName) =>
                        groupItemsForRest[groupName] &&
                        groupItemsForRest[groupName].length > 0
                    )
                    .map((groupName) => {
                      // Sort items with images and without images separately by display price
                      const getDisplayPrice = (item: MenuItem) => {
                        const price = parseFloat(item.price?.toString() || "0");
                        const discountPrice = parseFloat(
                          item.discountPrice?.toString() || "0"
                        );
                        return (
                          (item.cateringQuantityUnit ?? 7) *
                          (item.isDiscount && discountPrice > 0
                            ? discountPrice
                            : price)
                        );
                      };
                      const itemsWithImage = groupItemsForRest[groupName]
                        .filter((item) => item.image && item.image.trim() !== "")
                        .sort(
                          (a, b) => getDisplayPrice(a) - getDisplayPrice(b)
                        );
                      const itemsWithoutImage = groupItemsForRest[groupName]
                        .filter((item) => !item.image || item.image.trim() === "")
                        .sort(
                          (a, b) => getDisplayPrice(a) - getDisplayPrice(b)
                        );
                      const orderedItems = [
                        ...itemsWithImage,
                        ...itemsWithoutImage,
                      ];

                      return (
                        <div
                          key={`${rest.restaurantId}-${groupName}`}
                          className="mb-8"
                        >
                          <h3 className="ml-4 text-2xl font-bold text-primary mb-1">
                            {groupName}
                          </h3>

                          {/* Group Information (from menuGroupSettings) */}
                          {(() => {
                            const info =
                              rest.items[0]?.restaurant?.menuGroupSettings?.[
                                groupName
                              ]?.information;
                            if (!info) return null;
                            return (
                              <p className="ml-4 text-gray-600 text-base mb-4 whitespace-pre-line">
                                {info}
                              </p>
                            );
                          })()}
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                            {orderedItems.map((item) => (
                              <MenuItemCard
                                key={item.id}
                                item={item}
                                quantity={getItemQuantity?.(item.id, item) ?? 0}
                                isExpanded={expandedItemId === item.id}
                                onToggleExpand={() =>
                                  setExpandedItemId(
                                    expandedItemId === item.id ? null : item.id
                                  )
                                }
                                onAddItem={handleAddItem}
                                onUpdateQuantity={updateItemQuantity}
                                onAddOrderPress={handleOrderPress}
                                viewOnly={viewOnly}
                                onAddToOrder={onAddToOrder}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                </div>
              );
            });
          })()}
        </>
      )}
    </div>
  );
}
