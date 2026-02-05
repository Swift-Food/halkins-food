import { Restaurant } from "@/lib/components/catering/Step2MenuItems";
import { MealSessionState } from "@/types/catering.types";

export interface SectionQuantity {
  section: string;
  currentQuantity: number;
  minQuantity: number;
  isMet: boolean;
  isRequired: boolean;
}

export interface RestaurantMinOrderStatus {
  restaurantId: string;
  restaurantName: string;
  isValid: boolean;
  sections: SectionQuantity[];
}

/**
 * Calculate the quantity of items per section (groupTitle) for a given restaurant in a session
 */
function getSectionQuantities(
  session: MealSessionState,
  restaurantId: string
): Record<string, number> {
  const quantities: Record<string, number> = {};

  session.orderItems.forEach((orderItem) => {
    if (orderItem.item.restaurantId === restaurantId) {
      const section = orderItem.item.groupTitle || "Other";
      quantities[section] = (quantities[section] || 0) + orderItem.quantity;
    }
  });

  return quantities;
}

/**
 * Validate minimum order requirements for a specific restaurant in a session
 */
export function validateRestaurantMinOrders(
  session: MealSessionState,
  restaurant: Restaurant
): RestaurantMinOrderStatus {
  const restaurantId = restaurant.id;
  const restaurantName = restaurant.restaurant_name;
  const minOrderSettings = restaurant.cateringMinOrderSettings;

  // If no settings or no items from this restaurant, return valid
  const hasItemsFromRestaurant = session.orderItems.some(
    (item) => item.item.restaurantId === restaurantId
  );

  if (!minOrderSettings || !hasItemsFromRestaurant) {
    return {
      restaurantId,
      restaurantName,
      isValid: true,
      sections: [],
    };
  }

  const sectionQuantities = getSectionQuantities(session, restaurantId);
  const sections: SectionQuantity[] = [];
  let isValid = true;

  // Check required sections
  if (minOrderSettings.required) {
    minOrderSettings.required.forEach((rule) => {
      rule.applicableSections.forEach((section) => {
        const currentQuantity = sectionQuantities[section] || 0;
        const isMet = currentQuantity >= rule.minQuantity;

        sections.push({
          section,
          currentQuantity,
          minQuantity: rule.minQuantity,
          isMet,
          isRequired: true,
        });

        if (!isMet) {
          isValid = false;
        }
      });
    });
  }

  // Check optional sections (only if items from that section are present)
  if (minOrderSettings.optional) {
    minOrderSettings.optional.forEach((rule) => {
      rule.applicableSections.forEach((section) => {
        const currentQuantity = sectionQuantities[section] || 0;

        // Only validate if there are items from this section
        if (currentQuantity > 0) {
          const isMet = currentQuantity >= rule.minQuantity;

          sections.push({
            section,
            currentQuantity,
            minQuantity: rule.minQuantity,
            isMet,
            isRequired: false,
          });

          if (!isMet) {
            isValid = false;
          }
        }
      });
    });
  }

  return {
    restaurantId,
    restaurantName,
    isValid,
    sections,
  };
}

/**
 * Validate all restaurants in a session
 */
export function validateSessionMinOrders(
  session: MealSessionState,
  restaurants: Restaurant[]
): RestaurantMinOrderStatus[] {
  // Get unique restaurant IDs in the session
  const restaurantIdsInSession = new Set(
    session.orderItems.map((item) => item.item.restaurantId)
  );

  // Filter to only restaurants that have items in this session
  const relevantRestaurants = restaurants.filter((r) =>
    restaurantIdsInSession.has(r.id)
  );

  return relevantRestaurants.map((restaurant) =>
    validateRestaurantMinOrders(session, restaurant)
  );
}

/**
 * Check if a session is valid (all minimum order requirements met)
 */
export function isSessionValid(
  session: MealSessionState,
  restaurants: Restaurant[]
): boolean {
  const validations = validateSessionMinOrders(session, restaurants);
  return validations.every((v) => v.isValid);
}

/**
 * Get a user-friendly message for unmet requirements
 */
export function getMinOrderMessage(status: RestaurantMinOrderStatus): string {
  if (status.isValid) return "";

  const unmetSections = status.sections.filter((s) => !s.isMet);

  if (unmetSections.length === 0) return "";

  const messages = unmetSections.map((section) => {
    const remaining = section.minQuantity - section.currentQuantity;
    const requiredText = section.isRequired ? "Required" : "Minimum";
    return `${section.section}: ${requiredText} ${section.minQuantity}, currently ${section.currentQuantity} (need ${remaining} more)`;
  });

  return messages.join(" • ");
}
