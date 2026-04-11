"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { pdf } from "@react-pdf/renderer";
import { MoreHorizontal, Package, ShoppingBag, Trash2, X } from "lucide-react";
import { useActiveCatering } from "@/context/useActiveCatering";
import { useCoworking } from "@/context/CoworkingContext";
import {
  MealSessionState,
  CateringPricingResult,
} from "@/types/catering.types";
import { MenuItem } from "@/types/restaurant.types";
import { CateringBundleItem } from "@/types/api/catering.api.types";
import { cateringService } from "@/services/api/catering.api";
import { coworkingService } from "@/services/api";
import { CateringMenuPdf } from "@/lib/components/pdf/CateringMenuPdf";
import {
  LocalMealSession,
  transformLocalSessionsToPdfData,
} from "@/lib/utils/menuPdfUtils";
import { validateSessionMinOrders } from "@/lib/utils/catering-min-order-validation";
import MenuItemModal from "./MenuItemModal";
import TutorialTooltip from "./TutorialTooltip";
import SessionEditor from "./SessionEditor";
import DateSessionNav from "./DateSessionNav";
import ActiveSessionPanel from "./ActiveSessionPanel";
import ViewOrderModal from "./ViewOrderModal";
import MenuBrowserColumn from "./MenuBrowserColumn";
import EmptySessionWarningModal from "./modals/EmptySessionWarningModal";
import RemoveSessionConfirmModal from "./modals/RemoveSessionConfirmModal";
import MinOrderModal from "./modals/MinOrderModal";
import PdfDownloadModal from "./modals/PdfDownloadModal";
import SwapItemModal from "./modals/SwapItemModal";
import PricingSummary from "./contact/PricingSummary";
import { useCateringTutorial } from "./hooks/useCateringTutorial";
import { useCateringData } from "./hooks/useCateringData";
import {
  groupSessionsByDay,
  formatTimeDisplay,
  mapToMenuItem,
} from "./catering-order-helpers";

const CATERING_TIME_SLOTS = ["11:00", "13:00", "18:00"] as const;
const TUTORIAL_HINT_DISABLED_KEY = "catering_tutorial_hint_disabled";

const toMinutes = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

const getNextCateringTime = (time: string) => {
  const requestedMinutes = toMinutes(time);
  const nextSlot = CATERING_TIME_SLOTS.find(
    (slot) => toMinutes(slot) >= requestedMinutes,
  );
  return nextSlot ?? CATERING_TIME_SLOTS[CATERING_TIME_SLOTS.length - 1];
};

type PdfPreviewItem = LocalMealSession["orderItems"][number]["item"];

interface CateringOrderBuilderProps {
  nextStep?: number;
  desktopCheckoutNotice?: React.ReactNode;
  onContinue?: () => void;
  disableCheckoutWhenEmpty?: boolean;
  eventWindow?: {
    startDate?: string;
    startTime?: string;
    endDate?: string;
    endTime?: string;
  };
}

export default function CateringOrderBuilder({
  nextStep = 2,
  desktopCheckoutNotice,
  onContinue,
  disableCheckoutWhenEmpty = false,
  eventWindow,
}: CateringOrderBuilderProps) {
  const searchParams = useSearchParams();
  const {
    eventStartDate,
    eventStartTime,
    eventEndDate,
    eventEndTime,
    selectedVenue,
    spaceSlug,
  } = useCoworking();
  const resolvedEventStartDate = eventWindow?.startDate || eventStartDate;
  const resolvedEventStartTime = eventWindow?.startTime || eventStartTime;
  const resolvedEventEndDate = eventWindow?.endDate || eventEndDate;
  const resolvedEventEndTime = eventWindow?.endTime || eventEndTime;
  const {
    mealSessions,
    activeSessionIndex,
    setActiveSessionIndex,
    addMealSession,
    updateMealSession,
    removeMealSession,
    addMenuItem,
    updateItemQuantity,
    removeMenuItemByIndex,
    updateMenuItemByIndex,
    getSessionTotal,
    getSessionDiscount,
    getTotalPrice,
    setCurrentStep,
    eventDetails,
  } = useActiveCatering();

  const [editingSessionIndex, setEditingSessionIndex] = useState<number | null>(
    null,
  );
  const [isNewSession, setIsNewSession] = useState(false);
  const [navMode, setNavMode] = useState<"dates" | "sessions">("dates");
  const [selectedDayDate, setSelectedDayDate] = useState<string | null>(null);
  const [isNavSticky, setIsNavSticky] = useState(false);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [pendingItem, setPendingItem] = useState<MenuItem | null>(null);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(
    new Set(),
  );
  const [tutorialResetKey, setTutorialResetKey] = useState(0);
  const [isTutorialHintVisible, setIsTutorialHintVisible] = useState(false);
  const [isTutorialHintDisabled, setIsTutorialHintDisabled] = useState(false);
  const [showBundleBrowser, setShowBundleBrowser] = useState(false);
  const [swapItemIndex, setSwapItemIndex] = useState<number | null>(null);
  const [swapAlternatives, setSwapAlternatives] = useState<MenuItem[]>([]);
  const [bundleToRemove, setBundleToRemove] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [emptySessionIndex, setEmptySessionIndex] = useState<number | null>(
    null,
  );
  const [sessionToRemove, setSessionToRemove] = useState<number | null>(null);
  const [minOrderModalSession, setMinOrderModalSession] = useState<{
    index: number;
    validation: ReturnType<typeof validateSessionMinOrders>;
  } | null>(null);
  const [sessionValidationErrors, setSessionValidationErrors] = useState<
    Record<number, string>
  >({});
  const [isViewOrderOpen, setIsViewOrderOpen] = useState(false);
  const [removeItemIndex, setRemoveItemIndex] = useState<number | null>(null);
  const [isClearAllConfirmOpen, setIsClearAllConfirmOpen] = useState(false);
  const [isMobileCartMenuOpen, setIsMobileCartMenuOpen] = useState(false);
  const [isDesktopCartMenuOpen, setIsDesktopCartMenuOpen] = useState(false);
  const [desktopMenuPos, setDesktopMenuPos] = useState({ bottom: 0, left: 0 });
  const desktopMenuBtnRef = useRef<HTMLButtonElement>(null);
  const [pricing, setPricing] = useState<CateringPricingResult | null>(null);
  const [calculatingPricing, setCalculatingPricing] = useState(false);
  const pricingDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasAnyItems = mealSessions.some(
    (session) => session.orderItems.length > 0,
  );

  const lastAutoSelectedSessionTime = useRef<string | null>(null);
  const addDayNavButtonRef = useRef<HTMLButtonElement>(null);
  const backButtonRef = useRef<HTMLButtonElement>(null);
  const firstDayTabRef = useRef<HTMLDivElement>(null);
  const firstSessionPillRef = useRef<HTMLButtonElement>(null);
  const addSessionNavButtonRef = useRef<HTMLButtonElement>(null);
  const categoriesRowRef = useRef<HTMLDivElement>(null);
  const restaurantListRef = useRef<HTMLDivElement>(null);
  const firstMenuItemRef = useRef<HTMLDivElement>(null);
  const resetRestaurantListRef = useRef<(() => void) | null>(null);

  const {
    categories,
    selectedCategory,
    selectedSubcategory,
    handleCategoryClick,
    selectMainsCategory,
    restaurants,
    restaurantsLoading,
    selectedDietaryFilters,
    toggleDietaryFilter,
  } = useCateringData({ expandedSessionIndex: activeSessionIndex });

  const {
    tutorialStep,
    tutorialPhase,
    currentTutorialStep,
    handleTutorialNext,
    handleSkipTutorial,
    triggerNavigationTutorial,
    triggerSessionCreated,
    resetTutorial,
    getTutorialSteps,
  } = useCateringTutorial({
    mealSessions,
    navMode,
    refs: {
      addDayNavButtonRef,
      backButtonRef,
      firstDayTabRef,
      firstSessionPillRef,
      addSessionNavButtonRef,
      categoriesRowRef,
      restaurantListRef,
      firstMenuItemRef,
      resetRestaurantListRef,
    },
  });

  useEffect(() => {
    resetRestaurantListRef.current = () =>
      setTutorialResetKey((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (currentTutorialStep?.id !== "add-day-nav" || navMode === "dates")
      return;
    setNavMode("dates");
    setSelectedDayDate(null);
  }, [currentTutorialStep, navMode]);

  useEffect(() => {
    const storedPreference =
      typeof window !== "undefined"
        ? window.localStorage.getItem(TUTORIAL_HINT_DISABLED_KEY)
        : null;
    const disabled = storedPreference === "true";
    setIsTutorialHintDisabled(disabled);
    setIsTutorialHintVisible(!disabled);
  }, []);

  const handleTutorialHintDisabledChange = (checked: boolean) => {
    setIsTutorialHintDisabled(checked);
    setIsTutorialHintVisible(!checked);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        TUTORIAL_HINT_DISABLED_KEY,
        checked ? "true" : "false",
      );
    }
  };

  const handleRestartTutorial = () => {
    resetTutorial();
    setNavMode("dates");
    setSelectedDayDate(null);
    setExpandedItemId(null);
    setTutorialResetKey((key) => key + 1);
    if (!isTutorialHintDisabled) {
      setIsTutorialHintVisible(false);
    }
  };

  const getItemQuantity = (itemId: string): number => {
    const session = mealSessions[activeSessionIndex];
    if (!session) return 0;
    const orderItem = session.orderItems.find((oi) => oi.item.id === itemId);
    return orderItem?.quantity || 0;
  };

  const handleAddItem = (item: MenuItem) => {
    const backendQuantityUnit = item.cateringQuantityUnit || 7;
    const portionQuantity = item.portionQuantity || 1;
    const quantity = portionQuantity * backendQuantityUnit;

    addMenuItem(activeSessionIndex, {
      item: {
        id: item.id,
        menuItemName: item.menuItemName,
        description: item.description,
        price: item.price,
        discountPrice: item.discountPrice,
        allergens: item.allergens,
        dietaryFilters: item.dietaryFilters,
        isDiscount: item.isDiscount,
        image: item.image,
        restaurantId: item.restaurantId,
        restaurantName: item.restaurantName,
        groupTitle: item.groupTitle,
        cateringQuantityUnit: item.cateringQuantityUnit,
        feedsPerUnit: item.feedsPerUnit,
        itemDisplayOrder: item.itemDisplayOrder,
        addons: item.addons,
        selectedAddons: item.selectedAddons,
        categoryId: item.categoryId || selectedCategory?.id,
        categoryName: item.categoryName || selectedCategory?.name,
        subcategoryId: item.subcategoryId || selectedSubcategory?.id,
        subcategoryName: item.subcategoryName || selectedSubcategory?.name,
      },
      quantity,
    });
    setExpandedItemId(null);
  };

  const handleUpdateQuantity = (itemId: string, quantity: number) => {
    updateItemQuantity(activeSessionIndex, itemId, quantity);
  };

  const handleAddOrderPress = (item: MenuItem) => {
    setExpandedItemId(item.id);
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsNavSticky(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const basketColumnRef = useRef<HTMLDivElement>(null);
  const [basketHeight, setBasketHeight] = useState("100vh");
  useEffect(() => {
    const updateHeight = () => {
      if (basketColumnRef.current) {
        const top = Math.max(
          0,
          basketColumnRef.current.getBoundingClientRect().top,
        );
        setBasketHeight(`calc(100vh - ${top}px)`);
      }
    };
    updateHeight();
    window.addEventListener("scroll", updateHeight, { passive: true });
    window.addEventListener("resize", updateHeight);
    return () => {
      window.removeEventListener("scroll", updateHeight);
      window.removeEventListener("resize", updateHeight);
    };
  }, []);

  useEffect(() => {
    if (!resolvedEventStartTime || mealSessions.length === 0) return;
    const firstSession = mealSessions[0];
    if (!firstSession) return;

    const nextCateringTime = getNextCateringTime(resolvedEventStartTime);
    const currentTime = firstSession.eventTime || "";
    const shouldSync =
      currentTime === "" ||
      currentTime === resolvedEventStartTime ||
      currentTime === lastAutoSelectedSessionTime.current;

    if (!shouldSync || currentTime === nextCateringTime) {
      if (currentTime === nextCateringTime) {
        lastAutoSelectedSessionTime.current = nextCateringTime;
      }
      return;
    }

    updateMealSession(0, { eventTime: nextCateringTime });
    lastAutoSelectedSessionTime.current = nextCateringTime;
  }, [mealSessions, resolvedEventStartTime, updateMealSession]);

  useEffect(() => {
    const bundleId = searchParams.get("bundleId");
    if (!bundleId) return;

    const sessionDate = searchParams.get("sessionDate");
    const sessionTime = searchParams.get("sessionTime");

    const prefillFromBundle = async () => {
      try {
        const bundle = await cateringService.getBundleById(bundleId);
        const response = await cateringService.getMenuItems();
        const menuItems = (response || []).map(mapToMenuItem);

        bundle.items.forEach((bundleItem: CateringBundleItem) => {
          const menuItem = menuItems.find(
            (item: MenuItem) => item.id === bundleItem.menuItemId,
          );
          if (menuItem) {
            addMenuItem(activeSessionIndex, {
              item: { ...menuItem, selectedAddons: bundleItem.selectedAddons },
              quantity: bundleItem.quantity,
            });
          }
        });

        if (sessionDate || sessionTime) {
          updateMealSession(activeSessionIndex, {
            ...(sessionDate && { sessionDate }),
            ...(sessionTime && { eventTime: sessionTime }),
          });
        }
      } catch (error) {
        console.error("Error loading bundle:", error);
      }
    };

    prefillFromBundle();
  }, [searchParams, addMenuItem, activeSessionIndex, updateMealSession]);

  useEffect(() => {
    const pendingItemJson = localStorage.getItem("catering_pending_item");
    if (!pendingItemJson) return;

    try {
      const item = JSON.parse(pendingItemJson) as MenuItem;
      localStorage.removeItem("catering_pending_item");
      setPendingItem(item);
    } catch (error) {
      console.error("Error parsing pending item:", error);
      localStorage.removeItem("catering_pending_item");
    }
  }, []);

  const validationStatus = useMemo(() => {
    const activeSession = mealSessions[activeSessionIndex];
    if (!activeSession || restaurants.length === 0) return [];
    return validateSessionMinOrders(activeSession, restaurants);
  }, [mealSessions, activeSessionIndex, restaurants]);

  const isCurrentSessionValid = useMemo(
    () => validationStatus.every((status) => status.isValid),
    [validationStatus],
  );

  const dayGroups = useMemo(
    () => groupSessionsByDay(mealSessions, getSessionTotal),
    [mealSessions, getSessionTotal],
  );

  const currentDayGroup = useMemo(() => {
    if (!selectedDayDate) return null;
    return dayGroups.find((group) => group.date === selectedDayDate) || null;
  }, [dayGroups, selectedDayDate]);

  useEffect(() => {
    if (navMode !== "sessions" || activeSessionIndex === null) return;
    const activeSession = mealSessions[activeSessionIndex];
    if (!activeSession?.sessionDate) return;
    if (selectedDayDate !== activeSession.sessionDate) {
      setSelectedDayDate(activeSession.sessionDate);
    }
  }, [navMode, activeSessionIndex, mealSessions, selectedDayDate]);

  const handleDateClick = (dayDate: string) => {
    setSelectedDayDate(dayDate);
    setNavMode("sessions");
    const dayGroup = dayGroups.find((group) => group.date === dayDate);
    if (dayGroup?.sessions.length) {
      setActiveSessionIndex(dayGroup.sessions[0].index);
    }
  };

  const handleBackToDates = () => {
    if (selectedDayDate && currentDayGroup) {
      const sessionsToRemove = currentDayGroup.sessions
        .filter(
          ({ session }) =>
            session.orderItems.length === 0 && !session.eventTime,
        )
        .map(({ index }) => index)
        .sort((a, b) => b - a);

      sessionsToRemove.forEach((index) => removeMealSession(index));
    }

    setNavMode("dates");
    setSelectedDayDate(null);
  };

  const handleSessionPillClick = (sessionIndex: number) => {
    const session = mealSessions[sessionIndex];
    if (session?.sessionDate) {
      setSelectedDayDate(session.sessionDate);
      setNavMode("sessions");
    }
    setActiveSessionIndex(sessionIndex);
    setShowBundleBrowser(false);
  };

  const handleMinOrderNavigate = (_restaurantId: string, section: string) => {
    if (!minOrderModalSession) return;
    const sessionIndex = minOrderModalSession.index;
    setMinOrderModalSession(null);
    setActiveSessionIndex(sessionIndex);

    const session = mealSessions[sessionIndex];
    if (session?.sessionDate) {
      setSelectedDayDate(session.sessionDate);
      setNavMode("sessions");
    }

    const matchingCategory = categories.find(
      (category) => category.name.toLowerCase() === section.toLowerCase(),
    );
    if (matchingCategory) {
      handleCategoryClick(matchingCategory);
    }
  };

  const handleAddDay = () => {
    const newSession: MealSessionState = {
      sessionName: `Session ${mealSessions.length + 1}`,
      sessionDate: "",
      eventTime: "",
      orderItems: [],
    };

    const shouldReuseDefaultSession =
      mealSessions.length === 1 &&
      isUnconfiguredDefaultSession(mealSessions[0]);
    const newIndex = shouldReuseDefaultSession ? 0 : mealSessions.length;

    if (shouldReuseDefaultSession) {
      updateMealSession(0, newSession);
    } else {
      addMealSession(newSession);
    }

    setActiveSessionIndex(newIndex);
    selectMainsCategory();

    setTimeout(() => {
      setEditingSessionIndex(newIndex);
      setIsNewSession(true);
    }, 100);
  };

  const isUnconfiguredDefaultSession = (
    session: MealSessionState | undefined,
  ) => {
    if (!session) return false;

    return (
      session.sessionName === "Main Event" &&
      !session.sessionDate &&
      !session.eventTime &&
      !session.guestCount &&
      !session.specialRequirements?.trim() &&
      session.orderItems.length === 0
    );
  };

  const handleAddSessionToDay = (dayDate: string) => {
    const newSession: MealSessionState = {
      sessionName: `Session ${mealSessions.length + 1}`,
      sessionDate: dayDate,
      eventTime: "",
      orderItems: [],
    };

    const shouldReuseDefaultSession =
      mealSessions.length === 1 &&
      isUnconfiguredDefaultSession(mealSessions[0]);
    const newIndex = shouldReuseDefaultSession ? 0 : mealSessions.length;

    if (shouldReuseDefaultSession) {
      updateMealSession(0, newSession);
    } else {
      addMealSession(newSession);
    }

    setSelectedDayDate(dayDate);
    setNavMode("sessions");
    setActiveSessionIndex(newIndex);
    selectMainsCategory();

    setTimeout(() => {
      setEditingSessionIndex(newIndex);
      setIsNewSession(true);
    }, 150);
  };

  const totalDays = dayGroups.filter(
    (group) => group.date !== "unscheduled",
  ).length;
  const totalSessions = mealSessions.length;
  const totalItems = mealSessions.reduce(
    (acc, session) =>
      acc + session.orderItems.reduce((sum, item) => sum + item.quantity, 0),
    0,
  );

  const handleEditorClose = (cancelled: boolean) => {
    const sessionIndex = editingSessionIndex;
    const wasNewSession = isNewSession;

    if (cancelled && isNewSession && sessionIndex !== null) {
      removeMealSession(sessionIndex);
    }

    if (sessionIndex !== null && !cancelled) {
      setSessionValidationErrors((prev) => {
        const next = { ...prev };
        delete next[sessionIndex];
        return next;
      });
    }

    setEditingSessionIndex(null);
    setIsNewSession(false);

    if (sessionIndex !== null && !cancelled) {
      const session = mealSessions[sessionIndex];
      if (session?.sessionDate) {
        setSelectedDayDate(session.sessionDate);
        setNavMode("sessions");
      }
      setActiveSessionIndex(sessionIndex);

      if (wasNewSession && tutorialPhase === "navigation") {
        triggerSessionCreated();
      }
    }
  };

  const handleRemoveSession = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessionToRemove(index);
  };

  const confirmRemoveSession = () => {
    if (sessionToRemove === null) return;

    const remainingSessions = mealSessions.filter(
      (_, index) => index !== sessionToRemove,
    );
    removeMealSession(sessionToRemove);

    if (remainingSessions.length === 0) {
      setSelectedDayDate(null);
      setNavMode("dates");
      setActiveSessionIndex(0);
    } else {
      const nextSessionIndex = Math.min(
        sessionToRemove,
        remainingSessions.length - 1,
      );
      const nextSession = remainingSessions[nextSessionIndex];
      setActiveSessionIndex(nextSessionIndex);
      setSelectedDayDate(nextSession?.sessionDate || null);
      setNavMode(nextSession?.sessionDate ? "sessions" : "dates");
    }

    setEditingSessionIndex(null);
    setSessionToRemove(null);
  };

  const handleToggleCategory = (categoryName: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryName)) next.delete(categoryName);
      else next.add(categoryName);
      return next;
    });
  };

  const handleEditItem = (itemIndex: number) => {
    setEditingItemIndex(itemIndex);
    setIsEditModalOpen(true);
  };

  const handleRemoveItem = (itemIndex: number) => {
    setRemoveItemIndex(itemIndex);
  };

  const confirmRemoveItem = () => {
    if (removeItemIndex !== null) {
      removeMenuItemByIndex(activeSessionIndex, removeItemIndex);
      setRemoveItemIndex(null);
    }
  };

  const handleSaveEditedItem = (updatedItem: MenuItem) => {
    if (editingItemIndex === null) return;

    const backendQuantityUnit = updatedItem.cateringQuantityUnit || 7;
    const quantity = (updatedItem.portionQuantity || 1) * backendQuantityUnit;
    const originalOrderItem =
      mealSessions[activeSessionIndex].orderItems[editingItemIndex];
    const originalItem = originalOrderItem.item;

    updateMenuItemByIndex(activeSessionIndex, editingItemIndex, {
      item: {
        ...updatedItem,
        categoryId: originalItem.categoryId,
        categoryName: originalItem.categoryName,
        subcategoryId: originalItem.subcategoryId,
        subcategoryName: originalItem.subcategoryName,
        restaurantName:
          "restaurantName" in originalItem
            ? originalItem.restaurantName
            : originalItem.restaurant?.name,
      },
      quantity,
      bundleId: originalOrderItem.bundleId,
      bundleName: originalOrderItem.bundleName,
    });

    setIsEditModalOpen(false);
    setEditingItemIndex(null);
  };

  const handleRemoveBundle = (bundleId: string) => {
    const session = mealSessions[activeSessionIndex];
    if (!session) return;
    const bundleItem = session.orderItems.find(
      (item) => item.bundleId === bundleId,
    );
    setBundleToRemove({
      id: bundleId,
      name: bundleItem?.bundleName || "Bundle",
    });
  };

  const confirmRemoveBundle = () => {
    if (!bundleToRemove) return;
    const session = mealSessions[activeSessionIndex];
    if (!session) return;

    const indices = session.orderItems
      .map((item, index) => (item.bundleId === bundleToRemove.id ? index : -1))
      .filter((index) => index !== -1)
      .sort((a, b) => b - a);

    indices.forEach((index) =>
      removeMenuItemByIndex(activeSessionIndex, index),
    );
    setBundleToRemove(null);
  };

  const handleSwapItem = async (itemIndex: number) => {
    const session = mealSessions[activeSessionIndex];
    if (!session) return;
    const orderItem = session.orderItems[itemIndex];
    if (!orderItem) return;

    const item = orderItem.item as MenuItem;
    const restaurantId = item.restaurantId;
    const groupTitle = item.groupTitle;

    setSwapItemIndex(itemIndex);
    setSwapAlternatives([]);

    if (!restaurantId) return;

    try {
      const menuItems =
        await cateringService.getMenuItemsByRestaurant(restaurantId);
      const items: MenuItem[] = (menuItems || []).map(mapToMenuItem);
      const alternatives = groupTitle
        ? items.filter((mi) => mi.groupTitle === groupTitle)
        : items;
      setSwapAlternatives(alternatives);
    } catch (error) {
      console.error("Failed to fetch swap alternatives:", error);
    }
  };

  const handleConfirmSwap = (newItem: MenuItem) => {
    if (swapItemIndex === null) return;
    const session = mealSessions[activeSessionIndex];
    if (!session) return;

    const oldOrderItem = session.orderItems[swapItemIndex];
    const backendQuantityUnit = newItem.cateringQuantityUnit || 7;
    const quantity =
      newItem.portionQuantity && newItem.portionQuantity > 0
        ? newItem.portionQuantity * backendQuantityUnit
        : oldOrderItem.quantity;

    updateMenuItemByIndex(activeSessionIndex, swapItemIndex, {
      item: {
        ...newItem,
        categoryId: oldOrderItem.item.categoryId,
        categoryName: oldOrderItem.item.categoryName,
        subcategoryId: oldOrderItem.item.subcategoryId,
        subcategoryName: oldOrderItem.item.subcategoryName,
      },
      quantity,
      bundleId: oldOrderItem.bundleId,
      bundleName: oldOrderItem.bundleName,
    });

    setSwapItemIndex(null);
    setSwapAlternatives([]);
  };

  const handleCheckout = () => {
    if (disableCheckoutWhenEmpty && !hasAnyItems) {
      return;
    }

    if (mealSessions.length > 1) {
      const emptyIndex = mealSessions.findIndex(
        (session) => session.orderItems.length === 0,
      );
      if (emptyIndex !== -1) {
        setEmptySessionIndex(emptyIndex);
        return;
      }
    }

    for (let i = 0; i < mealSessions.length; i += 1) {
      const session = mealSessions[i];
      if (session.orderItems.length === 0) continue;
      const sessionValidation = validateSessionMinOrders(session, restaurants);
      if (sessionValidation.some((status) => !status.isValid)) {
        setActiveSessionIndex(i);
        setMinOrderModalSession({ index: i, validation: sessionValidation });
        return;
      }
    }

    for (let i = 0; i < mealSessions.length; i += 1) {
      const session = mealSessions[i];
      if (
        session.orderItems.length > 0 &&
        (!session.sessionDate || !session.eventTime)
      ) {
        setActiveSessionIndex(i);
        setEditingSessionIndex(i);
        return;
      }
    }

    const errors: Record<number, string> = {};

    for (let i = 0; i < mealSessions.length; i += 1) {
      const session = mealSessions[i];
      if (session.orderItems.length === 0) continue;

      const restaurantIds = new Set(
        session.orderItems.map((orderItem) => orderItem.item.restaurantId),
      );

      for (const restaurantId of restaurantIds) {
        const restaurant = restaurants.find(
          (candidate) => candidate.id === restaurantId,
        );
        if (!restaurant) continue;

        const cateringHours = restaurant.cateringOperatingHours;
        if (!cateringHours || cateringHours.length === 0) continue;

        const formatTimeRange = (hour: number, minute: number) => {
          const period = hour >= 12 ? "PM" : "AM";
          const hour12 = hour % 12 || 12;
          return `${hour12}:${minute.toString().padStart(2, "0")} ${period}`;
        };

        const dateString = session.sessionDate;
        const dateOverride = restaurant.dateOverrides?.find(
          (override) => override.date === dateString,
        );

        if (dateOverride) {
          if (dateOverride.isClosed) {
            errors[i] =
              `${restaurant.restaurant_name} is closed on ${dateString}${dateOverride.reason ? ` (${dateOverride.reason})` : ""
              }. Please select a different date.`;
            break;
          }

          if (dateOverride.timeSlots?.length && session.eventTime) {
            const [eventHour, eventMinute] = session.eventTime
              .split(":")
              .map(Number);
            const eventMinutes = eventHour * 60 + eventMinute;
            const inAnySlot = dateOverride.timeSlots.some((slot) => {
              const [openHour, openMinute] = slot.open.split(":").map(Number);
              const [closeHour, closeMinute] = slot.close
                .split(":")
                .map(Number);
              return (
                eventMinutes >= openHour * 60 + openMinute &&
                eventMinutes <= closeHour * 60 + closeMinute
              );
            });

            if (!inAnySlot) {
              const slotDescriptions = dateOverride.timeSlots
                .map((slot) => {
                  const [openHour, openMinute] = slot.open
                    .split(":")
                    .map(Number);
                  const [closeHour, closeMinute] = slot.close
                    .split(":")
                    .map(Number);
                  return `${formatTimeRange(openHour, openMinute)} - ${formatTimeRange(
                    closeHour,
                    closeMinute,
                  )}`;
                })
                .join(", ");
              errors[i] =
                `${restaurant.restaurant_name} only accepts orders between ${slotDescriptions} on ${dateString}.`;
              break;
            }
          }
        } else {
          const selectedDateTime = new Date(`${session.sessionDate}T00:00:00`);
          const dayOfWeek = selectedDateTime
            .toLocaleDateString("en-US", { weekday: "long" })
            .toLowerCase();

          const daySlots = cateringHours.filter(
            (schedule) =>
              schedule.day.toLowerCase() === dayOfWeek && schedule.enabled,
          );

          if (daySlots.length === 0) {
            errors[i] =
              `${restaurant.restaurant_name} does not accept event orders on ${dayOfWeek}s. Please select a different date for this session.`;
            break;
          }

          const enabledSlots = daySlots.filter(
            (slot) => slot.open && slot.close,
          );
          if (enabledSlots.length > 0 && session.eventTime) {
            const [eventHour, eventMinute] = session.eventTime
              .split(":")
              .map(Number);
            const eventMinutes = eventHour * 60 + eventMinute;

            const inAnySlot = enabledSlots.some((slot) => {
              const [openHour, openMinute] = slot.open!.split(":").map(Number);
              const [closeHour, closeMinute] = slot
                .close!.split(":")
                .map(Number);
              return (
                eventMinutes >= openHour * 60 + openMinute &&
                eventMinutes <= closeHour * 60 + closeMinute
              );
            });

            if (!inAnySlot) {
              const slotDescriptions = enabledSlots
                .map((slot) => {
                  const [openHour, openMinute] = slot
                    .open!.split(":")
                    .map(Number);
                  const [closeHour, closeMinute] = slot
                    .close!.split(":")
                    .map(Number);
                  return `${formatTimeRange(openHour, openMinute)} - ${formatTimeRange(
                    closeHour,
                    closeMinute,
                  )}`;
                })
                .join(", ");
              errors[i] =
                `${restaurant.restaurant_name} accepts event orders on ${dayOfWeek}s between ${slotDescriptions}. Please select a time within these hours for this session.`;
              break;
            }
          }
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      setSessionValidationErrors(errors);
      const firstErrorSessionIndex = parseInt(Object.keys(errors)[0], 10);
      setActiveSessionIndex(firstErrorSessionIndex);
      const errorSession = mealSessions[firstErrorSessionIndex];
      if (errorSession?.sessionDate) {
        setSelectedDayDate(errorSession.sessionDate);
        setNavMode("sessions");
      }
      return;
    }

    setSessionValidationErrors({});
    if (onContinue) {
      onContinue();
      return;
    }

    setCurrentStep(nextStep);
  };

  const handleRemoveEmptySession = () => {
    if (emptySessionIndex !== null) {
      removeMealSession(emptySessionIndex);
      setEmptySessionIndex(null);
    }
  };

  const handleAddItemsToEmptySession = () => {
    if (emptySessionIndex === null) return;
    const session = mealSessions[emptySessionIndex];
    setActiveSessionIndex(emptySessionIndex);
    if (session?.sessionDate) {
      setSelectedDayDate(session.sessionDate);
      setNavMode("sessions");
    }
    setEmptySessionIndex(null);
  };

  const handleViewMenu = () => {
    setShowPdfModal(true);
  };

  const handleClearAllItems = () => {
    // Remove sessions from highest index down. When the last one is removed,
    // the context resets to a single fresh default session.
    for (let i = mealSessions.length - 1; i >= 0; i--) {
      removeMealSession(i);
    }
    setActiveSessionIndex(0);
    setIsClearAllConfirmOpen(false);
    setIsMobileCartMenuOpen(false);
  };

  const FALLBACK_DELIVERY_ADDRESS = "1-2 Paris Gardens, London";
  const FALLBACK_DELIVERY_LAT = 51.50664530535029;
  const FALLBACK_DELIVERY_LNG = -0.10636436057400264;

  const fetchPricing = useCallback(
    async (sessions: MealSessionState[]) => {
      const hasItems = sessions.some((s) => s.orderItems.length > 0);
      if (!hasItems || !spaceSlug) {
        setPricing(null);
        return;
      }

      // Build flat + per-session items (mirrors Step3 buildCoworkingOrderData)
      const itemsByRestaurantFlat = new Map<
        string,
        { menuItemId: string; quantity: number }[]
      >();
      const builtSessions = sessions
        .filter((s) => s.orderItems.length > 0)
        .map((session, i) => {
          const byRestaurant = new Map<
            string,
            { menuItemId: string; quantity: number }[]
          >();
          session.orderItems.forEach(({ item, quantity }) => {
            if (!byRestaurant.has(item.restaurantId))
              byRestaurant.set(item.restaurantId, []);
            byRestaurant
              .get(item.restaurantId)!
              .push({ menuItemId: item.id, quantity });
            if (!itemsByRestaurantFlat.has(item.restaurantId))
              itemsByRestaurantFlat.set(item.restaurantId, []);
            itemsByRestaurantFlat
              .get(item.restaurantId)!
              .push({ menuItemId: item.id, quantity });
          });
          return {
            sessionName: session.sessionName || `Session ${i + 1}`,
            sessionDate: session.sessionDate,
            eventTime: session.eventTime,
            collectionTime: session.eventTime,
            guestCount: session.guestCount,
            orderItems: Array.from(byRestaurant.entries()).map(
              ([restaurantId, menuItems]) => ({ restaurantId, menuItems }),
            ),
          };
        });
      const flatOrderItems = Array.from(itemsByRestaurantFlat.entries()).map(
        ([restaurantId, menuItems]) => ({ restaurantId, menuItems }),
      );

      const deliveryAddress = selectedVenue?.name ?? FALLBACK_DELIVERY_ADDRESS;
      const deliveryLat = selectedVenue?.latitude ?? FALLBACK_DELIVERY_LAT;
      const deliveryLng = selectedVenue?.longitude ?? FALLBACK_DELIVERY_LNG;

      setCalculatingPricing(true);
      try {
        const result = await coworkingService.getCartPricing(spaceSlug, {
          deliveryAddress,
          deliveryLocation: {
            latitude: Number(deliveryLat),
            longitude: Number(deliveryLng),
          },
          venueId: selectedVenue?.id,
          orderItems: flatOrderItems.length > 0 ? flatOrderItems : undefined,
          mealSessions: builtSessions.length > 0 ? builtSessions : undefined,
        });
        if (result.isValid)
          setPricing(result as unknown as CateringPricingResult);
      } catch {
        // silently ignore
      } finally {
        setCalculatingPricing(false);
      }
    },
    [spaceSlug, selectedVenue],
  );

  useEffect(() => {
    if (pricingDebounceRef.current) clearTimeout(pricingDebounceRef.current);
    pricingDebounceRef.current = setTimeout(() => {
      fetchPricing(mealSessions);
    }, 600);
    return () => {
      if (pricingDebounceRef.current) clearTimeout(pricingDebounceRef.current);
    };
  }, [mealSessions, fetchPricing]);

  const handlePdfDownload = async (withPrices: boolean) => {
    if (generatingPdf) return;
    setGeneratingPdf(true);

    try {
      const sessionsForPreview: LocalMealSession[] = mealSessions.map(
        (session) => ({
          sessionName: session.sessionName,
          sessionDate: session.sessionDate,
          eventTime: session.eventTime,
          orderItems: session.orderItems.map((orderItem) => ({
            item: {
              id: orderItem.item.id,
              menuItemName: orderItem.item.menuItemName,
              price: orderItem.item.price,
              discountPrice: orderItem.item.discountPrice,
              isDiscount: orderItem.item.isDiscount,
              image: orderItem.item.image,
              restaurantId: orderItem.item.restaurantId,
              cateringQuantityUnit: orderItem.item.cateringQuantityUnit,
              feedsPerUnit: orderItem.item.feedsPerUnit,
              categoryName: orderItem.item.categoryName,
              subcategoryName: orderItem.item.subcategoryName,
              selectedAddons: orderItem.item.selectedAddons,
              description: (orderItem.item as PdfPreviewItem).description,
              allergens: (orderItem.item as PdfPreviewItem).allergens,
              dietaryFilters: (orderItem.item as PdfPreviewItem).dietaryFilters,
            } satisfies PdfPreviewItem,
            quantity: orderItem.quantity,
          })),
        }),
      );

      const restaurantNameById = Object.fromEntries(
        restaurants.map((r) => [r.id, r.restaurant_name]),
      );
      const pdfAppliedPromotions = (pricing?.appliedPromotions || [])
        .map((p) => {
          const restaurantName = restaurantNameById[p.restaurantId];
          const label = restaurantName
            ? `${p.name} (${restaurantName})`
            : p.name;
          return { name: label, discountAmount: p.discount };
        })
        .filter((p) => p.discountAmount > 0);

      const pdfData = await transformLocalSessionsToPdfData(
        sessionsForPreview,
        withPrices,
        pricing?.deliveryFee || undefined,
        pricing?.promoDiscount || undefined,
        pdfAppliedPromotions.length > 0 ? pdfAppliedPromotions : undefined,
      );
      const blob = await pdf(
        <CateringMenuPdf
          sessions={pdfData.sessions}
          showPrices={pdfData.showPrices}
          deliveryCharge={pdfData.deliveryCharge}
          totalPrice={pricing?.total ?? pdfData.totalPrice}
          promoDiscount={pdfData.promoDiscount}
          appliedPromotions={pdfData.appliedPromotions}
          logoUrl={pdfData.logoUrl}
        />,
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = withPrices
        ? "catering-menu-with-prices.pdf"
        : "catering-menu.pdf";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setShowPdfModal(false);
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setGeneratingPdf(false);
    }
  };

  const activeSession = mealSessions[activeSessionIndex];
  const activeSessionHasItems = Boolean(activeSession?.orderItems.length);

  return (
    <div className="min-h-screen bg-base-100">
      {editingSessionIndex !== null && (
        <SessionEditor
          session={mealSessions[editingSessionIndex]}
          sessionIndex={editingSessionIndex}
          onUpdate={updateMealSession}
          onClose={handleEditorClose}
          restaurants={restaurants}
          eventStartDate={resolvedEventStartDate}
          eventStartTime={resolvedEventStartTime}
          eventEndDate={resolvedEventEndDate}
          eventEndTime={resolvedEventEndTime}
          existingDates={dayGroups
            .filter((d) => d.date !== "unscheduled")
            .map((d) => ({
              date: d.date,
              dayName: d.dayName,
              displayDate: d.displayDate,
            }))}
        />
      )}

      {/* Two-Column Layout */}
      <div className="flex flex-col md:flex-row px-2">
        {/* Left Column: Session Nav + Menu Browser — centered in remaining space */}
        <div className="flex-1 min-w-0 flex flex-col">
          <DateSessionNav
            navMode={navMode}
            dayGroups={dayGroups}
            selectedDayDate={selectedDayDate}
            currentDayGroup={currentDayGroup}
            expandedSessionIndex={activeSessionIndex}
            isNavSticky={isNavSticky}
            onDateClick={handleDateClick}
            onBackToDates={handleBackToDates}
            onSessionPillClick={handleSessionPillClick}
            onAddDay={handleAddDay}
            onAddSessionToDay={handleAddSessionToDay}
            formatTimeDisplay={formatTimeDisplay}
            addDayNavButtonRef={addDayNavButtonRef}
            backButtonRef={backButtonRef}
            firstDayTabRef={firstDayTabRef}
            firstSessionPillRef={firstSessionPillRef}
            addSessionNavButtonRef={addSessionNavButtonRef}
          />
          <div className="max-w-6xl mx-auto w-full px-2 md:px-6">
            <MenuBrowserColumn
              showBundleBrowser={showBundleBrowser}
              onToggleBundleBrowser={setShowBundleBrowser}
              sessionIndex={activeSessionIndex}
              sessionDate={mealSessions[activeSessionIndex]?.sessionDate}
              eventTime={mealSessions[activeSessionIndex]?.eventTime}
              defaultGuestCount={
                mealSessions[activeSessionIndex]?.guestCount ??
                eventDetails?.guestCount ??
                1
              }
              restaurants={restaurants}
              restaurantsLoading={restaurantsLoading}
              onAddItem={handleAddItem}
              onUpdateQuantity={handleUpdateQuantity}
              onAddOrderPress={handleAddOrderPress}
              getItemQuantity={getItemQuantity}
              expandedItemId={expandedItemId}
              setExpandedItemId={setExpandedItemId}
              selectedDietaryFilters={selectedDietaryFilters}
              toggleDietaryFilter={toggleDietaryFilter}
              categoriesRowRef={categoriesRowRef}
              restaurantListRef={restaurantListRef}
              firstMenuItemRef={firstMenuItemRef}
              expandedSessionIndex={activeSessionIndex}
              autoOpenFirstRestaurant={currentTutorialStep?.id === "menu-item"}
              tutorialResetKey={tutorialResetKey}
            />
          </div>
        </div>

        {/* Right Column: Basket — full-height sticky sidebar */}
        <div
          ref={basketColumnRef}
          className="hidden md:flex md:w-96 flex-shrink-0 flex-col sticky top-0 overflow-hidden"
          style={{ height: basketHeight }}
        >
          {activeSession && (
            <div className="flex h-full flex-col overflow-hidden">
              <ActiveSessionPanel
                session={activeSession}
                sessionIndex={activeSessionIndex}
                sessionTotal={getSessionTotal(activeSessionIndex)}
                sessionDiscount={
                  getSessionDiscount(activeSessionIndex).discount
                }
                sessionPromotion={
                  getSessionDiscount(activeSessionIndex).promotion
                }
                validationError={
                  sessionValidationErrors[activeSessionIndex] || null
                }
                isUnscheduled={!activeSession.sessionDate}
                canRemove={mealSessions.length > 1}
                onEditSession={() => setEditingSessionIndex(activeSessionIndex)}
                onRemoveSession={(e) =>
                  handleRemoveSession(activeSessionIndex, e)
                }
                onEditItem={handleEditItem}
                onRemoveItem={handleRemoveItem}
                onSwapItem={handleSwapItem}
                onRemoveBundle={handleRemoveBundle}
                collapsedCategories={collapsedCategories}
                onToggleCategory={handleToggleCategory}
                onViewMenu={handleViewMenu}
                isCurrentSessionValid={isCurrentSessionValid}
                totalPrice={getTotalPrice()}
                onCheckout={handleCheckout}
                showCheckoutButton={false}
                restaurants={restaurants}
                className="flex-1 min-h-0"
              />
              <div className="flex-shrink-0 flex flex-col gap-1.5 pb-4 pt-2">
                {desktopCheckoutNotice && (
                  <div className="hidden md:block">{desktopCheckoutNotice}</div>
                )}
                {totalItems > 0 && (
                  <div className="px-2 pb-1 border-t border-base-300 pt-3">
                    <PricingSummary
                      pricing={pricing}
                      calculatingPricing={calculatingPricing}
                      compact
                    />
                  </div>
                )}
                <div className="flex w-full items-stretch gap-2">
                  {mealSessions.length > 0 && (
                    <div className="relative flex-shrink-0">
                      <button
                        ref={desktopMenuBtnRef}
                        onClick={() => {
                          if (
                            !isDesktopCartMenuOpen &&
                            desktopMenuBtnRef.current
                          ) {
                            const rect =
                              desktopMenuBtnRef.current.getBoundingClientRect();
                            setDesktopMenuPos({
                              bottom: window.innerHeight - rect.top + 8,
                              left: rect.left,
                            });
                          }
                          setIsDesktopCartMenuOpen((v) => !v);
                        }}
                        className="flex h-full items-center justify-center rounded-lg border border-base-300 px-3 text-base-content/60 transition-colors hover:bg-base-200"
                        title="More options"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                      {isDesktopCartMenuOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => setIsDesktopCartMenuOpen(false)}
                          />
                          <div
                            className="fixed z-50 w-44 overflow-hidden rounded-xl border border-base-200 bg-white shadow-lg"
                            style={{
                              bottom: desktopMenuPos.bottom,
                              left: desktopMenuPos.left,
                            }}
                          >
                            <button
                              onClick={() => {
                                setIsDesktopCartMenuOpen(false);
                                handleViewMenu();
                              }}
                              disabled={generatingPdf || !hasAnyItems}
                              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-gray-700 transition-colors hover:bg-base-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {generatingPdf ? (
                                <span className="loading loading-spinner loading-xs" />
                              ) : (
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-4 w-4"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                                  />
                                </svg>
                              )}
                              Download Menu
                            </button>
                            <button
                              onClick={() => {
                                setIsDesktopCartMenuOpen(false);
                                setIsClearAllConfirmOpen(true);
                              }}
                              className="flex w-full items-center gap-2 border-t border-base-200 px-3 py-2.5 text-left text-sm text-red-600 transition-colors hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                              Clear Cart
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                  <button
                    onClick={handleCheckout}
                    disabled={disableCheckoutWhenEmpty && !hasAnyItems}
                    className={`flex flex-1 items-center justify-between rounded-lg px-3 py-3 text-sm font-semibold text-white transition-colors ${disableCheckoutWhenEmpty && !hasAnyItems
                      ? "cursor-not-allowed bg-base-300 text-base-content/50"
                      : isCurrentSessionValid
                        ? "bg-primary hover:bg-primary/90"
                        : "bg-warning hover:bg-warning/90"
                      }`}
                  >
                    <div>
                      <span className="text-xs opacity-90">Total</span>
                      <span className="ml-1.5 font-bold">
                        £{getTotalPrice().toFixed(2)}
                      </span>
                    </div>
                    <span className="text-xs">
                      {disableCheckoutWhenEmpty && !hasAnyItems
                        ? "Add items to continue"
                        : isCurrentSessionValid
                          ? "Checkout"
                          : "Min. Order Not Met"}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {mealSessions.some((session) => session.orderItems.length > 0) && (
        <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
          <div className="flex justify-center items-center gap-2 px-4 pb-2">
            <div className="flex flex-col items-center rounded-2xl border border-base-200 bg-white/50 px-3 py-1.5 shadow-sm backdrop-blur-sm">
              <span className="text-xs font-semibold text-gray-800">
                {mealSessions[activeSessionIndex]?.sessionName}
              </span>
              <span className="text-[10px] text-gray-500">
                {mealSessions[activeSessionIndex]?.sessionDate
                  ? new Date(
                    mealSessions[activeSessionIndex].sessionDate,
                  ).toLocaleDateString("en-GB", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })
                  : "Date not set"}
                {mealSessions[activeSessionIndex]?.eventTime &&
                  ` · ${formatTimeDisplay(mealSessions[activeSessionIndex].eventTime)}`}
              </span>
            </div>
            <div className="relative">
              <button
                onClick={() => setIsMobileCartMenuOpen((v) => !v)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-base-200 bg-white/70 text-gray-700 shadow-sm backdrop-blur-sm transition-colors hover:bg-white"
                title="More actions"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
              {isMobileCartMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsMobileCartMenuOpen(false)}
                  />
                  <div className="absolute bottom-full right-0 z-50 mb-2 w-44 overflow-hidden rounded-xl border border-base-200 bg-white shadow-lg">
                    <button
                      onClick={() => {
                        setIsMobileCartMenuOpen(false);
                        handleViewMenu();
                      }}
                      disabled={generatingPdf || !hasAnyItems}
                      className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-gray-700 transition-colors hover:bg-base-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                      </svg>
                      Download Menu
                    </button>
                    <button
                      onClick={() => {
                        setIsMobileCartMenuOpen(false);
                        handleRestartTutorial();
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-gray-700 transition-colors hover:bg-base-100"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Tutorial
                    </button>
                    <div className="mx-3 border-t border-base-200" />
                    <button
                      onClick={() => {
                        setIsMobileCartMenuOpen(false);
                        setIsClearAllConfirmOpen(true);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-red-600 transition-colors hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      Clear Cart
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="bg-primary p-4">
            <button
              onClick={() => setIsViewOrderOpen(true)}
              className="flex w-full items-center justify-between text-white"
            >
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5" />
                <span className="font-semibold">View Order</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold">
                  £{getTotalPrice().toFixed(2)}
                </span>
                <span className="text-sm opacity-80">{totalItems} items</span>
              </div>
            </button>
          </div>
        </div>
      )}

      <ViewOrderModal
        isOpen={isViewOrderOpen}
        onClose={() => setIsViewOrderOpen(false)}
        mealSessions={mealSessions}
        activeSessionIndex={activeSessionIndex}
        onSessionChange={setActiveSessionIndex}
        getSessionTotal={getSessionTotal}
        getSessionDiscount={getSessionDiscount}
        validationErrors={sessionValidationErrors}
        onEditSession={(index) => {
          setIsViewOrderOpen(false);
          setEditingSessionIndex(index);
        }}
        onRemoveSession={(index, e) => handleRemoveSession(index, e)}
        onEditItem={handleEditItem}
        onRemoveItem={handleRemoveItem}
        onSwapItem={handleSwapItem}
        onRemoveBundle={handleRemoveBundle}
        collapsedCategories={collapsedCategories}
        onToggleCategory={handleToggleCategory}
        onViewMenu={handleViewMenu}
        generatingPdf={generatingPdf}
        isCurrentSessionValid={isCurrentSessionValid}
        totalPrice={getTotalPrice()}
        onCheckout={handleCheckout}
        canRemoveSession={() => mealSessions.length > 1}
        formatTimeDisplay={formatTimeDisplay}
        navMode={navMode}
        dayGroups={dayGroups}
        selectedDayDate={selectedDayDate}
        currentDayGroup={currentDayGroup}
        onDateClick={handleDateClick}
        onBackToDates={handleBackToDates}
        onAddDay={handleAddDay}
        onAddSessionToDay={handleAddSessionToDay}
        restaurants={restaurants}
        pricing={pricing}
        calculatingPricing={calculatingPricing}
      />

      {isEditModalOpen && editingItemIndex !== null && activeSession && (
        <MenuItemModal
          item={activeSession.orderItems[editingItemIndex].item as MenuItem}
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingItemIndex(null);
          }}
          quantity={activeSession.orderItems[editingItemIndex].quantity}
          isEditMode={true}
          editingIndex={editingItemIndex}
          onAddItem={handleSaveEditedItem}
          onRemoveItem={(index) => {
            removeMenuItemByIndex(activeSessionIndex, index);
            setIsEditModalOpen(false);
            setEditingItemIndex(null);
          }}
        />
      )}

      {pendingItem && (
        <MenuItemModal
          item={pendingItem}
          isOpen={true}
          onClose={() => setPendingItem(null)}
          quantity={0}
          onAddItem={(item) => {
            handleAddItem(item);
            setPendingItem(null);
          }}
        />
      )}

      {emptySessionIndex !== null && (
        <EmptySessionWarningModal
          sessionName={
            mealSessions[emptySessionIndex]?.sessionName || "Session"
          }
          onRemove={handleRemoveEmptySession}
          onAddItems={handleAddItemsToEmptySession}
        />
      )}

      {removeItemIndex !== null && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <X className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Remove Item</h3>
                <p className="text-sm text-gray-500">
                  {mealSessions[activeSessionIndex]?.orderItems[removeItemIndex]
                    ?.item.menuItemName || "Item"}
                </p>
              </div>
            </div>
            <p className="mb-6 text-gray-600">
              Are you sure you want to remove this item from your order?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setRemoveItemIndex(null)}
                className="flex-1 rounded-xl border border-base-300 px-4 py-3 font-medium text-gray-600 transition-colors hover:bg-base-100"
              >
                Cancel
              </button>
              <button
                onClick={confirmRemoveItem}
                className="flex-1 rounded-xl bg-red-500 px-4 py-3 font-medium text-white transition-colors hover:bg-red-600"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {sessionToRemove !== null && (
        <RemoveSessionConfirmModal
          sessionName={mealSessions[sessionToRemove]?.sessionName || "Session"}
          onConfirm={confirmRemoveSession}
          onCancel={() => setSessionToRemove(null)}
        />
      )}

      {isClearAllConfirmOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Clear Cart</h3>
                <p className="text-sm text-gray-500">
                  Remove all items and sessions
                </p>
              </div>
            </div>
            <p className="mb-6 text-gray-600">
              This will delete every session and remove all items you&apos;ve
              added, returning your order to a single empty session. This action
              cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setIsClearAllConfirmOpen(false)}
                className="flex-1 rounded-xl border border-base-300 px-4 py-3 font-medium text-gray-600 transition-colors hover:bg-base-100"
              >
                Cancel
              </button>
              <button
                onClick={handleClearAllItems}
                className="flex-1 rounded-xl bg-red-500 px-4 py-3 font-medium text-white transition-colors hover:bg-red-600"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {minOrderModalSession !== null && (
        <MinOrderModal
          sessionName={
            mealSessions[minOrderModalSession.index]?.sessionName || "Session"
          }
          validationStatus={minOrderModalSession.validation}
          onClose={() => setMinOrderModalSession(null)}
          onNavigateToSection={handleMinOrderNavigate}
        />
      )}

      {showPdfModal && (
        <PdfDownloadModal
          onDownload={handlePdfDownload}
          onClose={() => setShowPdfModal(false)}
          isGenerating={generatingPdf}
        />
      )}

      {bundleToRemove !== null && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <Package className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  Remove Bundle
                </h3>
                <p className="text-sm text-gray-500">{bundleToRemove.name}</p>
              </div>
            </div>
            <p className="mb-6 text-gray-600">
              Are you sure you want to remove this bundle? All items from this
              bundle will be removed from the session.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setBundleToRemove(null)}
                className="flex-1 rounded-xl border border-base-300 px-4 py-3 font-medium text-gray-600 transition-colors hover:bg-base-100"
              >
                Cancel
              </button>
              <button
                onClick={confirmRemoveBundle}
                className="flex-1 rounded-xl bg-red-500 px-4 py-3 font-medium text-white transition-colors hover:bg-red-600"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {swapItemIndex !== null && activeSession && (
        <SwapItemModal
          currentItem={activeSession.orderItems[swapItemIndex].item as MenuItem}
          currentQuantity={activeSession.orderItems[swapItemIndex].quantity}
          alternatives={swapAlternatives}
          isOpen={true}
          onClose={() => {
            setSwapItemIndex(null);
            setSwapAlternatives([]);
          }}
          onSwap={handleConfirmSwap}
        />
      )}

      <TutorialTooltip
        step={currentTutorialStep}
        onNext={handleTutorialNext}
        onSkip={handleSkipTutorial}
        currentStepIndex={tutorialStep ?? 0}
        totalSteps={getTutorialSteps().length}
      />

      <div className="fixed bottom-4 left-4 z-40 md:bottom-8 md:left-8">
        {isTutorialHintVisible && (
          <div className="absolute bottom-14 left-0 w-64 rounded-2xl border border-base-300 bg-white p-3 shadow-xl md:bottom-16">
            <div className="absolute -bottom-2 left-7 h-4 w-4 rotate-45 border-b border-r border-base-300 bg-white" />
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  Need a quick walkthrough?
                </p>
                <p className="mt-1 text-xs text-gray-600">
                  Use this button any time to restart the onboarding guide.
                </p>
              </div>
              <button
                onClick={() => setIsTutorialHintVisible(false)}
                className="text-gray-400 transition-colors hover:text-gray-600"
                aria-label="Dismiss tutorial hint"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
            <label className="mt-3 flex items-center gap-2 text-xs text-gray-600">
              <input
                type="checkbox"
                checked={isTutorialHintDisabled}
                onChange={(e) =>
                  handleTutorialHintDisabledChange(e.target.checked)
                }
                className="checkbox checkbox-xs"
              />
              Don&apos;t show this again
            </label>
          </div>
        )}

        <button
          onClick={handleRestartTutorial}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-base-300 bg-white text-gray-500 shadow-lg transition-colors hover:border-primary hover:text-primary md:h-12 md:w-12"
          title="Restart Tutorial"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 md:h-6 md:w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
