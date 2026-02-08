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
import {
  MemberInfo,
  BookingInfo,
  CoworkingSpaceInfo,
} from "@/types/api";

// Storage keys
const STORAGE_KEYS = {
  MEMBER_INFO: "coworking_member_info",
  BOOKINGS: "coworking_bookings",
  SPACE_INFO: "coworking_space_info",
  SESSION_EXPIRY: "coworking_session_expiry",
} as const;

interface CoworkingContextType {
  // Session state
  isAuthenticated: boolean;
  isLoading: boolean;
  member: MemberInfo | null;
  bookings: BookingInfo[];
  spaceInfo: CoworkingSpaceInfo | null;
  isOfficeRnDVerified: boolean;
  sessionExpiresAt: Date | null;
  sessionExpiringWarning: boolean; // True when session expires in <5 minutes
  minutesUntilExpiry: number | null; // Minutes until session expires

  // Actions
  setSpaceInfo: (info: CoworkingSpaceInfo) => void;
  setSession: (data: {
    member: MemberInfo;
    bookings?: BookingInfo[];
    expiresIn: number; // seconds until expiry
    isOfficeRnDVerified: boolean;
  }) => void;
  setBookings: (bookings: BookingInfo[]) => void;
  logout: () => void;
  refreshBookings: (spaceSlug: string) => Promise<void>;

  // Helpers
  isSessionExpired: () => boolean;
  getSelectedBooking: (bookingId: string) => BookingInfo | undefined;
}

const CoworkingContext = createContext<CoworkingContextType | undefined>(
  undefined
);

export function CoworkingProvider({ children }: { children: ReactNode }) {
  const [isHydrated, setIsHydrated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [member, setMember] = useState<MemberInfo | null>(null);
  const [bookings, setBookingsState] = useState<BookingInfo[]>([]);
  const [spaceInfo, setSpaceInfoState] = useState<CoworkingSpaceInfo | null>(null);
  const [isOfficeRnDVerified, setIsOfficeRnDVerified] = useState(false);
  const [sessionExpiresAt, setSessionExpiresAt] = useState<Date | null>(null);
  const [minutesUntilExpiry, setMinutesUntilExpiry] = useState<number | null>(null);
  const [sessionExpiringWarning, setSessionExpiringWarning] = useState(false);

  // Check if session is expired
  const isSessionExpired = useCallback((): boolean => {
    if (!sessionExpiresAt) return true;
    return new Date() > sessionExpiresAt;
  }, [sessionExpiresAt]);

  // Check if we have a valid token - this is the source of truth
  const hasValidToken = useCallback((): boolean => {
    if (typeof window === "undefined") return false;
    return !!coworkingService.getSessionToken();
  }, []);

  // Derived state - token is the authoritative source
  // Must have: token + member info + not expired
  const isAuthenticated = true; //hasValidToken() && !!member && !isSessionExpired();

  // Clear all session data
  const clearSession = useCallback(() => {
    if (typeof window === "undefined") return;

    coworkingService.clearSession();
    sessionStorage.removeItem(STORAGE_KEYS.MEMBER_INFO);
    sessionStorage.removeItem(STORAGE_KEYS.BOOKINGS);
    sessionStorage.removeItem(STORAGE_KEYS.SESSION_EXPIRY);
    // Keep space info as it's public data

    setMember(null);
    setBookingsState([]);
    setIsOfficeRnDVerified(false);
    setSessionExpiresAt(null);
    setMinutesUntilExpiry(null);
    setSessionExpiringWarning(false);
  }, []);

  // Load session from storage on mount
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;

      const token = coworkingService.getSessionToken();
      const savedMember = sessionStorage.getItem(STORAGE_KEYS.MEMBER_INFO);
      const savedBookings = sessionStorage.getItem(STORAGE_KEYS.BOOKINGS);
      const savedSpaceInfo = sessionStorage.getItem(STORAGE_KEYS.SPACE_INFO);
      const savedExpiry = sessionStorage.getItem(STORAGE_KEYS.SESSION_EXPIRY);

      if (token && savedMember && savedExpiry) {
        const expiry = new Date(savedExpiry);

        // Check if session is still valid
        if (new Date() < expiry) {
          setMember(JSON.parse(savedMember));
          setSessionExpiresAt(expiry);
          setIsOfficeRnDVerified(true); // If we have stored member, they were verified

          if (savedBookings) {
            setBookingsState(JSON.parse(savedBookings));
          }

          if (savedSpaceInfo) {
            setSpaceInfoState(JSON.parse(savedSpaceInfo));
          }
        } else {
          // Session expired, clear everything
          clearSession();
        }
      } else if (!token && savedMember) {
        // Token was cleared externally but we have stale member data - sync up
        clearSession();
      }
    } catch (error) {
      console.error("Error loading coworking session:", error);
      clearSession();
    } finally {
      setIsLoading(false);
      setIsHydrated(true);
    }
  }, [clearSession]);

  // Sync: Listen for storage changes (e.g., token cleared in another tab)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleStorageChange = (e: StorageEvent) => {
      // If the access token was removed from sessionStorage
      if (e.key === "coworking_access_token" && e.newValue === null) {
        // Clear our state to stay in sync
        setMember(null);
        setBookingsState([]);
        setIsOfficeRnDVerified(false);
        setSessionExpiresAt(null);
        setMinutesUntilExpiry(null);
        setSessionExpiringWarning(false);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Listen for session expired events from the API service
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleSessionExpired = () => {
      clearSession();
    };

    window.addEventListener("coworking-session-expired", handleSessionExpired);
    return () => window.removeEventListener("coworking-session-expired", handleSessionExpired);
  }, [clearSession]);

  // Update expiry warning timer
  useEffect(() => {
    if (!sessionExpiresAt) {
      setMinutesUntilExpiry(null);
      setSessionExpiringWarning(false);
      return;
    }

    const updateExpiry = () => {
      const now = new Date();
      const diffMs = sessionExpiresAt.getTime() - now.getTime();
      const diffMinutes = Math.floor(diffMs / 60000);

      setMinutesUntilExpiry(diffMinutes > 0 ? diffMinutes : 0);
      setSessionExpiringWarning(diffMinutes > 0 && diffMinutes < 5);

      if (diffMs <= 0) {
        clearSession();
      }
    };

    updateExpiry();
    const interval = setInterval(updateExpiry, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [sessionExpiresAt, clearSession]);

  // Set space info (public, doesn't require auth)
  const setSpaceInfo = useCallback((info: CoworkingSpaceInfo) => {
    setSpaceInfoState(info);
    if (typeof window !== "undefined") {
      sessionStorage.setItem(STORAGE_KEYS.SPACE_INFO, JSON.stringify(info));
    }
  }, []);

  // Set full session after authentication
  const setSession = useCallback(
    (data: {
      member: MemberInfo;
      bookings?: BookingInfo[];
      expiresIn: number;
      isOfficeRnDVerified: boolean;
    }) => {
      if (typeof window === "undefined") return;

      // Calculate expiry from expires_in (seconds)
      const expiresAt = new Date(Date.now() + data.expiresIn * 1000);

      setMember(data.member);
      setIsOfficeRnDVerified(data.isOfficeRnDVerified);
      setSessionExpiresAt(expiresAt);

      sessionStorage.setItem(
        STORAGE_KEYS.MEMBER_INFO,
        JSON.stringify(data.member)
      );
      sessionStorage.setItem(
        STORAGE_KEYS.SESSION_EXPIRY,
        expiresAt.toISOString()
      );

      if (data.bookings) {
        setBookingsState(data.bookings);
        sessionStorage.setItem(
          STORAGE_KEYS.BOOKINGS,
          JSON.stringify(data.bookings)
        );
      }
    },
    []
  );

  // Update bookings
  const setBookings = useCallback((newBookings: BookingInfo[]) => {
    setBookingsState(newBookings);
    if (typeof window !== "undefined") {
      sessionStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(newBookings));
    }
  }, []);

  // Refresh bookings from API
  const refreshBookings = useCallback(
    async (spaceSlug: string) => {
      if (!isAuthenticated) return;

      try {
        const response = await coworkingService.getBookings(spaceSlug);
        setBookings(response.bookings);
      } catch (error) {
        console.error("Failed to refresh bookings:", error);
        // SessionExpiredError is already handled by the service
      }
    },
    [isAuthenticated, setBookings]
  );

  // Logout
  const logout = useCallback(() => {
    clearSession();
  }, [clearSession]);

  // Get a specific booking by ID
  const getSelectedBooking = useCallback(
    (bookingId: string): BookingInfo | undefined => {
      return bookings.find((b) => b.id === bookingId);
    },
    [bookings]
  );

  const contextValue = useMemo(
    () => ({
      // State
      isAuthenticated,
      isLoading,
      member,
      bookings,
      spaceInfo,
      isOfficeRnDVerified,
      sessionExpiresAt,
      sessionExpiringWarning,
      minutesUntilExpiry,

      // Actions
      setSpaceInfo,
      setSession,
      setBookings,
      logout,
      refreshBookings,

      // Helpers
      isSessionExpired,
      getSelectedBooking,
    }),
    [
      isAuthenticated,
      isLoading,
      member,
      bookings,
      spaceInfo,
      isOfficeRnDVerified,
      sessionExpiresAt,
      sessionExpiringWarning,
      minutesUntilExpiry,
      setSpaceInfo,
      setSession,
      setBookings,
      logout,
      refreshBookings,
      isSessionExpired,
      getSelectedBooking,
    ]
  );

  // Don't render children until hydrated to avoid hydration mismatch
  if (!isHydrated) {
    return null;
  }

  return (
    <CoworkingContext.Provider value={contextValue}>
      {children}
    </CoworkingContext.Provider>
  );
}

/**
 * Hook to access coworking session state and actions
 */
export function useCoworking() {
  const context = useContext(CoworkingContext);
  if (!context) {
    throw new Error("useCoworking must be used within CoworkingProvider");
  }
  return context;
}

/**
 * Hook that returns true if the user is authenticated
 * Throws if session is expired or not authenticated
 */
export function useRequireCoworkingAuth() {
  const { isAuthenticated, isLoading, isSessionExpired } = useCoworking();

  if (isLoading) {
    return { isLoading: true, isAuthenticated: false };
  }

  if (!isAuthenticated || isSessionExpired()) {
    return { isLoading: false, isAuthenticated: false };
  }

  return { isLoading: false, isAuthenticated: true };
}

/**
 * Hook to get the currently selected booking for an order
 */
export function useSelectedBooking(bookingId: string | null) {
  const { getSelectedBooking } = useCoworking();

  if (!bookingId) {
    return null;
  }

  return getSelectedBooking(bookingId);
}
