// hooks/useAuth.ts
import { useState, useEffect } from "react";
import { restaurantApi } from "@/services/api/restaurant.api";

const UserRole = {
  RESTAURANT: "restaurant_owner",
  CUSTOMER: "customer",
  DRIVER: "driver",
  ADMIN: "admin",
} as const;

export const useAuth = () => {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem("access_token");
    const storedUser = localStorage.getItem("user");
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser).user);
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const credentials = {
      email,
      password,
      role: UserRole.RESTAURANT,
    };
    const tokens = await restaurantApi.login(credentials);
    localStorage.setItem("access_token", tokens.access_token);
    localStorage.setItem("refresh_token", tokens.refresh_token);

    const profile = await restaurantApi.getProfile();
    localStorage.setItem("user", JSON.stringify(profile));

    setToken(tokens.access_token);
    setUser(profile.user);
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
  };

  return { user, token, login, logout, isAuthenticated: !!token, loading };
};