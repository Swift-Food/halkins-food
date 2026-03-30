"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import { coworkingService } from "@/services/api/coworking.api";
import { MemberInfo, CoworkingSpaceInfo, CoworkingVenue } from "@/types/api";

const STORAGE_KEYS = {
  MEMBER_INFO: "coworking_member_info",
  SPACE_INFO: "coworking_space_info",
  VENUE_SELECTION: "coworking_venue_selection",
} as const;

const CHECKOUT_SNAPSHOT_KEY = "coworking_checkout_session_snapshot";

export function saveCoworkingSessionSnapshot() {
  if (typeof window === "undefined") return;

  const snapshot = {
    accessToken: coworkingService.getSessionToken(),
    refreshToken: coworkingService.getRefreshToken(),
    spaceSlug: coworkingService.getSpaceSlug(),
    memberInfo: sessionStorage.getItem(STORAGE_KEYS.MEMBER_INFO),
    spaceInfo: sessionStorage.getItem(STORAGE_KEYS.SPACE_INFO),
    venueSelection: sessionStorage.getItem(STORAGE_KEYS.VENUE_SELECTION),
  };

  localStorage.setItem(CHECKOUT_SNAPSHOT_KEY, JSON.stringify(snapshot));
}

export function restoreCoworkingSessionSnapshot() {
  if (typeof window === "undefined") return false;

  const rawSnapshot = localStorage.getItem(CHECKOUT_SNAPSHOT_KEY);
  if (!rawSnapshot) return false;

  try {
    const snapshot = JSON.parse(rawSnapshot) as {
      accessToken?: string | null;
      refreshToken?: string | null;
      spaceSlug?: string | null;
      memberInfo?: string | null;
      spaceInfo?: string | null;
      venueSelection?: string | null;
    };

    if (snapshot.accessToken && snapshot.refreshToken) {
      coworkingService.setTokens(
        snapshot.accessToken,
        snapshot.refreshToken,
        snapshot.spaceSlug ?? undefined
      );
    }

    if (snapshot.memberInfo) {
      sessionStorage.setItem(STORAGE_KEYS.MEMBER_INFO, snapshot.memberInfo);
    }
    if (snapshot.spaceInfo) {
      sessionStorage.setItem(STORAGE_KEYS.SPACE_INFO, snapshot.spaceInfo);
    }
    if (snapshot.venueSelection) {
      sessionStorage.setItem(STORAGE_KEYS.VENUE_SELECTION, snapshot.venueSelection);
    }

    return true;
  } catch (error) {
    console.error("Failed to restore coworking checkout snapshot:", error);
    return false;
  }
}

export function clearCoworkingSessionSnapshot() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CHECKOUT_SNAPSHOT_KEY);
}

export function clearCoworkingSessionStorage() {
  if (typeof window === "undefined") return;

  coworkingService.clearSession();
  sessionStorage.removeItem(STORAGE_KEYS.MEMBER_INFO);
  sessionStorage.removeItem(STORAGE_KEYS.SPACE_INFO);
  sessionStorage.removeItem(STORAGE_KEYS.VENUE_SELECTION);
}

interface VenueSelection {
  venue: CoworkingVenue;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
}

interface CoworkingContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  member: MemberInfo | null;
  spaceInfo: CoworkingSpaceInfo | null;
  spaceSlug: string | null;

  // Venue + event time selection
  selectedVenue: CoworkingVenue | null;
  eventStartDate: string;
  eventStartTime: string;
  eventEndDate: string;
  eventEndTime: string;

  setSpaceInfo: (info: CoworkingSpaceInfo) => void;
  setSession: (data: { member: MemberInfo }) => void;
  setVenueSelection: (venue: CoworkingVenue, startDate: string, startTime: string, endDate: string, endTime: string) => void;
  logout: () => void;
}

const CoworkingContext = createContext<CoworkingContextType | undefined>(
  undefined
);

export function CoworkingProvider({ children }: { children: ReactNode }) {
  const [isHydrated, setIsHydrated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [member, setMember] = useState<MemberInfo | null>(null);
  const [spaceInfo, setSpaceInfoState] = useState<CoworkingSpaceInfo | null>(null);
  const [selectedVenue, setSelectedVenue] = useState<CoworkingVenue | null>(null);
  const [eventStartDate, setEventStartDate] = useState("");
  const [eventStartTime, setEventStartTime] = useState("");
  const [eventEndDate, setEventEndDate] = useState("");
  const [eventEndTime, setEventEndTime] = useState("");

  const hasValidToken = useCallback((): boolean => {
    if (typeof window === "undefined") return false;
    return !!coworkingService.getSessionToken();
  }, []);

  const isAuthenticated = hasValidToken() && !!member;

  const clearSession = useCallback(() => {
    if (typeof window === "undefined") return;
    clearCoworkingSessionStorage();
    setMember(null);
    setSpaceInfoState(null);
    setSelectedVenue(null);
    setEventStartDate("");
    setEventStartTime("");
    setEventEndDate("");
    setEventEndTime("");
  }, []);

  // Load session from storage on mount
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;

      const token = coworkingService.getSessionToken();
      const savedMember = sessionStorage.getItem(STORAGE_KEYS.MEMBER_INFO);
      const savedSpaceInfo = null //sessionStorage.getItem(STORAGE_KEYS.SPACE_INFO);
      const savedVenueSelection = sessionStorage.getItem(STORAGE_KEYS.VENUE_SELECTION);

      if (token && savedMember) {
        setMember(JSON.parse(savedMember));
      } else if (!token && savedMember) {
        clearSession();
      }

      if (savedSpaceInfo) {
        setSpaceInfoState(JSON.parse(savedSpaceInfo));
      }

      if (savedVenueSelection) {
        const selection: VenueSelection = JSON.parse(savedVenueSelection);
        setSelectedVenue(selection.venue);
        setEventStartDate(selection.startDate);
        setEventStartTime(selection.startTime);
        setEventEndDate(selection.endDate ?? selection.startDate);
        setEventEndTime(selection.endTime);
      }
    } catch (error) {
      console.error("Error loading coworking session:", error);
      clearSession();
    } finally {
      setIsLoading(false);
      setIsHydrated(true);
    }
  }, [clearSession]);

  // Listen for session expired events from the API service
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleSessionExpired = () => {
      clearSession();
    };

    window.addEventListener("coworking-session-expired", handleSessionExpired);
    return () => window.removeEventListener("coworking-session-expired", handleSessionExpired);
  }, [clearSession]);

  const setSpaceInfo = useCallback((info: CoworkingSpaceInfo) => {
    setSpaceInfoState(info);
    if (typeof window !== "undefined") {
      sessionStorage.setItem(STORAGE_KEYS.SPACE_INFO, JSON.stringify(info));
    }
  }, []);

  const setSession = useCallback(
    (data: { member: MemberInfo }) => {
      if (typeof window === "undefined") return;
      setMember(data.member);
      sessionStorage.setItem(
        STORAGE_KEYS.MEMBER_INFO,
        JSON.stringify(data.member)
      );
    },
    []
  );

  const setVenueSelection = useCallback(
    (venue: CoworkingVenue, startDate: string, startTime: string, endDate: string, endTime: string) => {
      setSelectedVenue(venue);
      setEventStartDate(startDate);
      setEventStartTime(startTime);
      setEventEndDate(endDate);
      setEventEndTime(endTime);
      if (typeof window !== "undefined") {
        const selection: VenueSelection = { venue, startDate, startTime, endDate, endTime };
        sessionStorage.setItem(STORAGE_KEYS.VENUE_SELECTION, JSON.stringify(selection));
      }
    },
    []
  );

  const logout = useCallback(() => {
    clearSession();
  }, [clearSession]);

  const spaceSlug =
    typeof window === "undefined" ? null : coworkingService.getSpaceSlug();

  const contextValue = useMemo(
    () => ({
      isAuthenticated,
      isLoading,
      member,
      spaceInfo,
      spaceSlug,
      selectedVenue,
      eventStartDate,
      eventStartTime,
      eventEndDate,
      eventEndTime,
      setSpaceInfo,
      setSession,
      setVenueSelection,
      logout,
    }),
    [
      isAuthenticated,
      isLoading,
      member,
      spaceInfo,
      spaceSlug,
      selectedVenue,
      eventStartDate,
      eventStartTime,
      eventEndDate,
      eventEndTime,
      setSpaceInfo,
      setSession,
      setVenueSelection,
      logout,
    ]
  );

  if (!isHydrated) {
    return null;
  }

  return (
    <CoworkingContext.Provider value={contextValue}>
      {children}
    </CoworkingContext.Provider>
  );
}

export function useCoworking() {
  const context = useContext(CoworkingContext);
  if (!context) {
    throw new Error("useCoworking must be used within CoworkingProvider");
  }
  return context;
}
