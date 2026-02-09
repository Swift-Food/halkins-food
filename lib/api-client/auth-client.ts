// api/client.ts
const API_BASE_URL = "https://swiftfoods-32981ec7b5a4.herokuapp.com";

// Track if we're currently refreshing to avoid multiple refresh calls
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

// Helper function to make authenticated fetch requests
export const fetchWithAuth = async (
  url: string,
  options: RequestInit = {}
): Promise<Response> => {
  const token = localStorage.getItem("access_token");
  console.log("token", token)
  // Don't set Content-Type for FormData - let the browser set it with the boundary
  const isFormData = options.body instanceof FormData;

  // Add Authorization header if token exists
  const headers = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...options.headers,
    ...(token && { Authorization: `Bearer ${token}` }),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Handle 429 Too Many Requests
  if (response.status === 429) {
    const retryAfter = response.headers.get("Retry-After");
    const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 60000; // Default 60s

    // Show user-friendly error message
    console.warn(`Rate limit exceeded. Retry after ${waitTime / 1000} seconds`);

    // Throw error with retry information
    throw new Error(
      `Rate limit exceeded. Please try again in ${Math.ceil(
        waitTime / 1000
      )} seconds.`
    );
  }

  // If 401 and not already retrying, attempt refresh
  if (response.status === 401 && !(options as any)._retry) {
    // Skip refresh for login and refresh endpoints
    if (url.includes("/auth/login") || url.includes("/auth/refresh")) {
      return response;
    }

    if (isRefreshing) {
      // If already refreshing, queue this request
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        return fetchWithAuth(url, {
          ...options,
          headers: {
            ...options.headers,
            Authorization: `Bearer ${token}`,
          },
          _retry: true,
        } as any);
      });
    }

    isRefreshing = true;
    (options as any)._retry = true;

    const refreshToken = localStorage.getItem("refresh_token");

    if (!refreshToken) {
      // No refresh token, logout
      isRefreshing = false;
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("user");

      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }

      return response;
    }

    try {
      // Call refresh endpoint
      const refreshResponse = await fetch(
        `${API_BASE_URL}/auth/refresh`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refreshToken }),
        }
      );

      if (!refreshResponse.ok) {
        throw new Error("Token refresh failed");
      }

      const data = await refreshResponse.json();
      const { access_token, refresh_token: new_refresh_token } = data;

      // Save new tokens
      localStorage.setItem("access_token", access_token);
      localStorage.setItem("refresh_token", new_refresh_token);

      // Process queued requests
      processQueue(null, access_token);

      isRefreshing = false;

      // Retry original request with new token
      return fetchWithAuth(url, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${access_token}`,
        },
        _retry: true,
      } as any);
    } catch (refreshError) {
      // Refresh failed, logout
      processQueue(refreshError, null);
      isRefreshing = false;

      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("user");

      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }

      return response;
    }
  }

  return response;
};

export { API_BASE_URL };
