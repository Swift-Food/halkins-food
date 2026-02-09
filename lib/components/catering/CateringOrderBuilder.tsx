"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useCatering } from "@/context/CateringContext";
import { cateringService } from "@/services/api/catering.api";
import MenuItemCard from "./MenuItemCard";
import MenuItemModal from "./MenuItemModal";
import { MenuItem } from "@/types/restaurant.types";
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
import CheckoutBar from "./CheckoutBar";
import MinOrderModal from "./modals/MinOrderModal";
import PdfDownloadModal from "./modals/PdfDownloadModal";

// Hooks
import { useCateringData } from "./hooks/useCateringData";

// Helpers
import { formatTimeDisplay, getMinDate, getMaxDate } from "./catering-order-helpers";

// Icons
import { ShoppingBag, Clock, Calendar } from "lucide-react";

const PRESET_TIMES = [
  { value: "11:00", label: "11:00 AM" },
  { value: "13:00", label: "1:00 PM" },
  { value: "18:00", label: "6:00 PM" },
];

export default function CateringOrderBuilder() {
  const searchParams = useSearchParams();
  const {
    mealSessions,
    updateMealSession,
    addMenuItem,
    updateItemQuantity,
    removeMenuItemByIndex,
    updateMenuItemByIndex,
    getTotalPrice,
    setCurrentStep,
  } = useCatering();

  // Session editing state (for modal fallback)
  const [editingSessionIndex, setEditingSessionIndex] = useState<number | null>(null);

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

  // Min order modal state
  const [minOrderModalSession, setMinOrderModalSession] = useState<{
    index: number;
    validation: typeof validationStatus;
  } | null>(null);

  // Catering hours validation errors
  const [sessionValidationErrors, setSessionValidationErrors] = useState<Record<number, string>>({});

  // Refs
  const categoriesRowRef = useRef<HTMLDivElement>(null);
  const firstMenuItemRef = useRef<HTMLDivElement>(null);

  // The single session is always index 0
  const session = mealSessions[0];

  // Use custom hooks
  const {
    categories,
    selectedCategory,
    selectedSubcategory,
    categoriesLoading,
    categoriesError,
    handleCategoryClick,
    handleSubcategoryClick,
    menuItems,
    menuItemsLoading,
    menuItemsError,
    restaurants,
  } = useCateringData({ expandedSessionIndex: 0 });

  // Get quantity for an item in the current session
  const getItemQuantity = (itemId: string): number => {
    if (!session) return 0;
    const orderItem = session.orderItems.find((oi) => oi.item.id === itemId);
    return orderItem?.quantity || 0;
  };

  // Handle adding item to cart
  const handleAddItem = (item: MenuItem) => {
    const BACKEND_QUANTITY_UNIT = item.cateringQuantityUnit || 7;
    const portionQuantity = item.portionQuantity || 1;
    const quantity = portionQuantity * BACKEND_QUANTITY_UNIT;

    addMenuItem(0, {
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
    updateItemQuantity(0, itemId, quantity);
  };

  // Handle opening modal for add/edit
  const handleAddOrderPress = (item: MenuItem) => {
    setExpandedItemId(item.id);
  };

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

            addMenuItem(0, {
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
          updateMealSession(0, {
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
    if (!session || restaurants.length === 0) {
      return [];
    }
    return validateSessionMinOrders(session, restaurants);
  }, [session, restaurants]);

  // Check if current session meets all minimum order requirements
  const isCurrentSessionValid = useMemo(() => {
    return validationStatus.every((status) => status.isValid);
  }, [validationStatus]);

  const totalItems = session?.orderItems.length || 0;

  // Handle navigation from min order modal to a specific section
  const handleMinOrderNavigate = (_restaurantId: string, section: string) => {
    if (!minOrderModalSession) return;

    setMinOrderModalSession(null);

    const matchingCategory = categories.find(
      (cat) => cat.name.toLowerCase() === section.toLowerCase()
    );
    if (matchingCategory) {
      handleCategoryClick(matchingCategory);
    }
  };

  // Handle editor close
  const handleEditorClose = (cancelled: boolean) => {
    if (editingSessionIndex !== null && !cancelled) {
      setSessionValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[editingSessionIndex];
        return newErrors;
      });
    }
    setEditingSessionIndex(null);
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
    removeMenuItemByIndex(0, itemIndex);
  };

  // Handle save edited item
  const handleSaveEditedItem = (updatedItem: MenuItem) => {
    if (editingItemIndex === null) return;

    const BACKEND_QUANTITY_UNIT = updatedItem.cateringQuantityUnit || 7;
    const quantity = (updatedItem.portionQuantity || 1) * BACKEND_QUANTITY_UNIT;

    const originalItem = session.orderItems[editingItemIndex].item;

    updateMenuItemByIndex(0, editingItemIndex, {
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

  // Inline date/time change handlers
  const handleDateChange = (newDate: string) => {
    updateMealSession(0, { sessionDate: newDate });
    setSessionValidationErrors({});
  };

  const handleTimeChange = (newTime: string) => {
    updateMealSession(0, { eventTime: newTime });
    setSessionValidationErrors({});
  };

  // Handle checkout
  const handleCheckout = () => {
    // Check minimum order requirements
    if (session.orderItems.length > 0) {
      const sessionValidation = validateSessionMinOrders(session, restaurants);
      const hasUnmetRequirements = sessionValidation.some(
        (status) => !status.isValid
      );

      if (hasUnmetRequirements) {
        setMinOrderModalSession({
          index: 0,
          validation: sessionValidation,
        });
        return;
      }
    }

    // Check for missing date/time
    const hasItems = session.orderItems.length > 0;
    const missingDate = !session.sessionDate;
    const missingTime = !session.eventTime;

    if (hasItems && (missingDate || missingTime)) {
      setEditingSessionIndex(0);
      return;
    }

    // Validate catering hours
    if (session.orderItems.length > 0) {
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
          (schedule: any) => schedule.day.toLowerCase() === dayOfWeek
        );

        if (!daySchedule || !daySchedule.enabled) {
          setSessionValidationErrors({
            0: `${restaurant.restaurant_name} does not accept event orders on ${dayOfWeek}s. Please select a different date.`,
          });
          return;
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

            setSessionValidationErrors({
              0: `${restaurant.restaurant_name} accepts event orders on ${dayOfWeek}s between ${formatTimeRange(openHour, openMinute)} and ${formatTimeRange(closeHour, closeMinute)}. Please select a time within these hours.`,
            });
            return;
          }
        }
      }
    }

    setSessionValidationErrors({});
    setCurrentStep(2);
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
        (s) => ({
          sessionName: s.sessionName,
          sessionDate: s.sessionDate,
          eventTime: s.eventTime,
          orderItems: s.orderItems.map((orderItem) => ({
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

  return (
    <div className="min-h-screen bg-base-100">
      {/* Session Editor Modal (fallback for checkout validation) */}
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
                {session?.sessionDate
                  ? new Date(session.sessionDate + "T00:00:00").toLocaleDateString("en-GB", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    })
                  : "No date set"}
                {session?.eventTime ? ` • ${formatTimeDisplay(session.eventTime)}` : ""}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xl md:text-2xl font-bold text-primary">
                £{getTotalPrice().toFixed(2)}
              </p>
              <p className="text-xs md:text-sm text-gray-500">
                {totalItems} item{totalItems !== 1 ? "s" : ""}
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

        {/* Inline Date & Time Picker */}
        <div className="bg-white rounded-xl shadow-sm border border-base-200 p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-gray-800">Event Date & Time</h3>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="date"
                  value={session?.sessionDate || ""}
                  onChange={(e) => handleDateChange(e.target.value)}
                  min={getMinDate()}
                  max={getMaxDate()}
                  className="w-full pl-9 pr-4 py-2.5 border border-base-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary appearance-none bg-white text-sm"
                  style={{ WebkitAppearance: "none" }}
                />
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">Time</label>
              <select
                value={session?.eventTime || ""}
                onChange={(e) => handleTimeChange(e.target.value)}
                className="w-full px-4 py-2.5 border border-base-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
              >
                <option value="">Select a time</option>
                {PRESET_TIMES.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Validation Error Banner */}
        {sessionValidationErrors[0] && (
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
                {sessionValidationErrors[0]}
              </p>
            </div>
          </div>
        )}

        {/* Selected Items */}
        {session?.orderItems.length > 0 && (
          <div className="mb-4 min-w-0 overflow-hidden">
            <SelectedItemsByCategory
              sessionIndex={0}
              onEdit={handleEditItem}
              onRemove={handleRemoveItem}
              collapsedCategories={collapsedCategories}
              onToggleCategory={handleToggleCategory}
              onViewMenu={handleViewMenu}
            />
          </div>
        )}

        {/* Categories & Menu */}
        <div>
          {/* Categories Row */}
          <div ref={categoriesRowRef} className="pt-2 pb-1">
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

          {/* Subcategories Row */}
          {selectedCategory && selectedCategory.subcategories.length > 0 && (
            <div className="sticky top-0 z-30 bg-white pb-1 pt-1">
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
                      ref={itemIdx === 0 ? firstMenuItemRef : undefined}
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
      </div>

      {/* Edit Item Modal */}
      {isEditModalOpen && editingItemIndex !== null && (
        <MenuItemModal
          item={
            session.orderItems[editingItemIndex].item as MenuItem
          }
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingItemIndex(null);
          }}
          quantity={session.orderItems[editingItemIndex].quantity}
          isEditMode={true}
          editingIndex={editingItemIndex}
          onAddItem={handleSaveEditedItem}
          onRemoveItem={(index) => {
            removeMenuItemByIndex(0, index);
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

      {/* Min Order Modal */}
      {minOrderModalSession !== null && (
        <MinOrderModal
          sessionName={session?.sessionName || "Session"}
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
      {session?.orderItems.length > 0 && (
        <CheckoutBar
          isCurrentSessionValid={isCurrentSessionValid}
          totalPrice={getTotalPrice()}
          onCheckout={handleCheckout}
        />
      )}
    </div>
  );
}
