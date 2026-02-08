"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
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

interface CoworkingSessionState {
  member: MemberInfo | null;
  bookings: BookingInfo[];
  spaceInfo: CoworkingSpaceInfo | null;
  isOfficeRnDVerified: boolean;
}

interface CoworkingContextType {
  // Session state
  isAuthenticated: boolean;
  isLoading: boolean;
  member: MemberInfo | null;
  bookings: BookingInfo[];
  spaceInfo: CoworkingSpaceInfo | null;
  isOfficeRnDVerified: boolean;
  sessionExpiresAt: Date | null;

  // Actions
  setSpaceInfo: (info: CoworkingSpaceInfo) => void;
  setSession: (data: {
    member: MemberInfo;
    bookings?: BookingInfo[];
    expiresAt: Date;
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

  // Check if session is expired
  const isSessionExpired = useCallback((): boolean => {
    if (!sessionExpiresAt) return true;
    return new Date() > sessionExpiresAt;
  }, [sessionExpiresAt]);

  // Derived state
  const isAuthenticated = !!member && !isSessionExpired();

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
      }
    } catch (error) {
      console.error("Error loading coworking session:", error);
      clearSession();
    } finally {
      setIsLoading(false);
      setIsHydrated(true);
    }
  }, []);

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
  }, []);

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
      expiresAt: Date;
      isOfficeRnDVerified: boolean;
    }) => {
      if (typeof window === "undefined") return;

      setMember(data.member);
      setIsOfficeRnDVerified(data.isOfficeRnDVerified);
      setSessionExpiresAt(data.expiresAt);

      sessionStorage.setItem(
        STORAGE_KEYS.MEMBER_INFO,
        JSON.stringify(data.member)
      );
      sessionStorage.setItem(
        STORAGE_KEYS.SESSION_EXPIRY,
        data.expiresAt.toISOString()
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
        // If 401, session is invalid
        if (error instanceof Error && error.message.includes("expired")) {
          clearSession();
        }
      }
    },
    [isAuthenticated, setBookings, clearSession]
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

  // Don't render children until hydrated to avoid hydration mismatch
  if (!isHydrated) {
    return null;
  }

  return (
    <CoworkingContext.Provider
      value={{
        // State
        isAuthenticated,
        isLoading,
        member,
        bookings,
        spaceInfo,
        isOfficeRnDVerified,
        sessionExpiresAt,

        // Actions
        setSpaceInfo,
        setSession,
        setBookings,
        logout,
        refreshBookings,

        // Helpers
        isSessionExpired,
        getSelectedBooking,
      }}
    >
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
  const { getSelectedBooking, bookings } = useCoworking();

  if (!bookingId) {
    return null;
  }

  return getSelectedBooking(bookingId);
}
