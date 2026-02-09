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
import { MemberInfo, CoworkingSpaceInfo } from "@/types/api";

const STORAGE_KEYS = {
  MEMBER_INFO: "coworking_member_info",
  SPACE_INFO: "coworking_space_info",
} as const;

interface CoworkingContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  member: MemberInfo | null;
  spaceInfo: CoworkingSpaceInfo | null;

  setSpaceInfo: (info: CoworkingSpaceInfo) => void;
  setSession: (data: { member: MemberInfo }) => void;
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

  const hasValidToken = useCallback((): boolean => {
    if (typeof window === "undefined") return false;
    return !!coworkingService.getSessionToken();
  }, []);

  const isAuthenticated = hasValidToken() && !!member;

  const clearSession = useCallback(() => {
    if (typeof window === "undefined") return;
    coworkingService.clearSession();
    sessionStorage.removeItem(STORAGE_KEYS.MEMBER_INFO);
    setMember(null);
  }, []);

  // Load session from storage on mount
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;

      const token = coworkingService.getSessionToken();
      const savedMember = sessionStorage.getItem(STORAGE_KEYS.MEMBER_INFO);
      const savedSpaceInfo = sessionStorage.getItem(STORAGE_KEYS.SPACE_INFO);

      if (token && savedMember) {
        setMember(JSON.parse(savedMember));
      } else if (!token && savedMember) {
        clearSession();
      }

      if (savedSpaceInfo) {
        setSpaceInfoState(JSON.parse(savedSpaceInfo));
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

  const logout = useCallback(() => {
    clearSession();
  }, [clearSession]);

  const contextValue = useMemo(
    () => ({
      isAuthenticated,
      isLoading,
      member,
      spaceInfo,
      setSpaceInfo,
      setSession,
      logout,
    }),
    [
      isAuthenticated,
      isLoading,
      member,
      spaceInfo,
      setSpaceInfo,
      setSession,
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
