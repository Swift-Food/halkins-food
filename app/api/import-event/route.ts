import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";

export const dynamic = "force-dynamic";

interface JsonLdEvent {
  "@type"?: string;
  name?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  eventAttendanceMode?: string;
  location?: {
    "@type"?: string;
    name?: string;
    address?: {
      "@type"?: string;
      streetAddress?: string;
      addressLocality?: string;
      postalCode?: string;
      addressCountry?: string;
    } | string;
    geo?: {
      "@type"?: string;
      latitude?: number | string;
      longitude?: number | string;
    };
    latitude?: number | string;
    longitude?: number | string;
  };
  image?: string | string[] | { url?: string };
  url?: string;
}

interface ImportedEventData {
  name?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  location?: {
    name?: string;
    address?: string;
    city?: string;
    postalCode?: string;
    latitude?: number;
    longitude?: number;
  };
  image?: string;
  url?: string;
  eventFormat?: "IN_PERSON" | "VIRTUAL" | "BOTH";
}

function extractJsonLd(html: string): JsonLdEvent | null {
  const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;

  while ((match = jsonLdRegex.exec(html)) !== null) {
    try {
      const jsonContent = match[1].trim();
      const data = JSON.parse(jsonContent) as unknown;

      if (Array.isArray(data)) {
        const eventData = data.find((item) => {
          if (!item || typeof item !== "object") return false;
          const type = (item as JsonLdEvent)["@type"];
          return type === "Event" || type?.includes?.("Event");
        }) as JsonLdEvent | undefined;
        if (eventData) return eventData;
      }

      if (
        data &&
        typeof data === "object" &&
        "@graph" in data &&
        Array.isArray((data as { "@graph"?: unknown[] })["@graph"])
      ) {
        const eventData = (data as { "@graph": unknown[] })["@graph"].find((item) => {
          if (!item || typeof item !== "object") return false;
          const type = (item as JsonLdEvent)["@type"];
          return type === "Event" || type?.includes?.("Event");
        }) as JsonLdEvent | undefined;
        if (eventData) return eventData;
      }

      if (data && typeof data === "object") {
        const eventData = data as JsonLdEvent;
        if (eventData["@type"] === "Event" || eventData["@type"]?.includes?.("Event")) {
          return eventData;
        }
      }
    } catch {
      continue;
    }
  }

  return null;
}

function extractOgTags($: cheerio.CheerioAPI): ImportedEventData {
  const result: ImportedEventData = {};

  const ogTitle = $('meta[property="og:title"]').attr("content");
  const ogDesc = $('meta[property="og:description"]').attr("content");
  const ogImage = $('meta[property="og:image"]').attr("content");
  const ogUrl = $('meta[property="og:url"]').attr("content");

  if (ogTitle) result.name = ogTitle;
  if (ogDesc) result.description = ogDesc;
  if (ogImage) result.image = ogImage;
  if (ogUrl) result.url = ogUrl;

  if (!result.name) {
    const title = $("title").text().trim();
    if (title) result.name = title;
  }

  if (!result.description) {
    const metaDesc = $('meta[name="description"]').attr("content");
    if (metaDesc) result.description = metaDesc;
  }

  const startTime =
    $('meta[property="event:start_time"]').attr("content") ||
    $('meta[property="og:event:start_time"]').attr("content");
  if (startTime) result.startDate = startTime;

  const endTime =
    $('meta[property="event:end_time"]').attr("content") ||
    $('meta[property="og:event:end_time"]').attr("content");
  if (endTime) result.endDate = endTime;

  const ogLocality =
    $('meta[property="og:locality"]').attr("content") ||
    $('meta[property="place:location:locality"]').attr("content");
  if (ogLocality) {
    result.location = result.location || {};
    result.location.city = ogLocality;
  }

  return result;
}

const PLACEHOLDER_ADDRESS_PATTERNS = [
  /register to see address/i,
  /rsvp to see address/i,
  /sign up to see/i,
  /address revealed/i,
  /to be announced/i,
  /tba/i,
  /tbd/i,
];

function isPlaceholderAddress(address: string): boolean {
  return PLACEHOLDER_ADDRESS_PATTERNS.some((pattern) => pattern.test(address.trim()));
}

function extractCityFromLocationName(name: string): string | undefined {
  if (!name) return undefined;
  const parts = name.split(",").map((part) => part.trim());
  return parts[0] || undefined;
}

function normalizeEventData(
  jsonLd: JsonLdEvent,
  metaTags: Partial<JsonLdEvent>,
  originalUrl: string
): ImportedEventData {
  let imageUrl: string | undefined;
  const imgSource = jsonLd.image || metaTags.image;
  if (typeof imgSource === "string") {
    imageUrl = imgSource;
  } else if (Array.isArray(imgSource)) {
    imageUrl = imgSource[0];
  } else if (imgSource && typeof imgSource === "object" && "url" in imgSource) {
    imageUrl = imgSource.url;
  }

  let locationData: ImportedEventData["location"];
  if (jsonLd.location) {
    const loc = jsonLd.location;
    locationData = { name: loc.name };

    if (loc.address) {
      if (typeof loc.address === "string") {
        if (!isPlaceholderAddress(loc.address) && loc.address.trim() !== loc.name?.trim()) {
          locationData.address = loc.address;
        }
      } else {
        const street = loc.address.streetAddress?.trim();
        if (street && street !== loc.name?.trim()) {
          locationData.address = street;
        }
        locationData.city = loc.address.addressLocality;
        locationData.postalCode = loc.address.postalCode;
      }
    }

    if (!locationData.city && loc.name) {
      locationData.city = extractCityFromLocationName(loc.name);
    }

    let lat: number | undefined;
    let lng: number | undefined;

    if (loc.geo) {
      lat = typeof loc.geo.latitude === "string" ? parseFloat(loc.geo.latitude) : loc.geo.latitude;
      lng =
        typeof loc.geo.longitude === "string" ? parseFloat(loc.geo.longitude) : loc.geo.longitude;
    }

    if ((!lat || !lng) && loc.latitude && loc.longitude) {
      lat = typeof loc.latitude === "string" ? parseFloat(loc.latitude) : loc.latitude;
      lng = typeof loc.longitude === "string" ? parseFloat(loc.longitude) : loc.longitude;
    }

    if (lat && lng && !Number.isNaN(lat) && !Number.isNaN(lng)) {
      locationData.latitude = lat;
      locationData.longitude = lng;
    }
  }

  let description = jsonLd.description || metaTags.description;
  if (description) {
    description = description
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .trim();
  }

  let eventFormat: ImportedEventData["eventFormat"];
  if (jsonLd.eventAttendanceMode) {
    const mode = jsonLd.eventAttendanceMode.toLowerCase();
    if (mode.includes("offline") || mode.includes("in-person") || mode.includes("inperson")) {
      eventFormat = "IN_PERSON";
    } else if (mode.includes("online") || mode.includes("virtual")) {
      eventFormat = "VIRTUAL";
    } else if (mode.includes("mixed") || mode.includes("hybrid")) {
      eventFormat = "BOTH";
    }
  }

  if (!eventFormat && locationData?.address) {
    eventFormat = "IN_PERSON";
  }

  return {
    name: jsonLd.name || metaTags.name,
    description,
    startDate: jsonLd.startDate,
    endDate: jsonLd.endDate,
    location: locationData,
    image: imageUrl,
    url: jsonLd.url || originalUrl,
    eventFormat,
  };
}

const EDITOR_ALLOWED_TAGS = new Set([
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "p",
  "blockquote",
  "pre",
  "ul",
  "ol",
  "li",
  "hr",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "code",
  "a",
]);

function decodeCfEmail(encoded: string): string {
  const key = parseInt(encoded.substring(0, 2), 16);
  let result = "";
  for (let index = 2; index < encoded.length; index += 2) {
    result += String.fromCharCode(parseInt(encoded.substring(index, index + 2), 16) ^ key);
  }
  return result;
}

function sanitizeHtmlForEditor(html: string): string {
  return html
    .replace(/&nbsp;/g, " ")
    .replace(
      /<(?:a|span)[^>]*data-cfemail="([^"]+)"[^>]*>[\s\S]*?<\/(?:a|span)>/gi,
      (_, encoded: string) => `<u>${decodeCfEmail(encoded)}</u>`
    )
    .replace(/<a\b[^>]*href=["'][^"']*\/cdn-cgi\/l\/email-protection[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi, "$1")
    .replace(/<a\b[^>]*href=["']mailto:[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi, "<u>$1</u>")
    .replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*?)(\/?)>/g, (match, tag, attrs) => {
      const lower = String(tag).toLowerCase();
      if (!EDITOR_ALLOWED_TAGS.has(lower)) return "";
      if (match.startsWith("</")) return `</${lower}>`;
      if (lower === "br") return "<br>";
      if (lower === "hr") return "<hr>";
      if (lower === "a") {
        const hrefMatch = String(attrs).match(/href=["']([^"']*?)["']/i);
        return hrefMatch ? `<a href="${hrefMatch[1]}">` : "<a>";
      }
      return `<${lower}>`;
    })
    .replace(/<p>\s*<\/p>/g, "")
    .replace(/<h[1-6]>\s*<\/h[1-6]>/g, "")
    .replace(/(<br\s*\/?>){3,}/g, "<br><br>")
    .trim();
}

function decodeCfEmailsInDom($: cheerio.CheerioAPI): void {
  $("[data-cfemail]").each((_, element) => {
    const encoded = $(element).attr("data-cfemail");
    if (encoded) {
      $(element).replaceWith(`<u>${decodeCfEmail(encoded)}</u>`);
    }
  });

  $('a[href*="/cdn-cgi/l/email-protection"]').each((_, element) => {
    const inner = $(element).html();
    if (inner) {
      $(element).replaceWith(inner);
    } else {
      $(element).remove();
    }
  });

  $('a[href^="mailto:"]').each((_, element) => {
    const inner = $(element).html();
    if (inner) {
      $(element).replaceWith(`<u>${inner}</u>`);
    }
  });
}

const ADDRESS_POSTCODE_REGEX = /\b([A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2})\b/i;
const ADDRESS_LABEL_PREFIX = /^(?:location|address|venue|where)\s*[:：]\s*/i;

function stripAddressLabel(text: string): string {
  return text.replace(ADDRESS_LABEL_PREFIX, "").trim();
}

function parseAddressString(
  address: string
): { address?: string; city?: string; postalCode?: string } | null {
  if (!address || address.length < 3) return null;
  const result: { address?: string; city?: string; postalCode?: string } = {};
  const strippedAddress = stripAddressLabel(address);
  const postcodeMatch = strippedAddress.match(ADDRESS_POSTCODE_REGEX);

  if (postcodeMatch) {
    result.postalCode = postcodeMatch[1].toUpperCase();
  }

  const countrySuffixes = /^(uk|united kingdom|england|scotland|wales|us|usa|united states)$/i;
  const remaining = strippedAddress
    .replace(ADDRESS_POSTCODE_REGEX, "")
    .replace(/,\s*$/, "")
    .trim();

  let parts = remaining
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length >= 2 && countrySuffixes.test(parts[parts.length - 1])) {
    parts = parts.slice(0, -1);
  }

  if (parts.length >= 2) {
    result.city = parts[parts.length - 1];
    result.address = parts.slice(0, -1).join(", ");
  } else if (parts.length === 1) {
    result.address = parts[0];
  }

  return result;
}

function extractFromDom($: cheerio.CheerioAPI): ImportedEventData {
  const result: ImportedEventData = {};
  decodeCfEmailsInDom($);

  const dateTimes: string[] = [];
  $("time[datetime]").each((_, element) => {
    const dateTime = $(element).attr("datetime");
    if (dateTime) dateTimes.push(dateTime);
  });
  if (dateTimes.length >= 1) result.startDate = dateTimes[0];
  if (dateTimes.length >= 2) result.endDate = dateTimes[1];

  if (result.startDate && !result.endDate) {
    const timeText = $(".time-wrapper, time.datetime, .event-time, .date-time")
      .text()
      .replace(/\u00a0/g, " ")
      .trim();
    const rangeMatch = timeText.match(/(\d{1,2}:\d{2})\s*(?:to|–|—|-)\s*(\d{1,2}:\d{2})/i);
    if (rangeMatch) {
      try {
        const startDate = new Date(result.startDate);
        const [endHours, endMinutes] = rangeMatch[2].split(":").map(Number);
        startDate.setHours(endHours, endMinutes, 0, 0);
        result.endDate = startDate.toISOString();
      } catch {}
    }
  }

  const h1 = $("h1").first().text().trim();
  if (h1) {
    result.name = h1;
  } else {
    const h2 = $("h2").first().text().trim();
    if (h2) result.name = h2;
  }

  const drupalVenue = $(".field--name-field-event-venue").first().text().trim();
  if (drupalVenue) {
    result.location = result.location || {};
    result.location.name = drupalVenue;
  }

  const drupalLocation = $(".field--name-field-event-location, .field--name-field-location")
    .first()
    .text()
    .trim();
  if (drupalLocation) {
    result.location = result.location || {};
    if (!result.location.address) result.location.address = stripAddressLabel(drupalLocation);
  }

  const wpVenue = $(".tribe-venue, .event-venue, .venue-name, .tribe-venue-name")
    .first()
    .text()
    .trim();
  if (wpVenue && !result.location?.name) {
    result.location = result.location || {};
    result.location.name = wpVenue;
  }

  const wpAddress = $(".tribe-venue-address, .tribe-street-address, .event-address, .venue-address")
    .first()
    .text()
    .trim();
  if (wpAddress && !result.location?.address) {
    result.location = result.location || {};
    result.location.address = stripAddressLabel(wpAddress);
  }

  const sqDate = $(".eventitem-column-date, .event-date").first().text().trim();
  if (sqDate && !result.startDate) result.startDate = sqDate;

  const sqLocation = $(".eventitem-column-location, .event-location").first().text().trim();
  if (sqLocation && !result.location?.name) {
    result.location = result.location || {};
    result.location.name = sqLocation;
  }

  const lumaInfo = $(".info").first();
  if (lumaInfo.length) {
    const lumaVenue = lumaInfo.find(".fw-medium").first().text().trim();
    if (lumaVenue && !result.location?.name) {
      result.location = result.location || {};
      result.location.name = lumaVenue;
    }
    const lumaAddress = lumaInfo.find(".text-tinted").first().text().trim();
    if (lumaAddress && !result.location?.address) {
      result.location = result.location || {};
      const parsed = parseAddressString(lumaAddress);
      if (parsed) {
        if (parsed.address) result.location.address = parsed.address;
        if (parsed.city && !result.location.city) result.location.city = parsed.city;
        if (parsed.postalCode && !result.location.postalCode) result.location.postalCode = parsed.postalCode;
      } else {
        result.location.address = stripAddressLabel(lumaAddress);
      }
    }
  }

  const addressElement = $("address").first().text().trim();
  if (addressElement && !result.location?.address) {
    result.location = result.location || {};
    result.location.address = stripAddressLabel(addressElement);
  }

  if (!result.location?.address) {
    $("div, span, p, li, td").each((_, element) => {
      if (result.location?.address) return false;
      const text = $(element).text().replace(/\u00a0/g, " ").trim();
      if (text.length > 10 && text.length < 200 && ADDRESS_POSTCODE_REGEX.test(text) && text.includes(",")) {
        const commaCount = (text.match(/,/g) || []).length;
        if (commaCount >= 2) {
          const parsed = parseAddressString(text);
          if (parsed) {
            result.location = result.location || {};
            if (parsed.address) result.location.address = parsed.address;
            if (parsed.city && !result.location.city) result.location.city = parsed.city;
            if (parsed.postalCode && !result.location.postalCode) {
              result.location.postalCode = parsed.postalCode;
            }
            return false;
          }
        }
      }
      return undefined;
    });
  }

  if (!result.description) {
    const descriptionSelectors = [
      ".spark-content",
      ".field--name-body .field__item",
      ".field--name-body",
      ".event-description",
      ".event-content",
      ".event-details",
      ".tribe-events-single-event-description",
      '[itemprop="description"]',
      "article .content",
      "article",
    ];

    for (const selector of descriptionSelectors) {
      const element = $(selector).first();
      const rawHtml = element.html();
      if (!rawHtml) continue;
      const sanitized = sanitizeHtmlForEditor(rawHtml);
      if (sanitized && sanitized.length > 20) {
        result.description = sanitized.substring(0, 10000);
        break;
      }
    }
  }

  $("dl").each((_, dl) => {
    $(dl)
      .find("dt")
      .each((_, dt) => {
        const label = $(dt).text().trim().toLowerCase();
        const value = $(dt).next("dd").text().trim();
        if (!value) return;
        if (/\b(date|when|time|starts?)\b/.test(label) && !result.startDate) {
          result.startDate = value;
        } else if (/\b(end|ends|until)\b/.test(label) && !result.endDate) {
          result.endDate = value;
        } else if (/\b(location|where|venue|place|address)\b/.test(label) && !result.location?.name) {
          result.location = result.location || {};
          result.location.name = value;
        }
      });
  });

  $("li, .detail-item, .event-meta-item, .event-info-item").each((_, element) => {
    const text = $(element).text().trim();
    const labelMatch = text.match(
      /^(date|time|when|starts?|location|where|venue|place|address)\s*[:：]\s*(.+)/i
    );
    if (!labelMatch) return;
    const [, label, value] = labelMatch;
    const lowerLabel = label.toLowerCase();

    if (/^(date|time|when|starts?)$/.test(lowerLabel) && !result.startDate) {
      result.startDate = value.trim();
    } else if (
      /^(location|where|venue|place|address)$/.test(lowerLabel) &&
      !result.location?.name
    ) {
      result.location = result.location || {};
      result.location.name = value.trim();
    }
  });

  const bodySelectors = [
    ".field--name-body .field__item",
    ".field--name-body",
    ".event-description",
    ".event-content",
    ".event-details",
    ".tribe-events-single-event-description",
    '[itemprop="description"]',
    "article .content",
    "article",
  ];

  let bodyRoot: cheerio.Cheerio<AnyNode> | null = null;
  for (const selector of bodySelectors) {
    const element = $(selector).first();
    if (element.length) {
      bodyRoot = element;
      break;
    }
  }

  if (bodyRoot) {
    bodyRoot.find("p, div, li, span, td").each((_, element) => {
      const text = $(element).text().replace(/\u00a0/g, " ").trim();
      const match = text.match(/^(?:location|address|venue|where)\s*[:：]\s*(.+)/i);
      if (!match) return;

      const parsed = parseAddressString(match[1].trim());
      if (!parsed) return;

      result.location = result.location || {};
      if (parsed.address && !result.location.address) result.location.address = parsed.address;
      if (parsed.city && !result.location.city) result.location.city = parsed.city;
      if (parsed.postalCode && !result.location.postalCode) result.location.postalCode = parsed.postalCode;
      return false;
    });
  }

  return result;
}

function mergeEventData(...layers: ImportedEventData[]): ImportedEventData {
  const result: ImportedEventData = {};

  for (const layer of layers) {
    if (!result.name && layer.name) result.name = layer.name;
    if (!result.description && layer.description) result.description = layer.description;
    if (!result.startDate && layer.startDate) result.startDate = layer.startDate;
    if (!result.endDate && layer.endDate) result.endDate = layer.endDate;
    if (!result.image && layer.image) result.image = layer.image;
    if (!result.url && layer.url) result.url = layer.url;
    if (!result.eventFormat && layer.eventFormat) result.eventFormat = layer.eventFormat;

    if (layer.location) {
      result.location = result.location || {};
      if (!result.location.name && layer.location.name) result.location.name = layer.location.name;
      if (!result.location.address && layer.location.address) result.location.address = layer.location.address;
      if (!result.location.city && layer.location.city) result.location.city = layer.location.city;
      if (!result.location.postalCode && layer.location.postalCode) {
        result.location.postalCode = layer.location.postalCode;
      }
      if (result.location.latitude == null && layer.location.latitude != null) {
        result.location.latitude = layer.location.latitude;
      }
      if (result.location.longitude == null && layer.location.longitude != null) {
        result.location.longitude = layer.location.longitude;
      }
    }
  }

  return result;
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "URL parameter is required" }, { status: 400 });
  }

  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; EventImporter/1.0)",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      cache: "no-store",
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch page: ${response.status} ${response.statusText}` },
        { status: 502 }
      );
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const jsonLd = extractJsonLd(html);
    const jsonLdResult = normalizeEventData(jsonLd || {}, {}, url);
    const ogResult = extractOgTags($);
    let merged = mergeEventData(jsonLdResult, ogResult);

    const domResult = extractFromDom($);
    merged = mergeEventData(merged, domResult);

    if (domResult.description && domResult.description.length > 20) {
      const hasFormatting = /<(?:p|h[1-6]|strong|em|ul|ol|li|hr|blockquote|a\s)/i.test(
        domResult.description
      );
      if (hasFormatting) {
        merged.description = domResult.description;
      }
    }

    if (!merged.url) merged.url = url;
    return NextResponse.json(merged);
  } catch (error) {
    console.error("Error importing event:", error);
    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json(
        { error: "Request timed out. The page took too long to load." },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { error: "Failed to import event. Please check the URL and try again." },
      { status: 500 }
    );
  }
}
