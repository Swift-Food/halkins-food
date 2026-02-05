import { Restaurant } from "./Step2MenuItems";
import CateringFilterRow from "./CateringFilterRow";

interface RestaurantCatalogueProps {
  restaurants: Restaurant[];
  restaurantsLoading: boolean;
  selectedRestaurantId: string | null;
  setSelectedRestaurantId: (id: string | null) => void;
  restaurantPromotions: Record<string, any[]>;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearch: (e?: React.FormEvent) => void;
  onClearSearch: () => void;
  deliveryDate?: string;
  deliveryTime?: string;
  eventBudget?: string;
  hasActiveFilters: boolean;
  onFilterClick: () => void;
  filterModalOpen: boolean;
  hideDateTime?: boolean;
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

export default function RestaurantCatalogue({
  restaurants,
  restaurantsLoading,
  selectedRestaurantId,
  setSelectedRestaurantId,
  restaurantPromotions,
  searchQuery,
  onSearchChange,
  onSearch,
  onClearSearch,
  hasActiveFilters,
  onFilterClick,
  filterModalOpen,
  hideDateTime,
}: RestaurantCatalogueProps) {
  return (
    <div className="flex-1">
      <CateringFilterRow
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        onSearch={onSearch}
        onClearSearch={onClearSearch}
        hasActiveFilters={hasActiveFilters}
        onFilterClick={onFilterClick}
        filterModalOpen={filterModalOpen}
        hideDateTime={hideDateTime}
      />
      <h3 className="text-base md:text-lg font-semibold mb-3 text-base-content">
        {hideDateTime ? "Browse Restaurants" : "Select Restaurant"}
      </h3>
      {restaurantsLoading ? (
        <div className="text-center py-4 text-base-content/60 text-sm md:text-base">
          Loading restaurants...
        </div>
      ) : (
        <div className="flex flex-wrap sm:grid sm:grid-cols-3 gap-3 md:gap-4 pb-4">
          {restaurants.map((restaurant) => {
            const isComingSoon = restaurant.restaurantType === "coming_soon";
            return (
              <button
                key={restaurant.id}
                onClick={() => {
                  if (isComingSoon) return;
                  setSelectedRestaurantId(
                    selectedRestaurantId === restaurant.id
                      ? null
                      : restaurant.id
                  );
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                disabled={isComingSoon}
                className={`flex-shrink-0 w-full rounded-xl overflow-hidden border-2 transition-all ${
                  isComingSoon
                    ? "border-base-300 cursor-not-allowed"
                    : selectedRestaurantId === restaurant.id
                    ? "border-primary"
                    : "border-base-300 hover:border-primary/50"
                }`}
              >
                <div className="relative">
                {restaurant.images?.[0] ? (
                  <img
                    src={restaurant.images[0]}
                    alt={restaurant.restaurant_name}
                    className="w-full aspect-[16/9] object-cover"
                  />
                ) : (
                  <div className="w-full aspect-[16/9] bg-base-200 flex items-center justify-center px-4">
                    <span className="text-xl font-semibold text-base-content/30 text-center">
                      {restaurant.restaurant_name}
                    </span>
                  </div>
                )}
                  {/* COMING SOON RIBBON */}
                  {isComingSoon && (
                    <div className="absolute top-0 right-0 overflow-hidden w-36 h-36">
                      <div
                        className="absolute top-[26px] right-[-45px] w-[180px] bg-secondary text-primary text-xs font-bold py-1.5 shadow-md flex items-center justify-center"
                        style={{ transform: "rotate(45deg)" }}
                      >
                        Coming Soon
                      </div>
                    </div>
                  )}
                  {/* COMPACT PROMOTION BANNER OVERLAY */}
                  {restaurantPromotions[restaurant.id] && (
                    <div className="absolute top-2 right-2">
                      <div className="bg-green-700 text-white px-3 py-1.5 rounded-lg shadow-lg flex items-center justify-center gap-1.5 backdrop-blur-sm bg-opacity-95">
                        <span className="font-bold text-sm">
                          {
                            restaurantPromotions[restaurant.id][0]
                              .discountPercentage
                          }
                          % OFF
                        </span>
                        {restaurantPromotions[restaurant.id][0].minOrderAmount >
                          0 && (
                          <span className="text-xs">
                            (£
                            {
                              restaurantPromotions[restaurant.id][0]
                                .minOrderAmount
                            }
                            + orders)
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <div className="p-2 md:p-3 bg-base-100">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-semibold text-md md:text-sm text-base-content truncate">
                      {restaurant.restaurant_name}
                    </h4>
                    {(restaurant.contactEmail ||
                      restaurant.contactNumber ||
                      restaurant.cateringOperatingHours) && (
                      <div className="group relative flex-shrink-0">
                        <button
                          type="button"
                          className="text-base-content/60 hover:text-base-content cursor-pointer touch-manipulation active:scale-95"
                          onClick={(e) => {
                            e.stopPropagation();
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
                            className="w-5 h-5 md:w-4 md:h-4"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
                            />
                          </svg>
                        </button>
                        <div className="absolute bottom-full right-0 mb-2 hidden md:group-hover:block z-10 w-48">
                          <div className="bg-base-content text-base-100 text-xs rounded-lg p-3">
                            <p className="font-semibold mb-2">Contact Info:</p>
                            {restaurant.contactEmail && (
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
                            {restaurant.contactNumber && (
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
                            <div className="mb-2">
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
                    )}
                  </div>
                  {/* <div className="flex items-center gap-1 mt-1">
                    <span className="text-yellow-500 text-sm md:text-sm">
                      ★
                    </span>
                    <span className="text-sm md:text-sm text-base-content/70">
                      {restaurant.averageRating}
                    </span>
                  </div> */}

                  {restaurant.minCateringOrderQuantity &&
                    restaurant.minCateringOrderQuantity > 1 && (
                      <div className="mt-2 text-xs text-black bg-warning/10 px-2 py-1 rounded">
                        Min. {restaurant.minCateringOrderQuantity} items
                      </div>
                    )}

                  {restaurant.minimumDeliveryNoticeHours && (
                    <div className="mt-2 text-xs text-white bg-primary px-2 py-1 rounded-md">
                      {restaurant.minimumDeliveryNoticeHours >= 24 ? (
                        <>
                          <span className="font-bold">
                            {Math.floor(
                              restaurant.minimumDeliveryNoticeHours / 24
                            )}{" "}
                            day
                            {Math.floor(
                              restaurant.minimumDeliveryNoticeHours / 24
                            ) > 1
                              ? "s"
                              : ""}
                          </span>{" "}
                          <span className="">notice required</span>
                        </>
                      ) : (
                        <>
                          <span className="font-bold">
                            {restaurant.minimumDeliveryNoticeHours} hours
                          </span>{" "}
                          <span className="">notice required</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
