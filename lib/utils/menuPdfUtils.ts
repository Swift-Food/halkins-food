/**
 * Menu PDF Utility
 *
 * Transforms catering order data into the shape consumed by the
 * `CateringMenuPdf` React component (rendered via `@react-pdf/renderer`).
 */

import { CateringOrderResponse } from "@/types/api";
import { PricingOrderItem } from "@/types/api/pricing.api.types";
import type {
  PdfSession,
  PdfCategory,
  PdfMenuItem,
  PdfAddon,
  CateringMenuPdfProps,
} from "@/lib/components/pdf/CateringMenuPdf";

export type { PdfSession, PdfCategory, PdfMenuItem, PdfAddon, CateringMenuPdfProps };

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


export interface LocalMealSession {
  sessionName: string;
  sessionDate: string;
  eventTime: string;
  deliveryFee?: number;
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

  const promoDiscount = typeof order.promoDiscount === 'string'
    ? parseFloat(order.promoDiscount)
    : (order.promoDiscount || 0);
  const restaurantNameById = Object.fromEntries(
    (order.restaurants || []).map((r) => [r.restaurantId, r.restaurantName])
  );
  const sessionPromotions = (order.mealSessions || []).flatMap((s) =>
    Object.entries(s.appliedPromotions || {})
  );
  const promotionEntries = sessionPromotions.length > 0
    ? sessionPromotions
    : Object.entries(order.appliedPromotions || {});
  const appliedPromotions = promotionEntries
    .flatMap(([restaurantId, promos]) =>
      promos.map((p) => {
        const restaurantName = restaurantNameById[restaurantId];
        const label = restaurantName ? `${p.name} (${restaurantName})` : p.name;
        return { name: label, discountAmount: Number(p.discountAmount) };
      })
    )
    .filter((p) => p.discountAmount > 0);

  return {
    sessions,
    showPrices,
    deliveryCharge: deliveryFee,
    promoDiscount: promoDiscount || undefined,
    appliedPromotions: appliedPromotions.length > 0 ? appliedPromotions : undefined,
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
  deliveryFee?: number,
  promoDiscount?: number,
  appliedPromotions?: { name: string; discountAmount: number }[]
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
      deliveryFee: session.deliveryFee,
    });
  }

  const derivedDeliveryFee = sessions.reduce(
    (sum, session) => sum + (session.deliveryFee || 0),
    0
  );
  const resolvedDeliveryFee =
    deliveryFee !== undefined ? deliveryFee : derivedDeliveryFee || undefined;

  // Calculate total including delivery fee
  const totalWithDelivery = grandTotal + (resolvedDeliveryFee || 0);

  const totalPromotionDiscount = (appliedPromotions || []).reduce((s, p) => s + p.discountAmount, 0);

  return {
    sessions,
    showPrices,
    deliveryCharge: resolvedDeliveryFee,
    totalPrice: totalWithDelivery - (promoDiscount || 0) - totalPromotionDiscount,
    promoDiscount: promoDiscount || undefined,
    appliedPromotions: appliedPromotions?.length ? appliedPromotions : undefined,
    logoUrl: "/Logo_Circle.png",
  };
}
