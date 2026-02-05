/**
 * Menu PDF Utility
 *
 * Generates a printable HTML menu view for catering orders.
 * Uses browser's native print dialog for PDF generation.
 */

import { CateringOrderResponse } from "@/types/api";
import { PricingOrderItem } from "@/types/api/pricing.api.types";

/**
 * Process a menu item and return PDF items
 */
interface ProcessedPdfItem {
  item: PdfMenuItem;
  itemTotal: number;
}

function processMenuItemForPdf(
  menuItem: any,
  imageMap: Map<string, string | null>
): ProcessedPdfItem[] {
  const originalImageUrl = menuItem.menuItemImage;
  const base64Image = originalImageUrl ? imageMap.get(originalImageUrl) : null;
  const image = base64Image || originalImageUrl;

  const selectedAddons = menuItem.selectedAddons || [];

  const addons = selectedAddons.map((addon: any) => ({
    name: addon.name,
    quantity: addon.quantity || 1,
    price: addon.customerUnitPrice || addon.price,
    groupTitle: addon.groupTitle,
    allergens: addon.allergens,
    dietaryRestrictions: addon.dietaryRestrictions,
  }));

  return [{
    item: {
      quantity: menuItem.quantity,
      name: menuItem.menuItemName,
      description: menuItem.description,
      allergens: menuItem.allergens,
      dietaryFilters: menuItem.dietaryFilters,
      unitPrice: menuItem.customerUnitPrice,
      image,
      addons: addons.length > 0 ? addons : undefined,
      cateringQuantityUnit: menuItem.cateringQuantityUnit || 1,
      feedsPerUnit: menuItem.feedsPerUnit || 1,
    },
    itemTotal: menuItem.customerTotalPrice || 0,
  }];
}

interface MenuItemForPdf {
  name: string;
  quantity: number;
  cateringQuantityUnit: number;
  feedsPerUnit: number;
  price: number;
  restaurantName: string;
  categoryName?: string;
  subcategoryName?: string;
  image?: string;
  addons?: Array<{
    name: string;
    quantity: number;
    price: number;
    groupTitle?: string;
  }>;
}

interface MealSessionForPdf {
  sessionName: string;
  sessionDate: string;
  eventTime: string;
  items: MenuItemForPdf[];
  sessionTotal: number;
}

/**
 * Format time from 24h to 12h format
 */
const formatTime = (time: string): string => {
  if (!time) return "";
  const [hours, minutes] = time.split(":");
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
};

/**
 * Format date for display
 */
const formatDate = (date: string | Date): string => {
  return new Date(date).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

/**
 * Extract menu items from order items (splits by protein choice)
 */
const extractMenuItems = (orderItems: PricingOrderItem[]): MenuItemForPdf[] => {
  const items: MenuItemForPdf[] = [];

  orderItems.forEach((restaurant) => {
    restaurant.menuItems.forEach((item: any) => {
      type AddonType = { name: string; quantity: number; price: number; groupTitle?: string };
      const allAddons: AddonType[] = (item.selectedAddons || []).map((addon: any) => ({
        name: addon.name,
        quantity: addon.quantity || 1,
        price: addon.customerUnitPrice || addon.price || 0,
        groupTitle: addon.groupTitle,
      }));

      items.push({
        name: item.menuItemName || item.name,
        quantity: item.quantity,
        cateringQuantityUnit: item.cateringQuantityUnit || 1,
        feedsPerUnit: item.feedsPerUnit || 1,
        price: item.customerTotalPrice || 0,
        restaurantName: restaurant.restaurantName,
        categoryName: item.categoryName || item.groupTitle,
        subcategoryName: item.subcategory?.name,
        image: item.menuItemImage,
        addons: allAddons.length > 0 ? allAddons : undefined,
      });
    });
  });

  return items;
};

interface SubcategoryGroup {
  items: MenuItemForPdf[];
}

interface CategoryGroup {
  items: MenuItemForPdf[]; // Items without subcategory
  subcategories: Map<string, SubcategoryGroup>;
}

/**
 * Group items by category and subcategory, sorted by category order
 */
const groupItemsByCategory = (
  items: MenuItemForPdf[],
  categoryOrder: string[] = []
): Map<string, CategoryGroup> => {
  const grouped = new Map<string, CategoryGroup>();

  items.forEach((item) => {
    const category = item.categoryName || "Other Items";
    const subcategory = item.subcategoryName || "";

    if (!grouped.has(category)) {
      grouped.set(category, { items: [], subcategories: new Map() });
    }

    const categoryGroup = grouped.get(category)!;

    if (subcategory) {
      if (!categoryGroup.subcategories.has(subcategory)) {
        categoryGroup.subcategories.set(subcategory, { items: [] });
      }
      categoryGroup.subcategories.get(subcategory)!.items.push(item);
    } else {
      categoryGroup.items.push(item);
    }
  });

  // Sort categories by the order from the API
  if (categoryOrder.length > 0) {
    const sortedMap = new Map<string, CategoryGroup>();
    const entries = Array.from(grouped.entries());

    entries.sort((a, b) => {
      const indexA = categoryOrder.indexOf(a[0]);
      const indexB = categoryOrder.indexOf(b[0]);
      // Put unknown categories at the end
      const orderA = indexA === -1 ? 999 : indexA;
      const orderB = indexB === -1 ? 999 : indexB;
      return orderA - orderB;
    });

    entries.forEach(([key, value]) => sortedMap.set(key, value));
    return sortedMap;
  }

  return grouped;
};

/**
 * Build HTML for a single menu item
 */
const buildItemHtml = (item: MenuItemForPdf): string => {
  const numUnits = item.quantity / item.cateringQuantityUnit;
  const totalFeeds = numUnits * item.feedsPerUnit;

  // Group addons by groupTitle
  let addonsHtml = "";
  if (item.addons && item.addons.length > 0) {
    const addonsByGroup: Record<
      string,
      Array<{ name: string; quantity: number }>
    > = {};
    item.addons.forEach((addon) => {
      const group = addon.groupTitle || "Options";
      if (!addonsByGroup[group]) {
        addonsByGroup[group] = [];
      }
      addonsByGroup[group].push({ name: addon.name, quantity: addon.quantity });
    });

    addonsHtml = Object.entries(addonsByGroup)
      .map(([groupTitle, addons]) => {
        const addonsList = addons
          .map((a) => `${a.name}${a.quantity > 1 ? ` ×${a.quantity}` : ""}`)
          .join(", ");
        return `<span style="font-weight: 500; color: #666;">${groupTitle}:</span> ${addonsList}`;
      })
      .join(" • ");
  }

  const imageHtml = item.image
    ? `<img src="${item.image}" alt="${item.name}" style="width: 64px; height: 64px; border-radius: 8px; object-fit: cover; flex-shrink: 0;" />`
    : "";

  return `
    <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
      <div style="display: flex; gap: 12px;">
        ${imageHtml}
        <div style="flex: 1; display: flex; justify-content: space-between; align-items: flex-start;">
          <div style="flex: 1;">
            <p style="font-weight: 600; font-size: 14px; color: #111; margin: 0 0 2px 0;">${
              item.name
            }</p>
            ${
              addonsHtml
                ? `<p style="font-size: 12px; color: #888; margin: 0 0 4px 0;">${addonsHtml}</p>`
                : ""
            }
            <p style="font-size: 12px; color: #666; margin: 0;">
              ${Math.round(numUnits)} portion${
    Math.round(numUnits) !== 1 ? "s" : ""
  } • Serves ~${Math.round(totalFeeds)} people
            </p>
          </div>
          <p style="font-weight: 700; color: #ec4899; font-size: 14px; margin: 0; white-space: nowrap;">
            £${Number(item.price).toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  `;
};

/**
 * Build HTML for a category group with subcategories
 */
const buildCategoryHtml = (
  categoryName: string,
  categoryGroup: CategoryGroup
): string => {
  // Count total items including subcategories
  const totalItems =
    categoryGroup.items.length +
    Array.from(categoryGroup.subcategories.values()).reduce(
      (sum, sub) => sum + sub.items.length,
      0
    );

  // Build items without subcategory
  const itemsHtml = categoryGroup.items.map(buildItemHtml).join("");

  // Build subcategories
  const subcategoriesHtml = Array.from(categoryGroup.subcategories.entries())
    .map(
      ([subName, subGroup]) => `
      <div style="margin-top: 16px;">
        <p style="font-size: 13px; font-weight: 600; color: #666; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.5px;">
          ${subName}
        </p>
        ${subGroup.items.map(buildItemHtml).join("")}
      </div>
    `
    )
    .join("");

  return `
    <div style="margin-bottom: 24px;">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid #ec4899;">
        <span style="font-size: 18px;">🍽️</span>
        <h3 style="font-size: 16px; font-weight: 700; color: #111; margin: 0;">
          ${categoryName}
          <span style="font-weight: 400; color: #888; font-size: 14px; margin-left: 8px;">
            (${totalItems} item${totalItems !== 1 ? "s" : ""})
          </span>
        </h3>
      </div>
      ${itemsHtml}
      ${subcategoriesHtml}
    </div>
  `;
};

/**
 * Build HTML for a meal session
 */
const buildSessionHtml = (
  session: MealSessionForPdf,
  categoryOrder: string[] = []
): string => {
  const groupedItems = groupItemsByCategory(session.items, categoryOrder);
  const categoriesHtml = Array.from(groupedItems.entries())
    .map(([category, categoryGroup]) =>
      buildCategoryHtml(category, categoryGroup)
    )
    .join("");

  return `
    <div style="margin-bottom: 32px; padding-bottom: 32px; border-bottom: 2px solid #e5e7eb;">
      <div style="margin-bottom: 16px;">
        <h2 style="font-size: 20px; font-weight: 700; color: #be185d; margin: 0 0 8px 0;">
          ${session.sessionName}
        </h2>
        <div style="display: flex; flex-wrap: wrap; gap: 16px; font-size: 13px; color: #666;">
          <span style="display: flex; align-items: center; gap: 4px;">
            📅 ${formatDate(session.sessionDate)}
          </span>
          <span style="display: flex; align-items: center; gap: 4px;">
            🕐 ${formatTime(session.eventTime)}
          </span>
        </div>
      </div>
      <div>
        ${categoriesHtml}
        <div style="padding-top: 16px; margin-top: 16px;">
          <div style="display: flex; justify-content: flex-end; font-size: 16px; font-weight: 700;">
            <span style="color: #374151; margin-right: 8px;">Sub Total:</span>
            <span style="color: #ec4899;">£${Number(
              session.sessionTotal
            ).toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  `;
};

/**
 * Build the complete printable menu HTML
 */
export async function buildMenuHTML(order: CateringOrderResponse): Promise<string> {
  const orderRef = order.id.substring(0, 4).toUpperCase();
  const hasMealSessions = order.mealSessions && order.mealSessions.length > 0;

  // Fetch category order from API
  let categoryOrder: string[] = [];
  try {
    const { categoryService } = await import("@/services/api/category.api");
    const categories = await categoryService.getCategoriesWithSubcategories();
    categoryOrder = categories.map((c) => c.name);
  } catch (error) {
    console.error("Failed to fetch categories for ordering:", error);
  }

  // Prepare meal sessions data
  let sessions: MealSessionForPdf[] = [];

  if (hasMealSessions) {
    sessions = order
      .mealSessions!.sort((a, b) => {
        const dateA = new Date(a.sessionDate);
        const dateB = new Date(b.sessionDate);
        if (dateA.getTime() !== dateB.getTime()) {
          return dateA.getTime() - dateB.getTime();
        }
        return a.eventTime.localeCompare(b.eventTime);
      })
      .map((session) => ({
        sessionName: session.sessionName,
        sessionDate:
          typeof session.sessionDate === "string"
            ? session.sessionDate
            : session.sessionDate.toISOString(),
        eventTime: session.eventTime,
        items: extractMenuItems(session.orderItems),
        sessionTotal: session.sessionTotal,
      }));
  } else {
    // Legacy format - single session
    const restaurantsData = order.restaurants || order.orderItems || [];
    sessions = [
      {
        sessionName: "Event Menu",
        sessionDate:
          typeof order.eventDate === "string"
            ? order.eventDate
            : order.eventDate.toISOString(),
        eventTime: order.eventTime,
        items: extractMenuItems(restaurantsData as PricingOrderItem[]),
        sessionTotal: order.finalTotal || order.customerFinalTotal || 0,
      },
    ];
  }

  const sessionsHtml = sessions
    .map((session) => buildSessionHtml(session, categoryOrder))
    .join("");

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Event Menu - #${orderRef}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            color: #222;
            background: #f3f4f6;
            line-height: 1.5;
            min-height: 100vh;
          }
          .container {
            max-width: 800px;
            margin: 0 auto;
            background: #fff;
            min-height: 100vh;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
          }
          @media print {
            .no-print { display: none !important; }
            body { background: #fff; margin: 0; padding: 0; }
            .container {
              box-shadow: none;
              max-width: 100%;
            }
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
          }
          @page {
            margin: 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <!-- Header -->
          <div style="background: #ec4899; padding: 32px; color: white;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px;">
              <div>
                <h1 style="font-size: 28px; font-weight: 700; margin: 0 0 8px 0;">Event Menu</h1>
                <p style="font-size: 14px; opacity: 0.9; margin: 0;">
                  Reference: <span style="font-family: monospace; font-weight: 700;">#${orderRef}</span>
                </p>
              </div>
              <div style="text-align: right;">
                <p style="font-size: 13px; opacity: 0.9; margin: 0 0 4px 0;">${
                  order.customerName
                }</p>
                ${
                  order.organization
                    ? `<p style="font-size: 12px; opacity: 0.8; margin: 0;">${order.organization}</p>`
                    : ""
                }
              </div>
            </div>
          </div>

          <!-- Download Button -->
          <div class="no-print" style="padding: 16px 32px; background: #fff; border-bottom: 1px solid #e5e7eb; text-align: center;">
            <button
              id="download-menu-btn"
              style="background: #ec4899; color: #fff; border: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 14px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); transition: all 0.2s;"
              onmouseover="this.style.background='#db2777'"
              onmouseout="this.style.background='#ec4899'"
            >
              📄 Download / Save as PDF
            </button>
          </div>

          <!-- Content -->
          <div style="padding: 32px;">
            ${sessionsHtml}

            <!-- Grand Total -->
            <div style="background: #fce7f3; border-radius: 12px; padding: 20px; margin-top: 16px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 18px; font-weight: 700; color: #be185d;">Grand Total:</span>
                <span style="font-size: 24px; font-weight: 700; color: #be185d;">
                  £${Number(
                    order.finalTotal || order.customerFinalTotal || 0
                  ).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div style="padding: 24px 32px; border-top: 1px solid #e5e7eb; background: #f9fafb;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
              <div style="display: flex; align-items: center; gap: 12px;">
                <img src="/logo.png" alt="Swift Food" style="height: 32px; width: auto;" />
                <div style="font-size: 12px; color: #666;">
                  <strong style="color: #333;">Swift Food Services</strong><br/>
                  Catering Made Simple
                </div>
              </div>
              <p style="font-size: 11px; color: #888;">
                Generated on ${new Date().toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        </div>

        <script>
          (function() {
            const btn = document.getElementById('download-menu-btn');
            if (!btn) return;
            btn.addEventListener('click', function() {
              try {
                window.print();
              } catch (e) {
                console.error('Print failed', e);
                alert('Unable to open print dialog.');
              }
            });
          })();
        </script>
      </body>
    </html>
  `;
}

/**
 * Opens the menu in a new window for viewing/printing
 */
export async function openMenuViewer(order: CateringOrderResponse): Promise<void> {
  const html = await buildMenuHTML(order);
  const newWindow = window.open("", "_blank");

  if (!newWindow) {
    alert("Popup blocked. Please allow popups to view the menu.");
    return;
  }

  newWindow.document.write(html);
  newWindow.document.close();
  newWindow.focus();
}

/**
 * Build menu HTML from local meal session state (for CateringOrderBuilder)
 * This version works with the local state format before order submission
 */
export interface LocalMealSession {
  sessionName: string;
  sessionDate: string;
  eventTime: string;
  orderItems: Array<{
    item: {
      id: string;
      menuItemName: string;
      price: string;
      discountPrice?: string;
      isDiscount?: boolean;
      image?: string;
      restaurantId?: string;
      cateringQuantityUnit?: number;
      feedsPerUnit?: number;
      categoryName?: string;
      subcategoryName?: string;
      description?: string;
      allergens?: string[];
      dietaryFilters?: string[];
      selectedAddons?: Array<{
        name: string;
        price: number;
        quantity: number;
        groupTitle?: string;
        allergens?: string | string[];
        dietaryRestrictions?: string[];
      }>;
    };
    quantity: number;
  }>;
}

export async function buildMenuHTMLFromLocalState(
  mealSessions: LocalMealSession[],
  customerName?: string,
  organization?: string
): Promise<string> {
  // Fetch category order from API
  let categoryOrder: string[] = [];
  try {
    const { categoryService } = await import("@/services/api/category.api");
    const categories = await categoryService.getCategoriesWithSubcategories();
    categoryOrder = categories.map((c) => c.name);
  } catch (error) {
    console.error("Failed to fetch categories for ordering:", error);
  }

  const sessions: MealSessionForPdf[] = mealSessions
    .filter((session) => session.orderItems.length > 0)
    .sort((a, b) => {
      if (!a.sessionDate || !b.sessionDate) return 0;
      const dateA = new Date(a.sessionDate);
      const dateB = new Date(b.sessionDate);
      if (dateA.getTime() !== dateB.getTime()) {
        return dateA.getTime() - dateB.getTime();
      }
      return (a.eventTime || "").localeCompare(b.eventTime || "");
    })
    .map((session) => {
      let sessionTotal = 0;
      const items: MenuItemForPdf[] = session.orderItems.map((orderItem) => {
        const item = orderItem.item;
        const price = parseFloat(item.price || "0");
        const discountPrice = parseFloat(item.discountPrice || "0");
        const unitPrice =
          item.isDiscount && discountPrice > 0 ? discountPrice : price;
        const itemTotal = unitPrice * orderItem.quantity;

        const addonTotal = (item.selectedAddons || []).reduce(
          (sum, addon) => sum + (addon.price || 0) * (addon.quantity || 0),
          0
        );

        sessionTotal += itemTotal + addonTotal;

        return {
          name: item.menuItemName,
          quantity: orderItem.quantity,
          cateringQuantityUnit: item.cateringQuantityUnit || 7,
          feedsPerUnit: item.feedsPerUnit || 10,
          price: itemTotal + addonTotal,
          restaurantName: "Restaurant", // Not available in local state
          categoryName: item.categoryName,
          subcategoryName: item.subcategoryName,
          image: item.image,
          addons: item.selectedAddons?.map((addon) => ({
            name: addon.name,
            quantity: addon.quantity,
            price: addon.price,
            groupTitle: addon.groupTitle,
            allergens: addon.allergens,
            dietaryRestrictions: addon.dietaryRestrictions,
          })),
        };
      });

      return {
        sessionName: session.sessionName || "Menu Session",
        sessionDate: session.sessionDate || new Date().toISOString(),
        eventTime: session.eventTime || "12:00",
        items,
        sessionTotal,
      };
    });

  const grandTotal = sessions.reduce((sum, s) => sum + s.sessionTotal, 0);
  const sessionsHtml = sessions
    .map((session) => buildSessionHtml(session, categoryOrder))
    .join("");

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Event Menu Preview</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            color: #222;
            background: #f3f4f6;
            line-height: 1.5;
            min-height: 100vh;
          }
          .container {
            max-width: 800px;
            margin: 0 auto;
            background: #fff;
            min-height: 100vh;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
          }
          @media print {
            .no-print { display: none !important; }
            body { background: #fff; margin: 0; padding: 0; }
            .container {
              box-shadow: none;
              max-width: 100%;
            }
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
          }
          @page {
            margin: 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <!-- Header -->
          <div style="background: #ec4899; padding: 32px; color: white;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px;">
              <div>
                <h1 style="font-size: 28px; font-weight: 700; margin: 0 0 8px 0;">Event Menu Preview</h1>
                <p style="font-size: 14px; opacity: 0.9; margin: 0;">
                  This is a preview of your order
                </p>
              </div>
              <div style="text-align: right;">
                ${
                  customerName
                    ? `<p style="font-size: 13px; opacity: 0.9; margin: 0 0 4px 0;">${customerName}</p>`
                    : ""
                }
                ${
                  organization
                    ? `<p style="font-size: 12px; opacity: 0.8; margin: 0;">${organization}</p>`
                    : ""
                }
              </div>
            </div>
          </div>

          <!-- Download Button -->
          <div class="no-print" style="padding: 16px 32px; background: #fff; border-bottom: 1px solid #e5e7eb; text-align: center;">
            <button
              id="download-menu-btn"
              style="background: #ec4899; color: #fff; border: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 14px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); transition: all 0.2s;"
              onmouseover="this.style.background='#db2777'"
              onmouseout="this.style.background='#ec4899'"
            >
              📄 Download / Save as PDF
            </button>
          </div>

          <!-- Content -->
          <div style="padding: 32px;">
            ${
              sessions.length > 0
                ? sessionsHtml
                : `
              <div style="text-align: center; padding: 48px; color: #666;">
                <p style="font-size: 18px; margin-bottom: 8px;">No items in your order yet</p>
                <p style="font-size: 14px;">Add items to your sessions to see them here</p>
              </div>
            `
            }

            ${
              sessions.length > 0
                ? `
              <!-- Total Catering Cost -->
              <div style="background: #fce7f3; border-radius: 12px; padding: 20px; margin-top: 16px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span style="font-size: 18px; font-weight: 700; color: #be185d;">Total Catering Cost:</span>
                  <span style="font-size: 24px; font-weight: 700; color: #be185d;">
                    £${grandTotal.toFixed(2)}
                  </span>
                </div>
              </div>
            `
                : ""
            }
          </div>

          <!-- Footer -->
          <div style="padding: 24px 32px; border-top: 1px solid #e5e7eb; background: #f9fafb;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
              <div style="display: flex; align-items: center; gap: 12px;">
                <img src="/logo.png" alt="Swift Food" style="height: 32px; width: auto;" />
                <div style="font-size: 12px; color: #666;">
                  <strong style="color: #333;">Swift Food Services</strong><br/>
                  Catering Made Simple
                </div>
              </div>
              <p style="font-size: 11px; color: #888;">
                Preview generated on ${new Date().toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        </div>

        <script>
          (function() {
            const btn = document.getElementById('download-menu-btn');
            if (!btn) return;
            btn.addEventListener('click', function() {
              try {
                window.print();
              } catch (e) {
                console.error('Print failed', e);
                alert('Unable to open print dialog.');
              }
            });
          })();
        </script>
      </body>
    </html>
  `;
}

/**
 * Opens the menu preview from local state in a new window
 */
export async function openMenuPreview(
  mealSessions: LocalMealSession[],
  customerName?: string,
  organization?: string
): Promise<void> {
  const html = await buildMenuHTMLFromLocalState(
    mealSessions,
    customerName,
    organization
  );
  const newWindow = window.open("", "_blank");

  if (!newWindow) {
    alert("Popup blocked. Please allow popups to view the menu.");
    return;
  }

  newWindow.document.write(html);
  newWindow.document.close();
  newWindow.focus();
}

// ============================================================================
// NEW: React-PDF based PDF generation
// ============================================================================

import type {
  PdfSession,
  PdfCategory,
  PdfMenuItem,
  PdfAddon,
  CateringMenuPdfProps,
} from "@/lib/components/pdf/CateringMenuPdf";

// Re-export types for convenience
export type { PdfSession, PdfCategory, PdfMenuItem, PdfAddon, CateringMenuPdfProps };

/**
 * Format date for PDF display (e.g., "December 5")
 */
const formatDateForPdf = (dateStr: string | Date): string => {
  const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  return date.toLocaleDateString("en-GB", {
    month: "long",
    day: "numeric",
  });
};

/**
 * Transform CateringOrderResponse to PDF data format
 * Groups items by CATEGORY (not restaurant) as per design requirements
 * Now async to handle image fetching for CORS compatibility
 */
export async function transformOrderToPdfData(
  order: CateringOrderResponse,
  showPrices: boolean = true
): Promise<CateringMenuPdfProps> {
  const sessions: PdfSession[] = [];

  // Collect all unique image URLs for batch fetching
  const imageUrls = new Set<string>();

  // Gather image URLs from meal sessions or legacy format
  if (order.mealSessions && order.mealSessions.length > 0) {
    for (const session of order.mealSessions) {
      for (const restaurant of session.orderItems || []) {
        for (const menuItem of restaurant.menuItems || []) {
          if (menuItem.menuItemImage) {
            imageUrls.add(menuItem.menuItemImage);
          }
        }
      }
    }
  } else {
    const orderItems = order.restaurants || order.orderItems || [];
    for (const restaurant of orderItems as PricingOrderItem[]) {
      for (const menuItem of restaurant.menuItems || []) {
        if (menuItem.menuItemImage) {
          imageUrls.add(menuItem.menuItemImage);
        }
      }
    }
  }

  // Fetch all images in parallel and create a map of URL -> base64
  const imageMap = new Map<string, string | null>();
  if (imageUrls.size > 0) {
    // console.log(`Fetching ${imageUrls.size} images for PDF...`);
    const fetchPromises = Array.from(imageUrls).map(async (url) => {
      const base64 = await fetchImageAsBase64(url);
      imageMap.set(url, base64);
    });
    await Promise.all(fetchPromises);
    // console.log(`Fetched ${imageMap.size} images`);
  }

  // Handle multi-meal sessions
  if (order.mealSessions && order.mealSessions.length > 0) {
    const sortedSessions = [...order.mealSessions].sort((a, b) => {
      const dateA = new Date(a.sessionDate);
      const dateB = new Date(b.sessionDate);
      if (dateA.getTime() !== dateB.getTime()) {
        return dateA.getTime() - dateB.getTime();
      }
      return a.eventTime.localeCompare(b.eventTime);
    });

    for (const session of sortedSessions) {
      const categoryMap = new Map<string, PdfMenuItem[]>();
      let sessionItemsSubtotal = 0;

      // Group items by category across all restaurants in this session
      for (const restaurant of session.orderItems || []) {
        for (const menuItem of restaurant.menuItems || []) {
          const categoryName =
            (menuItem as any).category?.name || (menuItem as any).categoryName || "Other";

          if (!categoryMap.has(categoryName)) {
            categoryMap.set(categoryName, []);
          }

          // Process item (handles protein splitting automatically)
          const processedItems = processMenuItemForPdf(menuItem, imageMap);
          for (const { item, itemTotal } of processedItems) {
            categoryMap.get(categoryName)!.push(item);
            sessionItemsSubtotal += itemTotal;
          }
        }
      }

      // Convert map to categories array
      const categories: PdfCategory[] = Array.from(categoryMap.entries()).map(
        ([name, items]) => ({ name, items })
      );

      sessions.push({
        date: formatDateForPdf(session.sessionDate),
        sessionName: session.sessionName,
        time: session.eventTime,
        categories,
        subtotal: sessionItemsSubtotal, // Use calculated items subtotal, not session.sessionTotal
        deliveryFee: session.deliveryFee,
      });
    }
  } else {
    // Legacy single-session format
    const categoryMap = new Map<string, PdfMenuItem[]>();
    const orderItems = order.restaurants || order.orderItems || [];
    let itemsSubtotal = 0;

    for (const restaurant of orderItems as PricingOrderItem[]) {
      for (const menuItem of restaurant.menuItems || []) {
        const categoryName =
          (menuItem as any).category?.name ||
          (menuItem as any).categoryName ||
          "Menu Items";

        if (!categoryMap.has(categoryName)) {
          categoryMap.set(categoryName, []);
        }

        // Process item (handles protein splitting automatically)
        const processedItems = processMenuItemForPdf(menuItem, imageMap);
        for (const { item, itemTotal } of processedItems) {
          categoryMap.get(categoryName)!.push(item);
          itemsSubtotal += itemTotal;
        }
      }
    }

    const categories: PdfCategory[] = Array.from(categoryMap.entries()).map(
      ([name, items]) => ({ name, items })
    );

    // Parse delivery fee for legacy format
    const legacyDeliveryFee = typeof order.deliveryFee === 'string'
      ? parseFloat(order.deliveryFee)
      : order.deliveryFee;

    sessions.push({
      date: formatDateForPdf(order.eventDate),
      sessionName: "Menu",
      time: order.eventTime,
      categories,
      subtotal: itemsSubtotal, // Use calculated items subtotal
      deliveryFee: legacyDeliveryFee,
    });
  }

  // Parse delivery fee and total price to ensure they're numbers
  const deliveryFee = typeof order.deliveryFee === 'string'
    ? parseFloat(order.deliveryFee)
    : order.deliveryFee;

  const finalTotalValue = order.finalTotal || order.customerFinalTotal;
  const totalPrice = typeof finalTotalValue === 'string'
    ? parseFloat(finalTotalValue)
    : finalTotalValue;

  return {
    sessions,
    showPrices,
    deliveryCharge: deliveryFee,
    totalPrice: totalPrice,
    logoUrl: "/Logo_Circle.png",
  };
}

/**
 * Convert a blob to JPEG format using canvas (for WebP compatibility with react-pdf)
 */
async function convertToJpeg(blob: Blob): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(blob);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(objectUrl);
        resolve(null);
        return;
      }
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(objectUrl);
      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(null);
    };
    img.src = objectUrl;
  });
}

/**
 * Fetch an image and convert to base64 data URL
 * In development: Uses a proxy API route to bypass CORS issues
 * In production: Fetches directly (requires S3 CORS to be configured)
 * Note: WebP images are converted to JPEG for react-pdf compatibility
 */
async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    // In development, use proxy to bypass CORS
    // In production, fetch directly (S3 CORS must be configured)
    const isDev = true //process.env.NODE_ENV === "development";
    const fetchUrl = isDev
      ? `/api/proxy-image?v=4&url=${encodeURIComponent(url)}`
      : url;

    const response = await fetch(fetchUrl);
    if (!response.ok) {
      console.warn(`Failed to fetch image: ${url}`);
      return null;
    }
    const blob = await response.blob();

    // Check if it's a WebP image - react-pdf doesn't support WebP
    const isWebP = blob.type === 'image/webp' || url.toLowerCase().endsWith('.webp');
    if (isWebP) {
      return await convertToJpeg(blob);
    }

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn(`Error fetching image ${url}:`, error);
    return null;
  }
}

/**
 * Transform local meal session state to PDF data format
 * Used for preview before order submission
 * Now async to handle image fetching for CORS compatibility
 */
export async function transformLocalSessionsToPdfData(
  mealSessions: LocalMealSession[],
  showPrices: boolean = true,
  deliveryFee?: number
): Promise<CateringMenuPdfProps> {
  const sessions: PdfSession[] = [];
  let grandTotal = 0;

  const sortedSessions = [...mealSessions]
    .filter((s) => s.orderItems.length > 0)
    .sort((a, b) => {
      if (!a.sessionDate || !b.sessionDate) return 0;
      const dateA = new Date(a.sessionDate);
      const dateB = new Date(b.sessionDate);
      if (dateA.getTime() !== dateB.getTime()) {
        return dateA.getTime() - dateB.getTime();
      }
      return (a.eventTime || "").localeCompare(b.eventTime || "");
    });

  // Collect all unique image URLs for batch fetching
  const imageUrls = new Set<string>();
  for (const session of sortedSessions) {
    for (const orderItem of session.orderItems) {
      const imageUrl = (orderItem.item as any).image;
      if (imageUrl) {
        imageUrls.add(imageUrl);
      }
    }
  }

  // Fetch all images in parallel and create a map of URL -> base64
  const imageMap = new Map<string, string | null>();
  if (imageUrls.size > 0) {
    // console.log(`Fetching ${imageUrls.size} images for PDF...`);
    const fetchPromises = Array.from(imageUrls).map(async (url) => {
      const base64 = await fetchImageAsBase64(url);
      imageMap.set(url, base64);
    });
    await Promise.all(fetchPromises);
    // console.log(`Fetched ${imageMap.size} images`);
  }

  for (const session of sortedSessions) {
    const categoryMap = new Map<string, PdfMenuItem[]>();
    let sessionTotal = 0;

    for (const orderItem of session.orderItems) {
      const item = orderItem.item;
      const categoryName = (item as any).categoryName || "Menu Items";

      if (!categoryMap.has(categoryName)) {
        categoryMap.set(categoryName, []);
      }

      // Calculate prices including addons
      const price = parseFloat((item as any).price || "0");
      const discountPrice = parseFloat((item as any).discountPrice || "0");
      const unitPrice =
        (item as any).isDiscount && discountPrice > 0 ? discountPrice : price;
      const addonTotal = ((item as any).selectedAddons || []).reduce(
        (sum: number, addon: any) => sum + (addon.customerUnitPrice || addon.price || 0) * (addon.quantity || 0),
        0
      );
      const itemTotal = (unitPrice * orderItem.quantity) + addonTotal;
      sessionTotal += itemTotal;

      // Use base64 image if available, otherwise use original URL
      const originalImageUrl = (item as any).image;
      const base64Image = originalImageUrl ? imageMap.get(originalImageUrl) : null;

      // Transform addons for PDF
      const addons = (item as any).selectedAddons?.map((addon: any) => ({
        name: addon.name,
        quantity: addon.quantity || 1,
        price: addon.customerUnitPrice || addon.price || 0,
        groupTitle: addon.groupTitle,
        allergens: addon.allergens,
        dietaryRestrictions: addon.dietaryRestrictions,
      }));

      categoryMap.get(categoryName)!.push({
        quantity: orderItem.quantity,
        name: (item as any).menuItemName,
        description: (item as any).description,
        allergens: (item as any).allergens,
        dietaryFilters: (item as any).dietaryFilters || [],
        unitPrice,
        image: base64Image || originalImageUrl,
        addons: addons?.length > 0 ? addons : undefined,
        cateringQuantityUnit: (item as any).cateringQuantityUnit || 1,
        feedsPerUnit: (item as any).feedsPerUnit || 1,
      });
    }

    grandTotal += sessionTotal;

    const categories: PdfCategory[] = Array.from(categoryMap.entries()).map(
      ([name, items]) => ({ name, items })
    );

    sessions.push({
      date: session.sessionDate
        ? formatDateForPdf(session.sessionDate)
        : "Date TBD",
      sessionName: session.sessionName || "Menu",
      time: session.eventTime || "",
      categories,
      subtotal: sessionTotal,
    });
  }

  // Calculate total including delivery fee
  const totalWithDelivery = grandTotal + (deliveryFee || 0);

  return {
    sessions,
    showPrices,
    deliveryCharge: deliveryFee,
    totalPrice: totalWithDelivery,
    logoUrl: "/Logo_Circle.png",
  };
}
