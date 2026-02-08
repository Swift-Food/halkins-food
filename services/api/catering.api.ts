// services/catering.service.ts
import { fetchWithAuth } from "@/lib/api-client/auth-client";
import {
  SearchResponse,
  SearchFilters,
  EventDetails,
  SelectedMenuItem,
  ContactInfo,
  CateringPricingResult,
  PromoCodeValidation,
  CreateMenuItemDto,
  MenuItemDetails,
  UpdateMenuItemDto,
  MenuCategory,
  MealSessionState,
} from "@/types/catering.types";
import {
  CreateCateringOrderRequest,
  CateringRestaurantOrderRequest,
  CateringMenuItemRequest,
  MealSessionRequest,
  AddSharedAccessRequest,
  RemoveSharedAccessRequest,
  UpdatePickupContactRequest,
  UpdateDeliveryTimeRequest,
  UpdateSharedAccessRoleRequest,
  CateringOrderResponse,
  OrderPricingBreakdown,
  RestaurantPayoutsResponse,
  CateringBundleResponse,
  DeliveryTrackingDto,
} from "@/types/api";
import { CategoryWithSubcategories } from "@/types/catering.types";
import { API_BASE_URL, GOOGLE_MAPS_API_KEY } from "@/lib/constants";
import { API_ENDPOINTS } from "@/lib/constants/api";
import { create } from "domain";

class CateringService {
  async searchMenuItems(
    query: string,
    filters?: SearchFilters
  ): Promise<SearchResponse> {
    const params = new URLSearchParams();

    params.append("q", query || "");
    if (filters?.page) params.append("page", filters.page.toString());
    if (filters?.limit) params.append("limit", filters.limit.toString());
    if (filters?.marketId) params.append("marketId", filters.marketId);
    if (filters?.categoryId) params.append("categoryId", filters.categoryId);
    if (filters?.minRating)
      params.append("minRating", filters.minRating.toString());
    if (filters?.maxPrice)
      params.append("maxPrice", filters.maxPrice.toString());
    // if (filters?.dietaryFilters && filters.dietaryFilters.length > 0) {
    //   filters.dietaryFilters.forEach((filter) =>
    //     params.append("dietaryFilters", filter)
    //   );
    // }
    if (filters?.dietaryFilters)
      params.append("dietaryFilters", filters.dietaryFilters.join(","));
    if (filters?.allergens)
      params.append("excludeAllergens", filters.allergens.join(","));
    // if (filters?.allergens && filters.allergens.length > 0) {
    //   filters.allergens.forEach((allergen) =>
    //     params.append("allergens", allergen)
    //   );
    // }

    const response = await fetchWithAuth(
      `${API_BASE_URL}/search?catering=true&${params.toString()}`
    );

    if (!response.ok) {
      throw new Error("Failed to search menu items");
    }

    return response.json();
  }

  async getMenuItems() {
    const response = await fetchWithAuth(`${API_BASE_URL}/menu-item/catering`);
    if (!response.ok) {
      throw new Error("Failed to search menu items");
    }

    return response.json();
  }

  async getBundleById(bundleId: string): Promise<CateringBundleResponse> {
    const response = await fetchWithAuth(
      `${API_BASE_URL}${API_ENDPOINTS.CATERING_BUNDLE(bundleId)}`
    );

    if (!response.ok) {
      throw new Error("Failed to fetch bundle");
    }

    return response.json();
  }

  async submitCateringOrder(
    eventDetails: EventDetails,
    mealSessions: MealSessionState[],
    contactInfo: ContactInfo,
    promoCodes: string[],
    ccEmails?: string[],
    eventId?: string,
    specialInstructions?: string
  ) {
    let userId;
    try {
      userId = await this.findOrCreateConsumerAccount(contactInfo);
    } catch (error: any) {
      console.error("❌ Failed to find/create consumer account");
      console.error("Error:", error);
      throw new Error(`Failed to create user account: ${error.message}`);
    }

    // Helper function to group items by restaurant for a single session
    const groupItemsByRestaurant = (
      orderItems: SelectedMenuItem[]
    ): CateringRestaurantOrderRequest[] => {
      const groupedByRestaurant = orderItems.reduce(
        (acc, { item, quantity }) => {
          const restaurantId =
            item.restaurant?.restaurantId || item.restaurantId || "unknown";

          if (!acc[restaurantId]) {
            acc[restaurantId] = {
              restaurantId,
              items: [],
            };
          }

          acc[restaurantId].items.push({
            menuItemId: item.id,
            quantity,
            selectedAddons: item.selectedAddons,
            groupTitle: item.groupTitle,
          });

          return acc;
        },
        {} as Record<string, { restaurantId: string; items: any[] }>
      );

      return Object.values(groupedByRestaurant).map((group) => ({
        restaurantId: group.restaurantId,
        menuItems: group.items.map(
          (item) =>
            ({
              menuItemId: item.menuItemId,
              quantity: item.quantity,
              selectedAddons: item.selectedAddons,
              groupTitle: item.groupTitle,
            } as CateringMenuItemRequest)
        ),
        specialInstructions: "",
      }));
    };

    // Transform MealSessionState[] to MealSessionRequest[]
    const mealSessionRequests: MealSessionRequest[] = mealSessions
      .filter((session) => session.orderItems.length > 0) // Only include sessions with items
      .map((session, index) => {
        // Validate required fields
        const sessionLabel = session.sessionName || `Session ${index + 1}`;
        if (!session.sessionDate) {
          throw new Error(
            `Session "${sessionLabel}" is missing a date. Please go back and set a delivery date for your session.`
          );
        }
        // Validate sessionDate format (YYYY-MM-DD)
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(session.sessionDate)) {
          throw new Error(
            `Session "${sessionLabel}" has an invalid date format. Please select a valid date.`
          );
        }
        if (!session.eventTime) {
          throw new Error(
            `Session "${sessionLabel}" is missing a time. Please go back and set a delivery time for your session.`
          );
        }
        // Validate eventTime format (HH:MM)
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(session.eventTime)) {
          throw new Error(
            `Session "${sessionLabel}" has an invalid time format. Expected HH:MM format.`
          );
        }

        return {
          sessionName: session.sessionName || `Session ${index + 1}`,
          sessionOrder: index + 1,
          sessionDate: session.sessionDate,
          eventTime: session.eventTime,
          guestCount: session.guestCount,
          specialRequirements: session.specialRequirements,
          orderItems: groupItemsByRestaurant(session.orderItems),
          promoCodes: [], // Session-specific promo codes if needed
        };
      });

    // Calculate rough estimated total for display (backend will recalculate)
    const estimatedTotal = mealSessions.reduce((total, session) => {
      return (
        total +
        session.orderItems.reduce((sessionTotal, { item, quantity }) => {
          const price = parseFloat(item.price?.toString() || "0");
          const discountPrice = parseFloat(
            item.discountPrice?.toString() || "0"
          );
          const unitPrice =
            item.isDiscount && discountPrice > 0 ? discountPrice : price;

          const addonTotal = (item.selectedAddons || []).reduce(
            (sum, { price, quantity }) => sum + (price || 0) * (quantity || 0),
            0
          );

          return sessionTotal + unitPrice * quantity + addonTotal;
        }, 0)
      );
    }, 0);

    // Get the first session's date/time for top-level fields (backward compatibility)
    const firstSession = mealSessionRequests[0];
    const createDto: CreateCateringOrderRequest = {
      userId,
      organization: contactInfo.organization,
      customerName: contactInfo.fullName,
      customerEmail: contactInfo.email,
      customerPhone: contactInfo.phone,
      ccEmails: ccEmails || [],
      // Optional billing address for Stripe invoices
      billingAddress: contactInfo.billingAddress,
      // Top-level event details (from first session for backward compatibility)
      eventDate: firstSession?.sessionDate || eventDetails?.eventDate || "",
      eventTime: firstSession?.eventTime || eventDetails?.eventTime || "",
      eventId: eventId || undefined,
      guestCount: eventDetails?.guestCount || 0,
      eventType: eventDetails?.eventType || "",
      deliveryAddress: `${contactInfo.addressLine1}${
        contactInfo.addressLine2 ? ", " + contactInfo.addressLine2 : ""
      }, ${contactInfo.city}, ${contactInfo.zipcode}`,
      deliveryLocation: {
        latitude: contactInfo.latitude!,
        longitude: contactInfo.longitude!,
      },
      specialRequirements: specialInstructions || eventDetails?.specialRequests || "",
      // Use mealSessions instead of orderItems
      mealSessions: mealSessionRequests,
      estimatedTotal,
      promoCodes,
      paymentMethod: "stripe_direct",
    };

    const response = await fetchWithAuth(`${API_BASE_URL}/catering-orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(createDto),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error("Failed to submit catering order: ", response, error);

      // Check for London delivery validation error (can be in message or error field)
      const errorMessage = error.message || error.error;
      if (response.status === 400 && errorMessage?.includes("London")) {
        throw new Error(errorMessage);
      }

      throw new Error(errorMessage || "Failed to submit catering order");
    }

    return response.json();
  }

  async findOrCreateConsumerAccount(contactInfo: ContactInfo): Promise<string> {
    // Step 1: Check if user exists by email
    try {
      const checkResponse = await fetchWithAuth(
        `${API_BASE_URL}/users/email/${encodeURIComponent(contactInfo.email)}`
      );

      if (checkResponse.ok) {
        const existingUser = await checkResponse.json();
        return existingUser.id; // User exists, return their ID
      }
    } catch (error) {
      console.error(error);
      // User doesn't exist, continue to create
    }

    // Step 2: Create new user if not found
    const randomPassword = Math.random().toString(36).slice(-10) + "A1";
    const formattedPhone = contactInfo.phone.startsWith("+")
      ? contactInfo.phone
      : "+44" + contactInfo.phone.replace(/^0/, "");

    const createConsumerDto = {
      userDetails: {
        username: contactInfo.email.split("@")[0] + "_" + Date.now(),
        password: randomPassword,
        email: contactInfo.email,
        phoneNumber: formattedPhone,
        role: "customer",
      },
    };
    const response = await fetchWithAuth(`${API_BASE_URL}/consumer-user`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(createConsumerDto),
    });

    if (!response.ok) {
      throw new Error("Failed to create consumer account");
    }

    const data = await response.json();
    return data.user.id;
  }

  async createAddress(
    userId: string,
    contactInfo: ContactInfo
  ): Promise<string> {
    const createAddressDto = {
      userId,
      name: "Catering Delivery Address",
      addressLine1: contactInfo.addressLine1,
      addressLine2: contactInfo.addressLine2,
      city: contactInfo.city,
      zipcode: contactInfo.zipcode,
      location: {
        latitude: contactInfo.latitude || 0,
        longitude: contactInfo.longitude || 0,
      },
    };

    const response = await fetchWithAuth(`${API_BASE_URL}/address`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(createAddressDto),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("Failed to create address:", error);
      throw new Error("Failed to create address");
    }

    const data = await response.json();
    return data.id;
  }

  // Add to services/catering.service.ts

  async geocodeAddress(
    address: string
  ): Promise<{ latitude: number; longitude: number }> {
    const encodedAddress = encodeURIComponent(address);

    const response = await fetchWithAuth(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${GOOGLE_MAPS_API_KEY}`
    );

    if (!response.ok) {
      throw new Error("Geocoding failed");
    }

    const data = await response.json();

    if (data.status === "OK" && data.results[0]) {
      const location = data.results[0].geometry.location;
      return {
        latitude: location.lat,
        longitude: location.lng,
      };
    }

    throw new Error("No results from geocoding");
  }

  async calculateCateringPricing(
    orderItems: CateringRestaurantOrderRequest[],
    promoCodes?: string[],
    deliveryLocation?: { latitude: number; longitude: number }
  ): Promise<CateringPricingResult> {
    const pricingData = {
      orderItems,
      promoCodes,
      ...(deliveryLocation && { deliveryLocation }),
    };

    try {
      const response = await fetchWithAuth(
        `${API_BASE_URL}/pricing/catering-verify-cart`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(pricingData),
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        console.error("Pricing calculation failed - status:", response.status, "error:", JSON.stringify(error));

        // NestJS BadRequestException returns: { message: string, error: string, statusCode: number }
        const errorMessage = error.message;
        if (errorMessage?.includes("London")) {
          throw new Error(errorMessage);
        }
        throw new Error(errorMessage || "Failed to calculate pricing");
      }

      return response.json();
    } catch (error: any) {
      console.error("Pricing API error:", error);
      throw error;
    }
  }

  /**
   * Calculate pricing for multi-meal catering orders using meal sessions.
   * Each meal session has its own delivery fee calculated by the backend.
   */
  async calculateCateringPricingWithMealSessions(
    mealSessions: MealSessionState[],
    promoCodes?: string[],
    deliveryLocation?: { latitude: number; longitude: number }
  ): Promise<CateringPricingResult> {
    // Helper function to group items by restaurant for a single session
    const groupItemsByRestaurant = (
      orderItems: SelectedMenuItem[]
    ): CateringRestaurantOrderRequest[] => {
      const groupedByRestaurant = orderItems.reduce(
        (acc, { item, quantity }) => {
          const restaurantId =
            item.restaurant?.restaurantId || item.restaurantId || "unknown";

          if (!acc[restaurantId]) {
            acc[restaurantId] = {
              restaurantId,
              items: [],
            };
          }

          acc[restaurantId].items.push({
            menuItemId: item.id,
            quantity,
            selectedAddons: item.selectedAddons || [],
            groupTitle: item.groupTitle,
          });

          return acc;
        },
        {} as Record<string, { restaurantId: string; items: any[] }>
      );

      return Object.values(groupedByRestaurant).map((group) => ({
        restaurantId: group.restaurantId,
        menuItems: group.items.map(
          (item) =>
            ({
              menuItemId: item.menuItemId,
              quantity: item.quantity,
              selectedAddons: item.selectedAddons,
              groupTitle: item.groupTitle,
            } as CateringMenuItemRequest)
        ),
        specialInstructions: "",
      }));
    };

    // Transform MealSessionState[] to the format expected by backend
    const mealSessionRequests = mealSessions
      .filter((session) => session.orderItems.length > 0) // Only include sessions with items
      .map((session, index) => ({
        sessionName: session.sessionName || `Session ${index + 1}`,
        sessionDate: session.sessionDate,
        eventTime: session.eventTime,
        guestCount: session.guestCount,
        specialRequirements: session.specialRequirements,
        orderItems: groupItemsByRestaurant(session.orderItems),
      }));

    const pricingData = {
      mealSessions: mealSessionRequests,
      promoCodes,
      ...(deliveryLocation && { deliveryLocation }),
    };

    try {
      const response = await fetchWithAuth(
        `${API_BASE_URL}/pricing/catering-verify-cart`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(pricingData),
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        console.error("Pricing calculation failed - status:", response.status, "error:", JSON.stringify(error));

        // NestJS BadRequestException returns: { message: string, error: string, statusCode: number }
        const errorMessage = error.message;

        // Return error as a pricing result instead of throwing
        // This allows the component to handle it properly
        return {
          isValid: false,
          subtotal: 0,
          deliveryFee: 0,
          total: 0,
          error: errorMessage || "Failed to calculate pricing",
        } as CateringPricingResult;
      }

      return response.json();
    } catch (error: any) {
      console.error("Pricing API error:", error);
      // Return error as a pricing result instead of throwing
      return {
        isValid: false,
        subtotal: 0,
        deliveryFee: 0,
        total: 0,
        error: error.message || "Failed to calculate pricing",
      } as CateringPricingResult;
    }
  }

  async validatePromoCode(
    promoCode: string,
    orderItems: CateringRestaurantOrderRequest[]
  ): Promise<PromoCodeValidation> {
    // Use POST request with body instead of GET with query params
    try {
      const response = await fetchWithAuth(
        `${API_BASE_URL}/promotions/validate-catering`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: promoCode,
            orderItems,
          }),
        }
      );

      if (!response.ok) {
        return { valid: false, reason: "Failed to validate promo code" };
      }

      return response.json();
    } catch (err) {
      console.error("Promo validation error:", err);
      return {
        valid: false,
        reason: "Network error while validating promo code",
      };
    }
  }

  /**
   * Validate promo code using meal sessions format
   */
  async validatePromoCodeWithMealSessions(
    promoCode: string,
    mealSessions: MealSessionState[]
  ): Promise<PromoCodeValidation> {
    // Helper function to group items by restaurant for a single session
    const groupItemsByRestaurant = (
      orderItems: SelectedMenuItem[]
    ): CateringRestaurantOrderRequest[] => {
      const groupedByRestaurant = orderItems.reduce(
        (acc, { item, quantity }) => {
          const restaurantId =
            item.restaurant?.restaurantId || item.restaurantId || "unknown";

          if (!acc[restaurantId]) {
            acc[restaurantId] = {
              restaurantId,
              items: [],
            };
          }

          acc[restaurantId].items.push({
            menuItemId: item.id,
            quantity,
            selectedAddons: item.selectedAddons || [],
            groupTitle: item.groupTitle,
          });

          return acc;
        },
        {} as Record<string, { restaurantId: string; items: any[] }>
      );

      return Object.values(groupedByRestaurant).map((group) => ({
        restaurantId: group.restaurantId,
        menuItems: group.items.map(
          (item) =>
            ({
              menuItemId: item.menuItemId,
              quantity: item.quantity,
              selectedAddons: item.selectedAddons,
              groupTitle: item.groupTitle,
            } as CateringMenuItemRequest)
        ),
        specialInstructions: "",
      }));
    };

    // Flatten all order items from all sessions for validation
    const allOrderItems = mealSessions.flatMap((session) =>
      groupItemsByRestaurant(session.orderItems)
    );

    return this.validatePromoCode(promoCode, allOrderItems);
  }

  async getDeliveryTracking(mealSessionId: string): Promise<DeliveryTrackingDto> {
    console.log("what we sending", `${API_BASE_URL}/catering-driver/delivery-tracking/${mealSessionId}` )
    const response = await fetchWithAuth(
      `${API_BASE_URL}/catering-driver/track/${mealSessionId}`
    );

    if (!response.ok) {
      throw new Error("Failed to fetch delivery tracking");
    }

    return response.json();
  }

  async getOrderByToken(token: string): Promise<CateringOrderResponse> {
    const response = await fetchWithAuth(
      `${API_BASE_URL}/catering-orders/view/${token}`
    );

    if (!response.ok) {
      throw new Error("Failed to fetch order");
    }

    return response.json();
  }

  async getOrdersByUserId(userId: string): Promise<CateringOrderResponse[]> {
    const response = await fetchWithAuth(
      `${API_BASE_URL}/catering-orders/user/${userId}`
    );

    if (!response.ok) {
      throw new Error("Failed to fetch orders");
    }

    return response.json();
  }

  async addSharedAccess(
    dto: AddSharedAccessRequest
  ): Promise<CateringOrderResponse> {
    const response = await fetchWithAuth(
      `${API_BASE_URL}/catering-orders/shared-access/add`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dto),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to add shared access");
    }

    return response.json();
  }

  async updateSharedAccessRole(
    dto: UpdateSharedAccessRoleRequest
  ): Promise<CateringOrderResponse> {
    const response = await fetchWithAuth(
      `${API_BASE_URL}/catering-orders/shared-access/update-role`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dto),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to update role");
    }

    return response.json();
  }

  async removeSharedAccess(
    dto: RemoveSharedAccessRequest
  ): Promise<CateringOrderResponse> {
    const response = await fetchWithAuth(
      `${API_BASE_URL}/catering-orders/shared-access/remove`,
      {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dto),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to remove shared access");
    }

    return response.json();
  }

  async updatePickupContact(
    dto: UpdatePickupContactRequest
  ): Promise<CateringOrderResponse> {
    const response = await fetchWithAuth(
      `${API_BASE_URL}/catering-orders/pickup-contact`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dto),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to update pickup contact");
    }

    return response.json();
  }

  async updateDeliveryTime(
    dto: UpdateDeliveryTimeRequest
  ): Promise<CateringOrderResponse> {
    const response = await fetchWithAuth(
      `${API_BASE_URL}/catering-orders/delivery-time`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dto),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to update delivery time");
    }

    return response.json();
  }

  async getRestaurantMenuItems(
    restaurantId: string
  ): Promise<MenuItemDetails[]> {
    const url = `${API_BASE_URL}/menu-item/admin/restaurant/${restaurantId}`;

    const response = await fetchWithAuth(url);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("API Error:", errorText);
      throw new Error(
        `Failed to fetch menu items: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();

    // Handle both array and object responses
    if (Array.isArray(data)) {
      return data;
    } else if (
      data &&
      typeof data === "object" &&
      Array.isArray(data.menuItems)
    ) {
      return data.menuItems;
    }

    return [];
  }

  async createMenuItem(dto: CreateMenuItemDto): Promise<MenuItemDetails> {
    const response = await fetchWithAuth(`${API_BASE_URL}/menu-item`, {
      method: "POST",
      body: JSON.stringify(dto),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to create menu item");
    }

    return response.json();
  }

  async updateMenuItem(
    itemId: string,
    dto: UpdateMenuItemDto
  ): Promise<MenuItemDetails> {
    const response = await fetchWithAuth(
      `${API_BASE_URL}/menu-item/${itemId}`,
      {
        method: "PATCH",
        body: JSON.stringify(dto),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to update menu item");
    }

    return response.json();
  }

  async deleteMenuItem(itemId: string): Promise<void> {
    const response = await fetchWithAuth(
      `${API_BASE_URL}/menu-item/${itemId}`,
      {
        method: "DELETE",
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to delete menu item");
    }
  }

  async duplicateMenuItem(
    itemId: string,
    restaurantId: string
  ): Promise<MenuItemDetails> {
    // Fetch the original item
    const items = await this.getRestaurantMenuItems(restaurantId);
    const originalItem = items.find((item) => item.id === itemId);

    if (!originalItem) {
      throw new Error("Menu item not found");
    }

    // Create a duplicate with modified name
    const duplicateDto: CreateMenuItemDto = {
      restaurantId: originalItem.restaurantId,
      categoryIds: originalItem.categoryIds || [],
      groupTitle: originalItem.groupTitle,
      name: `${originalItem.name} (Copy)`,
      description: originalItem.description,
      price: originalItem.price,
      prepTime: originalItem.prepTime,
      discountPrice: originalItem.discountPrice,
      isDiscount: originalItem.isDiscount,
      image: originalItem.image,
      isAvailable: originalItem.isAvailable,
      allergens: originalItem.allergens || [],
      addons: originalItem.addons,
      itemDisplayOrder: originalItem.itemDisplayOrder,
      popular: originalItem.popular,
      style: originalItem.style,
      status: originalItem.status,
    };

    return this.createMenuItem(duplicateDto);
  }

  async getCategories(): Promise<CategoryWithSubcategories[]> {
    const response = await fetchWithAuth(`${API_BASE_URL}/categories`);

    if (!response.ok) {
      throw new Error("Failed to fetch categories");
    }

    return response.json();
  }

  async reorderGroups(
    restaurantId: string,
    groupSettings: { [groupTitle: string]: { displayOrder: number } }
  ): Promise<void> {
    const response = await fetchWithAuth(
      `${API_BASE_URL}/restaurant/menu/reorder-groups/${restaurantId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupSettings }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to reorder groups");
    }

    return response.json();
  }

  async getRestaurant(restaurantId: string): Promise<any> {
    const response = await fetchWithAuth(
      `${API_BASE_URL}/restaurant/${restaurantId}`
    );

    if (!response.ok) {
      throw new Error("Failed to fetch restaurant");
    }

    return response.json();
  }

  // PRICING API METHODS

  /**
   * Get detailed pricing breakdown for a catering order
   * Returns complete pricing calculation from the pricing engine
   */
  async getCateringOrderPricingBreakdown(
    orderId: string
  ): Promise<OrderPricingBreakdown> {
    const response = await fetchWithAuth(
      `${API_BASE_URL}/catering-orders/${orderId}/pricing-breakdown`
    );

    if (!response.ok) {
      throw new Error("Failed to fetch pricing breakdown");
    }

    return response.json();
  }

  /**
   * Get restaurant payout information for a catering order
   * Shows exactly what each restaurant will receive
   */
  async getCateringOrderRestaurantPayouts(
    orderId: string
  ): Promise<RestaurantPayoutsResponse> {
    const response = await fetchWithAuth(
      `${API_BASE_URL}/catering-orders/${orderId}/restaurant-payouts`
    );

    if (!response.ok) {
      throw new Error("Failed to fetch restaurant payouts");
    }

    return response.json();
  }



}

export const cateringService = new CateringService();
