"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useCatering } from "@/context/CateringContext";
import { MealSessionState } from "@/types/catering.types";
import { cateringService } from "@/services/api/catering.api";
import MenuItemCard from "./MenuItemCard";
import MenuItemModal from "./MenuItemModal";
import { MenuItem } from "@/types/restaurant.types";
import TutorialTooltip from "./TutorialTooltip";
import SelectedItemsByCategory from "./SelectedItemsByCategory";
import {
  LocalMealSession,
  transformLocalSessionsToPdfData,
} from "@/lib/utils/menuPdfUtils";
import { pdf } from "@react-pdf/renderer";
import { CateringMenuPdf } from "@/lib/components/pdf/CateringMenuPdf";
import { validateSessionMinOrders } from "@/lib/utils/catering-min-order-validation";

// Extracted components
import SessionEditor from "./SessionEditor";
import SessionAccordion from "./SessionAccordion";
import DateSessionNav from "./DateSessionNav";
import CheckoutBar from "./CheckoutBar";
import AddDayModal from "./modals/AddDayModal";
import EmptySessionWarningModal from "./modals/EmptySessionWarningModal";
import RemoveSessionConfirmModal from "./modals/RemoveSessionConfirmModal";
import MinOrderModal from "./modals/MinOrderModal";
import PdfDownloadModal from "./modals/PdfDownloadModal";

// Hooks
import { useCateringTutorial } from "./hooks/useCateringTutorial";
import { useCateringData } from "./hooks/useCateringData";

// Helpers
import { groupSessionsByDay, formatTimeDisplay } from "./catering-order-helpers";

// Icons
import { Plus, Clock, ShoppingBag, Calendar } from "lucide-react";

export default function CateringOrderBuilder() {
  const searchParams = useSearchParams();
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
    getTotalPrice,
    setCurrentStep,
  } = useCatering();

  // Session editing state
  const [editingSessionIndex, setEditingSessionIndex] = useState<number | null>(null);
  const [isNewSession, setIsNewSession] = useState(false);

  // Navigation state
  const [navMode, setNavMode] = useState<"dates" | "sessions">("dates");
  const [selectedDayDate, setSelectedDayDate] = useState<string | null>(null);
  const [expandedSessionIndex, setExpandedSessionIndex] = useState<number | null>(0);

  // Add day modal state
  const [isAddDayModalOpen, setIsAddDayModalOpen] = useState(false);
  const [newDayDate, setNewDayDate] = useState("");

  // Refs for scroll-to behavior
  const sessionAccordionRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const dayRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Sticky nav detection
  const [isNavSticky, setIsNavSticky] = useState(false);

  // Menu items state
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  // Edit item state
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Pending item modal state
  const [pendingItem, setPendingItem] = useState<MenuItem | null>(null);

  // Collapsed categories state
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  // PDF generation state
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);

  // Empty session warning modal state
  const [emptySessionIndex, setEmptySessionIndex] = useState<number | null>(null);

  // Remove session confirmation modal state
  const [sessionToRemove, setSessionToRemove] = useState<number | null>(null);

  // Min order modal state
  const [minOrderModalSession, setMinOrderModalSession] = useState<{
    index: number;
    validation: typeof validationStatus;
  } | null>(null);

  // Catering hours validation errors
  const [sessionValidationErrors, setSessionValidationErrors] = useState<Record<number, string>>({});

  // Tutorial refs
  const addDayButtonRef = useRef<HTMLButtonElement>(null);
  const addDayNavButtonRef = useRef<HTMLButtonElement>(null);
  const backButtonRef = useRef<HTMLButtonElement>(null);
  const firstDayTabRef = useRef<HTMLButtonElement>(null);
  const firstSessionPillRef = useRef<HTMLButtonElement>(null);
  const addSessionNavButtonRef = useRef<HTMLButtonElement>(null);
  const categoriesRowRef = useRef<HTMLDivElement>(null);
  const firstMenuItemRef = useRef<HTMLDivElement>(null);

  // Use custom hooks
  const {
    categories,
    selectedCategory,
    selectedSubcategory,
    categoriesLoading,
    categoriesError,
    handleCategoryClick,
    handleSubcategoryClick,
    selectMainsCategory,
    menuItems,
    menuItemsLoading,
    menuItemsError,
    restaurants,
  } = useCateringData({ expandedSessionIndex });

  const {
    tutorialStep,
    tutorialPhase,
    currentTutorialStep,
    handleTutorialNext,
    handleSkipTutorial,
    triggerNavigationTutorial,
    resetTutorial,
    getTutorialSteps,
  } = useCateringTutorial({
    mealSessions,
    refs: {
      addDayNavButtonRef,
      backButtonRef,
      firstDayTabRef,
      firstSessionPillRef,
      addSessionNavButtonRef,
      categoriesRowRef,
      firstMenuItemRef,
    },
  });

  // Get quantity for an item in the current session
  const getItemQuantity = (itemId: string): number => {
    const session = mealSessions[activeSessionIndex];
    if (!session) return 0;
    const orderItem = session.orderItems.find((oi) => oi.item.id === itemId);
    return orderItem?.quantity || 0;
  };

  // Handle adding item to cart
  const handleAddItem = (item: MenuItem) => {
    const BACKEND_QUANTITY_UNIT = item.cateringQuantityUnit || 7;
    const portionQuantity = item.portionQuantity || 1;
    const quantity = portionQuantity * BACKEND_QUANTITY_UNIT;

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
        categoryId: selectedCategory?.id,
        categoryName: selectedCategory?.name,
        subcategoryId: selectedSubcategory?.id || item.subcategoryId,
        subcategoryName: selectedSubcategory?.name || item.subcategoryName,
      },
      quantity,
    });
    setExpandedItemId(null);
  };

  // Handle updating item quantity
  const handleUpdateQuantity = (itemId: string, quantity: number) => {
    updateItemQuantity(activeSessionIndex, itemId, quantity);
  };

  // Handle opening modal for add/edit
  const handleAddOrderPress = (item: MenuItem) => {
    setExpandedItemId(item.id);
  };

  // Detect when sticky nav becomes stuck
  useEffect(() => {
    const handleScroll = () => {
      setIsNavSticky(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Prefill cart from bundle query parameter
  useEffect(() => {
    const bundleId = searchParams.get("bundleId");
    if (!bundleId) return;

    const sessionDate = searchParams.get("sessionDate");
    const sessionTime = searchParams.get("sessionTime");

    const prefillFromBundle = async () => {
      try {
        const bundle = await cateringService.getBundleById(bundleId);
        const response = await cateringService.getMenuItems();
        const allMenuItems = (response || []).map((item: any) => ({
          id: item.id,
          menuItemName: item.name,
          description: item.description,
          price: item.price?.toString() || "0",
          discountPrice: item.discountPrice?.toString(),
          isDiscount: item.isDiscount || false,
          image: item.image,
          averageRating: item.averageRating?.toString(),
          restaurantId: item.restaurantId || "",
          cateringQuantityUnit: item.cateringQuantityUnit || 7,
          feedsPerUnit: item.feedsPerUnit || 10,
          groupTitle: item.groupTitle,
          status: item.status,
          itemDisplayOrder: item.itemDisplayOrder,
          addons: Array.isArray(item.addons) ? item.addons : [],
          allergens: Array.isArray(item.allergens) ? item.allergens : [],
          restaurant: {
            id: item.restaurantId,
            name: item.restaurant?.restaurant_name || "Unknown",
            restaurantId: item.restaurantId,
            menuGroupSettings: item.restaurant?.menuGroupSettings,
          },
          dietaryFilters: item.dietaryFilters,
        }));

        bundle.items.forEach((bundleItem) => {
          const menuItem = allMenuItems.find(
            (item: MenuItem) => item.id === bundleItem.menuItemId
          );

          if (menuItem) {
            const itemWithAddons: MenuItem = {
              ...menuItem,
              selectedAddons: bundleItem.selectedAddons,
            };

            addMenuItem(activeSessionIndex, {
              item: itemWithAddons,
              quantity: bundleItem.quantity,
            });
          } else {
            console.warn(
              `Menu item ${bundleItem.menuItemId} not found in loaded menu items`
            );
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Check for pending item from menu view
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

  // Validate minimum order requirements for current session
  const validationStatus = useMemo(() => {
    const activeSession = mealSessions[activeSessionIndex];
    if (!activeSession || restaurants.length === 0) {
      return [];
    }
    return validateSessionMinOrders(activeSession, restaurants);
  }, [mealSessions, activeSessionIndex, restaurants]);

  // Check if current session meets all minimum order requirements
  const isCurrentSessionValid = useMemo(() => {
    return validationStatus.every((status) => status.isValid);
  }, [validationStatus]);

  // Group sessions by day for timeline view
  const dayGroups = useMemo(() => {
    return groupSessionsByDay(mealSessions, getSessionTotal);
  }, [mealSessions, getSessionTotal]);

  // Get the current day group based on selected date
  const currentDayGroup = useMemo(() => {
    if (!selectedDayDate) return null;
    return dayGroups.find((g) => g.date === selectedDayDate) || null;
  }, [dayGroups, selectedDayDate]);

  // Handle clicking a date tab
  const handleDateClick = (dayDate: string) => {
    setSelectedDayDate(dayDate);
    setNavMode("sessions");
    setTimeout(() => {
      const element = dayRefs.current.get(dayDate);
      if (element) {
        const headerOffset = 60;
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
        window.scrollTo({
          top: offsetPosition,
          behavior: "smooth",
        });
      }
    }, 150);
  };

  // Handle back to dates view
  const handleBackToDates = () => {
    if (selectedDayDate && currentDayGroup) {
      const sessionsToRemove = currentDayGroup.sessions
        .filter(({ session }) => session.orderItems.length === 0 && !session.eventTime)
        .map(({ index }) => index)
        .sort((a, b) => b - a);

      sessionsToRemove.forEach((index) => {
        removeMealSession(index);
      });
    }
    setNavMode("dates");
    setSelectedDayDate(null);
  };

  // Handle session pill click
  const handleSessionPillClick = (sessionIndex: number) => {
    setExpandedSessionIndex(sessionIndex);
    setActiveSessionIndex(sessionIndex);
    setTimeout(() => {
      const element = sessionAccordionRefs.current.get(sessionIndex);
      if (element) {
        const headerOffset = 60;
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
        window.scrollTo({
          top: offsetPosition,
          behavior: "smooth",
        });
      }
    }, 150);
  };

  // Toggle session accordion
  const toggleSessionExpand = (sessionIndex: number) => {
    setExpandedSessionIndex((prev) =>
      prev === sessionIndex ? null : sessionIndex
    );
    setActiveSessionIndex(sessionIndex);
  };

  // Handle navigation from min order modal to a specific section
  const handleMinOrderNavigate = (_restaurantId: string, section: string) => {
    if (!minOrderModalSession) return;

    const sessionIndex = minOrderModalSession.index;
    const session = mealSessions[sessionIndex];

    // Close the modal
    setMinOrderModalSession(null);

    // Ensure the session is expanded and active
    setExpandedSessionIndex(sessionIndex);
    setActiveSessionIndex(sessionIndex);

    // Set nav mode to sessions and select the correct day
    if (session?.sessionDate) {
      setSelectedDayDate(session.sessionDate);
      setNavMode("sessions");
    }

    // Try to find and select a category that matches the section name
    const matchingCategory = categories.find(
      (cat) => cat.name.toLowerCase() === section.toLowerCase()
    );
    if (matchingCategory) {
      handleCategoryClick(matchingCategory);
    }

    // Scroll to the session accordion
    setTimeout(() => {
      const element = sessionAccordionRefs.current.get(sessionIndex);
      if (element) {
        const headerOffset = 60;
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
        window.scrollTo({
          top: offsetPosition,
          behavior: "smooth",
        });
      }
    }, 150);
  };

  // Handle adding a new day
  const handleAddDay = () => {
    setNewDayDate("");
    setIsAddDayModalOpen(true);
  };

  // Handle confirm add day
  const handleConfirmAddDay = () => {
    if (!newDayDate) {
      alert("Please select a date.");
      return;
    }

    const existingDay = dayGroups.find((g) => g.date === newDayDate);
    if (existingDay) {
      alert("This date already has sessions. Please select a different date.");
      return;
    }

    const newSession: MealSessionState = {
      sessionName: "New Session",
      sessionDate: newDayDate,
      eventTime: "",
      orderItems: [],
    };
    addMealSession(newSession);

    const newIndex = mealSessions.length;
    setIsAddDayModalOpen(false);
    setSelectedDayDate(newDayDate);
    setNavMode("sessions");
    setExpandedSessionIndex(newIndex);
    selectMainsCategory();

    setTimeout(() => {
      setEditingSessionIndex(newIndex);
      setActiveSessionIndex(newIndex);
      setIsNewSession(true);
    }, 100);
  };

  // Handle adding session to a day
  const handleAddSessionToDay = (dayDate: string) => {
    const newSession: MealSessionState = {
      sessionName: `Session ${mealSessions.length + 1}`,
      sessionDate: dayDate,
      eventTime: "",
      orderItems: [],
    };
    addMealSession(newSession);

    const newIndex = mealSessions.length;
    setActiveSessionIndex(newIndex);
    setExpandedSessionIndex(newIndex);
    selectMainsCategory();

    setTimeout(() => {
      setEditingSessionIndex(newIndex);
      setIsNewSession(true);
      const element = sessionAccordionRefs.current.get(newIndex);
      if (element) {
        const headerOffset = 80;
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
        window.scrollTo({
          top: offsetPosition,
          behavior: "smooth",
        });
      }
    }, 150);
  };

  // Calculate totals
  const totalDays = dayGroups.filter((g) => g.date !== "unscheduled").length;
  const totalSessions = mealSessions.length;
  const totalItems = mealSessions.reduce((acc, s) => acc + s.orderItems.length, 0);

  // Handle editor close
  const handleEditorClose = (cancelled: boolean) => {
    const sessionIndex = editingSessionIndex;
    const wasNewSession = isNewSession;

    if (cancelled && isNewSession && sessionIndex !== null) {
      removeMealSession(sessionIndex);
    }

    if (sessionIndex !== null && !cancelled) {
      setSessionValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[sessionIndex];
        return newErrors;
      });
    }

    setEditingSessionIndex(null);
    setIsNewSession(false);

    if (sessionIndex !== null && !cancelled) {
      setExpandedSessionIndex(sessionIndex);
      setTimeout(() => {
        const element = sessionAccordionRefs.current.get(sessionIndex);
        if (element) {
          const headerOffset = 80;
          const elementPosition = element.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
          window.scrollTo({
            top: offsetPosition,
            behavior: "smooth",
          });
        }
      }, 150);

      if (wasNewSession && tutorialPhase === "initial") {
        triggerNavigationTutorial();
      }
    }
  };

  // Handle remove session
  const handleRemoveSession = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessionToRemove(index);
  };

  const confirmRemoveSession = () => {
    if (sessionToRemove !== null) {
      removeMealSession(sessionToRemove);
      setEditingSessionIndex(null);
      setSessionToRemove(null);
    }
  };

  // Toggle collapsed category
  const handleToggleCategory = (categoryName: string) => {
    setCollapsedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(categoryName)) {
        newSet.delete(categoryName);
      } else {
        newSet.add(categoryName);
      }
      return newSet;
    });
  };

  // Handle edit item from cart
  const handleEditItem = (itemIndex: number) => {
    setEditingItemIndex(itemIndex);
    setIsEditModalOpen(true);
  };

  // Handle remove item from cart
  const handleRemoveItem = (itemIndex: number) => {
    removeMenuItemByIndex(activeSessionIndex, itemIndex);
  };

  // Handle save edited item
  const handleSaveEditedItem = (updatedItem: MenuItem) => {
    if (editingItemIndex === null) return;

    const BACKEND_QUANTITY_UNIT = updatedItem.cateringQuantityUnit || 7;
    const quantity = (updatedItem.portionQuantity || 1) * BACKEND_QUANTITY_UNIT;

    const originalItem =
      mealSessions[activeSessionIndex].orderItems[editingItemIndex].item;

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
    });

    setIsEditModalOpen(false);
    setEditingItemIndex(null);
  };

  // Handle checkout
  const handleCheckout = () => {
    // Check for empty sessions
    if (mealSessions.length > 1) {
      const emptyIndex = mealSessions.findIndex(
        (session) => session.orderItems.length === 0
      );
      if (emptyIndex !== -1) {
        setEmptySessionIndex(emptyIndex);
        return;
      }
    }

    // Check minimum order requirements
    for (let i = 0; i < mealSessions.length; i++) {
      const session = mealSessions[i];
      if (session.orderItems.length === 0) continue;

      const sessionValidation = validateSessionMinOrders(session, restaurants);
      const hasUnmetRequirements = sessionValidation.some(
        (status) => !status.isValid
      );

      if (hasUnmetRequirements) {
        setActiveSessionIndex(i);
        setMinOrderModalSession({
          index: i,
          validation: sessionValidation,
        });
        return;
      }
    }

    // Check for missing date/time
    for (let i = 0; i < mealSessions.length; i++) {
      const session = mealSessions[i];
      const hasItems = session.orderItems.length > 0;
      const missingDate = !session.sessionDate;
      const missingTime = !session.eventTime;

      if (hasItems && (missingDate || missingTime)) {
        setActiveSessionIndex(i);
        setEditingSessionIndex(i);
        return;
      }
    }

    // Validate catering hours
    const errors: Record<number, string> = {};
    for (let i = 0; i < mealSessions.length; i++) {
      const session = mealSessions[i];
      if (session.orderItems.length === 0) continue;

      const restaurantIds = new Set(
        session.orderItems.map((oi) => oi.item.restaurantId)
      );

      for (const restaurantId of restaurantIds) {
        const restaurant = restaurants.find((r) => r.id === restaurantId);
        if (!restaurant) continue;

        const cateringHours = restaurant.cateringOperatingHours;
        if (!cateringHours || cateringHours.length === 0) continue;

        const selectedDateTime = new Date(session.sessionDate + "T00:00:00");
        const dayOfWeek = selectedDateTime
          .toLocaleDateString("en-US", { weekday: "long" })
          .toLowerCase();

        const daySchedule = cateringHours.find(
          (schedule : any) => schedule.day.toLowerCase() === dayOfWeek
        );

        if (!daySchedule || !daySchedule.enabled) {
          errors[
            i
          ] = `${restaurant.restaurant_name} does not accept event orders on ${dayOfWeek}s. Please select a different date for this session.`;
          break;
        }

        if (daySchedule.open && daySchedule.close && session.eventTime) {
          const [eventHour, eventMinute] = session.eventTime
            .split(":")
            .map(Number);
          const [openHour, openMinute] = daySchedule.open.split(":").map(Number);
          const [closeHour, closeMinute] = daySchedule.close
            .split(":")
            .map(Number);

          const eventMinutes = eventHour * 60 + eventMinute;
          const openMinutes = openHour * 60 + openMinute;
          const closeMinutes = closeHour * 60 + closeMinute;

          if (eventMinutes < openMinutes || eventMinutes > closeMinutes) {
            const formatTimeRange = (hour: number, minute: number) => {
              const period = hour >= 12 ? "PM" : "AM";
              const hour12 = hour % 12 || 12;
              return `${hour12}:${minute.toString().padStart(2, "0")} ${period}`;
            };

            errors[
              i
            ] = `${restaurant.restaurant_name} accepts event orders on ${dayOfWeek}s between ${formatTimeRange(openHour, openMinute)} and ${formatTimeRange(closeHour, closeMinute)}. Please select a time within these hours for this session.`;
            break;
          }
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      setSessionValidationErrors(errors);
      const firstErrorSessionIndex = parseInt(Object.keys(errors)[0]);
      setActiveSessionIndex(firstErrorSessionIndex);
      setExpandedSessionIndex(firstErrorSessionIndex);
      setTimeout(() => {
        const element = sessionAccordionRefs.current.get(firstErrorSessionIndex);
        if (element) {
          const headerOffset = 80;
          const elementPosition = element.getBoundingClientRect().top;
          const offsetPosition =
            elementPosition + window.pageYOffset - headerOffset;
          window.scrollTo({
            top: offsetPosition,
            behavior: "smooth",
          });
        }
      }, 150);
      return;
    }

    setSessionValidationErrors({});
    setCurrentStep(2);
  };

  // Handle remove empty session
  const handleRemoveEmptySession = () => {
    if (emptySessionIndex !== null) {
      removeMealSession(emptySessionIndex);
      setEmptySessionIndex(null);
    }
  };

  // Handle add items to empty session
  const handleAddItemsToEmptySession = () => {
    if (emptySessionIndex !== null) {
      const session = mealSessions[emptySessionIndex];
      const sessionDate = session?.sessionDate;

      setActiveSessionIndex(emptySessionIndex);

      if (sessionDate) {
        setSelectedDayDate(sessionDate);
        setNavMode("sessions");
      }

      setExpandedSessionIndex(emptySessionIndex);
      setEmptySessionIndex(null);

      setTimeout(() => {
        const element = sessionAccordionRefs.current.get(emptySessionIndex);
        if (element) {
          const headerOffset = 80;
          const elementPosition = element.getBoundingClientRect().top;
          const offsetPosition =
            elementPosition + window.pageYOffset - headerOffset;
          window.scrollTo({
            top: offsetPosition,
            behavior: "smooth",
          });
        }
      }, 150);
    }
  };

  // Handle view menu - opens modal to choose with/without prices
  const handleViewMenu = () => {
    setShowPdfModal(true);
  };

  // Handle PDF download with selected price option
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
              description: (orderItem.item as any).description,
              allergens: (orderItem.item as any).allergens,
              dietaryFilters: (orderItem.item as any).dietaryFilters,
            },
            quantity: orderItem.quantity,
          })),
        })
      );

      const pdfData = await transformLocalSessionsToPdfData(
        sessionsForPreview,
        withPrices
      );

      const blob = await pdf(
        <CateringMenuPdf
          sessions={pdfData.sessions}
          showPrices={pdfData.showPrices}
          deliveryCharge={pdfData.deliveryCharge}
          totalPrice={pdfData.totalPrice}
          logoUrl={pdfData.logoUrl}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = withPrices ? "catering-menu-with-prices.pdf" : "catering-menu.pdf";
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

  // Render validation error banner
  const renderValidationErrorBanner = (index: number) => {
    if (!sessionValidationErrors[index]) return null;

    return (
      <div className="mb-4 p-4 bg-red-50 border-2 border-red-500 rounded-xl flex items-start gap-3">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6 text-red-500 flex-shrink-0 mt-0.5"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            clipRule="evenodd"
          />
        </svg>
        <div className="flex-1">
          <p className="text-sm font-semibold text-red-800 mb-1">
            Catering Hours Conflict
          </p>
          <p className="text-sm text-red-700">
            {sessionValidationErrors[index]}
          </p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setEditingSessionIndex(index);
            }}
            className="mt-3 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
          >
            Edit Session Time
          </button>
        </div>
      </div>
    );
  };

  // Render categories and subcategories
  const renderCategoriesSection = (sessionIndex: number) => (
    <div>
      {/* Categories Row */}
      <div
        ref={expandedSessionIndex === sessionIndex ? categoriesRowRef : undefined}
        className="-mx-3 px-3 md:-mx-5 md:px-5 pt-2 pb-1"
      >
        <div>
          {categoriesLoading ? (
            <div className="flex items-center gap-3 overflow-x-auto pb-2">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="flex-shrink-0 w-28 h-10 bg-base-200 rounded-full animate-pulse"
                />
              ))}
            </div>
          ) : categoriesError ? (
            <div className="text-center py-4 text-red-500">
              {categoriesError}
            </div>
          ) : (
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => handleCategoryClick(category)}
                  className={`
                    flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all
                    ${
                      selectedCategory?.id === category.id
                        ? "bg-primary text-white"
                        : "bg-base-200 text-gray-700 hover:bg-base-300"
                    }
                  `}
                >
                  {category.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Subcategories Row */}
      {selectedCategory && selectedCategory.subcategories.length > 0 && (
        <div className="sticky top-[67px] z-30 bg-white pb-1 pt-1 -mx-3 px-3 md:-mx-5 md:px-5">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <span className="flex-shrink-0 text-xs text-gray-500 mr-1">
              {selectedCategory.name}:
            </span>
            {selectedCategory.subcategories.map((subcategory) => (
              <button
                key={subcategory.id}
                onClick={() => handleSubcategoryClick(subcategory)}
                className={`
                  flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all border border-primary/50
                  ${
                    selectedSubcategory?.id === subcategory.id
                      ? "bg-primary text-white"
                      : "bg-white text-primary hover:bg-secondary/20"
                  }
                `}
              >
                {subcategory.name}
                {selectedSubcategory?.id === subcategory.id && (
                  <span className="ml-1.5 inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-white/20">
                    ×
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Menu Items */}
      <div className="bg-base-100 rounded-xl p-4 mt-2">
        {menuItemsLoading ? (
          <div className="text-center py-4">
            <div className="inline-block w-6 h-6 border-3 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="mt-2 text-sm text-gray-500">Loading...</p>
          </div>
        ) : menuItemsError ? (
          <div className="text-center py-4 text-red-500 text-sm">
            {menuItemsError}
          </div>
        ) : !selectedCategory ? (
          <div className="text-center py-6">
            <ShoppingBag className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">
              Select a category to browse items
            </p>
          </div>
        ) : menuItems.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-gray-500 text-sm">
              No items available for{" "}
              {selectedSubcategory?.name || selectedCategory.name}
            </p>
          </div>
        ) : (
          <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-3">
              {selectedSubcategory?.name || selectedCategory.name}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {menuItems.map((item, itemIdx) => (
                <div
                  key={item.id}
                  ref={
                    expandedSessionIndex === sessionIndex && itemIdx === 0
                      ? firstMenuItemRef
                      : undefined
                  }
                >
                  <MenuItemCard
                    item={item}
                    quantity={getItemQuantity(item.id)}
                    isExpanded={expandedItemId === item.id}
                    onToggleExpand={() =>
                      setExpandedItemId(
                        expandedItemId === item.id ? null : item.id
                      )
                    }
                    onAddItem={handleAddItem}
                    onUpdateQuantity={handleUpdateQuantity}
                    onAddOrderPress={handleAddOrderPress}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Render session content (selected items + categories/menu)
  const renderSessionContent = (
    session: MealSessionState,
    index: number,
    isUnscheduled: boolean = false
  ) => (
    <SessionAccordion
      key={index}
      session={session}
      isExpanded={expandedSessionIndex === index}
      onToggle={() => toggleSessionExpand(index)}
      sessionTotal={getSessionTotal(index)}
      accordionRef={(el) => {
        if (el) sessionAccordionRefs.current.set(index, el);
        else sessionAccordionRefs.current.delete(index);
      }}
      onEditSession={() => {
        setEditingSessionIndex(index);
      }}
      onRemoveSession={(e) => handleRemoveSession(index, e)}
      canRemove={isUnscheduled ? mealSessions.length > 1 : true}
    >
      {renderValidationErrorBanner(index)}

      {session.orderItems.length > 0 && (
        <div className="mb-4 min-w-0 overflow-hidden">
          <SelectedItemsByCategory
            sessionIndex={index}
            onEdit={handleEditItem}
            onRemove={handleRemoveItem}
            collapsedCategories={collapsedCategories}
            onToggleCategory={handleToggleCategory}
            onViewMenu={handleViewMenu}
          />
        </div>
      )}

      {renderCategoriesSection(index)}
    </SessionAccordion>
  );

  return (
    <div className="min-h-screen bg-base-100">
      {/* Sticky Navigation */}
      <DateSessionNav
        navMode={navMode}
        dayGroups={dayGroups}
        selectedDayDate={selectedDayDate}
        currentDayGroup={currentDayGroup}
        expandedSessionIndex={expandedSessionIndex}
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

      {/* Session Editor Modal */}
      {editingSessionIndex !== null && (
        <SessionEditor
          session={mealSessions[editingSessionIndex]}
          sessionIndex={editingSessionIndex}
          onUpdate={updateMealSession}
          onClose={handleEditorClose}
          restaurants={restaurants}
        />
      )}

      <div className="max-w-6xl mx-auto p-2">
        {/* Summary Card */}
        <div className="flex gap-3 mb-6">
          <div className="flex-1 bg-white rounded-xl shadow-sm border border-base-200 p-3 md:p-4 flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-gray-500">
                {totalDays > 0
                  ? `${totalDays} day${totalDays !== 1 ? "s" : ""}`
                  : "No days scheduled"}{" "}
                • {totalSessions} session{totalSessions !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xl md:text-2xl font-bold text-primary">
                £{getTotalPrice().toFixed(2)}
              </p>
              <p className="text-xs md:text-sm text-gray-500">
                {totalItems} items total
              </p>
            </div>
          </div>

          {/* Download Menu Button */}
          {totalItems > 0 && (
            <button
              onClick={handleViewMenu}
              disabled={generatingPdf}
              className="flex-shrink-0 bg-white rounded-xl shadow-sm border border-base-200 p-4 flex flex-col items-center justify-center hover:border-primary hover:bg-primary/5 transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generatingPdf ? (
                <>
                  <span className="loading loading-spinner loading-sm text-primary"></span>
                  <span className="hidden md:block text-xs text-gray-500 mt-1">
                    Generating...
                  </span>
                </>
              ) : (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 text-primary"
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
                  <span className="hidden md:block text-xs text-gray-500 mt-1 group-hover:text-primary transition-colors">
                    Download Menu
                  </span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Timeline */}
        <div className="relative mb-8">
          {/* Timeline Line */}
          <div className="absolute left-[23px] top-8 bottom-8 w-0.5 bg-primary/20 hidden md:block" />

          {/* Unscheduled Sessions */}
          {dayGroups.find((day) => day.date === "unscheduled") && (
            <div className="relative mb-8">
              <div className="flex flex-col md:flex-row md:gap-4">
                <div className="hidden md:flex flex-shrink-0 w-12 h-12 rounded-xl bg-amber-500 flex-col items-center justify-center z-10 shadow-lg">
                  <Clock className="w-6 h-6 text-white" />
                </div>

                <div className="flex-1 md:bg-amber-50 md:rounded-2xl md:p-4 border border-amber-200 rounded-xl">
                  <div className="mb-3 flex items-start gap-3 p-3 md:p-0">
                    <div className="md:hidden flex-shrink-0 w-11 h-11 rounded-xl bg-amber-500 text-white flex items-center justify-center">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800">
                        Unscheduled Sessions
                      </h3>
                      <p className="text-sm text-amber-600">
                        Set date & time to continue
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 px-3 pb-3 md:px-0 md:pb-0">
                    {dayGroups
                      .find((day) => day.date === "unscheduled")
                      ?.sessions.map(({ session, index }) =>
                        renderSessionContent(session, index, true)
                      )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Scheduled Days */}
          {dayGroups
            .filter((day) => day.date !== "unscheduled")
            .map((day) => (
              <div
                key={day.date}
                ref={(el) => {
                  if (el) dayRefs.current.set(day.date, el);
                  else dayRefs.current.delete(day.date);
                }}
                className="relative mb-8 last:mb-0"
              >
                <div className="flex flex-col md:flex-row md:gap-4">
                  <div className="hidden md:flex flex-shrink-0 w-12 h-12 rounded-xl bg-primary flex-col items-center justify-center z-10 shadow-lg">
                    <span className="text-xs font-medium text-white/80">
                      {day.dayName}
                    </span>
                    <span className="text-sm font-bold text-white">
                      {day.displayDate.split(" ")[0]}
                    </span>
                  </div>

                  <div className="flex-1 md:bg-primary/5 md:rounded-2xl md:p-4">
                    <div className="mb-3 flex items-start gap-3">
                      <div className="md:hidden flex-shrink-0 w-11 h-11 rounded-xl bg-primary text-white flex flex-col items-center justify-center">
                        <span className="text-[10px] font-medium leading-tight">
                          {day.dayName}
                        </span>
                        <span className="text-sm font-bold leading-tight">
                          {day.displayDate.split(" ")[0]}
                        </span>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-800">
                          {day.fullDate}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {day.sessions.length} session
                          {day.sessions.length !== 1 ? "s" : ""} • £
                          {day.total.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {day.sessions.map(({ session, index }) =>
                        renderSessionContent(session, index)
                      )}
                    </div>
                  </div>
                </div>

                {day.date !== "unscheduled" && (
                  <div className="md:ml-16 mt-3">
                    <button
                      onClick={() => handleAddSessionToDay(day.date)}
                      className="w-full p-3 rounded-xl border-2 border-dashed border-base-300 text-gray-400 hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span className="text-sm font-medium">
                        Add Session to {day.displayDate}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            ))}

          {/* Add Day Button */}
          <div className={`relative mt-6 ${totalDays > 0 ? "md:ml-14" : ""}`}>
            <button
              ref={addDayButtonRef}
              onClick={handleAddDay}
              className="w-full p-4 rounded-xl border-2 border-dashed border-base-300 text-gray-400 hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
            >
              <Calendar className="w-5 h-5" />
              <span className="font-medium">Add Day</span>
            </button>
          </div>
        </div>
      </div>

      {/* Edit Item Modal */}
      {isEditModalOpen && editingItemIndex !== null && (
        <MenuItemModal
          item={
            mealSessions[activeSessionIndex].orderItems[editingItemIndex]
              .item as MenuItem
          }
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingItemIndex(null);
          }}
          quantity={
            mealSessions[activeSessionIndex].orderItems[editingItemIndex]
              .quantity
          }
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

      {/* Pending Item Modal */}
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

      {/* Add Day Modal */}
      <AddDayModal
        isOpen={isAddDayModalOpen}
        newDayDate={newDayDate}
        onDateChange={setNewDayDate}
        onConfirm={handleConfirmAddDay}
        onClose={() => setIsAddDayModalOpen(false)}
      />

      {/* Empty Session Warning Modal */}
      {emptySessionIndex !== null && (
        <EmptySessionWarningModal
          sessionName={mealSessions[emptySessionIndex]?.sessionName || "Session"}
          onRemove={handleRemoveEmptySession}
          onAddItems={handleAddItemsToEmptySession}
        />
      )}

      {/* Remove Session Confirmation Modal */}
      {sessionToRemove !== null && (
        <RemoveSessionConfirmModal
          sessionName={mealSessions[sessionToRemove]?.sessionName || "Session"}
          onConfirm={confirmRemoveSession}
          onCancel={() => setSessionToRemove(null)}
        />
      )}

      {/* Min Order Modal */}
      {minOrderModalSession !== null && (
        <MinOrderModal
          sessionName={mealSessions[minOrderModalSession.index]?.sessionName || "Session"}
          validationStatus={minOrderModalSession.validation}
          onClose={() => setMinOrderModalSession(null)}
          onNavigateToSection={handleMinOrderNavigate}
        />
      )}

      {/* PDF Download Modal */}
      {showPdfModal && (
        <PdfDownloadModal
          onDownload={handlePdfDownload}
          onClose={() => setShowPdfModal(false)}
          isGenerating={generatingPdf}
        />
      )}

      {/* Checkout Button */}
      {mealSessions.some((s) => s.orderItems.length > 0) && (
        <CheckoutBar
          isCurrentSessionValid={isCurrentSessionValid}
          totalPrice={getTotalPrice()}
          onCheckout={handleCheckout}
        />
      )}

      {/* Tutorial Tooltip */}
      <TutorialTooltip
        step={currentTutorialStep}
        onNext={handleTutorialNext}
        onSkip={handleSkipTutorial}
        currentStepIndex={tutorialStep ?? 0}
        totalSteps={getTutorialSteps().length}
      />

      {/* Tutorial Help Button */}
      <button
        onClick={() => {
          resetTutorial();
          setNavMode("dates");
          setSelectedDayDate(null);
        }}
        className="fixed bottom-4 left-4 md:bottom-8 md:left-8 w-10 h-10 md:w-12 md:h-12 bg-white border border-base-300 rounded-full shadow-lg flex items-center justify-center text-gray-500 hover:text-primary hover:border-primary transition-colors z-40"
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
  );
}
