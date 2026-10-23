
import axios from "axios";

const configuredUrl = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

const api = axios.create({
  baseURL: configuredUrl ? `${configuredUrl}/api` : "/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("oryndel_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || "";

    if (error.response?.status === 401 && !url.includes("/auth/")) {
      localStorage.removeItem("oryndel_token");

      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

export default api;
