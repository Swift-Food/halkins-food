"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import {
  EventDetails,
  SelectedMenuItem,
  ContactInfo,
  MealSessionState,
} from "@/types/catering.types";
import { Restaurant } from "@/types/restaurant.types";

// Default session for new orders
const createDefaultSession = (): MealSessionState => ({
  sessionName: "Main Event",
  sessionDate: "",
  eventTime: "",
  orderItems: [],
});

interface CateringContextType {
  currentStep: number;
  eventDetails: EventDetails | null;
  contactInfo: ContactInfo | null;
  promoCodes: string[] | null;
  selectedRestaurants: Restaurant[];
  restaurantPromotions: Record<string, any[]>;
  restaurantDiscounts: Record<string, { discount: number; promotion: any }>;

  // Meal sessions (replaces selectedItems)
  mealSessions: MealSessionState[];
  activeSessionIndex: number;

  // Session management
  addMealSession: (session: MealSessionState) => void;
  updateMealSession: (index: number, updates: Partial<MealSessionState>) => void;
  removeMealSession: (index: number) => void;
  setActiveSessionIndex: (index: number) => void;

  // Item operations (take sessionIndex)
  addMenuItem: (sessionIndex: number, item: SelectedMenuItem) => void;
  removeMenuItem: (sessionIndex: number, itemId: string) => void;
  removeMenuItemByIndex: (sessionIndex: number, itemIndex: number) => void;
  updateItemQuantity: (sessionIndex: number, itemId: string, quantity: number) => void;
  updateMenuItemByIndex: (sessionIndex: number, itemIndex: number, item: SelectedMenuItem) => void;

  // Pricing
  getSessionTotal: (sessionIndex: number) => number;
  getTotalPrice: () => number;

  // Helper
  getAllItems: () => SelectedMenuItem[];

  // Other functions
  setCurrentStep: (step: number) => void;
  setEventDetails: (details: EventDetails) => void;
  setContactInfo: (info: ContactInfo) => void;
  setPromoCodes: (codes: string[]) => void;
  setSelectedRestaurants: (restaurants: Restaurant[]) => void;
  setRestaurantPromotions: (promotions: Record<string, any[]>) => void;
  resetOrder: () => void;
  markOrderAsSubmitted: () => void;
}

const CateringContext = createContext<CateringContextType | undefined>(
  undefined
);

// LocalStorage keys
const STORAGE_KEYS = {
  CURRENT_STEP: "catering_current_step",
  EVENT_DETAILS: "catering_event_details",
  MEAL_SESSIONS: "catering_meal_sessions",
  ACTIVE_SESSION_INDEX: "catering_active_session_index",
  CONTACT_INFO: "catering_contact_info",
  PROMO_CODES: "catering_promo_codes",
  SELECTED_RESTAURANTS: "catering_selected_restaurants",
  ORDER_SUBMITTED: "catering_order_submitted",
  RESTAURANT_PROMOTIONS: "catering_restaurant_promotions",
  // Legacy key for migration
  SELECTED_ITEMS: "catering_selected_items",
};

export function CateringProvider({ children }: { children: ReactNode }) {
  const [isHydrated, setIsHydrated] = useState(false);
  const [currentStep, setCurrentStepState] = useState(1);
  const [eventDetails, setEventDetailsState] = useState<EventDetails | null>(null);
  const [contactInfo, setContactInfoState] = useState<ContactInfo | null>(null);
  const [promoCodes, setPromoCodesState] = useState<string[]>([]);
  const [selectedRestaurants, setSelectedRestaurantsState] = useState<Restaurant[]>([]);
  const [restaurantPromotions, setRestaurantPromotionsState] = useState<Record<string, any[]>>({});

  // Meal sessions state (replaces selectedItems)
  const [mealSessions, setMealSessionsState] = useState<MealSessionState[]>([]);
  const [activeSessionIndex, setActiveSessionIndexState] = useState(0);

  // Calculated values for promotions
  const [restaurantDiscounts, setRestaurantDiscounts] = useState<Record<string, { discount: number; promotion: any }>>({});

  // ============================================================================
  // PROMOTION CALCULATION HELPERS
  // ============================================================================

  const calculatePromotionDiscount = useCallback((
    restaurantId: string,
    subtotal: number,
    cartItems: Array<{ menuItemId: string; groupTitle: string; price: number; quantity: number; restaurantId: string }>
  ): { discount: number; promotion: any | null } => {
    const promos = restaurantPromotions[restaurantId];

    if (!promos || promos.length === 0) {
      return { discount: 0, promotion: null };
    }

    const isPromotionApplicable = (promo: any, subtotal: number): boolean => {
      const now = new Date();
      if (now < new Date(promo.startDate) || now > new Date(promo.endDate)) {
        return false;
      }
      if (promo.minOrderAmount && subtotal < promo.minOrderAmount) {
        return false;
      }
      return true;
    };

    const calculateDiscountByType = (
      promo: any,
      subtotal: number,
      cartItems: Array<{ menuItemId: string; groupTitle: string; price: number; quantity: number }>
    ): number => {
      let eligibleAmount = 0;

      switch (promo.promotionType) {
        case 'RESTAURANT_WIDE':
          eligibleAmount = subtotal;
          break;

        case 'CATEGORY_SPECIFIC':
          eligibleAmount = cartItems
            .filter(item => promo.applicableCategories?.includes(item.groupTitle))
            .reduce((sum, item) => sum + (item.price * item.quantity), 0);
          break;

        case 'ITEM_SPECIFIC':
          eligibleAmount = cartItems
            .filter(item => promo.applicableMenuItemIds?.includes(item.menuItemId))
            .reduce((sum, item) => sum + (item.price * item.quantity), 0);
          break;

        case 'BUY_MORE_SAVE_MORE':
          return calculateBuyMoreSaveMoreDiscount(promo, cartItems);

        case 'BOGO':
          return calculateBogoDiscount(promo, cartItems);

        default:
          eligibleAmount = 0;
      }

      let discount = eligibleAmount * (promo.discountPercentage / 100);
      if (promo.maxDiscountAmount && discount > promo.maxDiscountAmount) {
        discount = promo.maxDiscountAmount;
      }
      return discount;
    };

    const calculateBuyMoreSaveMoreDiscount = (
      promo: any,
      cartItems: Array<{ menuItemId: string; groupTitle: string; price: number; quantity: number }>
    ): number => {
      if (!promo.discountTiers || promo.discountTiers.length === 0) {
        return 0;
      }

      const applicableItems = cartItems.filter((item) => {
        if (promo.applyToAllGroups) return true;
        return item.groupTitle
          ? (promo.applicableCategories?.includes(item.groupTitle) ?? false)
          : false;
      });

      const totalQuantity = applicableItems.reduce((sum, item) => sum + item.quantity, 0);

      const sortedTiers = [...promo.discountTiers].sort((a, b) => b.minQuantity - a.minQuantity);
      const applicableTier = sortedTiers.find((tier) => totalQuantity >= tier.minQuantity);

      if (!applicableTier) return 0;

      const eligibleAmount = applicableItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      let discount = eligibleAmount * (applicableTier.discountPercentage / 100);

      if (promo.maxDiscountAmount && discount > promo.maxDiscountAmount) {
        discount = promo.maxDiscountAmount;
      }
      return discount;
    };

    const calculateBogoDiscount = (
      promo: any,
      cartItems: Array<{ menuItemId: string; groupTitle: string; price: number; quantity: number }>
    ): number => {
      if (!promo.bogoItemIds || promo.bogoItemIds.length === 0) return 0;

      let totalDiscount = 0;
      const applicableItems = cartItems.filter((item) => promo.bogoItemIds.includes(item.menuItemId));

      applicableItems.forEach((item) => {
        const buyQty = promo.buyQuantity || 1;
        const getQty = promo.getQuantity || 1;
        const setSize = buyQty + getQty;
        const completeSets = Math.floor(item.quantity / setSize);
        const freeItemsCount = completeSets * getQty;
        totalDiscount += freeItemsCount * item.price;
      });

      if (promo.maxDiscountAmount && totalDiscount > promo.maxDiscountAmount) {
        totalDiscount = promo.maxDiscountAmount;
      }
      return totalDiscount;
    };

    const applicablePromos = promos
      .filter(promo => isPromotionApplicable(promo, subtotal))
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));

    if (applicablePromos.length === 0) {
      return { discount: 0, promotion: null };
    }

    let totalDiscount = 0;
    const primaryPromotion = applicablePromos[0];

    applicablePromos.forEach(promo => {
      totalDiscount += calculateDiscountByType(promo, subtotal, cartItems);
    });

    return {
      discount: Number(Number(totalDiscount).toFixed(2)),
      promotion: primaryPromotion
    };
  }, [restaurantPromotions]);

  // ============================================================================
  // PRICING FUNCTIONS
  // ============================================================================

  const getSessionTotal = useCallback((sessionIndex: number): number => {
    const session = mealSessions[sessionIndex];
    if (!session) return 0;

    return session.orderItems.reduce((total, { item, quantity }) => {
      const price = parseFloat(item.price?.toString() || "0");
      const discountPrice = parseFloat(item.discountPrice?.toString() || "0");
      const unitPrice = item.isDiscount && discountPrice > 0 ? discountPrice : price;
      const itemPrice = unitPrice * quantity;

      const addonTotal = (item.selectedAddons || []).reduce(
        (sum, { price, quantity }) => sum + (price || 0) * (quantity || 0),
        0
      );

      return total + itemPrice + addonTotal;
    }, 0);
  }, [mealSessions]);

  const getTotalPrice = useCallback((): number => {
    return mealSessions.reduce((sum, _, index) => sum + getSessionTotal(index), 0);
  }, [mealSessions, getSessionTotal]);

  const getAllItems = useCallback((): SelectedMenuItem[] => {
    return mealSessions.flatMap(session => session.orderItems);
  }, [mealSessions]);

  // ============================================================================
  // CALCULATE DISCOUNTS WHEN ITEMS OR PROMOTIONS CHANGE
  // ============================================================================

  useEffect(() => {
    const allItems = getAllItems();
    const restaurantSubtotals: Record<string, number> = {};
    const newRestaurantDiscounts: Record<string, { discount: number; promotion: any }> = {};

    // Calculate subtotal per restaurant
    allItems.forEach(({ item, quantity }) => {
      const restaurantId = item.restaurantId;
      const price = parseFloat(item.price?.toString() || "0");
      const discountPrice = parseFloat(item.discountPrice?.toString() || "0");
      const itemPrice = item.isDiscount && discountPrice > 0 ? discountPrice : price;

      const addonTotal = (item.selectedAddons || []).reduce(
        (total, { price, quantity }) => total + (price || 0) * (quantity || 0),
        0
      );

      const itemSubtotal = (itemPrice * quantity) + addonTotal;

      if (!restaurantSubtotals[restaurantId]) {
        restaurantSubtotals[restaurantId] = 0;
      }
      restaurantSubtotals[restaurantId] += itemSubtotal;
    });

    // Build cart items for discount calculation
    const cartItems = allItems.map(selected => {
      const price = parseFloat(selected.item.price?.toString() || "0");
      const discountPrice = parseFloat(selected.item.discountPrice?.toString() || "0");
      const itemPrice = selected.item.isDiscount && discountPrice > 0 ? discountPrice : price;

      return {
        menuItemId: selected.item.id,
        groupTitle: selected.item.groupTitle || '',
        price: itemPrice,
        quantity: selected.quantity,
        restaurantId: selected.item.restaurantId
      };
    });

    // Calculate discount per restaurant
    Object.keys(restaurantSubtotals).forEach(restaurantId => {
      const subtotal = restaurantSubtotals[restaurantId];
      const { discount, promotion } = calculatePromotionDiscount(restaurantId, subtotal, cartItems);
      newRestaurantDiscounts[restaurantId] = { discount, promotion };
    });

    setRestaurantDiscounts(newRestaurantDiscounts);
  }, [mealSessions, restaurantPromotions, getAllItems, calculatePromotionDiscount]);

  // ============================================================================
  // LOAD FROM LOCALSTORAGE ON MOUNT
  // ============================================================================

  useEffect(() => {
    try {
      const orderSubmitted = localStorage.getItem(STORAGE_KEYS.ORDER_SUBMITTED);

      if (orderSubmitted === "true") {
        // Clear all storage
        Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
        setIsHydrated(true);
        return;
      }

      const savedStep = localStorage.getItem(STORAGE_KEYS.CURRENT_STEP);
      const savedEventDetails = localStorage.getItem(STORAGE_KEYS.EVENT_DETAILS);
      const savedMealSessions = localStorage.getItem(STORAGE_KEYS.MEAL_SESSIONS);
      const savedActiveSessionIndex = localStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION_INDEX);
      const savedContactInfo = localStorage.getItem(STORAGE_KEYS.CONTACT_INFO);
      const savedPromoCodes = localStorage.getItem(STORAGE_KEYS.PROMO_CODES);
      const savedRestaurants = localStorage.getItem(STORAGE_KEYS.SELECTED_RESTAURANTS);
      const savedPromotions = localStorage.getItem(STORAGE_KEYS.RESTAURANT_PROMOTIONS);

      // Legacy migration: if old SELECTED_ITEMS exists, migrate to mealSessions
      const legacySelectedItems = localStorage.getItem(STORAGE_KEYS.SELECTED_ITEMS);

      if (savedStep) setCurrentStepState(JSON.parse(savedStep));
      if (savedEventDetails) setEventDetailsState(JSON.parse(savedEventDetails));
      if (savedContactInfo) setContactInfoState(JSON.parse(savedContactInfo));
      if (savedPromoCodes) setPromoCodesState(JSON.parse(savedPromoCodes));
      if (savedRestaurants) setSelectedRestaurantsState(JSON.parse(savedRestaurants));
      if (savedPromotions) setRestaurantPromotionsState(JSON.parse(savedPromotions));

      if (savedMealSessions) {
        // New format - filter out empty sessions without dates (cleanup old default sessions)
        const sessions = JSON.parse(savedMealSessions) as MealSessionState[];
        const validSessions = sessions.filter(
          (s) => s.orderItems.length > 0 || s.sessionDate
        );
        // If no valid sessions remain, create a default one
        if (validSessions.length === 0) {
          setMealSessionsState([createDefaultSession()]);
        } else {
          setMealSessionsState(validSessions);
          if (savedActiveSessionIndex) {
            const activeIndex = JSON.parse(savedActiveSessionIndex);
            // Ensure active index is within bounds
            setActiveSessionIndexState(Math.min(activeIndex, Math.max(0, validSessions.length - 1)));
          }
        }
      } else if (legacySelectedItems) {
        // Migrate legacy format: put all items in first session
        const items = JSON.parse(legacySelectedItems) as SelectedMenuItem[];
        const migratedSession: MealSessionState = {
          ...createDefaultSession(),
          orderItems: items,
        };
        setMealSessionsState([migratedSession]);
        // Remove legacy key
        localStorage.removeItem(STORAGE_KEYS.SELECTED_ITEMS);
      } else {
        // No saved sessions at all - create a default one
        setMealSessionsState([createDefaultSession()]);
      }
    } catch (error) {
      console.error("Error loading catering data from localStorage:", error);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  // ============================================================================
  // HELPER TO SAVE MEAL SESSIONS
  // ============================================================================

  const saveMealSessions = (sessions: MealSessionState[]) => {
    localStorage.setItem(STORAGE_KEYS.MEAL_SESSIONS, JSON.stringify(sessions));
  };

  // ============================================================================
  // SESSION MANAGEMENT FUNCTIONS
  // ============================================================================

  const addMealSession = (session: MealSessionState) => {
    setMealSessionsState((prev) => {
      const updated = [...prev, session];
      saveMealSessions(updated);
      return updated;
    });
  };

  const updateMealSession = (index: number, updates: Partial<MealSessionState>) => {
    setMealSessionsState((prev) => {
      if (index < 0 || index >= prev.length) return prev;
      const updated = [...prev];
      updated[index] = { ...updated[index], ...updates };
      saveMealSessions(updated);
      return updated;
    });
  };

  const removeMealSession = (index: number) => {
    setMealSessionsState((prev) => {
      if (prev.length <= 1) {
        // Always keep at least one session
        const reset = [createDefaultSession()];
        saveMealSessions(reset);
        return reset;
      }
      const updated = prev.filter((_, i) => i !== index);
      saveMealSessions(updated);

      // Adjust activeSessionIndex if needed
      if (activeSessionIndex >= updated.length) {
        setActiveSessionIndexState(updated.length - 1);
        localStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION_INDEX, JSON.stringify(updated.length - 1));
      }

      return updated;
    });
  };

  const setActiveSessionIndex = (index: number) => {
    setActiveSessionIndexState(index);
    localStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION_INDEX, JSON.stringify(index));
  };

  // ============================================================================
  // ITEM OPERATIONS (now take sessionIndex)
  // ============================================================================

  const addMenuItem = (sessionIndex: number, newItem: SelectedMenuItem) => {
    const validQuantity = Math.max(newItem.quantity, 1);

    setMealSessionsState((prev) => {
      if (sessionIndex < 0 || sessionIndex >= prev.length) return prev;

      const session = prev[sessionIndex];
      const existingIndex = session.orderItems.findIndex((i) => {
        if (i.item.id !== newItem.item.id) return false;

        const existingAddons = i.item.selectedAddons || [];
        const newAddons = newItem.item.selectedAddons || [];

        if (existingAddons.length !== newAddons.length) return false;

        return existingAddons.every((existingAddon) =>
          newAddons.some(
            (newAddon) =>
              newAddon.name === existingAddon.name &&
              newAddon.groupTitle === existingAddon.groupTitle &&
              newAddon.quantity === existingAddon.quantity
          )
        );
      });

      let updatedItems: SelectedMenuItem[];
      if (existingIndex >= 0) {
        updatedItems = [...session.orderItems];
        updatedItems[existingIndex] = {
          ...updatedItems[existingIndex],
          quantity: updatedItems[existingIndex].quantity + validQuantity,
        };
      } else {
        updatedItems = [...session.orderItems, { ...newItem, quantity: validQuantity }];
      }

      const updated = [...prev];
      updated[sessionIndex] = { ...session, orderItems: updatedItems };
      saveMealSessions(updated);
      return updated;
    });
  };

  const removeMenuItemByIndex = (sessionIndex: number, itemIndex: number) => {
    setMealSessionsState((prev) => {
      if (sessionIndex < 0 || sessionIndex >= prev.length) return prev;

      const session = prev[sessionIndex];
      const updatedItems = [...session.orderItems];
      updatedItems.splice(itemIndex, 1);

      const updated = [...prev];
      updated[sessionIndex] = { ...session, orderItems: updatedItems };
      saveMealSessions(updated);
      return updated;
    });
  };

  const removeMenuItem = (sessionIndex: number, itemId: string) => {
    setMealSessionsState((prev) => {
      if (sessionIndex < 0 || sessionIndex >= prev.length) return prev;

      const session = prev[sessionIndex];
      const updatedItems = session.orderItems.filter((i) => i.item.id !== itemId);

      const updated = [...prev];
      updated[sessionIndex] = { ...session, orderItems: updatedItems };
      saveMealSessions(updated);
      return updated;
    });
  };

  const updateItemQuantity = (sessionIndex: number, itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeMenuItem(sessionIndex, itemId);
      return;
    }

    setMealSessionsState((prev) => {
      if (sessionIndex < 0 || sessionIndex >= prev.length) return prev;

      const session = prev[sessionIndex];
      const updatedItems = session.orderItems.map((i) =>
        i.item.id === itemId ? { ...i, quantity } : i
      );

      const updated = [...prev];
      updated[sessionIndex] = { ...session, orderItems: updatedItems };
      saveMealSessions(updated);
      return updated;
    });
  };

  const updateMenuItemByIndex = (sessionIndex: number, itemIndex: number, item: SelectedMenuItem) => {
    setMealSessionsState((prev) => {
      if (sessionIndex < 0 || sessionIndex >= prev.length) return prev;

      const session = prev[sessionIndex];
      const updatedItems = [...session.orderItems];
      updatedItems[itemIndex] = item;

      const updated = [...prev];
      updated[sessionIndex] = { ...session, orderItems: updatedItems };
      saveMealSessions(updated);
      return updated;
    });
  };

  // ============================================================================
  // OTHER SETTER FUNCTIONS
  // ============================================================================

  const setCurrentStep = (step: number) => {
    setCurrentStepState(step);
    localStorage.setItem(STORAGE_KEYS.CURRENT_STEP, JSON.stringify(step));
  };

  const setSelectedRestaurants = (restaurants: Restaurant[]) => {
    setSelectedRestaurantsState(restaurants);
    localStorage.setItem(STORAGE_KEYS.SELECTED_RESTAURANTS, JSON.stringify(restaurants));
  };

  const setEventDetails = (details: EventDetails) => {
    setEventDetailsState(details);
    localStorage.setItem(STORAGE_KEYS.EVENT_DETAILS, JSON.stringify(details));
  };

  const setContactInfo = (info: ContactInfo) => {
    setContactInfoState(info);
    localStorage.setItem(STORAGE_KEYS.CONTACT_INFO, JSON.stringify(info));
  };

  const setPromoCodes = (codes: string[]) => {
    setPromoCodesState(codes);
    localStorage.setItem(STORAGE_KEYS.PROMO_CODES, JSON.stringify(codes));
  };


  const setRestaurantPromotions = (promotions: Record<string, any[]>) => {
    setRestaurantPromotionsState(promotions);
    localStorage.setItem(STORAGE_KEYS.RESTAURANT_PROMOTIONS, JSON.stringify(promotions));
  };

  const resetOrder = () => {
    setCurrentStepState(1);
    setEventDetailsState(null);
    setMealSessionsState([]);
    setActiveSessionIndexState(0);
    setContactInfoState(null);
    setPromoCodesState([]);
    setSelectedRestaurantsState([]);
    setRestaurantPromotionsState({});

    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
  };

  const markOrderAsSubmitted = () => {
    localStorage.setItem(STORAGE_KEYS.ORDER_SUBMITTED, "true");
  };

  if (!isHydrated) {
    return null;
  }

  return (
    <CateringContext.Provider
      value={{
        currentStep,
        eventDetails,
        contactInfo,
        promoCodes,
        selectedRestaurants,
        restaurantPromotions,
        restaurantDiscounts,

        // Meal sessions
        mealSessions,
        activeSessionIndex,

        // Session management
        addMealSession,
        updateMealSession,
        removeMealSession,
        setActiveSessionIndex,

        // Item operations
        addMenuItem,
        removeMenuItem,
        removeMenuItemByIndex,
        updateItemQuantity,
        updateMenuItemByIndex,

        // Pricing
        getSessionTotal,
        getTotalPrice,

        // Helper
        getAllItems,

        // Other functions
        setCurrentStep,
        setEventDetails,
        setContactInfo,
        setPromoCodes,
        setSelectedRestaurants,
        setRestaurantPromotions,
        resetOrder,
        markOrderAsSubmitted,
      }}
    >
      {children}
    </CateringContext.Provider>
  );
}

export function useCatering() {
  const context = useContext(CateringContext);
  if (!context) {
    throw new Error("useCatering must be used within CateringProvider");
  }
  return context;
}
