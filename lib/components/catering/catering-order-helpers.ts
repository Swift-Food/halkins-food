import { MealSessionState, MenuItemDetails } from "@/types/catering.types";
import { DayGroup } from "./types";
import { MenuItem } from "@/types/restaurant.types";

// Hour options for 12-hour time picker
export const HOUR_12_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  label: `${i + 1}`,
  value: String(i + 1).padStart(2, "0"),
}));

// Minute options (15-minute intervals)
export const MINUTE_OPTIONS = [
  { label: "00", value: "00" },
  { label: "15", value: "15" },
  { label: "30", value: "30" },
  { label: "45", value: "45" },
];

/**
 * Groups meal sessions by date for timeline display
 */
export function groupSessionsByDay(
  sessions: MealSessionState[],
  getSessionTotal: (index: number) => number
): DayGroup[] {
  const groups: Map<string, DayGroup> = new Map();

  sessions.forEach((session, index) => {
    const date = session.sessionDate || "unscheduled";
    if (!groups.has(date)) {
      const dateObj =
        date !== "unscheduled" ? new Date(date + "T00:00:00") : null;
      groups.set(date, {
        date,
        displayDate:
          dateObj?.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
          }) || "No Date",
        fullDate:
          dateObj?.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
          }) || "Unscheduled",
        dayName:
          dateObj?.toLocaleDateString("en-GB", { weekday: "short" }) || "",
        sessions: [],
        total: 0,
      });
    }
    const group = groups.get(date)!;
    group.sessions.push({ session, index });
    group.total += getSessionTotal(index);
  });

  // Sort sessions within each group by eventTime
  groups.forEach((group) => {
    group.sessions.sort((a, b) => {
      if (!a.session.eventTime && !b.session.eventTime) return 0;
      if (!a.session.eventTime) return 1;
      if (!b.session.eventTime) return -1;
      return a.session.eventTime.localeCompare(b.session.eventTime);
    });
  });

  // Sort groups by date
  return Array.from(groups.values()).sort((a, b) => {
    if (a.date === "unscheduled") return 1;
    if (b.date === "unscheduled") return -1;
    return a.date.localeCompare(b.date);
  });
}

/**
 * Format time for display (e.g., "12:00 PM")
 */
export function formatTimeDisplay(eventTime: string | undefined): string {
  if (!eventTime) return "Set time";
  const [hours, minutes] = eventTime.split(":");
  const hour = parseInt(hours);
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${period}`;
}

/**
 * Get minimum date (today) for date picker
 */
export function getMinDate(): string {
  const date = new Date();
  return date.toISOString().split("T")[0];
}

/**
 * Get maximum date (3 months from now) for date picker
 */
export function getMaxDate(): string {
  const date = new Date();
  date.setMonth(date.getMonth() + 3);
  return date.toISOString().split("T")[0];
}

/**
 * Map MenuItemDetails from API to MenuItem format for components
 */
export function mapToMenuItem(item: MenuItemDetails): MenuItem {
  return {
    id: item.id,
    menuItemName: item.name,
    description: item.description,
    price: item.price?.toString() || "0",
    discountPrice: item.discountPrice?.toString(),
    allergens: item.allergens,
    isDiscount: item.isDiscount || false,
    image: item.image,
    averageRating: item.averageRating,
    restaurantId: item.restaurantId,
    restaurantName: (item as any).restaurant?.restaurant_name,
    groupTitle: item.groupTitle,
    status: item.status,
    itemDisplayOrder: item.itemDisplayOrder || 0,
    cateringQuantityUnit: (item as any).cateringQuantityUnit,
    feedsPerUnit: (item as any).feedsPerUnit,
    dietaryFilters: (item as any).dietaryFilters,
    // Include subcategory info from API response
    subcategoryId: (item as any).subcategories?.[0]?.id,
    subcategoryName: (item as any).subcategories?.[0]?.name,
    addons: (item.addons || []).map((addon) => ({
      name: addon.name,
      price: addon.price?.toString() || "0",
      allergens: addon.allergens?.join(", ") || "",
      dietaryRestrictions: (addon as any).dietaryRestrictions,
      groupTitle: addon.groupTitle || "",
      isRequired: addon.isRequired || false,
      selectionType: addon.selectionType || "single",
    })),
  };
}

/**
 * Format time with hour and minute to display string
 */
export function formatTime(hour: number, minute: number): string {
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minute.toString().padStart(2, "0")} ${period}`;
}

/**
 * Convert 24-hour time string to 12-hour components
 */
export function parseEventTime(eventTime: string): {
  hour: string;
  minute: string;
  period: "AM" | "PM";
} {
  const [hours, minutes] = eventTime.split(":");
  const hour = Number(hours);
  const hour12 = hour % 12 || 12;
  return {
    hour: String(hour12).padStart(2, "0"),
    minute: minutes,
    period: hour >= 12 ? "PM" : "AM",
  };
}

/**
 * Convert 12-hour time components to 24-hour time string
 */
export function formatTo24Hour(
  hour: string,
  minute: string,
  period: "AM" | "PM"
): string {
  let hourNum = Number(hour) % 12;
  if (period === "PM") hourNum += 12;
  if (period === "AM" && hourNum === 12) hourNum = 0;
  return `${String(hourNum).padStart(2, "0")}:${minute}`;
}
