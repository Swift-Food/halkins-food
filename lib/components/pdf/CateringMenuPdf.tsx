"use client";

import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";

// =============================================================================
// FONT CONFIGURATION - Editorial Style
// =============================================================================
// Using Helvetica (built-in) for clean editorial typography
const FONT_FAMILY = "Helvetica";
const FONT_FAMILY_BOLD = "Helvetica-Bold";
const FONT_FAMILY_OBLIQUE = "Helvetica-Oblique";
const FONT_FAMILY_BOLD_OBLIQUE = "Helvetica-BoldOblique";

// Helper to format allergen names (e.g., "cereals_containing_gluten" -> "Cereals Containing Gluten")
const formatAllergen = (allergen: string): string => {
  return allergen
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

// Helper to normalize and format allergens (handles both string and array input)
const formatAllergens = (allergens: string | string[] | undefined): string => {
  if (!allergens) return "";

  // If it's a string, it might be comma-separated or a single allergen
  const allergenArray = typeof allergens === "string"
    ? allergens.split(",").map(a => a.trim())
    : allergens;

  return allergenArray.map(formatAllergen).join(", ");
};

// Dietary filter configuration with colors and abbreviations (Editorial style colors)
const DIETARY_CONFIG: Record<string, { abbrev: string; label: string; color: string; bgColor: string }> = {
  vegetarian: { abbrev: "V", label: "Vegetarian", color: "#fff", bgColor: "#8dc63f" },
  vegan: { abbrev: "VG", label: "Vegan", color: "#fff", bgColor: "#00a651" },
  halal: { abbrev: "H", label: "Halal", color: "#fff", bgColor: "#00a651" },
  pescatarian: { abbrev: "P", label: "Pescatarian", color: "#fff", bgColor: "#3b82f6" },
  no_nut: { abbrev: "NN", label: "No Nuts", color: "#fff", bgColor: "#f97316" },
  no_dairy: { abbrev: "ND", label: "No Dairy", color: "#fff", bgColor: "#a855f7" },
  no_gluten: { abbrev: "GF", label: "Gluten Free", color: "#fff", bgColor: "#a16207" },
  nonvegetarian: { abbrev: "NV", label: "Non-Veg", color: "#fff", bgColor: "#ee3b2b" },
};

// Get all unique dietary filters from sessions for the legend
const getAllDietaryFilters = (sessions: PdfSession[]): string[] => {
  console.log("sessions", JSON.stringify(sessions, null, 2))
  const filters = new Set<string>();
  sessions.forEach(session => {
    session.categories.forEach(category => {
      category.items.forEach(item => {
        // Check item dietary filters
        if (item.dietaryFilters) {
          item.dietaryFilters.forEach(filter => {
            const key = filter.toLowerCase();
            if (DIETARY_CONFIG[key]) {
              filters.add(key);
            }
          });
        }
        // Check addon dietary restrictions
        if (item.addons) {
          item.addons.forEach(addon => {
            if (addon.dietaryRestrictions) {
              addon.dietaryRestrictions.forEach(filter => {
                const key = filter.toLowerCase();
                if (DIETARY_CONFIG[key]) {
                  filters.add(key);
                }
              });
            }
          });
        }
      });
    });
  });
  return Array.from(filters);
};
// =============================================================================

// Types
export interface PdfAddon {
  name: string;
  quantity: number;
  price?: number;
  groupTitle?: string;
  allergens?: string | string[];
  dietaryRestrictions?: string[];
}

export interface PdfMenuItem {
  quantity: number;
  name: string;
  description?: string;
  allergens?: string | string[];
  dietaryFilters?: string[];
  unitPrice?: number;
  image?: string;
  addons?: PdfAddon[];
  cateringQuantityUnit?: number;
  feedsPerUnit?: number;
}

export interface PdfCategory {
  name: string;
  items: PdfMenuItem[];
}

export interface PdfSession {
  date: string;
  sessionName: string;
  time: string;
  categories: PdfCategory[];
  subtotal?: number;
  deliveryFee?: number;
}

export interface CateringMenuPdfProps {
  sessions: PdfSession[];
  showPrices: boolean;
  deliveryCharge?: number;
  totalPrice?: number;
  logoUrl?: string;
}

// =============================================================================
// EDITORIAL STYLES - Magazine/Print Design
// =============================================================================
const styles = StyleSheet.create({
  // Page Styles
  page: {
    backgroundColor: "#fdfdfd",
    padding: 48,
    paddingBottom: 70,
    fontFamily: FONT_FAMILY,
  },
  menuPage: {
    backgroundColor: "#fdfdfd",
    padding: 48,
    paddingBottom: 70,
    fontFamily: FONT_FAMILY,
  },

  // Day Section
  daySection: {
    marginBottom: 50,
  },
  dayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderBottomWidth: 2,
    borderBottomColor: "#000",
    paddingBottom: 4,
    marginBottom: 24,
  },
  dayTitle: {
    fontSize: 18,
    fontFamily: FONT_FAMILY_BOLD_OBLIQUE,
    textTransform: "uppercase",
    letterSpacing: -0.3,
  },
  dayLabel: {
    fontSize: 8,
    fontFamily: FONT_FAMILY_BOLD,
    color: "#9ca3af",
    textTransform: "uppercase",
    letterSpacing: 2,
  },

  // Session Header
  sessionHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 20,
  },
  sessionTitle: {
    fontSize: 28,
    fontFamily: FONT_FAMILY_BOLD,
    textTransform: "uppercase",
    letterSpacing: -0.5,
  },
  sessionTime: {
    fontSize: 14,
    fontFamily: FONT_FAMILY_OBLIQUE,
    color: "#9ca3af",
    marginLeft: 12,
    marginBottom: 2,
  },

  // Category Header
  categoryHeader: {
    fontSize: 10,
    fontFamily: FONT_FAMILY_BOLD,
    marginBottom: 16,
    marginTop: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
    textDecoration: "underline",
  },

  // Menu Item - Editorial Layout
  menuItem: {
    flexDirection: "row",
    marginBottom: 28,
    paddingBottom: 20,
  },
  menuItemContent: {
    flex: 1,
    paddingRight: 16,
  },
  menuItemName: {
    fontSize: 14,
    fontFamily: FONT_FAMILY_BOLD,
    textTransform: "uppercase",
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  menuItemDescription: {
    fontSize: 10,
    fontFamily: FONT_FAMILY_OBLIQUE,
    color: "#4b5563",
    marginBottom: 8,
    lineHeight: 1.4,
  },

  // Add-ons Container - Editorial Style
  addonsContainer: {
    marginTop: 8,
    marginBottom: 8,
    paddingLeft: 8,
    paddingVertical: 8,
    backgroundColor: "#f9fafb",
    borderLeftWidth: 2,
    borderLeftColor: "rgba(0,0,0,0.1)",
  },
  addonsSection: {
    marginBottom: 4,
  },
  addonsSectionHeader: {
    fontSize: 8,
    fontFamily: FONT_FAMILY_BOLD,
    color: "#9ca3af",
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 4,
  },
  addonRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: 2,
  },
  addonBullet: {
    fontSize: 9,
    color: "#4b5563",
    marginRight: 4,
  },
  addonText: {
    fontSize: 9,
    color: "#374151",
  },
  addonDietaryBadges: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 4,
  },
  addonDietaryBadge: {
    width: 14,
    height: 14,
    borderRadius: 2,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 2,
  },
  addonDietaryBadgeText: {
    fontSize: 6,
    fontFamily: FONT_FAMILY_BOLD,
    color: "#fff",
  },
  addonAllergenText: {
    fontSize: 9,
    color: "#6b7280",
    marginLeft: 4,
  },

  // Main Item Allergen
  mainItemAllergenContainer: {
    marginTop: 8,
    marginBottom: 6,
  },
  mainItemAllergenLabel: {
    fontSize: 9,
    fontFamily: FONT_FAMILY_BOLD,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  mainItemAllergenText: {
    fontSize: 9,
    fontFamily: FONT_FAMILY_BOLD,
  },

  // Dietary Badges
  menuItemDietaryFilters: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 8,
    marginTop: 4,
  },
  dietaryBadge: {
    width: 18,
    height: 18,
    borderRadius: 2,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4,
  },
  dietaryBadgeText: {
    fontSize: 7,
    fontFamily: FONT_FAMILY_BOLD,
    color: "#fff",
  },

  // Portions & Price
  menuItemPortions: {
    fontSize: 9,
    color: "#9ca3af",
    marginTop: 4,
  },
  menuItemPrice: {
    flexDirection: "row",
    marginTop: 2,
  },
  menuItemPriceLabel: {
    fontSize: 10,
    fontFamily: FONT_FAMILY_BOLD_OBLIQUE,
    letterSpacing: -0.3,
  },
  menuItemPriceValue: {
    fontSize: 10,
    fontFamily: FONT_FAMILY_BOLD_OBLIQUE,
    letterSpacing: -0.3,
  },

  // Menu Item Image
  menuItemImage: {
    width: 100,
    height: 65,
    objectFit: "cover",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },

  // Session Subtotal
  subtotalContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 16,
    marginBottom: 32,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: "#000",
  },
  subtotalText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY_BOLD,
  },
  deliveryFeeText: {
    fontSize: 9,
    fontFamily: FONT_FAMILY_OBLIQUE,
    color: "#9ca3af",
    marginTop: 6,
  },

  // Totals Container - Full Width Editorial Style
  totalsContainer: {
    marginTop: 40,
    paddingTop: 20,
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 16,
  },
  totalsLabel: {
    fontSize: 24,
    fontFamily: FONT_FAMILY_BOLD_OBLIQUE,
    textTransform: "uppercase",
    letterSpacing: -0.5,
  },
  totalsValue: {
    fontSize: 24,
    fontFamily: FONT_FAMILY_BOLD_OBLIQUE,
    letterSpacing: -0.5,
  },
  totalsBreakdown: {
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingVertical: 16,
    marginBottom: 20,
  },
  totalsBreakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 6,
  },
  totalsBreakdownLabel: {
    fontSize: 11,
    fontFamily: FONT_FAMILY_BOLD,
    color: "#9ca3af",
    textTransform: "uppercase",
    letterSpacing: 2,
  },
  totalsBreakdownValue: {
    fontSize: 11,
    fontFamily: FONT_FAMILY_BOLD,
  },
  totalsBreakdownValueItalic: {
    fontSize: 11,
    fontFamily: FONT_FAMILY_OBLIQUE,
    color: "#9ca3af",
  },
  grandTotalContainer: {
    alignItems: "flex-end",
    marginTop: 16,
  },
  grandTotalLabel: {
    fontSize: 8,
    fontFamily: FONT_FAMILY_BOLD,
    color: "#9ca3af",
    textTransform: "uppercase",
    letterSpacing: 3,
    marginBottom: 4,
    textAlign: "right",
  },
  grandTotalValue: {
    fontSize: 28,
    fontFamily: FONT_FAMILY_BOLD_OBLIQUE,
    letterSpacing: -0.5,
    textAlign: "right",
  },

  // Footer - Editorial Style
  footer: {
    position: "absolute",
    bottom: 30,
    left: 48,
    right: 48,
  },
  dietaryLegend: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 6,
  },
  footerDivider: {
    height: 0.5,
    backgroundColor: "#d1d5db",
    marginBottom: 10,
  },
  dietaryLegendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
    marginBottom: 4,
  },
  dietaryLegendBadge: {
    width: 14,
    height: 14,
    borderRadius: 2,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4,
  },
  dietaryLegendText: {
    fontSize: 8,
    fontFamily: FONT_FAMILY_BOLD,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  footerText: {
    fontSize: 8,
    fontFamily: FONT_FAMILY_OBLIQUE,
    color: "#666",
  },
});

// Cover Page Component - Using pre-designed image
const CoverPage: React.FC = () => (
  <Page size="A4">
    <Image src="/Swift_PDF_Cover_Page.png" style={{ width: "100%", height: "100%" }} />
  </Page>
);

// Original Cover Page Component (commented out)
// const CoverPageOriginal: React.FC<{ logoUrl?: string }> = ({ logoUrl }) => (
//   <Page size="A4" style={styles.coverPage}>
//     <Text style={styles.coverTitle}>FOOD CATERING MENU</Text>
//     <View style={styles.coverTitleUnderline} />
//     {logoUrl && <Image src={logoUrl} style={styles.coverLogo} />}
//     <View style={styles.coverTagline}>
//       <Text style={styles.coverTaglineText}>Local</Text>
//       <Text style={styles.coverTaglineText}>Simple</Text>
//       <Text style={styles.coverTaglineText}>Reliable</Text>
//     </View>
//     <Text style={styles.coverBrandName}>SWIFT FOOD</Text>
//   </Page>
// );

// Menu Item Component - Editorial Style
const MenuItem: React.FC<{ item: PdfMenuItem; showPrice: boolean }> = ({
  item,
  showPrice,
}) => {
  // Group addons by groupTitle
  const groupedAddons: Record<string, PdfAddon[]> = {};
  if (item.addons && item.addons.length > 0) {
    item.addons.forEach((addon) => {
      const group = addon.groupTitle || "Add-Ons";
      if (!groupedAddons[group]) {
        groupedAddons[group] = [];
      }
      groupedAddons[group].push(addon);
    });
  }

  // Calculate portions and serves
  const cateringQuantityUnit = item.cateringQuantityUnit || 1;
  const feedsPerUnit = item.feedsPerUnit || 1;
  const numPortions = Math.round(item.quantity / cateringQuantityUnit);
  const totalServes = Math.round(item.quantity * feedsPerUnit);

  // Check if item has allergens
  const hasItemAllergens = item.allergens && (
    Array.isArray(item.allergens) ? item.allergens.length > 0 : item.allergens.trim() !== ""
  );

  return (
    <View style={styles.menuItem} wrap={false}>
      <View style={styles.menuItemContent}>
        {/* Item Name & Quantity */}
        <Text style={styles.menuItemName}>
          {item.quantity}x {item.name}
        </Text>

        {/* Description */}
        {item.description && (
          <Text style={styles.menuItemDescription}>{item.description}</Text>
        )}

        {/* Add-ons Section */}
        {Object.keys(groupedAddons).length > 0 && (
          <View style={styles.addonsContainer}>
            {Object.entries(groupedAddons).map(([groupTitle, addons]) => (
              <View key={groupTitle} style={styles.addonsSection}>
                <Text style={styles.addonsSectionHeader}>{groupTitle}</Text>
                {addons.map((addon, idx) => {
                  const hasAddonAllergens = addon.allergens && (
                    Array.isArray(addon.allergens) ? addon.allergens.length > 0 : addon.allergens.trim() !== ""
                  );
                  const hasDietary = addon.dietaryRestrictions && addon.dietaryRestrictions.length > 0;
                  return (
                    <View key={idx} style={styles.addonRow}>
                      <Text style={styles.addonBullet}>•</Text>
                      <Text style={styles.addonText}>
                        {addon.quantity > 1 ? `${addon.quantity}x ` : ""}{addon.name}
                        {showPrice && addon.price !== undefined && addon.price > 0 && (
                          <Text style={{ fontFamily: FONT_FAMILY_BOLD }}> - £{(addon.price * (addon.quantity || 1)).toFixed(2)}</Text>
                        )}
                      </Text>
                      {hasDietary && (
                        <View style={styles.addonDietaryBadges}>
                          {addon.dietaryRestrictions!.map((filter, filterIdx) => {
                            const config = DIETARY_CONFIG[filter.toLowerCase()];
                            if (!config) return null;
                            return (
                              <View key={filterIdx} style={[styles.addonDietaryBadge, { backgroundColor: config.bgColor }]}>
                                <Text style={styles.addonDietaryBadgeText}>{config.abbrev}</Text>
                              </View>
                            );
                          })}
                        </View>
                      )}
                      {hasAddonAllergens && (
                        <Text style={styles.addonAllergenText}>(Allergen: {formatAllergens(addon.allergens)})</Text>
                      )}
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        )}

        {/* Main Item Allergen - only show if has allergens */}
        {hasItemAllergens && (
          <View style={styles.mainItemAllergenContainer}>
            <Text>
              <Text style={styles.mainItemAllergenLabel}>Allergen: </Text>
              <Text style={styles.mainItemAllergenText}>{formatAllergens(item.allergens)}</Text>
            </Text>
          </View>
        )}

        {/* Dietary Badges */}
        {item.dietaryFilters && item.dietaryFilters.length > 0 && (
          <View style={styles.menuItemDietaryFilters}>
            {item.dietaryFilters.map((filter, idx) => {
              const config = DIETARY_CONFIG[filter.toLowerCase()];
              if (!config) return null;
              return (
                <View key={idx} style={[styles.dietaryBadge, { backgroundColor: config.bgColor }]}>
                  <Text style={styles.dietaryBadgeText}>{config.abbrev}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Portions & Price */}
        <Text style={styles.menuItemPortions}>
          {numPortions} portion{numPortions !== 1 ? "s" : ""} • Serves ~{totalServes} attendees
        </Text>
        {showPrice && item.unitPrice !== undefined && (
          <View style={styles.menuItemPrice}>
            <Text style={styles.menuItemPriceLabel}>Unit </Text>
            <Text style={styles.menuItemPriceValue}>
              £{item.unitPrice === 0 ? "FREE" : item.unitPrice.toFixed(2)}
            </Text>
          </View>
        )}
      </View>

      {/* Item Image */}
      {item.image && <Image src={item.image} style={styles.menuItemImage} />}
    </View>
  );
};

// Helper to group sessions by date
const groupSessionsByDate = (sessions: PdfSession[]) => {
  const groups: Record<string, PdfSession[]> = {};
  sessions.forEach(session => {
    const date = session.date;
    if (!groups[date]) groups[date] = [];
    groups[date].push(session);
  });
  return Object.keys(groups)
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
    .map((date, idx) => ({
      date,
      dayNumber: idx + 1,
      sessions: groups[date]
    }));
};

// Helper to format time with AM/PM
const formatTimeWithAmPm = (time: string): string => {
  if (!time) return "";
  // If already has AM/PM, return as is
  if (time.toLowerCase().includes("am") || time.toLowerCase().includes("pm")) {
    return time;
  }
  // Parse HH:MM format
  const [hours, minutes] = time.split(":").map(Number);
  if (isNaN(hours)) return time;
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes?.toString().padStart(2, "0") || "00"} ${period}`;
};

// Session Page Component - Each session gets its own page
const SessionPage: React.FC<{
  session: PdfSession;
  dayDate: string;
  dayNumber: number;
  showPrices: boolean;
  allSessions: PdfSession[];
  isLastSession: boolean;
  deliveryCharge?: number;
}> = ({ session, dayDate, dayNumber, showPrices, allSessions, isLastSession, deliveryCharge }) => {
  const totalCatering = allSessions.reduce((sum, s) => sum + (s.subtotal || 0), 0);

  return (
  <Page size="A4" style={styles.menuPage} wrap>
    {/* Day Header */}
    <View style={styles.dayHeader} wrap={false}>
      <Text style={styles.dayTitle}>{dayDate}</Text>
      <Text style={styles.dayLabel}>Day {dayNumber}</Text>
    </View>

    {/* Session Header */}
    <View style={styles.sessionHeader} wrap={false} minPresenceAhead={150}>
      <Text style={styles.sessionTitle}>{session.sessionName}</Text>
      <Text style={styles.sessionTime}>{formatTimeWithAmPm(session.time)}</Text>
    </View>

    {/* Categories */}
    {session.categories.map((category, catIndex) => (
      <View key={catIndex}>
        {session.categories.length > 1 && (
          <Text style={styles.categoryHeader} minPresenceAhead={100}>{category.name}</Text>
        )}
        {category.items.map((item, itemIndex) => (
          <MenuItem key={itemIndex} item={item} showPrice={showPrices} />
        ))}
      </View>
    ))}

    {/* Session Subtotal */}
    {showPrices && session.subtotal !== undefined && (
      <View style={styles.subtotalContainer} wrap={false}>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={styles.subtotalText}>
            Subtotal: £{session.subtotal.toFixed(2)}
          </Text>
          <Text style={styles.deliveryFeeText}>
            Delivery Fee: {session.deliveryFee !== undefined ? `£${session.deliveryFee.toFixed(2)}` : "TBC"}
          </Text>
        </View>
      </View>
    )}

    {/* Grand Totals - Only on last session */}
    {isLastSession && showPrices && (
      <View style={styles.totalsContainer} wrap={false}>
        <View style={styles.totalsBreakdown}>
          <View style={styles.totalsBreakdownRow}>
            <Text style={styles.totalsBreakdownLabel}>Catering Total</Text>
            <Text style={styles.totalsBreakdownValue}>£{totalCatering.toFixed(2)}</Text>
          </View>
          <View style={styles.totalsBreakdownRow}>
            <Text style={styles.totalsBreakdownLabel}>Logistics / Delivery</Text>
            <Text style={styles.totalsBreakdownValueItalic}>
              {deliveryCharge !== undefined ? `£${deliveryCharge.toFixed(2)}` : "TBC"}
            </Text>
          </View>
        </View>

        <View style={styles.grandTotalContainer}>
          <Text style={styles.grandTotalLabel}>
            {deliveryCharge !== undefined ? "Grand Total" : "Estimated Grand Total"}
          </Text>
          <Text style={styles.grandTotalValue}>
            {deliveryCharge !== undefined
              ? `£${(totalCatering + deliveryCharge).toFixed(2)}`
              : `£${totalCatering.toFixed(2)} + TBC`}
          </Text>
        </View>
      </View>
    )}

    {/* Footer */}
    <View style={styles.footer} fixed>
      <View style={styles.footerDivider} />
      {getAllDietaryFilters(allSessions).length > 0 && (
        <View style={styles.dietaryLegend}>
          {getAllDietaryFilters(allSessions).map((filterKey) => {
            const config = DIETARY_CONFIG[filterKey];
            if (!config) return null;
            return (
              <View key={filterKey} style={styles.dietaryLegendItem}>
                <View style={[styles.dietaryLegendBadge, { backgroundColor: config.bgColor }]}>
                  <Text style={[styles.dietaryBadgeText, { fontSize: 6 }]}>{config.abbrev}</Text>
                </View>
                <Text style={styles.dietaryLegendText}>{config.label}</Text>
              </View>
            );
          })}
        </View>
      )}
      <Text style={styles.footerText}>
        *Images are for illustrative purposes only. Actual dishes may vary in appearance, portion size, and presentation due to preparation and ingredient differences.
      </Text>
    </View>
  </Page>
  );
};

// Main Document Component
export const CateringMenuPdf: React.FC<CateringMenuPdfProps> = ({
  sessions,
  showPrices,
  deliveryCharge,
}) => {
  const groupedByDay = groupSessionsByDate(sessions);

  // Flatten all sessions to determine which is last
  const allSessionsFlat = groupedByDay.flatMap((day) =>
    day.sessions.map((session, sessionIndex) => ({
      session,
      dayDate: day.date,
      dayNumber: day.dayNumber,
      key: `${day.date}-${sessionIndex}`,
    }))
  );

  return (
    <Document>
      <CoverPage />
      {/* Each session gets its own page */}
      {allSessionsFlat.map((item, index) => (
        <SessionPage
          key={item.key}
          session={item.session}
          dayDate={item.dayDate}
          dayNumber={item.dayNumber}
          showPrices={showPrices}
          allSessions={sessions}
          isLastSession={index === allSessionsFlat.length - 1}
          deliveryCharge={deliveryCharge}
        />
      ))}
    </Document>
  );
};

export default CateringMenuPdf;
