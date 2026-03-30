"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { CateringContextType } from "@/context/CateringContext";
import type {
  ContactInfo,
  CoworkingBookingQuestionnaire,
  EventDetails,
  MealSessionState,
  SelectedMenuItem,
} from "@/types/catering.types";
import type { Restaurant } from "@/types/restaurant.types";

const STORAGE_PREFIX = "coworking_add_catering";

const STORAGE_KEYS = {
  CURRENT_STEP: `${STORAGE_PREFIX}_current_step`,
  HIGHEST_VISITED_STEP: `${STORAGE_PREFIX}_highest_visited_step`,
  EVENT_DETAILS: `${STORAGE_PREFIX}_event_details`,
  MEAL_SESSIONS: `${STORAGE_PREFIX}_meal_sessions`,
  ACTIVE_SESSION_INDEX: `${STORAGE_PREFIX}_active_session_index`,
  CONTACT_INFO: `${STORAGE_PREFIX}_contact_info`,
  BOOKING_QUESTIONNAIRE: `${STORAGE_PREFIX}_booking_questionnaire`,
  PROMO_CODES: `${STORAGE_PREFIX}_promo_codes`,
  SELECTED_RESTAURANTS: `${STORAGE_PREFIX}_selected_restaurants`,
  RESTAURANT_PROMOTIONS: `${STORAGE_PREFIX}_restaurant_promotions`,
  ORDER_META: `${STORAGE_PREFIX}_order_meta`,
} as const;

const createDefaultSession = (): MealSessionState => ({
  sessionName: "Main Event",
  sessionDate: "",
  eventTime: "",
  orderItems: [],
});

interface CoworkingAddCateringOrderMeta {
  orderId: string;
  token: string;
  spaceSlug: string;
  venueName: string | null;
  deliveryAddress: string;
  deliveryLocation: { latitude: number; longitude: number } | null;
  bookingStartTime: string | null;
  bookingEndTime: string | null;
  ownerEmail: string | null;
}

interface CoworkingAddCateringContextType extends CateringContextType {
  orderMeta: CoworkingAddCateringOrderMeta | null;
  setOrderMeta: (meta: CoworkingAddCateringOrderMeta) => void;
  clearOrderMeta: () => void;
}

const CoworkingAddCateringContext =
  createContext<CoworkingAddCateringContextType | undefined>(undefined);

export function clearCoworkingAddCateringStorage() {
  if (typeof window === "undefined") return;
  Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
}

export function CoworkingAddCateringProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [isHydrated, setIsHydrated] = useState(false);
  const [currentStep, setCurrentStepState] = useState(1);
  const [highestVisitedStep, setHighestVisitedStepState] = useState(1);
  const [eventDetails, setEventDetailsState] = useState<EventDetails | null>(null);
  const [contactInfo, setContactInfoState] = useState<ContactInfo | null>(null);
  const [bookingQuestionnaire, setBookingQuestionnaireState] =
    useState<CoworkingBookingQuestionnaire | null>(null);
  const [promoCodes, setPromoCodesState] = useState<string[]>([]);
  const [selectedRestaurants, setSelectedRestaurantsState] = useState<Restaurant[]>([]);
  const [restaurantPromotions, setRestaurantPromotionsState] = useState<Record<string, any[]>>(
    {}
  );
  const [restaurantDiscounts] = useState<
    Record<string, { discount: number; promotion: any }>
  >({});
  const [mealSessions, setMealSessionsState] = useState<MealSessionState[]>([
    createDefaultSession(),
  ]);
  const [activeSessionIndex, setActiveSessionIndexState] = useState(0);
  const [orderMeta, setOrderMetaState] = useState<CoworkingAddCateringOrderMeta | null>(
    null
  );

  const saveMealSessions = useCallback((sessions: MealSessionState[]) => {
    localStorage.setItem(STORAGE_KEYS.MEAL_SESSIONS, JSON.stringify(sessions));
  }, []);

  useEffect(() => {
    try {
      const savedStep = localStorage.getItem(STORAGE_KEYS.CURRENT_STEP);
      const savedHighestVisitedStep = localStorage.getItem(STORAGE_KEYS.HIGHEST_VISITED_STEP);
      const savedEventDetails = localStorage.getItem(STORAGE_KEYS.EVENT_DETAILS);
      const savedMealSessions = localStorage.getItem(STORAGE_KEYS.MEAL_SESSIONS);
      const savedActiveSessionIndex = localStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION_INDEX);
      const savedContactInfo = localStorage.getItem(STORAGE_KEYS.CONTACT_INFO);
      const savedBookingQuestionnaire = localStorage.getItem(
        STORAGE_KEYS.BOOKING_QUESTIONNAIRE
      );
      const savedPromoCodes = localStorage.getItem(STORAGE_KEYS.PROMO_CODES);
      const savedRestaurants = localStorage.getItem(STORAGE_KEYS.SELECTED_RESTAURANTS);
      const savedPromotions = localStorage.getItem(STORAGE_KEYS.RESTAURANT_PROMOTIONS);
      const savedOrderMeta = localStorage.getItem(STORAGE_KEYS.ORDER_META);

      if (savedStep) setCurrentStepState(JSON.parse(savedStep));
      if (savedHighestVisitedStep) {
        setHighestVisitedStepState(JSON.parse(savedHighestVisitedStep));
      }
      if (savedEventDetails) setEventDetailsState(JSON.parse(savedEventDetails));
      if (savedContactInfo) setContactInfoState(JSON.parse(savedContactInfo));
      if (savedBookingQuestionnaire) {
        setBookingQuestionnaireState(JSON.parse(savedBookingQuestionnaire));
      }
      if (savedPromoCodes) setPromoCodesState(JSON.parse(savedPromoCodes));
      if (savedRestaurants) setSelectedRestaurantsState(JSON.parse(savedRestaurants));
      if (savedPromotions) setRestaurantPromotionsState(JSON.parse(savedPromotions));
      if (savedOrderMeta) setOrderMetaState(JSON.parse(savedOrderMeta));

      if (savedMealSessions) {
        const sessions = JSON.parse(savedMealSessions) as MealSessionState[];
        const validSessions = sessions.filter((s) => s.orderItems.length > 0 || s.sessionDate);
        if (validSessions.length > 0) {
          setMealSessionsState(validSessions);
          if (savedActiveSessionIndex) {
            const activeIndex = JSON.parse(savedActiveSessionIndex);
            setActiveSessionIndexState(
              Math.min(activeIndex, Math.max(0, validSessions.length - 1))
            );
          }
        }
      }
    } catch (error) {
      console.error("Error loading coworking add catering state:", error);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  const addMealSession = useCallback(
    (session: MealSessionState) => {
      setMealSessionsState((prev) => {
        const updated = [...prev, session];
        saveMealSessions(updated);
        return updated;
      });
    },
    [saveMealSessions]
  );

  const updateMealSession = useCallback(
    (index: number, updates: Partial<MealSessionState>) => {
      setMealSessionsState((prev) => {
        if (index < 0 || index >= prev.length) return prev;
        const updated = [...prev];
        updated[index] = { ...updated[index], ...updates };
        saveMealSessions(updated);
        return updated;
      });
    },
    [saveMealSessions]
  );

  const removeMealSession = useCallback(
    (index: number) => {
      setMealSessionsState((prev) => {
        if (prev.length <= 1) {
          const reset = [createDefaultSession()];
          saveMealSessions(reset);
          return reset;
        }
        const updated = prev.filter((_, i) => i !== index);
        saveMealSessions(updated);
        if (activeSessionIndex >= updated.length) {
          const nextIndex = updated.length - 1;
          setActiveSessionIndexState(nextIndex);
          localStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION_INDEX, JSON.stringify(nextIndex));
        }
        return updated;
      });
    },
    [activeSessionIndex, saveMealSessions]
  );

  const setActiveSessionIndex = useCallback((index: number) => {
    setActiveSessionIndexState(index);
    localStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION_INDEX, JSON.stringify(index));
  }, []);

  const addMenuItem = useCallback(
    (sessionIndex: number, newItem: SelectedMenuItem) => {
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
    },
    [saveMealSessions]
  );

  const removeMenuItem = useCallback(
    (sessionIndex: number, itemId: string) => {
      setMealSessionsState((prev) => {
        if (sessionIndex < 0 || sessionIndex >= prev.length) return prev;
        const session = prev[sessionIndex];
        const updated = [...prev];
        updated[sessionIndex] = {
          ...session,
          orderItems: session.orderItems.filter((i) => i.item.id !== itemId),
        };
        saveMealSessions(updated);
        return updated;
      });
    },
    [saveMealSessions]
  );

  const removeMenuItemByIndex = useCallback(
    (sessionIndex: number, itemIndex: number) => {
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
    },
    [saveMealSessions]
  );

  const updateItemQuantity = useCallback(
    (sessionIndex: number, itemId: string, quantity: number) => {
      const session = mealSessions[sessionIndex];
      const orderItem = session?.orderItems.find((item) => item.item.id === itemId);
      const minQty = (orderItem?.item as any)?.minOrderQuantity || 1;
      if (quantity < minQty) {
        removeMenuItem(sessionIndex, itemId);
        return;
      }

      setMealSessionsState((prev) => {
        if (sessionIndex < 0 || sessionIndex >= prev.length) return prev;
        const sessionValue = prev[sessionIndex];
        const updated = [...prev];
        updated[sessionIndex] = {
          ...sessionValue,
          orderItems: sessionValue.orderItems.map((item) =>
            item.item.id === itemId ? { ...item, quantity } : item
          ),
        };
        saveMealSessions(updated);
        return updated;
      });
    },
    [mealSessions, removeMenuItem, saveMealSessions]
  );

  const updateMenuItemByIndex = useCallback(
    (sessionIndex: number, itemIndex: number, item: SelectedMenuItem) => {
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
    },
    [saveMealSessions]
  );

  const getSessionTotal = useCallback(
    (sessionIndex: number) => {
      const session = mealSessions[sessionIndex];
      if (!session) return 0;
      return session.orderItems.reduce((total, { item, quantity }) => {
        const price = parseFloat(item.price?.toString() || "0");
        const discountPrice = parseFloat(item.discountPrice?.toString() || "0");
        const unitPrice = item.isDiscount && discountPrice > 0 ? discountPrice : price;
        const addonTotal = (item.selectedAddons || []).reduce(
          (sum, { price: addonPrice, quantity: addonQuantity }) =>
            sum + (addonPrice || 0) * (addonQuantity || 0),
          0
        );
        return total + unitPrice * quantity + addonTotal;
      }, 0);
    },
    [mealSessions]
  );

  const getSessionDiscount = useCallback(() => ({ discount: 0, promotion: null }), []);

  const getTotalPrice = useCallback(() => {
    return mealSessions.reduce((sum, _, index) => sum + getSessionTotal(index), 0);
  }, [getSessionTotal, mealSessions]);

  const getAllItems = useCallback(() => {
    return mealSessions.flatMap((session) => session.orderItems);
  }, [mealSessions]);

  const setCurrentStep = useCallback((step: number) => {
    setCurrentStepState(step);
    localStorage.setItem(STORAGE_KEYS.CURRENT_STEP, JSON.stringify(step));
    setHighestVisitedStepState((prev) => {
      const next = Math.max(prev, step);
      localStorage.setItem(STORAGE_KEYS.HIGHEST_VISITED_STEP, JSON.stringify(next));
      return next;
    });
  }, []);

  const setEventDetails = useCallback((details: EventDetails) => {
    setEventDetailsState(details);
    localStorage.setItem(STORAGE_KEYS.EVENT_DETAILS, JSON.stringify(details));
  }, []);

  const setContactInfo = useCallback((info: ContactInfo) => {
    setContactInfoState(info);
    localStorage.setItem(STORAGE_KEYS.CONTACT_INFO, JSON.stringify(info));
  }, []);

  const setBookingQuestionnaire = useCallback((answers: CoworkingBookingQuestionnaire) => {
    setBookingQuestionnaireState(answers);
    localStorage.setItem(STORAGE_KEYS.BOOKING_QUESTIONNAIRE, JSON.stringify(answers));
  }, []);

  const setPromoCodes = useCallback((codes: string[]) => {
    setPromoCodesState(codes);
    localStorage.setItem(STORAGE_KEYS.PROMO_CODES, JSON.stringify(codes));
  }, []);

  const setSelectedRestaurants = useCallback((restaurants: Restaurant[]) => {
    setSelectedRestaurantsState(restaurants);
    localStorage.setItem(STORAGE_KEYS.SELECTED_RESTAURANTS, JSON.stringify(restaurants));
  }, []);

  const setRestaurantPromotions = useCallback((promotions: Record<string, any[]>) => {
    setRestaurantPromotionsState(promotions);
    localStorage.setItem(STORAGE_KEYS.RESTAURANT_PROMOTIONS, JSON.stringify(promotions));
  }, []);

  const clearOrderMeta = useCallback(() => {
    setOrderMetaState(null);
    localStorage.removeItem(STORAGE_KEYS.ORDER_META);
  }, []);

  const setOrderMeta = useCallback((meta: CoworkingAddCateringOrderMeta) => {
    setOrderMetaState(meta);
    localStorage.setItem(STORAGE_KEYS.ORDER_META, JSON.stringify(meta));
  }, []);

  const resetOrder = useCallback(() => {
    clearCoworkingAddCateringStorage();
    setCurrentStepState(1);
    setHighestVisitedStepState(1);
    setEventDetailsState(null);
    setContactInfoState(null);
    setBookingQuestionnaireState(null);
    setPromoCodesState([]);
    setSelectedRestaurantsState([]);
    setRestaurantPromotionsState({});
    setMealSessionsState([createDefaultSession()]);
    setActiveSessionIndexState(0);
    setOrderMetaState(null);
  }, []);

  const markOrderAsSubmitted = useCallback(() => {
    resetOrder();
  }, [resetOrder]);

  const value = useMemo<CoworkingAddCateringContextType>(
    () => ({
      currentStep,
      highestVisitedStep,
      eventDetails,
      contactInfo,
      bookingQuestionnaire,
      promoCodes,
      selectedRestaurants,
      restaurantPromotions,
      restaurantDiscounts,
      mealSessions,
      activeSessionIndex,
      addMealSession,
      updateMealSession,
      removeMealSession,
      setActiveSessionIndex,
      addMenuItem,
      removeMenuItem,
      removeMenuItemByIndex,
      updateItemQuantity,
      updateMenuItemByIndex,
      getSessionTotal,
      getSessionDiscount,
      getTotalPrice,
      getAllItems,
      setCurrentStep,
      setEventDetails,
      setContactInfo,
      setBookingQuestionnaire,
      setPromoCodes,
      setSelectedRestaurants,
      setRestaurantPromotions,
      resetOrder,
      markOrderAsSubmitted,
      orderMeta,
      setOrderMeta,
      clearOrderMeta,
    }),
    [
      activeSessionIndex,
      addMealSession,
      addMenuItem,
      bookingQuestionnaire,
      clearOrderMeta,
      contactInfo,
      currentStep,
      eventDetails,
      getAllItems,
      getSessionDiscount,
      getSessionTotal,
      getTotalPrice,
      highestVisitedStep,
      markOrderAsSubmitted,
      mealSessions,
      orderMeta,
      promoCodes,
      removeMealSession,
      removeMenuItem,
      removeMenuItemByIndex,
      resetOrder,
      restaurantDiscounts,
      restaurantPromotions,
      selectedRestaurants,
      setActiveSessionIndex,
      setBookingQuestionnaire,
      setContactInfo,
      setCurrentStep,
      setEventDetails,
      setOrderMeta,
      setPromoCodes,
      setRestaurantPromotions,
      setSelectedRestaurants,
      updateItemQuantity,
      updateMealSession,
      updateMenuItemByIndex,
    ]
  );

  if (!isHydrated) return null;

  return (
    <CoworkingAddCateringContext.Provider value={value}>
      {children}
    </CoworkingAddCateringContext.Provider>
  );
}

export function useCoworkingAddCatering() {
  const context = useContext(CoworkingAddCateringContext);
  if (!context) {
    throw new Error(
      "useCoworkingAddCatering must be used within CoworkingAddCateringProvider"
    );
  }
  return context;
}

export function useCoworkingAddCateringOptional() {
  return useContext(CoworkingAddCateringContext);
}
